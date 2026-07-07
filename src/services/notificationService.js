import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  doc,
  updateDoc,
  deleteDoc,
  getDocs,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "../config/firebase";

/**
 * Create a notification for a user.
 * Stored in Users/{uid}/Notifications subcollection.
 */
export const createNotification = async (targetUid, notification) => {
  try {
    const notifRef = collection(db, "Users", targetUid, "Notifications");
    await addDoc(notifRef, {
      ...notification,
      read: notification.read ?? false,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error creating notification:", error);
  }
};

/**
 * Listen to a user's notifications in real time (newest first).
 * @returns {Function} unsubscribe
 */
export const listenNotifications = (uid, callback) => {
  const notifRef = collection(db, "Users", uid, "Notifications");
  const q = query(notifRef, orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snapshot) => {
      const notifications = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      callback(notifications);
    },
    (error) => {
      console.error("Error listening to notifications:", error);
      callback([]);
    }
  );
};

/**
 * Mark a single notification as read.
 */
export const markAsRead = async (uid, notificationId) => {
  try {
    const notifDoc = doc(db, "Users", uid, "Notifications", notificationId);
    await updateDoc(notifDoc, { read: true });
  } catch (error) {
    console.error("Error marking notification as read:", error);
  }
};

/**
 * Mark all notifications as read.
 */
export const markAllAsRead = async (uid) => {
  try {
    const notifRef = collection(db, "Users", uid, "Notifications");
    const q = query(notifRef, where("read", "==", false));
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    snapshot.docs.forEach((d) => {
      batch.update(d.ref, { read: true });
    });
    await batch.commit();
  } catch (error) {
    console.error("Error marking all as read:", error);
  }
};

/**
 * Delete a single notification.
 */
export const deleteNotification = async (uid, notificationId) => {
  try {
    const notifDoc = doc(db, "Users", uid, "Notifications", notificationId);
    await deleteDoc(notifDoc);
  } catch (error) {
    console.error("Error deleting notification:", error);
  }
};

/**
 * Delete all notifications, optionally filtered by type.
 */
export const deleteAllNotifications = async (uid, filterType = null) => {
  try {
    const notifRef = collection(db, "Users", uid, "Notifications");
    let q;
    if (filterType && filterType !== "all") {
      q = query(notifRef, where("type", "==", filterType));
    } else {
      q = query(notifRef);
    }
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    snapshot.docs.forEach((d) => {
      batch.delete(d.ref);
    });
    await batch.commit();
  } catch (error) {
    console.error("Error deleting all notifications:", error);
  }
};
