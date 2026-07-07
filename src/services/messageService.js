import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";
import toast from "react-hot-toast";

/**
 * Build the Firestore path for a message collection.
 *
 * Server channel → Servers/{serverId}/Channels/{channelId}/Messages
 * DM / Group     → Groups/{groupId}/Messages
 */
function getMessagesRef(context) {
  if (context.serverId && context.channelId) {
    return collection(
      db,
      "Servers",
      context.serverId,
      "Channels",
      String(context.channelId),
      "Messages"
    );
  }
  if (context.groupId) {
    return collection(db, "Groups", context.groupId, "Messages");
  }
  throw new Error(
    "messageService: must provide { serverId, channelId } or { groupId }"
  );
}

/**
 * Send a message. Works for both DMs and server channels.
 *
 * @param {Object} context  - { serverId, channelId } OR { groupId }
 * @param {Object} message  - { senderId, senderName, senderPhoto, content }
 */
export async function sendMessage(context, message) {
  try {
    const ref = getMessagesRef(context);
    await addDoc(ref, {
      ...message,
      createdAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error("Error sending message:", error);
    toast.error("Mesaj gönderilemedi");
    return false;
  }
}

/**
 * Listen to messages in real time. Works for both DMs and server channels.
 *
 * @param {Object}   context  - { serverId, channelId } OR { groupId }
 * @param {Function} callback - receives an array of message objects
 * @returns {Function} unsubscribe
 */
export function listenMessages(context, callback) {
  const ref = getMessagesRef(context);
  const q = query(ref, orderBy("createdAt", "asc"));
  return onSnapshot(
    q,
    (snapshot) => {
      const msgs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(msgs);
    },
    (error) => {
      console.error("listenMessages error:", error);
      callback([]);
    }
  );
}
