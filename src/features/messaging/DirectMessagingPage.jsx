import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Search, Users, Loader2 } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getFriendsList } from "../../services/friendService";
import { getUser } from "../../services/userService";
import { getOrCreateDMChannel } from "../../services/groupService";
import ChatPanel from "../../Components/chat/ChatPanel";

const DirectMessagingPage = () => {
  const location = useLocation();
  const requestedUserID = location.state?.userID;

  const { userData } = useAuth();
  const [friends, setFriends] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [search, setSearch] = useState("");

  const [activeFriend, setActiveFriend] = useState(null); // { userID, nickName, photoURL }
  const [activeChannelId, setActiveChannelId] = useState(null);
  const [openingDM, setOpeningDM] = useState(false);

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
        }));
      setFriends(mapped);
      setLoadingFriends(false);
    };
    fetchFriends();
  }, [userData]);

  // Bir arkadaşla DM aç: kanalı bul-ya-da-oluştur
  const openDM = useCallback(
    async (friend) => {
      if (!userData?.userID || !friend) return;
      if (activeFriend?.userID === friend.userID) return; // zaten açık
      setActiveFriend(friend);
      setActiveChannelId(null);
      setOpeningDM(true);
      const channelId = await getOrCreateDMChannel(userData.userID, friend.userID);
      setActiveChannelId(channelId);
      setOpeningDM(false);
    },
    [userData, activeFriend]
  );

  // Bir profilden "mesaj gönder" ile gelindiyse o kişiyle DM'i otomatik aç
  useEffect(() => {
    if (!requestedUserID || !userData?.userID) return;
    if (activeFriend) return; // kullanıcı zaten birini seçtiyse dokunma
    const openFromNav = async () => {
      // Önce mevcut arkadaş listesinde ara, yoksa profili çek
      const known = friends.find((f) => f.userID === requestedUserID);
      const friend = known || (await getUser(requestedUserID));
      if (friend) {
        openDM({
          userID: friend.userID,
          nickName: friend.nickName || friend.name || "Kullanıcı",
          photoURL: friend.photoURL || "/1.png",
        });
      }
    };
    openFromNav();
    // requestedUserID değişince bir kez çalışır
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedUserID, friends, userData]);

  const filteredFriends = friends.filter((f) =>
    f.nickName.toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: -100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 100 }}
      transition={{ duration: 0.1 }}
      className="background fixed top-0 left-0 w-full h-screen bg-[var(--secondary-bg)] text-[var(--secondary-text)]"
    >
      <div className="background fixed inset-0 flex items-center justify-center min-h-screen bg-[var(--primary-bg)] z-0">
        <div className="w-full my-auto max-w-5xl h-[90vh] flex bg-[var(--primary-bg)] rounded-xl shadow-lg overflow-hidden border border-[var(--primary-border)]">
          {/* Sol Sidebar — Arkadaş Listesi */}
          <div className="w-80 bg-[var(--primary-bg)] border-r border-[var(--primary-border)] flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-[var(--primary-border)]">
              <h2 className="text-xl font-semibold text-[var(--secondary-text)] flex items-center gap-2 mb-3">
                <MessageCircle className="w-5 h-5 text-[var(--tertiary-border)]" />
                Direkt Mesajlar
              </h2>
              {/* Arkadaş arama */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--primary-text)]" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Arkadaş ara..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-[var(--secondary-bg)] text-[var(--secondary-text)] border border-[var(--primary-border)] focus:outline-none focus:border-[var(--tertiary-border)] placeholder:text-[var(--primary-text)] text-sm transition-colors"
                />
              </div>
            </div>

            {/* Liste */}
            <div className="flex-1 overflow-y-auto">
              {loadingFriends ? (
                <div className="flex items-center justify-center py-10 text-[var(--primary-text)]">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              ) : filteredFriends.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 px-4 text-center text-[var(--primary-text)] gap-2">
                  <Users className="w-8 h-8" />
                  <p className="text-sm">
                    {friends.length === 0
                      ? "Henüz arkadaşın yok. Arkadaş ekleyerek mesajlaşmaya başla."
                      : "Eşleşen arkadaş bulunamadı."}
                  </p>
                </div>
              ) : (
                <AnimatePresence>
                  {filteredFriends.map((friend, index) => {
                    const isSelected = activeFriend?.userID === friend.userID;
                    return (
                      <motion.div
                        key={friend.userID}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ delay: index * 0.02 }}
                        onClick={() => openDM(friend)}
                        className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-l-2 transition-colors ${
                          isSelected
                            ? "bg-[var(--secondary-bg)] border-[var(--tertiary-border)]"
                            : "border-transparent hover:bg-[var(--secondary-bg)]"
                        }`}
                      >
                        <img
                          src={friend.photoURL}
                          alt=""
                          className="w-10 h-10 rounded-full border border-[var(--primary-border)] object-cover"
                        />
                        <span
                          className={`font-medium truncate ${
                            isSelected
                              ? "text-[var(--tertiary-text)]"
                              : "text-[var(--secondary-text)]"
                          }`}
                        >
                          {friend.nickName}
                        </span>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>
          </div>

          {/* Ana Mesajlaşma Alanı */}
          <div className="flex-1 flex flex-col bg-[var(--secondary-bg)]">
            {activeFriend && activeChannelId ? (
              <ChatPanel
                key={activeChannelId}
                context={{ groupId: activeChannelId }}
                channelName={activeFriend.nickName}
                headerIcon={
                  <img
                    src={activeFriend.photoURL}
                    alt=""
                    className="w-8 h-8 rounded-full border border-[var(--primary-border)] object-cover"
                  />
                }
              />
            ) : openingDM ? (
              <div className="flex-1 flex items-center justify-center text-[var(--primary-text)]">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center px-6">
                  <div className="w-16 h-16 bg-[var(--primary-bg)] border border-[var(--primary-border)] rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageCircle className="w-8 h-8 text-[var(--tertiary-border)]" />
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--secondary-text)] mb-2">
                    Mesajlaşmaya Başla
                  </h3>
                  <p className="text-[var(--primary-text)] text-sm">
                    Konuşmaya başlamak için soldan bir arkadaş seç.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default DirectMessagingPage;
