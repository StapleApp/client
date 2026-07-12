import { createContext, useContext, useEffect, useRef, useState } from "react";
import { socket } from "../config/socket";
import { useAuth } from "./AuthContext";
import { resolveStatus } from "../services/userService";

// Gerçek zamanlı çevrimiçilik: uygulama açıkken Render socket sunucusuyla
// bağlantı açık tutulur. Sunucu hem çevrimiçi/çevrimdışı geçişlerini hem de
// durum tercihi (uyuyor/dnd) değişikliklerini anında herkese yayınlar.
// Socket sunucusuna ulaşılamıyorsa (ör. Render free tier uykuda) last_seen
// tabanlı eski yönteme düşülür.
const PresenceContext = createContext(null);

export const PresenceProvider = ({ children }) => {
  const { currentUser, userData } = useAuth();
  const uid = currentUser?.uid;

  // userId -> durum tercihi ("online" | "sleeping" | "dnd" | "offline")
  const [onlineMap, setOnlineMap] = useState(() => new Map());
  const [presenceActive, setPresenceActive] = useState(false); // socket canlı mı
  const uidRef = useRef(uid);
  uidRef.current = uid;
  const statusRef = useRef(userData?.status);
  statusRef.current = userData?.status;

  useEffect(() => {
    if (!uid) return;

    const announce = () =>
      socket.emit("presence:online", {
        userId: uidRef.current,
        status: statusRef.current || "online",
      });

    const onConnect = () => {
      setPresenceActive(true);
      announce(); // (yeniden) bağlanınca kimliği bildir → snapshot gelir
    };
    const onDisconnect = () => {
      setPresenceActive(false);
      setOnlineMap(new Map());
    };
    const onSnapshot = ({ users, userIds }) => {
      setPresenceActive(true);
      const next = new Map();
      // Yeni format: [{ userId, status }] — eski format (userIds) fallback
      (users || []).forEach((u) => next.set(u.userId, u.status || "online"));
      (userIds || []).forEach((id) => !next.has(id) && next.set(id, "online"));
      setOnlineMap(next);
    };
    const onDiff = ({ userId, online, status }) => {
      setOnlineMap((prev) => {
        const next = new Map(prev);
        if (online) next.set(userId, status || next.get(userId) || "online");
        else next.delete(userId);
        return next;
      });
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("presence:snapshot", onSnapshot);
    socket.on("presence:diff", onDiff);

    if (socket.connected) onConnect();
    else socket.connect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("presence:snapshot", onSnapshot);
      socket.off("presence:diff", onDiff);
      // Oturum kapanırken çevrimdışı bildir (socket'i koparmadan — ses vs. kullanıyor olabilir)
      socket.emit("presence:offline");
      setPresenceActive(false);
      setOnlineMap(new Map());
    };
  }, [uid]);

  // Durum tercihim değişti → sunucuya yayınla (DB güncellemesinden bağımsız,
  // diğer kullanıcılar anında görsün)
  const announceStatus = (status) => {
    if (!status) return;
    statusRef.current = status;
    if (socket.connected) socket.emit("presence:status", { status });
    // Kendi haritamı da anında güncelle
    setOnlineMap((prev) => {
      if (!uidRef.current || !prev.has(uidRef.current)) return prev;
      const next = new Map(prev);
      next.set(uidRef.current, status);
      return next;
    });
  };

  // Gösterilecek durum: socket presence canlıysa gerçek zamanlı bilgi
  // (bağlantı + canlı durum tercihi), değilse last_seen fallback'i.
  const liveStatus = (userId, status, lastSeen) => {
    if (presenceActive) {
      const live = onlineMap.get(userId);
      if (!live) return "offline"; // bağlı değil
      const pref = live || status || "online";
      return pref === "offline" ? "offline" : pref; // "offline" tercihi = görünmez
    }
    return resolveStatus(status, lastSeen);
  };

  const isOnline = (userId) => presenceActive && onlineMap.has(userId);

  return (
    <PresenceContext.Provider
      value={{ presenceActive, onlineMap, isOnline, liveStatus, announceStatus }}
    >
      {children}
    </PresenceContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const usePresence = () => useContext(PresenceContext);
