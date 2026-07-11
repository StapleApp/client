import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IoMdNotifications } from "react-icons/io";
import { UserPlus, Mail, Bell, Trash2, Check, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { acceptFriendRequest } from "../../services/friendService";
import {
  listenNotifications,
  markAsRead,
  updateNotification,
  deleteNotification,
} from "../../services/notificationService";

const relTime = (iso) => {
  if (!iso) return "";
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "şimdi";
  if (m < 60) return `${m} dk önce`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} sa önce`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} gün önce`;
  return new Date(iso).toLocaleDateString("tr-TR");
};

const NotificationsBell = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const ref = useRef(null);

  const uid = userData?.userID;

  // Realtime listen notifications
  useEffect(() => {
    if (!uid) return;
    const unsub = listenNotifications(uid, (data) => {
      setNotifications(data);
    });
    return () => unsub && unsub();
  }, [uid]);

  // Click outside / Esc close
  useEffect(() => {
    const onDoc = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const handleFriendRequest = async (notificationId, accepted) => {
    if (!uid) return;
    const notification = notifications.find((n) => n.id === notificationId);
    if (accepted && notification?.fromUid) {
      await acceptFriendRequest(uid, notification.fromUid);
    }
    await updateNotification(uid, notificationId, {
      read: true,
      responded: true,
      accepted,
    });
  };

  const handleMarkRead = async (notificationId) => {
    if (!uid) return;
    await markAsRead(uid, notificationId);
  };

  const handleDelete = async (notificationId) => {
    if (!uid) return;
    await deleteNotification(uid, notificationId);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getNotificationTime = (item) => {
    if (!item.createdAt?.seconds) return "";
    return relTime(new Date(item.createdAt.seconds * 1000).toISOString());
  };

  return (
    <div className="relative" ref={ref}>
      <div className="icon group" onClick={() => setOpen(!open)}>
        <IoMdNotifications size="25" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-2 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold leading-none border-2 border-[var(--primary-bg)]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
        <span className="sidebar-tooltip group-hover:scale-100">Bildirimler</span>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, x: -8, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -8, scale: 0.98 }}
            transition={{ duration: 0.14 }}
            className="absolute left-full top-0 ml-3 w-[320px] max-w-[80vw] z-[60] rounded-xl overflow-hidden bg-[var(--secondary-bg)] border-2 border-[var(--primary-border)] shadow-xl"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b-2 border-[var(--primary-border)]">
              <span className="text-sm font-bold text-[var(--secondary-text)]">Bildirimler</span>
              {unreadCount > 0 && (
                <span className="min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">
                  {unreadCount}
                </span>
              )}
            </div>

            <div className="max-h-[70vh] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-[var(--primary-text)]">
                  <Bell size={26} className="opacity-40" />
                  <p className="text-sm">Bildirim bulunmuyor</p>
                </div>
              ) : (
                notifications.map((item) => (
                  <div
                    key={item.id}
                    onClick={async () => {
                      await handleMarkRead(item.id);
                      if (item.type === "friend") {
                        navigate("/AddFriends");
                      } else if (item.type === "message" && item.fromUid) {
                        navigate("/DirectMessaging", { state: { userID: item.fromUid } });
                      }
                      setOpen(false);
                    }}
                    className={`flex items-start gap-3 px-4 py-3 border-b border-[var(--primary-border)] cursor-pointer bg-[var(--primary-bg)] hover:bg-[var(--secondary-bg)] transition-colors relative ${
                      !item.read ? "border-l-2 border-red-500" : ""
                    }`}
                  >
                    <div className="relative shrink-0 mt-0.5">
                      <img src={item.photo || "/defaults/avatars/1.png"} alt="" className="w-9 h-9 rounded-full object-cover" />
                      <span className="absolute -bottom-1 -right-1 w-4.5 h-4.5 flex items-center justify-center rounded-full bg-[var(--tertiary-bg)] text-[var(--tertiary-text)] border-2 border-[var(--primary-bg)]">
                        {item.type === "friend" ? <UserPlus size={9} /> : <Mail size={9} />}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-sm font-semibold text-[var(--secondary-text)] truncate">
                            {item.user || "Kullanıcı"}
                          </span>
                          {!item.read && (
                            <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                          )}
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(item.id);
                          }}
                          className="p-1 text-[var(--primary-text)] hover:text-red-500 rounded-full transition-colors shrink-0"
                          title="Bildirimi sil"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <p className="text-xs text-[var(--primary-text)] break-words mt-0.5">
                        {item.type === "friend"
                          ? (item.message || "Size arkadaşlık isteği gönderdi")
                          : (item.message || "Yeni bir mesaj gönderdi")
                        }
                      </p>

                      {/* Friend request accept/reject actions inside the notification panel */}
                      {item.type === "friend" && !item.responded && (
                        <div className="flex gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleFriendRequest(item.id, true)}
                            className="px-2 py-1 bg-[var(--tertiary-bg)] text-[var(--tertiary-text)] text-[10px] font-bold rounded-md hover:bg-[var(--quaternary-bg)] flex items-center gap-1"
                          >
                            <Check size={12} /> Kabul Et
                          </button>
                          <button
                            onClick={() => handleFriendRequest(item.id, false)}
                            className="px-2 py-1 bg-[var(--primary-bg)] text-[var(--secondary-text)] text-[10px] font-bold rounded-md border border-[var(--secondary-border)] hover:border-[var(--tertiary-border)] flex items-center gap-1"
                          >
                            <X size={12} /> Reddet
                          </button>
                        </div>
                      )}

                      {item.type === "friend" && item.responded && (
                        <div className="mt-1.5">
                          <span className="text-[10px] bg-[var(--secondary-bg)] text-[var(--secondary-text)] px-2 py-0.5 rounded-full border border-[var(--primary-border)]">
                            {item.accepted ? 'Kabul edildi' : 'Reddedildi'}
                          </span>
                        </div>
                      )}

                      <p className="text-[10px] text-[var(--primary-text)] opacity-70 mt-1">
                        {getNotificationTime(item)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationsBell;
