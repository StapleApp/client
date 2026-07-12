import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { IoIosSearch, IoMdPersonAdd } from "react-icons/io";
import { Check, X, Clock, Menu, Home, Compass, UserPlus, Settings, User } from "lucide-react";
import Navigator from "../../Components/layout/Navigator";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

import pfp from "../../assets/branding/staple-icon.png";
import profileBanner from "../../assets/backgrounds/profile-banner.png";
import { useAuth } from "../../context/AuthContext";
import { useMobileMenu } from "../../context/MobileMenuContext";
import {
  GetUserByFriendshipID,
  sendFriendRequest,
  getIncomingRequests,
  getOutgoingRequests,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
} from "../../services/friendService";
import { getUser } from "../../services/userService";
import { usePresence } from "../../context/PresenceContext";

const statusPill = (st) => {
  if (st === "online") return <span className="text-green-500 text-xs">● Çevrimiçi</span>;
  if (st === "sleeping") return <span className="text-blue-500 text-xs">● Uykuda</span>;
  if (st === "dnd") return <span className="text-red-500 text-xs">● Rahatsız Etmeyin</span>;
  return <span className="text-gray-500 text-xs">● Çevrimdışı</span>;
};

const RequestRow = ({ profile, children }) => (
  <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--primary-bg)] border border-[var(--primary-border)]">
    <img
      src={profile?.photoURL || pfp}
      alt=""
      className="w-10 h-10 rounded-full object-cover shrink-0"
    />
    <div className="flex-1 min-w-0">
      <p className="font-semibold text-[var(--secondary-text)] truncate">
        {profile?.nickName || profile?.name || "Kullanıcı"}
      </p>
      <p className="text-xs text-[var(--primary-text)] truncate">#{profile?.friendshipID || "—"}</p>
    </div>
    <div className="flex items-center gap-2 shrink-0">{children}</div>
  </div>
);

const AddFriendsPage = () => {
  const { userData } = useAuth();
  const { liveStatus } = usePresence();
  const { isMobile, isOpen, setIsOpen } = useMobileMenu();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchId, setSearchId] = useState("");
  const [searched, setSearched] = useState(false);
  const [friendData, setFriendData] = useState(null);

  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);

  const uid = userData?.userID;

  const loadRequests = useCallback(async () => {
    if (!uid) return;
    const [inc, out] = await Promise.all([
      getIncomingRequests(uid),
      getOutgoingRequests(uid),
    ]);
    const [incProfiles, outProfiles] = await Promise.all([
      Promise.all(inc.map(async (r) => ({ ...r, profile: await getUser(r.uid) }))),
      Promise.all(out.map(async (r) => ({ ...r, profile: await getUser(r.uid) }))),
    ]);
    setIncoming(incProfiles);
    setOutgoing(outProfiles);
  }, [uid]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const runSearch = useCallback(
    (id) => {
      if (!id) return;
      setSearched(false);
      GetUserByFriendshipID(id).then((friend) => {
        setSearched(true);
        setFriendData(friend && userData?.friendshipID !== id ? friend : null);
      });
    },
    [userData?.friendshipID]
  );

  const handleSearch = () => runSearch(searchId.trim());

  // Profil kartından "Ekle" ile gelindiyse otomatik ara
  const requestedCode = location.state?.friendshipID;
  useEffect(() => {
    if (requestedCode && userData) {
      setSearchId(requestedCode);
      runSearch(requestedCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedCode, userData?.userID]);

  const handleAdd = async (target) => {
    if (!userData || !target) return;
    const res = await sendFriendRequest(userData, target.userID);
    switch (res.reason) {
      case "sent":
        toast.success("Arkadaşlık isteği gönderildi");
        loadRequests();
        break;
      case "already_sent":
        toast("Zaten arkadaşlık isteği attınız", { icon: "⏳" });
        break;
      case "already_friends":
        toast("Zaten arkadaşsınız", { icon: "🤝" });
        break;
      case "incoming_exists":
        toast("Bu kullanıcı size zaten istek gönderdi — aşağıdan kabul edebilirsin", { icon: "📩" });
        break;
      case "self":
        toast.error("Kendine istek gönderemezsin");
        break;
      default:
        toast.error("Bir hata oluştu");
    }
  };

  const handleAccept = async (fromUid) => {
    await acceptFriendRequest(uid, fromUid);
    toast.success("Arkadaşlık isteği kabul edildi");
    loadRequests();
  };
  const handleReject = async (fromUid) => {
    await rejectFriendRequest(uid, fromUid);
    toast("İstek reddedildi", { icon: "🚫" });
    loadRequests();
  };
  const handleCancel = async (toUid) => {
    await cancelFriendRequest(uid, toUid);
    toast("İstek iptal edildi", { icon: "↩️" });
    loadRequests();
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 100 }}
      transition={{ duration: 0.1 }}
      className="parallax-bg fixed top-0 left-0 w-full h-screen bg-[var(--secondary-bg)] text-[var(--secondary-text)] overflow-hidden text-left flex flex-col"
      style={{
        paddingLeft: isMobile ? "0px" : "64px",
      }}
    >
      {isMobile && (
        <div className="flex items-center h-[60px] px-5 py-4 bg-[var(--primary-bg)] border-b-2 border-[var(--primary-border)] text-[var(--secondary-text)] shrink-0 z-30">
          <button
            onClick={() => setIsOpen(true)}
            className="p-1.5 rounded-lg hover:bg-[var(--secondary-bg)] transition-colors mr-3 text-[var(--secondary-text)]"
          >
            <Menu size={20} />
          </button>
          <span className="font-bold truncate text-lg">Arkadaşlar</span>
        </div>
      )}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <h1 className="text-2xl font-bold mb-6">Arkadaşlar</h1>

        {/* Arama */}
        <div className="mb-8">
          <div className="flex items-center gap-2">
            <div className="flex items-center flex-1 rounded-lg border-2 border-[var(--secondary-border)] focus-within:border-[var(--tertiary-border)] bg-[var(--primary-bg)] px-3">
              <IoIosSearch size={20} className="text-[var(--primary-text)]" />
              <input
                type="text"
                placeholder="Arkadaşlık kodu ile ara..."
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="w-full p-2 bg-transparent focus:outline-none"
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-4 py-2.5 rounded-lg bg-[var(--tertiary-bg)] text-[var(--tertiary-text)] font-semibold hover:bg-[var(--quaternary-bg)] transition-colors"
            >
              Ara
            </button>
          </div>

          {/* Sonuç */}
          {!searched && !friendData && (
            <div className="flex flex-col items-center mt-6">
              <DotLottieReact
                src="https://lottie.host/7ae9face-ddcd-4284-8dfe-19efef04d56b/sySXGDavLA.lottie"
                autoplay
                style={{ width: 220, height: 220 }}
              />
              <span className="text-lg font-semibold text-[var(--quaternary-text)]">
                ARKADAŞLARINI BUL
              </span>
            </div>
          )}
          {searched && friendData && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 rounded-xl overflow-hidden bg-[var(--primary-bg)] border-2 border-[var(--primary-border)]"
            >
              <div
                className="flex items-center gap-4 p-4 bg-cover bg-center"
                style={{ backgroundImage: `url(${profileBanner})` }}
              >
                <img
                  src={friendData.photoURL || pfp}
                  alt=""
                  className="w-20 h-20 rounded-full border-4 border-[var(--tertiary-border)] object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold text-[var(--secondary-text)] truncate">
                    {friendData.nickName || "Bilinmeyen Kullanıcı"}
                  </h2>
                  <p className="text-[var(--primary-text)] text-sm">#{friendData.friendshipID}</p>
                  {statusPill(liveStatus(friendData.userID, friendData.status, friendData.lastSeen))}
                </div>
                <button
                  onClick={() => handleAdd(friendData)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--tertiary-bg)] text-[var(--tertiary-text)] font-semibold hover:bg-[var(--quaternary-bg)] transition-colors shrink-0"
                >
                  <IoMdPersonAdd size={20} /> Ekle
                </button>
              </div>
              {friendData.about && (
                <div className="p-4">
                  <p className="text-sm text-[var(--primary-text)]">{friendData.about}</p>
                </div>
              )}
            </motion.div>
          )}
          {searched && friendData === null && (
            <p className="mt-6 text-center text-[var(--primary-text)] font-semibold">
              Kullanıcı bulunamadı
            </p>
          )}
        </div>

        {/* İstekler */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Gelen */}
          <div>
            <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--primary-text)] mb-3">
              <span className="w-1 h-4 rounded-full bg-[var(--tertiary-bg)]" />
              Gelen İstekler{incoming.length > 0 && ` (${incoming.length})`}
            </h2>
            {incoming.length === 0 ? (
              <p className="text-sm text-[var(--primary-text)] p-4 rounded-lg border-2 border-dashed border-[var(--primary-border)]">
                Bekleyen istek yok.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {incoming.map((r) => (
                  <RequestRow key={r.uid} profile={r.profile}>
                    <button
                      onClick={() => handleAccept(r.uid)}
                      className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--tertiary-bg)] text-[var(--tertiary-text)] hover:opacity-90 transition"
                      title="Kabul et"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      onClick={() => handleReject(r.uid)}
                      className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--secondary-bg)] border border-[var(--primary-border)] text-[var(--primary-text)] hover:text-red-400 hover:border-red-400/50 transition"
                      title="Reddet"
                    >
                      <X size={16} />
                    </button>
                  </RequestRow>
                ))}
              </div>
            )}
          </div>

          {/* Gönderilen */}
          <div>
            <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--primary-text)] mb-3">
              <span className="w-1 h-4 rounded-full bg-[var(--tertiary-bg)]" />
              Gönderilen İstekler{outgoing.length > 0 && ` (${outgoing.length})`}
            </h2>
            {outgoing.length === 0 ? (
              <p className="text-sm text-[var(--primary-text)] p-4 rounded-lg border-2 border-dashed border-[var(--primary-border)]">
                Gönderilen istek yok.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {outgoing.map((r) => (
                  <RequestRow key={r.uid} profile={r.profile}>
                    <span className="flex items-center gap-1 text-[11px] text-[var(--primary-text)]">
                      <Clock size={12} /> Bekliyor
                    </span>
                    <button
                      onClick={() => handleCancel(r.uid)}
                      className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--secondary-bg)] border border-[var(--primary-border)] text-[var(--primary-text)] hover:text-red-400 hover:border-red-400/50 transition"
                      title="İsteği iptal et"
                    >
                      <X size={16} />
                    </button>
                  </RequestRow>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
      {/* Mobile Drawer */}
      {isMobile && (
        <AnimatePresence>
          {isOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 bg-black/60 z-40 transition-opacity duration-200"
                onClick={() => setIsOpen(false)}
              />
              {/* Drawer Container */}
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="fixed top-0 bottom-0 left-0 z-50 flex w-[320px] shadow-2xl"
              >
                {/* Left: Navigator */}
                <div className="w-16 h-full shrink-0 relative z-20 bg-[var(--primary-bg)]/90 backdrop-blur-md border-r border-[var(--primary-border)]/20">
                  <Navigator />
                </div>
                {/* Right: Navigation Options */}
                <div className="w-64 h-full bg-[var(--primary-bg)]/90 backdrop-blur-md flex flex-col relative z-10 p-5 overflow-y-auto gap-5 text-left">
                  {/* Header */}
                  <div className="flex justify-between items-center pb-2 border-b border-[var(--primary-border)]/25 shrink-0">
                    <span className="font-bold text-sm text-[var(--secondary-text)] uppercase tracking-widest font-mono">Seçenekler</span>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="p-1 rounded-lg hover:bg-[var(--secondary-bg)] transition-colors text-[var(--secondary-text)] active:scale-95"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* Navigation Links */}
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                    <button
                      onClick={() => {
                        navigate("/");
                        setIsOpen(false);
                      }}
                      className="flex items-center gap-3 w-full p-2.5 rounded-xl bg-[var(--secondary-bg)]/40 hover:bg-[var(--secondary-bg)] border border-[var(--primary-border)]/30 hover:border-[var(--tertiary-border)]/40 text-sm font-semibold text-[var(--secondary-text)] transition-all active:scale-95"
                    >
                      <Home size={18} className="text-[var(--tertiary-bg)]" />
                      <span>Ana Sayfa</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        navigate("/servers");
                        setIsOpen(false);
                      }}
                      className="flex items-center gap-3 w-full p-2.5 rounded-xl bg-[var(--secondary-bg)] hover:bg-[var(--secondary-bg)] border border-[var(--primary-border)]/30 hover:border-[var(--tertiary-border)]/40 text-sm font-semibold text-[var(--secondary-text)] transition-all active:scale-95"
                    >
                      <Compass size={18} className="text-[var(--tertiary-bg)]" />
                      <span>Sunucu Keşfet</span>
                    </button>

                    <button
                      onClick={() => {
                        navigate("/AddFriends");
                        setIsOpen(false);
                      }}
                      className="flex items-center gap-3 w-full p-2.5 rounded-xl bg-[var(--secondary-bg)]/40 hover:bg-[var(--secondary-bg)] border border-[var(--primary-border)]/30 hover:border-[var(--tertiary-border)]/40 text-sm font-semibold text-[var(--secondary-text)] transition-all active:scale-95"
                    >
                      <UserPlus size={18} className="text-[var(--tertiary-bg)]" />
                      <span>Arkadaş Ekle</span>
                    </button>

                    <button
                      onClick={() => {
                        navigate("/settings");
                        setIsOpen(false);
                      }}
                      className="flex items-center gap-3 w-full p-2.5 rounded-xl bg-[var(--secondary-bg)]/40 hover:bg-[var(--secondary-bg)] border border-[var(--primary-border)]/30 hover:border-[var(--tertiary-border)]/40 text-sm font-semibold text-[var(--secondary-text)] transition-all active:scale-95"
                    >
                      <Settings size={18} className="text-[var(--tertiary-bg)]" />
                      <span>Ayarlar</span>
                    </button>

                    <button
                      onClick={() => {
                        navigate("/Profile");
                        setIsOpen(false);
                      }}
                      className="flex items-center gap-3 w-full p-2.5 rounded-xl bg-[var(--secondary-bg)]/40 hover:bg-[var(--secondary-bg)] border border-[var(--primary-border)]/30 hover:border-[var(--tertiary-border)]/40 text-sm font-semibold text-[var(--secondary-text)] transition-all active:scale-95"
                    >
                      <User size={18} className="text-[var(--tertiary-bg)]" />
                      <span>Profili Düzenle</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      )}
    </motion.div>
  );
};

export default AddFriendsPage;
