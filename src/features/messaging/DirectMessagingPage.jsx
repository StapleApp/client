import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Search, Users, Loader2, UserPlus, Menu } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { getFriendsList } from "../../services/friendService";
import { getUser } from "../../services/userService";
import { usePresence } from "../../context/PresenceContext";
import { getOrCreateDMChannel, getDMOverview, markDmRead } from "../../services/groupService";
import ChatPanel from "../../Components/chat/ChatPanel";
import { useMobileMenu } from "../../context/MobileMenuContext";
import Navigator from "../../Components/layout/Navigator";


const statusColor = (status) => {
  switch (status) {
    case "online": return "bg-green-500";
    case "sleeping": return "bg-blue-500";
    case "dnd": return "bg-red-500";
    default: return "bg-gray-500";
  }
};

// Son mesaj önizleme metni
const previewText = (ov, myId) => {
  if (!ov || !ov.lastAt) return "";
  const mine = ov.lastSenderId === myId ? "Sen: " : "";
  if (ov.lastType === "gif") return `${mine}GIF`;
  if (ov.lastType === "image") return `${mine}📷 Görsel`;
  return mine + (ov.lastContent || "");
};

// Kısa zaman etiketi (bugün → saat, değilse tarih)
const shortTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  return sameDay
    ? d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" });
};

const DirectMessagingPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const requestedUserID = location.state?.userID;

  const { userData } = useAuth();
  const { liveStatus } = usePresence();
  const { isMobile, isOpen, setIsOpen } = useMobileMenu();
  const [friends, setFriends] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [search, setSearch] = useState("");

  const [activeFriend, setActiveFriend] = useState(null); // { userID, nickName, photoURL, status }
  const [activeChannelId, setActiveChannelId] = useState(null);
  const [openingDM, setOpeningDM] = useState(false);
  const [overview, setOverview] = useState({}); // otherUserId -> { lastAt, unread, ... }

  // Sidebar genişliği ayarlanabilirliği (resize) ve kalıcılığı
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    return Number(localStorage.getItem("staple-sidebar-width")) || 256;
  });
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);

  useEffect(() => {
    document.documentElement.style.setProperty("--sidebar-width", `${sidebarWidth}px`);
    localStorage.setItem("staple-sidebar-width", sidebarWidth);
  }, [sidebarWidth]);

  const startSidebarResize = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const onPointerMove = (moveEvent) => {
      const newWidth = startWidth + (moveEvent.clientX - startX);
      setSidebarWidth(Math.max(200, Math.min(newWidth, 450)));
    };

    const onPointerUp = () => {
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
      document.body.style.cursor = "default";
      document.body.classList.remove("select-none");
      setIsResizingSidebar(false);
    };

    setIsResizingSidebar(true);
    document.body.style.cursor = "col-resize";
    document.body.classList.add("select-none");
    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
  };

  // Arkadaş listesini getir + her birinin profilini çek
  useEffect(() => {
    const fetchFriends = async () => {
      if (!userData?.userID) return;
      setLoadingFriends(true);
      const list = await getFriendsList(userData.userID);
      const profiles = await Promise.all(list.map((f) => getUser(f.uid)));
      const mapped = profiles
        .filter(Boolean)
        .map((p) => ({
          userID: p.userID,
          nickName: p.nickName || p.name || "Kullanıcı",
          photoURL: p.photoURL || "/defaults/avatars/1.png",
          status: p.status || "offline",
          lastSeen: p.lastSeen || null,
        }));
      setFriends(mapped);
      setLoadingFriends(false);
    };
    fetchFriends();
  }, [userData]);

  // DM önizleme/okunmamış özetini getir (açık sohbet değişince tazele)
  const refreshOverview = useCallback(async () => {
    if (!userData?.userID) return;
    const ov = await getDMOverview(userData.userID);
    setOverview(ov);
  }, [userData]);

  useEffect(() => {
    refreshOverview();
  }, [refreshOverview, activeChannelId]);

  // Bir arkadaşla DM aç: kanalı bul-ya-da-oluştur
  const openDM = useCallback(
    async (friend) => {
      if (!userData?.userID || !friend) return;
      if (activeFriend?.userID === friend.userID) return; // zaten açık
      setActiveFriend(friend);
      setActiveChannelId(null);
      setOpeningDM(true);
      try {
        const channelId = await getOrCreateDMChannel(userData.userID, friend.userID);
        if (!channelId) throw new Error("Kanal oluşturulamadı");
        setActiveChannelId(channelId);
        // Okundu işaretle + rozeti anında sıfırla
        markDmRead(channelId, userData.userID);
        setOverview((prev) =>
          prev[friend.userID]
            ? { ...prev, [friend.userID]: { ...prev[friend.userID], unread: 0 } }
            : prev
        );
      } catch (error) {
        console.error("DM açılamadı:", error);
        toast.error("Sohbet açılamadı, tekrar dene");
        setActiveFriend(null); // spinner'da takılı kalma
      } finally {
        setOpeningDM(false);
        setIsOpen(false);
      }
    },
    [userData, activeFriend, setIsOpen]
  );

  // Bir profilden "mesaj gönder" ile gelindiyse o kişiyle DM'i otomatik aç.
  // Zaten başka bir sohbet açıkken de yeni istenen kişiye GEÇMELİ.
  // Her navigasyon (location.key) yalnızca BİR kez işlenir — böylece
  // kullanıcı elle başka sohbete geçince eski istek geri zıplamaz,
  // ama aynı kişi yeniden istenirse (yeni navigasyon) tekrar açılır.
  const handledNavRef = useRef(null);
  useEffect(() => {
    if (!requestedUserID || !userData?.userID) return;
    if (handledNavRef.current === location.key) return;
    handledNavRef.current = location.key;
    if (activeFriend?.userID === requestedUserID) return;
    const openFromNav = async () => {
      const known = friends.find((f) => f.userID === requestedUserID);
      const friend = known || (await getUser(requestedUserID));
      if (friend) {
        openDM({
          userID: friend.userID,
          nickName: friend.nickName || friend.name || "Kullanıcı",
          photoURL: friend.photoURL || "/defaults/avatars/1.png",
          status: friend.status || "offline",
          lastSeen: friend.lastSeen || null,
        });
      }
    };
    openFromNav();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key, requestedUserID, friends, userData]);

  const filteredFriends = friends
    .filter((f) => f.nickName.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => {
      const ta = overview[a.userID]?.lastAt;
      const tb = overview[b.userID]?.lastAt;
      if (ta && tb) return new Date(tb) - new Date(ta);
      if (ta) return -1;
      if (tb) return 1;
      return a.nickName.localeCompare(b.nickName, "tr");
    });

  const renderFriendsListSidebar = () => {
    return (
      <>
        <div className="p-4 border-b border-[var(--primary-border)]">
          <h2 className="text-xl font-semibold text-[var(--secondary-text)] flex items-center gap-2 mb-3">
            <MessageCircle className="w-5 h-5 text-[var(--tertiary-border)]" />
            Direkt Mesajlar
          </h2>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--primary-text)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Arkadaş ara..."
              aria-label="Arkadaş ara"
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-[var(--secondary-bg)] text-[var(--secondary-text)] border border-[var(--primary-border)] focus:outline-none focus:border-[var(--tertiary-border)] placeholder:text-[var(--primary-text)] text-sm transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingFriends ? (
            <div className="flex flex-col gap-2 p-2 animate-pulse">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-2 py-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--secondary-bg)]" />
                  <div className="h-3 w-24 rounded bg-[var(--secondary-bg)]" />
                </div>
              ))}
            </div>
          ) : filteredFriends.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center text-[var(--primary-text)] gap-3">
              <Users className="w-8 h-8" />
              <p className="text-sm">
                {friends.length === 0
                  ? "Henüz arkadaşın yok. Arkadaş ekleyerek mesajlaşmaya başla."
                  : "Eşleşen arkadaş bulunamadı."}
              </p>
              {friends.length === 0 && (
                <button
                  onClick={() => navigate("/AddFriends")}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--tertiary-bg)] text-[var(--tertiary-text)] font-semibold text-sm hover:bg-[var(--quaternary-bg)] transition-colors"
                >
                  <UserPlus className="w-4 h-4" /> Arkadaş Ekle
                </button>
              )}
            </div>
          ) : (
            <AnimatePresence>
              {filteredFriends.map((friend) => {
                const isActive = activeFriend?.userID === friend.userID;
                const unread = overview[friend.userID]?.unread || 0;
                const lastAt = overview[friend.userID]?.lastAt;
                const preview = previewText(overview[friend.userID], userData?.userID);

                return (
                  <motion.div
                    key={friend.userID}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    onClick={() => openDM(friend)}
                    className={`flex items-center gap-3 px-4 py-3 mx-2 my-1 rounded-xl cursor-pointer transition-all duration-200 group relative ${
                      isActive
                        ? "bg-[var(--secondary-bg)] border border-[var(--primary-border)] shadow-md"
                        : "hover:bg-[var(--secondary-bg)]/40 border border-transparent"
                    }`}
                  >
                    <div className="relative shrink-0">
                      <img
                        src={friend.photoURL}
                        alt=""
                        className="w-10 h-10 rounded-full border border-[var(--primary-border)] object-cover group-hover:scale-105 transition-transform"
                      />
                      <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[var(--primary-bg)] ${statusColor(liveStatus(friend.userID, friend.status, friend.lastSeen))}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <h4 className="text-sm font-semibold text-[var(--secondary-text)] truncate">
                          {friend.nickName}
                        </h4>
                        {lastAt && (
                          <span className="text-[10px] text-[var(--primary-text)] shrink-0">
                            {shortTime(lastAt)}
                          </span>
                        )}
                      </div>
                      {preview && (
                        <p
                          className={`text-xs truncate ${
                            unread > 0
                              ? "text-[var(--secondary-text)] font-medium"
                              : "text-[var(--primary-text)]"
                          }`}
                        >
                          {preview}
                        </p>
                      )}
                    </div>
                    {unread > 0 && (
                      <span className="shrink-0 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">
                        {unread > 9 ? "9+" : unread}
                      </span>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.1 }}
    >
      {/* Desktop sidebar view */}
      {!isMobile && (
        <div 
          style={{ width: sidebarWidth }}
          className="fixed top-0 left-16 h-screen bg-[var(--primary-bg)]/90 backdrop-blur-md border-r border-[var(--primary-border)]/20 flex flex-col z-30 select-none"
        >
          {renderFriendsListSidebar()}
          {/* Sürükleme ile genişletme/daraltma tutamacı */}
          <div
            onPointerDown={startSidebarResize}
            className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-[var(--tertiary-border)]/50 active:bg-[var(--tertiary-border)] transition-colors z-50 group flex items-center justify-center"
          >
            <div className="w-0.5 h-8 bg-[var(--primary-border)] group-hover:bg-[var(--tertiary-text)] opacity-40 group-hover:opacity-100 transition-opacity rounded" />
          </div>
        </div>
      )}

      {/* Mobile drawer view */}
      {isMobile && (
        <>
          {isOpen && (
            <div
              className="fixed inset-0 bg-black/60 z-40 transition-opacity duration-200"
              onClick={() => setIsOpen(false)}
            />
          )}
          <div
            className={`fixed top-0 bottom-0 left-0 z-50 flex transition-transform duration-200 w-[320px] ${
              isOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <div className="w-16 h-full shrink-0 relative z-20 bg-[var(--primary-bg)]/90 backdrop-blur-md border-r border-[var(--primary-border)]/20">
              <Navigator />
            </div>
            <div className="w-64 h-full bg-[var(--primary-bg)]/90 backdrop-blur-md flex flex-col relative z-10">
              {renderFriendsListSidebar()}
            </div>
          </div>
        </>
      )}

      {/* Chat alanı */}
      <div 
        className="fixed top-0 right-0 h-[100dvh] bg-[var(--secondary-bg)] z-20 flex flex-col"
        style={isMobile ? { left: 0 } : {
          left: 64 + sidebarWidth,
          transition: isResizingSidebar ? "none" : "left 0.2s ease-in-out"
        }}
      >
        {activeFriend && activeChannelId ? (
          <ChatPanel
            key={activeChannelId}
            context={{ groupId: activeChannelId }}
            channelName={activeFriend.nickName}
            headerUserId={activeFriend.userID}
            headerIcon={
              <img
                src={activeFriend.photoURL}
                alt=""
                className="w-8 h-8 rounded-full border border-[var(--primary-border)] object-cover"
              />
            }
          />
        ) : openingDM ? (
          <div className="h-full flex items-center justify-center text-[var(--primary-text)]">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <div className="background h-full flex flex-col justify-center">
            {isMobile && (
              <div className="flex items-center h-[60px] px-5 py-4 bg-[var(--primary-bg)]/80 backdrop-blur-md border-b border-[var(--primary-border)]/30 text-[var(--secondary-text)] shrink-0 absolute top-0 left-0 right-0 z-30">
                <button
                  onClick={() => setIsOpen(true)}
                  className="p-1.5 rounded-lg hover:bg-[var(--secondary-bg)] transition-colors mr-3 text-[var(--secondary-text)]"
                >
                  <Menu size={20} />
                </button>
                <span className="font-bold truncate text-lg">Direkt Mesajlar</span>
              </div>
            )}
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center px-6">
                <div className="w-16 h-16 bg-[var(--primary-bg)] border border-[var(--primary-border)] rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-8 h-8 text-[var(--tertiary-border)]" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--secondary-text)] mb-2">
                  Mesajlaşmaya Başla
                </h3>
                <p className="text-[var(--primary-text)] text-sm mb-4">
                  Konuşmaya başlamak için soldan bir arkadaş seç.
                </p>
                {friends.length === 0 && (
                  <button
                    onClick={() => navigate("/AddFriends")}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--tertiary-bg)] text-[var(--tertiary-text)] font-semibold text-sm hover:bg-[var(--quaternary-bg)] transition-colors"
                  >
                    <UserPlus className="w-4 h-4" /> Arkadaş Ekle
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

    </motion.div>
  );
};

export default DirectMessagingPage;
