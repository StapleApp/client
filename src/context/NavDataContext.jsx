import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "./AuthContext";
import { listenNotifications } from "../services/notificationService";
import { getServersList } from "../services/serverService";
import icon from "../assets/branding/staple-icon.svg";

/**
 * Sol navigasyon çubuğunun ihtiyaç duyduğu paylaşılan verileri tek noktadan sağlar:
 *  - Canlı bildirimler (tek abonelik; NotificationsBell + rozetler ortak kullanır)
 *  - Kullanıcının katıldığı sunucular (Navigator'daki ikon listesi için)
 *  - Sunucu/kişi başına okunmamış bildirim sayaçları (kırmızı rozetler için)
 *
 * Böylece hem çift realtime abonelik hem de mükerrer sunucu isteği önlenir.
 */
const NavDataContext = createContext(null);

export const NavDataProvider = ({ children }) => {
  const { currentUser, userData } = useAuth();
  const uid = userData?.userID;

  const [notifications, setNotifications] = useState([]);
  const [servers, setServers] = useState([]);

  // Bildirimleri canlı dinle (tek abonelik).
  useEffect(() => {
    if (!uid) {
      setNotifications([]);
      return;
    }
    const unsub = listenNotifications(uid, setNotifications);
    return () => unsub && unsub();
  }, [uid]);

  // Katılınan sunucuları çek.
  useEffect(() => {
    if (!currentUser?.uid) {
      setServers([]);
      return;
    }
    let alive = true;
    getServersList(currentUser.uid).then((list) => {
      if (!alive) return;
      setServers(
        (list || []).map((s) => ({
          id: s.ServerId,
          name: s.ServerName,
          photo: s.ServerPhotoURL || icon,
        }))
      );
    });
    return () => {
      alive = false;
    };
  }, [currentUser?.uid]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  // Sunucu başına okunmamış bildirim (reply/mention → data.serverId taşır).
  const serverUnread = useMemo(() => {
    const map = {};
    notifications.forEach((n) => {
      if (!n.read && n.serverId) {
        map[n.serverId] = (map[n.serverId] || 0) + 1;
      }
    });
    return map;
  }, [notifications]);

  // Kişi başına okunmamış DM bildirimi (message → fromUid, gruplanmışsa count).
  const userUnread = useMemo(() => {
    const map = {};
    notifications.forEach((n) => {
      if (!n.read && n.type === "message" && n.fromUid) {
        map[n.fromUid] = (map[n.fromUid] || 0) + (n.count || 1);
      }
    });
    return map;
  }, [notifications]);

  const value = useMemo(
    () => ({
      notifications,
      setNotifications,
      unreadCount,
      serverUnread,
      userUnread,
      servers,
    }),
    [notifications, unreadCount, serverUnread, userUnread, servers]
  );

  return (
    <NavDataContext.Provider value={value}>{children}</NavDataContext.Provider>
  );
};

export const useNavData = () => {
  const ctx = useContext(NavDataContext);
  if (!ctx) {
    throw new Error("useNavData must be used within NavDataProvider");
  }
  return ctx;
};
