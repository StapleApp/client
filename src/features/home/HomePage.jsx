import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  UserPlus,
  MessageCircle,
  Bell,
  Compass,
  Hash,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getServersList } from "../../services/serverService";
import { getFriendsList } from "../../services/friendService";
import { getUser } from "../../services/userService";
import { listenNotifications } from "../../services/notificationService";
import SocialBar from "../../Components/layout/SocialBar";
import icon from "../../assets/360.png";
import backgroundTile from "../../assets/background_tile.png";

const statusColor = (status) => {
  switch (status) {
    case "online": return "bg-green-500";
    case "sleeping": return "bg-blue-500";
    case "dnd": return "bg-red-500";
    default: return "bg-gray-500";
  }
};

const QuickAction = ({ icon, label, onClick, badge = 0 }) => (
  <button
    onClick={onClick}
    className="relative flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--primary-bg)] border-2 border-[var(--primary-border)] hover:border-[var(--tertiary-border)] hover:scale-[1.02] transition-all duration-200 text-left"
  >
    <span className="text-[var(--tertiary-border)]">{icon}</span>
    <span className="text-sm font-semibold text-[var(--secondary-text)]">{label}</span>
    {badge > 0 && (
      <span className="absolute -top-2 -right-2 min-w-[20px] h-5 px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[11px] font-bold border-2 border-[var(--secondary-bg)]">
        {badge > 9 ? "9+" : badge}
      </span>
    )}
  </button>
);

const SectionTitle = ({ children }) => (
  <h2 className="text-xs font-bold uppercase tracking-wide text-[var(--primary-text)] mb-3">
    {children}
  </h2>
);

const HomePage = () => {
  const navigate = useNavigate();
  const { userData, currentUser } = useAuth();

  const [servers, setServers] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      if (!currentUser?.uid || !userData?.userID) return;
      setLoading(true);
      const [serverList, friendList] = await Promise.all([
        getServersList(currentUser.uid),
        getFriendsList(userData.userID),
      ]);
      const friendProfiles = await Promise.all(
        friendList.map((f) => getUser(f.uid))
      );
      setServers(
        serverList.map((s) => ({
          id: s.ServerId,
          name: s.ServerName,
          photo: s.ServerPhotoURL || icon,
        }))
      );
      setFriends(
        friendProfiles.filter(Boolean).map((p) => ({
          userID: p.userID,
          nickName: p.nickName || p.name || "Kullanıcı",
          photoURL: p.photoURL || "/1.png",
          status: p.status || "offline",
        }))
      );
      setLoading(false);
    };
    load();
  }, [currentUser, userData]);

  // Bekleyen arkadaşlık istekleri (okunmamış "friend" bildirimleri)
  useEffect(() => {
    if (!userData?.userID) return;
    const unsub = listenNotifications(userData.userID, (list) => {
      setPendingCount(list.filter((n) => !n.read && n.type === "friend").length);
    });
    return () => unsub && unsub();
  }, [userData?.userID]);

  const greeting = `Merhaba, ${userData?.nickName || "gezgin"} 👋`;

  return (
    <>
      <div
        className="fixed top-0 left-16 right-56 h-screen overflow-y-auto bg-[var(--primary-bg)] text-left"
        style={{
          backgroundImage: `url(${backgroundTile})`,
          backgroundSize: "7vw 7vw",
          backgroundRepeat: "repeat",
          backgroundPosition: "center",
        }}
      >
        <div className="max-w-4xl mx-auto px-8 py-10">
          {/* Başlık */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-2xl font-bold text-[var(--secondary-text)]">{greeting}</h1>
            <p className="text-sm text-[var(--primary-text)] mt-1">
              Bugün ne yapmak istersin?
            </p>
          </motion.div>

          {/* Hızlı aksiyonlar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
            <QuickAction icon={<Plus size={20} />} label="Sunucu Oluştur" onClick={() => navigate("/create-server")} />
            <QuickAction icon={<UserPlus size={20} />} label="Arkadaş Ekle" onClick={() => navigate("/AddFriends")} />
            <QuickAction icon={<MessageCircle size={20} />} label="Mesajlar" onClick={() => navigate("/DirectMessaging")} />
            <QuickAction icon={<Bell size={20} />} label="Bildirimler" onClick={() => navigate("/Notifications")} badge={pendingCount} />
          </div>

          {/* Sunucular */}
          <div className="mb-10">
            <SectionTitle>Sunucuların</SectionTitle>
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-pulse">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-16 rounded-xl bg-[var(--primary-bg)]" />
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
                    className="flex items-center gap-3 p-3 rounded-xl bg-[var(--primary-bg)] border-2 border-[var(--primary-border)] hover:border-[var(--tertiary-border)] hover:scale-[1.02] transition-all duration-200 cursor-pointer"
                  >
                    <img src={s.photo} alt="" className="w-11 h-11 rounded-full object-cover" />
                    <span className="font-semibold text-[var(--secondary-text)] truncate">{s.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Arkadaşlar — hızlı DM */}
          <div>
            <SectionTitle>Arkadaşların</SectionTitle>
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 animate-pulse">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-16 rounded-xl bg-[var(--primary-bg)]" />
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
                    className="flex items-center gap-3 p-3 rounded-xl bg-[var(--primary-bg)] border-2 border-[var(--primary-border)] hover:border-[var(--tertiary-border)] hover:scale-[1.02] transition-all duration-200 cursor-pointer"
                  >
                    <div className="relative shrink-0">
                      <img src={f.photoURL} alt="" className="w-10 h-10 rounded-full object-cover" />
                      <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[var(--primary-bg)] ${statusColor(f.status)}`} />
                    </div>
                    <span className="font-medium text-[var(--secondary-text)] truncate">{f.nickName}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="h-8" />
          <button
            onClick={() => navigate("/Profile")}
            className="flex items-center gap-2 text-[var(--primary-text)] text-sm hover:text-[var(--quaternary-text)] transition-colors"
          >
            <Hash size={14} /> Profilini görüntüle ve düzenle →
          </button>
        </div>
      </div>

      <SocialBar defaultTab="servers" />
    </>
  );
};

export default HomePage;
