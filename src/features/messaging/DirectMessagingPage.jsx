import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Search, Users, Loader2, UserPlus } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { getFriendsList } from "../../services/friendService";
import { getUser } from "../../services/userService";
import { getOrCreateDMChannel, getDMOverview, markDmRead } from "../../services/groupService";
import ChatPanel from "../../Components/chat/ChatPanel";


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
  const [friends, setFriends] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [search, setSearch] = useState("");

  const [activeFriend, setActiveFriend] = useState(null); // { userID, nickName, photoURL, status }
  const [activeChannelId, setActiveChannelId] = useState(null);
  const [openingDM, setOpeningDM] = useState(false);
  const [overview, setOverview] = useState({}); // otherUserId -> { lastAt, unread, ... }

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
          photoURL: p.photoURL || "/1.png",
          status: p.status || "offline",
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
      }
    },
    [userData, activeFriend]
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
          photoURL: friend.photoURL || "/1.png",
          status: friend.status || "offline",
        });
      }
    };
    openFromNav();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key, requestedUserID, friends, userData]);

  const filteredFriends = friends
    .filter((f) => f.nickName.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => {
      // Son mesajı olanlar en üstte, en yeni önce; kalanlar alfabetik
      const ta = overview[a.userID]?.lastAt;
      const tb = overview[b.userID]?.lastAt;
      if (ta && tb) return new Date(tb) - new Date(ta);
      if (ta) return -1;
      if (tb) return 1;
      return a.nickName.localeCompare(b.nickName, "tr");
    });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.1 }}
    >
      {/* Sol panel — Arkadaş / sohbet listesi (nav rail'in sağında) */}
      <div className="fixed top-0 left-16 h-screen w-64 bg-[var(--primary-bg)] border-l border-r border-[var(--primary-border)] flex flex-col z-30">
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
              {filteredFriends.map((friend, index) => {
                const isSelected = activeFriend?.userID === friend.userID;
                const ov = overview[friend.userID];
                const unread = !isSelected ? ov?.unread || 0 : 0;
                const preview = previewText(ov, userData?.userID);
                return (
                  <motion.div
                    key={friend.userID}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: index * 0.02 }}
                    onClick={() => openDM(friend)}
                    className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer border-l-2 transition-colors ${
                      isSelected
                        ? "bg-[var(--secondary-bg)] border-[var(--tertiary-border)]"
                        : "border-transparent hover:bg-[var(--secondary-bg)]"
                    }`}
                  >
                    <div className="relative shrink-0">
                      <img
                        src={friend.photoURL}
                        alt=""
                        className="w-10 h-10 rounded-full border border-[var(--primary-border)] object-cover"
                      />
                      <span
                        className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[var(--primary-bg)] ${statusColor(friend.status)}`}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`truncate ${
                            unread > 0 ? "font-bold" : "font-medium"
                          } ${
                            isSelected
                              ? "text-[var(--tertiary-text)]"
                              : "text-[var(--secondary-text)]"
                          }`}
                        >
                          {friend.nickName}
                        </span>
                        {ov?.lastAt && (
                          <span className="shrink-0 text-[10px] text-[var(--primary-text)]">
                            {shortTime(ov.lastAt)}
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
      </div>

      {/* Chat alanı */}
      <div className="fixed top-0 left-80 right-0 h-screen bg-[var(--secondary-bg)] z-20">
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
          <div className="background h-full flex items-center justify-center">
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
        )}
      </div>

    </motion.div>
  );
};

export default DirectMessagingPage;
