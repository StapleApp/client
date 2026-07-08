import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { IoMdCheckmark, IoMdClose, IoMdNotifications, IoMdMail, IoMdPerson, IoMdTrash } from "react-icons/io";
import { useAuth } from "../../context/AuthContext";
import {
  listenNotifications,
  markAsRead,
  updateNotification,
  deleteNotification,
  markAllAsRead,
  deleteAllNotifications,
} from "../../services/notificationService";
import { acceptFriendRequest } from "../../services/friendService";

const NotificationsPage = () => {
  const { userData } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [filteredNotifications, setFilteredNotifications] = useState([]);
  const [filterType, setFilterType] = useState("all");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userData?.userID) return;
    setIsLoading(true);
    const unsubscribe = listenNotifications(userData.userID, (data) => {
      setNotifications(data);
      setIsLoading(false);
    });
    return () => unsubscribe && unsubscribe();
  }, [userData?.userID]);

  useEffect(() => {
    if (filterType === "all") {
      setFilteredNotifications(notifications);
    } else {
      setFilteredNotifications(
        notifications.filter((notification) => notification.type === filterType)
      );
    }
  }, [filterType, notifications]);

  const handleFriendRequest = async (notificationId, accepted) => {
    if (!userData?.userID) return;
    const notification = notifications.find((n) => n.id === notificationId);

    // Kabul edilirse iki yönlü arkadaşlığı şimdi kur.
    // (Eski bildirimlerde fromUid olmayabilir — o durumda sadece işaretle.)
    if (accepted && notification?.fromUid) {
      await acceptFriendRequest(userData.userID, notification.fromUid);
    }

    await updateNotification(userData.userID, notificationId, {
      read: true,
      responded: true,
      accepted,
    });
  };

  const handleMarkRead = async (notificationId) => {
    if (!userData?.userID) return;
    await markAsRead(userData.userID, notificationId);
  };

  const handleDelete = async (notificationId) => {
    if (!userData?.userID) return;
    await deleteNotification(userData.userID, notificationId);
  };

  const handleMarkAllRead = async () => {
    if (!userData?.userID) return;
    await markAllAsRead(userData.userID);
  };

  const handleDeleteAll = async () => {
    if (!userData?.userID) return;
    await deleteAllNotifications(userData.userID, filterType);
  };

  const formatTime = (createdAt) => {
    if (!createdAt?.seconds) return "Az önce";
    const date = new Date(createdAt.seconds * 1000);
    return date.toLocaleDateString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderNotification = (notification) => {
    const bgColor = notification.read ? "bg-[var(--primary-bg)]" : "bg-[var(--secondary-bg)]";
    const borderColor = notification.read ? "border-[var(--secondary-border)]" : "border-[var(--tertiary-border)]";

    switch (notification.type) {
      case "friend":
        return (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`p-4 rounded-lg border-2 ${bgColor} ${borderColor} mb-3 hover:border-[var(--tertiary-border)] relative`}
            onClick={() => handleMarkRead(notification.id)}
          >
            <div className="flex items-start mb-2">
              <div className="w-10 h-10 rounded-full bg-[var(--tertiary-bg)] mr-3 flex items-center justify-center text-[var(--tertiary-text)]">
                <IoMdPerson size={20} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold">{notification.user}</h3>
                <p className="text-sm text-[var(--primary-text)]">{notification.message || "Size arkadaşlık isteği gönderdi"}</p>
                <p className="text-xs text-[var(--primary-text)] opacity-70">{formatTime(notification.createdAt)}</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(notification.id);
                }}
                className="p-2 text-[var(--primary-text)] hover:text-[var(--tertiary-text)] rounded-full transition-colors"
                aria-label="Bildirimi sil"
              >
                <IoMdTrash size={18} />
              </button>
            </div>
            {!notification.responded && (
              <div className="flex space-x-2 mt-2 ml-12">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFriendRequest(notification.id, true);
                  }}
                  className="px-3 py-1 bg-[var(--tertiary-bg)] text-[var(--tertiary-text)] rounded-md hover:bg-[var(--quaternary-bg)] flex items-center animate-none"
                >
                  <IoMdCheckmark size={16} className="mr-1" /> Kabul Et
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFriendRequest(notification.id, false);
                  }}
                  className="px-3 py-1 bg-[var(--primary-bg)] text-[var(--secondary-text)] rounded-md border border-[var(--secondary-border)] hover:border-[var(--tertiary-border)] flex items-center"
                >
                  <IoMdClose size={16} className="mr-1" /> Reddet
                </button>
              </div>
            )}
            {notification.responded && (
              <div className="ml-12">
                <span className="text-xs bg-[var(--secondary-bg)] text-[var(--secondary-text)] px-2 py-1 rounded-full">
                  {notification.accepted ? 'Kabul edildi' : 'Reddedildi'}
                </span>
              </div>
            )}
          </motion.div>
        );

      case "message":
        return (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`p-4 rounded-lg border-2 ${bgColor} ${borderColor} mb-3 hover:border-[var(--tertiary-border)] relative`}
            onClick={() => handleMarkRead(notification.id)}
          >
            <div className="flex items-start">
              <div className="w-10 h-10 rounded-full bg-[var(--tertiary-bg)] mr-3 flex items-center justify-center text-[var(--tertiary-text)]">
                <IoMdMail size={20} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold">{notification.user}</h3>
                <p className="text-sm text-[var(--primary-text)]">{notification.message}</p>
                <p className="text-xs text-[var(--primary-text)] opacity-70">{formatTime(notification.createdAt)}</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(notification.id);
                }}
                className="p-2 text-[var(--primary-text)] hover:text-[var(--tertiary-text)] rounded-full transition-colors"
                aria-label="Bildirimi sil"
              >
                <IoMdTrash size={18} />
              </button>
            </div>
          </motion.div>
        );

      case "app":
        return (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`p-4 rounded-lg border-2 ${bgColor} ${borderColor} mb-3 hover:border-[var(--tertiary-border)] relative`}
            onClick={() => handleMarkRead(notification.id)}
          >
            <div className="flex items-start">
              <div className="w-10 h-10 rounded-full bg-[var(--tertiary-bg)] mr-3 flex items-center justify-center text-[var(--tertiary-text)]">
                <IoMdNotifications size={20} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold">{notification.title}</h3>
                <p className="text-sm text-[var(--primary-text)]">{notification.message}</p>
                <p className="text-xs text-[var(--primary-text)] opacity-70">{formatTime(notification.createdAt)}</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(notification.id);
                }}
                className="p-2 text-[var(--primary-text)] hover:text-[var(--tertiary-text)] rounded-full transition-colors"
                aria-label="Bildirimi sil"
              >
                <IoMdTrash size={18} />
              </button>
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 100 }}
      transition={{ duration: 0.1 }}
      className="background fixed top-0 left-0 w-full h-screen bg-[var(--secondary-bg)] text-[var(--secondary-text)] overflow-y-auto"
      style={{ paddingLeft: "80px" }}
    >
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6 text-center">Bildirimler</h1>

        <div className="flex justify-center mb-6">
          <button
            onClick={() => setFilterType("all")}
            className={`px-4 py-2 rounded-l-lg ${filterType === "all" ?
              "bg-[var(--tertiary-bg)] text-[var(--tertiary-text)]" :
              "bg-[var(--primary-bg)] text-[var(--secondary-text)]"}`}
          >
            Tümü
          </button>
          <button
            onClick={() => setFilterType("friend")}
            className={`px-4 py-2 ${filterType === "friend" ?
              "bg-[var(--tertiary-bg)] text-[var(--tertiary-text)]" :
              "bg-[var(--primary-bg)] text-[var(--secondary-text)]"}`}
          >
            Arkadaşlık
          </button>
          <button
            onClick={() => setFilterType("message")}
            className={`px-4 py-2 ${filterType === "message" ?
              "bg-[var(--tertiary-bg)] text-[var(--tertiary-text)]" :
              "bg-[var(--primary-bg)] text-[var(--secondary-text)]"}`}
          >
            Mesajlar
          </button>
          <button
            onClick={() => setFilterType("app")}
            className={`px-4 py-2 rounded-r-lg ${filterType === "app" ?
              "bg-[var(--tertiary-bg)] text-[var(--tertiary-text)]" :
              "bg-[var(--primary-bg)] text-[var(--secondary-text)]"}`}
          >
            Uygulama
          </button>
        </div>

        <div className="mt-6 max-w-2xl mx-auto">
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <svg className="animate-spin h-8 w-8 text-[var(--tertiary-text)]" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          ) : filteredNotifications.length > 0 ? (
            <>
              {filteredNotifications.map((notification) => renderNotification(notification))}
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                exit={{ height: 0 }}
                className="w-full"
              ></motion.div>
            </>
          ) : (
            <div className="text-center py-10">
              <div className="w-16 h-16 mx-auto bg-[var(--secondary-bg)] rounded-full flex items-center justify-center mb-4">
                <IoMdNotifications size={30} className="text-[var(--primary-text)]" />
              </div>
              <p className="text-[var(--primary-text)]">
                {filterType === "all"
                  ? "Hiç bildiriminiz yok"
                  : filterType === "friend"
                    ? "Hiç arkadaşlık bildirimi yok"
                    : filterType === "message"
                      ? "Hiç mesaj bildirimi yok"
                      : "Hiç uygulama bildirimi yok"}
              </p>
            </div>
          )}
        </div>

        {filteredNotifications.length > 0 && (
          <div className="mt-6 text-center flex justify-center gap-4">
            <button
              onClick={handleMarkAllRead}
              className="bg-[var(--primary-bg)] text-[var(--secondary-text)] px-4 py-2 rounded-lg border border-[var(--secondary-border)] hover:border-[var(--tertiary-border)]"
            >
              Tümünü Okundu İşaretle
            </button>
            <button
              onClick={handleDeleteAll}
              className="bg-[var(--primary-bg)] text-[var(--secondary-text)] px-4 py-2 rounded-lg border border-[var(--secondary-border)] hover:border-[var(--tertiary-border)] hover:text-[var(--tertiary-text)] flex items-center"
            >
              <IoMdTrash size={16} className="mr-1" /> {filterType === "all" ? "Tümünü Sil" : "Seçili Bildirimleri Sil"}
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default NotificationsPage;
