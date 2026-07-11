import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  Plus,
  UserPlus,
  MessageCircle,
  Compass,
  Hash,
  Check,
  ChevronRight,
  ChevronDown,
  Volume2,
  Copy,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  getServersList,
  getVoiceChannelsMap,
} from "../../services/serverService";
import { getFriendsList } from "../../services/friendService";
import {
  getUser,
  resolveStatus,
  updateUserStatus,
} from "../../services/userService";
import { getDMOverview } from "../../services/groupService";
import { socket } from "../../config/socket";

import icon from "../../assets/branding/staple-icon.png";
import backgroundTile from "../../assets/backgrounds/tile.png";

// Düz renk — koyu mavi kartlar/butonlar (projenin geneliyle aynı), gri paneller.
const GLASS = "bg-[var(--primary-bg)] border-2 border-[var(--primary-border)]";
const GLASS_HOVER = "hover:border-[var(--tertiary-border)]";
const GLASS_PANEL = "bg-[var(--secondary-bg)] border-2 border-[var(--primary-border)]";

const STATUS_META = {
  online: { color: "bg-green-500", label: "Çevrimiçi" },
  sleeping: { color: "bg-blue-500", label: "Uyuyor" },
  dnd: { color: "bg-red-500", label: "Rahatsız Etmeyin" },
  offline: { color: "bg-gray-500", label: "Çevrimdışı" },
};

const statusColor = (status) => (STATUS_META[status] || STATUS_META.offline).color;

const greetingForHour = () => {
  const h = new Date().getHours();
  if (h < 6) return "İyi geceler";
  if (h < 12) return "Günaydın";
  if (h < 18) return "İyi günler";
  return "İyi akşamlar";
};

const relativeTime = (iso) => {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "şimdi";
  if (m < 60) return `${m}dk`;
  const hrs = Math.floor(m / 60);
  if (hrs < 24) return `${hrs}sa`;
  const d = Math.floor(hrs / 24);
  if (d < 7) return `${d}g`;
  return `${Math.floor(d / 7)}h`;
};

const dmPreview = (dm) => {
  if (!dm.lastContent) return "Henüz mesaj yok";
  if (dm.lastType === "gif") return "GIF gönderdi";
  if (dm.lastType === "image") return "Görsel gönderdi";
  const prefix = dm.fromMe ? "Sen: " : "";
  const text = dm.lastContent.length > 38 ? dm.lastContent.slice(0, 38) + "…" : dm.lastContent;
  return prefix + text;
};

/* ---- Küçük yapı taşları ---- */

const StatChip = ({ value, label }) => (
  <div className="flex flex-col items-start px-4 py-2 rounded-xl bg-[var(--secondary-bg)] border border-[var(--primary-border)]">
    <span className="text-lg font-extrabold leading-none text-[var(--tertiary-bg)]">{value}</span>
    <span className="text-[11px] font-medium text-[var(--primary-text)] mt-1">{label}</span>
  </div>
);

const QuickAction = ({ icon, label, onClick, badge = 0 }) => (
  <button
    onClick={onClick}
    className={`group relative flex flex-col items-start gap-2 px-4 py-4 rounded-2xl ${GLASS} ${GLASS_HOVER} hover:-translate-y-0.5 transition-all duration-200 text-left`}
  >
    <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-[var(--secondary-bg)] text-[var(--tertiary-border)] group-hover:bg-[var(--tertiary-bg)] group-hover:text-[var(--tertiary-text)] transition-colors">
      {icon}
    </span>
    <span className="text-sm font-semibold text-[var(--secondary-text)]">{label}</span>
    {badge > 0 && (
      <span className="absolute top-3 right-3 min-w-[20px] h-5 px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[11px] font-bold border-2 border-[var(--primary-bg)]">
        {badge > 9 ? "9+" : badge}
      </span>
    )}
  </button>
);

const SectionTitle = ({ children, action, onAction }) => (
  <div className="flex items-center justify-between mb-3">
    <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--primary-text)]">
      <span className="w-1 h-4 rounded-full bg-[var(--tertiary-bg)]" />
      {children}
    </h2>
    {action && (
      <button
        onClick={onAction}
        className="flex items-center gap-1 text-[11px] font-semibold text-[var(--primary-text)] hover:text-[var(--tertiary-bg)] transition-colors"
      >
        {action} <ChevronRight size={12} />
      </button>
    )}
  </div>
);

const StatusSelector = ({ status, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const onDoc = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  const meta = STATUS_META[status] || STATUS_META.offline;
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--secondary-bg)] border border-[var(--primary-border)] hover:bg-[var(--primary-bg)] transition-all`}
      >
        <span className={`w-2.5 h-2.5 rounded-full ${meta.color}`} />
        <span className="text-xs font-semibold text-[var(--secondary-text)]">{meta.label}</span>
        <ChevronDown size={13} className="text-[var(--primary-text)] ml-auto" />
      </button>
      {open && (
        <div className="absolute z-30 mt-2 left-0 right-0 py-1 rounded-xl bg-[var(--secondary-bg)] border-2 border-[var(--primary-border)] shadow-xl">
          {["online", "sleeping", "dnd", "offline"].map((s) => (
            <button
              key={s}
              onClick={() => {
                onChange(s);
                setOpen(false);
              }}
              className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-[var(--secondary-bg)] transition-colors"
            >
              <span className={`w-2.5 h-2.5 rounded-full ${STATUS_META[s].color}`} />
              <span className="text-xs font-medium text-[var(--secondary-text)]">{STATUS_META[s].label}</span>
              {s === status && <Check size={13} className="ml-auto text-[var(--tertiary-bg)]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const DmRow = ({ dm, onClick }) => (
  <div
    onClick={onClick}
    className={`flex items-center gap-3 p-3 rounded-xl ${GLASS} ${GLASS_HOVER} transition-all duration-200 cursor-pointer`}
  >
    <img src={dm.photo} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-[var(--secondary-text)] truncate">{dm.name}</span>
        <span className="text-[11px] text-[var(--primary-text)] shrink-0">{relativeTime(dm.lastAt)}</span>
      </div>
      <p className={`text-xs truncate ${dm.unread > 0 ? "text-[var(--secondary-text)] font-medium" : "text-[var(--primary-text)]"}`}>
        {dmPreview(dm)}
      </p>
    </div>
    {dm.unread > 0 && (
      <span className="min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full bg-[var(--tertiary-bg)] text-[var(--tertiary-text)] text-[11px] font-bold shrink-0">
        {dm.unread > 9 ? "9+" : dm.unread}
      </span>
    )}
  </div>
);

const RailTitle = ({ children }) => (
  <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[var(--primary-text)] mb-2 px-1">
    {children}
  </h3>
);

/* ---- Ana sayfa ---- */

const HomePage = () => {
  const navigate = useNavigate();
  const { userData, currentUser, refreshUserData } = useAuth();

  const [servers, setServers] = useState([]);
  const [friends, setFriends] = useState([]);
  const [dmList, setDmList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myStatus, setMyStatus] = useState("online");

  // Aktif ses kanalları
  const [serverVoice, setServerVoice] = useState({}); // serverId -> { channelId: [users] }
  const [voiceChanMap, setVoiceChanMap] = useState({}); // channelId -> { name, serverId }

  useEffect(() => {
    setMyStatus(resolveStatus(userData?.status, userData?.lastSeen));
  }, [userData?.status, userData?.lastSeen]);

  useEffect(() => {
    const load = async () => {
      if (!currentUser?.uid || !userData?.userID) return;
      setLoading(true);
      const [serverList, friendList, overview] = await Promise.all([
        getServersList(currentUser.uid),
        getFriendsList(userData.userID),
        getDMOverview(userData.userID),
      ]);
      const friendProfiles = await Promise.all(friendList.map((f) => getUser(f.uid)));
      const validFriends = friendProfiles.filter(Boolean);

      const mappedServers = serverList.map((s) => ({
        id: s.ServerId,
        name: s.ServerName,
        photo: s.ServerPhotoURL || icon,
      }));
      setServers(mappedServers);

      // Ses kanalı isim haritası (rail'deki aktif kanal başlıkları için)
      getVoiceChannelsMap(mappedServers.map((s) => s.id)).then(setVoiceChanMap);

      setFriends(
        validFriends
          .map((p) => ({
            userID: p.userID,
            nickName: p.nickName || p.name || "Kullanıcı",
            photoURL: p.photoURL || "/defaults/avatars/1.png",
            status: resolveStatus(p.status, p.lastSeen),
          }))
          .sort((a, b) => (a.status !== "offline" ? -1 : 1) - (b.status !== "offline" ? -1 : 1))
      );

      // Devam eden sohbetler — DM overview + isim/foto çözümle
      const friendMap = {};
      validFriends.forEach((p) => (friendMap[p.userID] = p));
      const entries = Object.entries(overview).filter(([, v]) => v.lastAt);
      const dms = await Promise.all(
        entries.map(async ([otherId, v]) => {
          let profile = friendMap[otherId];
          if (!profile) profile = await getUser(otherId);
          return {
            otherId,
            name: profile?.nickName || profile?.name || "Kullanıcı",
            photo: profile?.photoURL || "/defaults/avatars/1.png",
            fromMe: v.lastSenderId === userData.userID,
            ...v,
          };
        })
      );
      dms.sort((a, b) => new Date(b.lastAt || 0) - new Date(a.lastAt || 0));
      setDmList(dms.slice(0, 20));
      setLoading(false);
    };
    load();
  }, [currentUser, userData]);

  // Aktif ses kanalları — her sunucunun doluluğunu socket üzerinden izle.
  // (Ana sayfada VoiceContext bir sunucu izlemediği için çakışma olmaz.)
  useEffect(() => {
    if (servers.length === 0) return;
    const ids = servers.map((s) => s.id);
    const onState = ({ serverId, state }) => {
      setServerVoice((prev) => ({ ...prev, [serverId]: state }));
    };
    socket.on("voice:state", onState);
    if (!socket.connected) socket.connect();
    ids.forEach((id) => socket.emit("voice:watch", { serverId: id }));
    return () => {
      socket.off("voice:state", onState);
      ids.forEach((id) => socket.emit("voice:unwatch", { serverId: id }));
    };
  }, [servers]);

  const handleStatusChange = useCallback(
    async (s) => {
      setMyStatus(s);
      if (userData?.userID) {
        await updateUserStatus(userData.userID, s);
        refreshUserData && refreshUserData();
      }
    },
    [userData?.userID, refreshUserData]
  );

  const copyFriendshipID = () => {
    if (!userData?.friendshipID) return;
    navigator.clipboard?.writeText(userData.friendshipID);
    toast.success("Arkadaşlık kodu kopyalandı");
  };

  const onlineFriends = friends.filter((f) => f.status !== "offline");
  const unreadDms = dmList.filter((d) => d.unread > 0);
  const totalUnread = unreadDms.reduce((n, d) => n + d.unread, 0);
  const avatar = userData?.photoURL || "/defaults/avatars/1.png";

  // Aktif ses kanallarını düz listeye çevir
  const serverNameMap = {};
  servers.forEach((s) => (serverNameMap[s.id] = s.name));
  const activeVoice = [];
  Object.entries(serverVoice).forEach(([sid, state]) => {
    Object.entries(state || {}).forEach(([cid, users]) => {
      if (!users || users.length === 0) return;
      activeVoice.push({
        serverId: sid,
        channelId: cid,
        channelName: voiceChanMap[cid]?.name || "Ses Kanalı",
        serverName: serverNameMap[sid] || "Sunucu",
        users,
      });
    });
  });

  return (
    <div
      className="fixed top-0 left-16 right-0 h-screen overflow-y-auto bg-[var(--secondary-bg)] text-left"
      style={{
        backgroundImage: `url(${backgroundTile})`,
        backgroundSize: "7vw 7vw",
        backgroundRepeat: "repeat",
        backgroundPosition: "center",
      }}
    >
      <div className="max-w-6xl mx-auto px-6 sm:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ================= ANA SÜTUN ================= */}
          <div className="lg:col-span-2 space-y-8">
            {/* Hero */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-5 rounded-2xl ${GLASS}`}
            >
              <p className="text-xs font-medium text-[var(--primary-text)]">{greetingForHour()},</p>
              <h1 className="text-2xl font-bold text-[var(--secondary-text)]">
                {userData?.nickName || "gezgin"} 👋
              </h1>
              <div className="flex flex-wrap gap-2 mt-4">
                <StatChip value={servers.length} label="Sunucu" />
                <StatChip value={friends.length} label="Arkadaş" />
                <StatChip value={onlineFriends.length} label="Çevrimiçi" />
                {totalUnread > 0 && <StatChip value={totalUnread} label="Okunmamış" />}
              </div>
            </motion.div>

            {/* Hızlı aksiyonlar */}
            <div className="grid grid-cols-3 gap-3">
              <QuickAction icon={<Plus size={20} />} label="Sunucu Oluştur" onClick={() => navigate("/create-server")} />
              <QuickAction icon={<UserPlus size={20} />} label="Arkadaş Ekle" onClick={() => navigate("/AddFriends")} />
              <QuickAction icon={<MessageCircle size={20} />} label="Mesajlar" onClick={() => navigate("/DirectMessaging")} />
            </div>

            {/* Okunmamış mesajlar — okunmamış DM varsa öncelikli göster */}
            {!loading && unreadDms.length > 0 && (
              <div>
                <SectionTitle action="Tümü" onAction={() => navigate("/DirectMessaging")}>
                  Okunmamış Mesajlar
                  <span className="ml-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-[var(--tertiary-bg)] text-[var(--tertiary-text)] text-[10px] font-bold normal-case">
                    {totalUnread > 9 ? "9+" : totalUnread}
                  </span>
                </SectionTitle>
                <div className="flex flex-col gap-2">
                  {unreadDms.map((dm) => (
                    <DmRow
                      key={dm.otherId}
                      dm={dm}
                      onClick={() => navigate("/DirectMessaging", { state: { userID: dm.otherId } })}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Sunucular */}
            <div>
              <SectionTitle>Sunucuların</SectionTitle>
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-pulse">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-16 rounded-xl bg-[var(--secondary-bg)]/40" />
                  ))}
                </div>
              ) : servers.length === 0 ? (
                <div className="flex flex-col items-start gap-3 p-6 rounded-xl border-2 border-dashed border-[var(--primary-border)]">
                  <p className="text-sm text-[var(--primary-text)]">Henüz bir sunucuda değilsin.</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate("/create-server")}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--tertiary-bg)] text-[var(--tertiary-text)] font-semibold text-sm hover:bg-[var(--quaternary-bg)] transition-colors"
                    >
                      <Plus size={16} /> Oluştur
                    </button>
                    <button
                      onClick={() => navigate("/SearchServer")}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--primary-bg)] border-2 border-[var(--primary-border)] text-[var(--secondary-text)] font-semibold text-sm hover:border-[var(--tertiary-border)] transition-colors"
                    >
                      <Compass size={16} /> Keşfet
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {servers.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => navigate(`/server/${s.id}`)}
                      className={`flex items-center gap-3 p-3 rounded-xl ${GLASS} ${GLASS_HOVER} hover:-translate-y-0.5 transition-all duration-200 cursor-pointer`}
                    >
                      <img src={s.photo} alt="" className="w-11 h-11 rounded-2xl object-cover" />
                      <span className="font-semibold text-[var(--secondary-text)] truncate">{s.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Arkadaşlar */}
            <div>
              <SectionTitle>
                Arkadaşların{onlineFriends.length > 0 && <span className="ml-2 text-[var(--tertiary-bg)] normal-case">· {onlineFriends.length} çevrimiçi</span>}
              </SectionTitle>
              {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 animate-pulse">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-16 rounded-xl bg-[var(--secondary-bg)]/40" />
                  ))}
                </div>
              ) : friends.length === 0 ? (
                <div className="flex flex-col items-start gap-3 p-6 rounded-xl border-2 border-dashed border-[var(--primary-border)]">
                  <p className="text-sm text-[var(--primary-text)]">Henüz arkadaşın yok.</p>
                  <button
                    onClick={() => navigate("/AddFriends")}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--tertiary-bg)] text-[var(--tertiary-text)] font-semibold text-sm hover:bg-[var(--quaternary-bg)] transition-colors"
                  >
                    <UserPlus size={16} /> Arkadaş Ekle
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {friends.map((f) => (
                    <div
                      key={f.userID}
                      onClick={() => navigate("/DirectMessaging", { state: { userID: f.userID } })}
                      className={`flex items-center gap-3 p-3 rounded-xl ${GLASS} ${GLASS_HOVER} hover:-translate-y-0.5 transition-all duration-200 cursor-pointer`}
                    >
                      <div className="relative shrink-0">
                        <img src={f.photoURL} alt="" className="w-10 h-10 rounded-full object-cover" />
                        <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[var(--secondary-bg)] ${statusColor(f.status)}`} />
                      </div>
                      <span className="font-medium text-[var(--secondary-text)] truncate">{f.nickName}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => navigate("/Profile")}
              className="flex items-center gap-2 text-[var(--primary-text)] text-sm hover:text-[var(--quaternary-text)] transition-colors"
            >
              <Hash size={14} /> Profilini görüntüle ve düzenle →
            </button>
          </div>

          {/* ================= SAĞ RAIL ================= */}
          <aside className="space-y-5 lg:sticky lg:top-0 self-start">
            {/* Mini profil */}
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`relative z-30 p-4 rounded-2xl ${GLASS}`}
            >
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <img src={avatar} alt="" className="w-12 h-12 rounded-2xl object-cover border-2 border-[var(--tertiary-border)]" />
                  <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[var(--secondary-bg)] ${statusColor(myStatus)}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[var(--secondary-text)] truncate">{userData?.nickName || "gezgin"}</p>
                  {userData?.friendshipID && (
                    <button
                      onClick={copyFriendshipID}
                      className="flex items-center gap-1 text-[11px] text-[var(--primary-text)] hover:text-[var(--tertiary-bg)] transition-colors"
                      title="Arkadaşlık kodunu kopyala"
                    >
                      <Hash size={11} />
                      <span className="truncate">{userData.friendshipID}</span>
                      <Copy size={11} />
                    </button>
                  )}
                </div>
              </div>
              <div className="mt-3">
                <StatusSelector status={myStatus} onChange={handleStatusChange} />
              </div>
            </motion.div>

            {/* Aktif ses kanalları */}
            {activeVoice.length > 0 && (
              <div className={`p-3 rounded-2xl ${GLASS}`}>
                <RailTitle>
                  <Volume2 size={13} className="text-green-400" /> Aktif Ses Kanalları
                </RailTitle>
                <div className="flex flex-col gap-2">
                  {activeVoice.map((vc) => (
                    <div
                      key={vc.channelId}
                      onClick={() => navigate(`/server/${vc.serverId}`)}
                      className="flex items-center gap-2 p-2 rounded-xl bg-[var(--secondary-bg)] border border-[var(--primary-border)] hover:border-green-400/40 hover:bg-[var(--primary-bg)] transition-all cursor-pointer"
                    >
                      <Volume2 size={16} className="text-green-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[var(--secondary-text)] truncate">{vc.channelName}</p>
                        <p className="text-[10px] text-[var(--primary-text)] truncate">{vc.serverName}</p>
                      </div>
                      <div className="flex items-center -space-x-2 shrink-0">
                        {vc.users.slice(0, 3).map((u) => (
                          <img
                            key={u.socketId}
                            src="/defaults/avatars/1.png"
                            alt=""
                            title={u.nickName}
                            className="w-6 h-6 rounded-full object-cover border-2 border-[var(--secondary-bg)]"
                          />
                        ))}
                        {vc.users.length > 3 && (
                          <span className="w-6 h-6 rounded-full bg-[var(--secondary-bg)] border-2 border-[var(--secondary-bg)] flex items-center justify-center text-[9px] font-bold text-[var(--secondary-text)]">
                            +{vc.users.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Çevrimiçi arkadaşlar */}
            <div className={`p-3 rounded-2xl ${GLASS}`}>
              <RailTitle>
                <span className="w-2 h-2 rounded-full bg-green-500" /> Çevrimiçi — {onlineFriends.length}
              </RailTitle>
              {loading ? (
                <div className="flex flex-col gap-2 animate-pulse">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-10 rounded-lg bg-[var(--secondary-bg)]/40" />
                  ))}
                </div>
              ) : onlineFriends.length === 0 ? (
                <p className="px-1 py-2 text-xs text-[var(--primary-text)]">Şu an kimse çevrimiçi değil.</p>
              ) : (
                <div className="flex flex-col gap-1">
                  {onlineFriends.slice(0, 8).map((f) => (
                    <div
                      key={f.userID}
                      className="group flex items-center gap-2 p-1.5 rounded-lg hover:bg-[var(--secondary-bg)] transition-colors"
                    >
                      <div className="relative shrink-0">
                        <img src={f.photoURL} alt="" className="w-8 h-8 rounded-full object-cover" />
                        <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[var(--secondary-bg)] ${statusColor(f.status)}`} />
                      </div>
                      <span className="flex-1 text-sm font-medium text-[var(--secondary-text)] truncate">{f.nickName}</span>
                      <button
                        onClick={() => navigate("/DirectMessaging", { state: { userID: f.userID } })}
                        className="flex items-center justify-center w-7 h-7 rounded-lg bg-[var(--secondary-bg)] border border-[var(--primary-border)] text-[var(--tertiary-border)] opacity-0 group-hover:opacity-100 hover:bg-[var(--tertiary-bg)] hover:text-[var(--tertiary-text)] transition-all"
                        title="Sohbet başlat"
                      >
                        <MessageCircle size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
