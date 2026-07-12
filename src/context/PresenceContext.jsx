import { createContext, useContext, useEffect, useRef, useState } from "react";
import { socket } from "../config/socket";
import { useAuth } from "./AuthContext";
import { resolveStatus } from "../services/userService";

// Gerçek zamanlı çevrimiçilik: uygulama açıkken Render socket sunucusuyla
// bağlantı açık tutulur. Sunucu, kullanıcının hiç socket'i kalmayınca onu
// çevrimdışı sayar ve herkese yayınlar. Socket sunucusuna ulaşılamıyorsa
// (ör. Render free tier uykuda) last_seen tabanlı eski yönteme düşülür.
const PresenceContext = createContext(null);

export const PresenceProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const uid = currentUser?.uid;

  const [onlineIds, setOnlineIds] = useState(() => new Set());
  const [presenceActive, setPresenceActive] = useState(false); // socket canlı mı
  const uidRef = useRef(uid);
  uidRef.current = uid;

  useEffect(() => {
    if (!uid) return;

    const announce = () => socket.emit("presence:online", { userId: uidRef.current });

    const onConnect = () => {
      setPresenceActive(true);
      announce(); // (yeniden) bağlanınca kimliği bildir → snapshot gelir
    };
    const onDisconnect = () => {
      setPresenceActive(false);
      setOnlineIds(new Set());
    };
    const onSnapshot = ({ userIds }) => {
      setPresenceActive(true);
      setOnlineIds(new Set(userIds || []));
    };
    const onDiff = ({ userId, online }) => {
      setOnlineIds((prev) => {
        const next = new Set(prev);
        if (online) next.add(userId);
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
      setOnlineIds(new Set());
    };
  }, [uid]);

  // Gösterilecek durum: socket presence canlıysa gerçek zamanlı bilgi,
  // değilse last_seen tabanlı eski çözüm (fallback).
  const liveStatus = (userId, status, lastSeen) => {
    if (presenceActive) {
      if (!onlineIds.has(userId)) return "offline";
      return status === "offline" ? "offline" : status || "online";
    }
    return resolveStatus(status, lastSeen);
  };

  const isOnline = (userId) => presenceActive && onlineIds.has(userId);

  return (
    <PresenceContext.Provider value={{ presenceActive, onlineIds, isOnline, liveStatus }}>
      {children}
    </PresenceContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const usePresence = () => useContext(PresenceContext);
