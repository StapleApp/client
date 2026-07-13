import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Check, X, Clock, Menu, Home, Compass, UserPlus, Settings, User, Search, Copy, Inbox, SendHorizontal } from "lucide-react";
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
  if (st === "online") return <span className="text-green-500 text-xs font-semibold flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Çevrimiçi</span>;
  if (st === "sleeping") return <span className="text-blue-400 text-xs font-semibold flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Uykuda</span>;
  if (st === "dnd") return <span className="text-red-500 text-xs font-semibold flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Rahatsız Etmeyin</span>;
  return <span className="text-[var(--primary-text)] text-xs font-semibold flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-gray-500" /> Çevrimdışı</span>;
};

const RequestRow = ({ profile, children }) => (
  <div className="flex items-center gap-3 p-3.5 rounded-xl bg-[var(--primary-bg)]/40 backdrop-blur-sm border border-[var(--primary-border)]/40 hover:border-[var(--tertiary-border)]/30 hover:bg-[var(--primary-bg)]/60 transition-all duration-200">
    <img
      src={profile?.photoURL || pfp}
      alt=""
      className="w-10 h-10 rounded-full object-cover shrink-0 border border-[var(--primary-border)]/50 bg-[var(--secondary-bg)]"
    />
    <div className="flex-1 min-w-0">
      <p className="font-bold text-[var(--secondary-text)] truncate text-sm">
        {profile?.nickName || profile?.name || "Kullanıcı"}
      </p>
      <p className="text-[11px] font-semibold text-[var(--primary-text)] font-mono truncate mt-0.5">#{profile?.friendshipID || "—"}</p>
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

  const copyFriendshipID = () => {
    if (!userData?.friendshipID) return;
    navigator.clipboard.writeText(userData.friendshipID);
    toast.success("Arkadaşlık kodunuz kopyalandı!");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="parallax-bg fixed top-0 left-0 w-full h-screen bg-[var(--secondary-bg)] text-[var(--secondary-text)] overflow-hidden text-left flex flex-col"
      style={{
        paddingLeft: isMobile ? "0px" : "64px",
      }}
    >
      {isMobile && (
        <div className="flex items-center h-[60px] px-5 py-4 bg-[var(--primary-bg)] border-b border-[var(--primary-border)]/30 text-[var(--secondary-text)] shrink-0 z-30">
          <button
            onClick={() => setIsOpen(true)}
            className="p-1.5 rounded-lg hover:bg-[var(--secondary-bg)] transition-colors mr-3 text-[var(--secondary-text)] active:scale-95"
            aria-label="Menüyü Aç"
          >
            <Menu size={20} />
          </button>
          <span className="font-bold truncate text-lg">Arkadaşlar</span>
        </div>
      )}
      
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <h1 className="text-2xl font-black mb-6 flex items-center gap-2.5 text-[var(--secondary-text)]">
            <UserPlus size={24} className="text-[var(--tertiary-bg)]" />
            Arkadaş Ekle
          </h1>

          {/* Kendi kodun kutusu */}
          <div className="mb-6 p-4 rounded-2xl border border-[var(--primary-border)]/40 bg-[var(--primary-bg)]/45 backdrop-blur-md flex items-center justify-between gap-4 shadow-sm">
            <div>
              <p className="text-xs text-[var(--primary-text)] font-extrabold uppercase tracking-wider">Kendi Arkadaşlık Kodun</p>
              <p className="text-lg font-black text-[var(--secondary-text)] font-mono mt-1 select-all">#{userData?.friendshipID || "------"}</p>
            </div>
            <button
              onClick={copyFriendshipID}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-[var(--tertiary-bg)] hover:bg-[var(--quaternary-bg)] text-[var(--tertiary-text)] hover:scale-[1.03] active:scale-95 transition-all duration-200 shadow-sm"
            >
              <Copy size={13} /> Kopyala
            </button>
          </div>

          {/* Arama Kutusu */}
          <div className="mb-8">
            <div className="flex items-center gap-3">
              <div className="flex items-center flex-1 rounded-2xl border border-[var(--primary-border)]/55 bg-[var(--primary-bg)]/60 backdrop-blur-sm focus-within:border-[var(--tertiary-border)] transition-colors duration-200 px-4">
                <Search size={18} className="text-[var(--primary-text)] shrink-0" />
                <input
                  type="text"
                  placeholder="Arkadaşlık kodu ile ara..."
                  value={searchId}
                  onChange={(e) => setSearchId(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="w-full py-3 pl-3 bg-transparent text-[var(--secondary-text)] placeholder-[var(--primary-text)]/75 focus:outline-none text-sm font-semibold"
                />
              </div>
              <button
                onClick={handleSearch}
                className="px-6 py-3 rounded-2xl bg-[var(--tertiary-bg)] text-[var(--tertiary-text)] font-bold hover:bg-[var(--quaternary-bg)] transition-all hover:scale-[1.02] active:scale-95 shadow-md shadow-[var(--tertiary-bg)]/10"
              >
                Ara
              </button>
            </div>

            {/* Arama Sonucu */}
            <AnimatePresence mode="wait">
              {!searched && !friendData && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center mt-8 p-6 rounded-2xl border border-[var(--primary-border)]/20 bg-[var(--primary-bg)]/15 backdrop-blur-sm"
                >
                  <DotLottieReact
                    src="https://lottie.host/7ae9face-ddcd-4284-8dfe-19efef04d56b/sySXGDavLA.lottie"
                    autoplay
                    style={{ width: 160, height: 160 }}
                  />
                  <span className="text-sm font-extrabold text-[var(--quaternary-text)] tracking-widest uppercase mt-4">
                    Arkadaşlarını Bul
                  </span>
                </motion.div>
              )}
              
              {searched && friendData && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                  className="mt-6 rounded-2xl overflow-hidden bg-[var(--primary-bg)]/80 backdrop-blur-md border border-[var(--primary-border)]/50 shadow-2xl relative"
                >
                  {/* Banner */}
                  <div
                    className="h-28 bg-cover bg-center w-full relative"
                    style={{ backgroundImage: `url(${profileBanner})` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-[var(--primary-bg)] to-transparent" />
                  </div>
                  
                  <div className="px-6 pb-6 relative">
                    {/* Avatar */}
                    <div className="flex justify-between items-end -mt-10 mb-4">
                      <div className="relative">
                        <img
                          src={friendData.photoURL || pfp}
                          alt=""
                          className="w-20 h-20 rounded-full border-4 border-[var(--primary-bg)] object-cover bg-[var(--primary-bg)] shadow-md"
                        />
                        {/* Status Circle */}
                        <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-[var(--primary-bg)] flex items-center justify-center bg-[var(--primary-bg)]">
                          <span className={`w-2 h-2 rounded-full ${
                            liveStatus(friendData.userID, friendData.status, friendData.lastSeen) === "online"
                              ? "bg-green-500"
                              : liveStatus(friendData.userID, friendData.status, friendData.lastSeen) === "sleeping"
                              ? "bg-blue-500"
                              : liveStatus(friendData.userID, friendData.status, friendData.lastSeen) === "dnd"
                              ? "bg-red-500"
                              : "bg-gray-500"
                          }`} />
                        </div>
                      </div>

                      <button
                        onClick={() => handleAdd(friendData)}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--tertiary-bg)] hover:bg-[var(--quaternary-bg)] text-[var(--tertiary-text)] font-bold transition-all duration-200 hover:scale-[1.03] active:scale-95 shadow-md shadow-[var(--tertiary-bg)]/15 shrink-0"
                      >
                        <UserPlus size={16} /> Ekle
                      </button>
                    </div>

                    <div className="min-w-0">
                      <h2 className="text-xl font-black text-[var(--secondary-text)] flex items-center gap-2">
                        {friendData.nickName || "Bilinmeyen Kullanıcı"}
                        <span className="text-xs font-mono font-bold text-[var(--primary-text)] bg-[var(--secondary-bg)]/60 px-2 py-0.5 rounded-md border border-[var(--primary-border)]/20">
                          #{friendData.friendshipID}
                        </span>
                      </h2>
                      <div className="mt-1.5">
                        {statusPill(liveStatus(friendData.userID, friendData.status, friendData.lastSeen))}
                      </div>
                    </div>

                    {friendData.about && (
                      <div className="mt-4 pt-4 border-t border-[var(--primary-border)]/20">
                        <p className="text-xs text-[var(--primary-text)] uppercase font-extrabold tracking-wider mb-1">Hakkında</p>
                        <p className="text-sm text-[var(--secondary-text)]/90 italic leading-relaxed">{friendData.about}</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
              
              {searched && friendData === null && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 text-center text-[var(--primary-text)] font-bold p-4 bg-red-500/10 border border-red-500/20 rounded-2xl"
                >
                  Kullanıcı bulunamadı. Lütfen kodu kontrol edin.
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* İstekler Izgarası */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Gelen İstekler */}
            <div>
              <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[var(--primary-text)] mb-4">
                <span className="w-1.5 h-4 rounded-full bg-[var(--tertiary-bg)]" />
                Gelen İstekler {incoming.length > 0 && <span className="bg-[var(--tertiary-bg)] text-[var(--tertiary-text)] text-[10px] font-black px-1.5 py-0.5 rounded-full ml-1">{incoming.length}</span>}
              </h2>
              {incoming.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-[var(--primary-border)]/35 bg-[var(--primary-bg)]/10 text-center gap-2">
                  <Inbox size={24} className="text-[var(--primary-text)]/40" />
                  <p className="text-sm font-semibold text-[var(--primary-text)]/80">Bekleyen istek yok.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {incoming.map((r) => (
                    <RequestRow key={r.uid} profile={r.profile}>
                      <button
                        onClick={() => handleAccept(r.uid)}
                        className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--tertiary-bg)] text-[var(--tertiary-text)] hover:opacity-90 active:scale-90 transition duration-150"
                        title="Kabul et"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        onClick={() => handleReject(r.uid)}
                        className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--secondary-bg)] border border-[var(--primary-border)] text-[var(--primary-text)] hover:text-red-400 hover:border-red-400/50 active:scale-90 transition duration-150"
                        title="Reddet"
                      >
                        <X size={16} />
                      </button>
                    </RequestRow>
                  ))}
                </div>
              )}
            </div>

            {/* Gönderilen İstekler */}
            <div>
              <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[var(--primary-text)] mb-4">
                <span className="w-1.5 h-4 rounded-full bg-[var(--tertiary-bg)]" />
                Gönderilen İstekler {outgoing.length > 0 && <span className="bg-[var(--tertiary-bg)] text-[var(--tertiary-text)] text-[10px] font-black px-1.5 py-0.5 rounded-full ml-1">{outgoing.length}</span>}
              </h2>
              {outgoing.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-[var(--primary-border)]/35 bg-[var(--primary-bg)]/10 text-center gap-2">
                  <SendHorizontal size={24} className="text-[var(--primary-text)]/40" />
                  <p className="text-sm font-semibold text-[var(--primary-text)]/80">Gönderilen istek yok.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {outgoing.map((r) => (
                    <RequestRow key={r.uid} profile={r.profile}>
                      <span className="flex items-center gap-1 text-[11px] font-bold text-[var(--primary-text)] bg-[var(--secondary-bg)]/50 border border-[var(--primary-border)]/30 px-2 py-1 rounded-lg">
                        <Clock size={11} className="text-[var(--tertiary-bg)]" /> Bekliyor
                      </span>
                      <button
                        onClick={() => handleCancel(r.uid)}
                        className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--secondary-bg)] border border-[var(--primary-border)] text-[var(--primary-text)] hover:text-red-400 hover:border-red-400/50 active:scale-90 transition duration-150"
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
                      className="flex items-center gap-3 w-full p-2.5 rounded-xl bg-[var(--secondary-bg)] hover:bg-[var(--secondary-bg)] border border-[var(--primary-border)]/30 hover:border-[var(--tertiary-border)]/40 text-sm font-semibold text-[var(--secondary-text)] transition-all active:scale-95"
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
                        navigate("/ProfileSettings");
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
