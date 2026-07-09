import { supabase } from "../config/supabase";
import toast from "react-hot-toast";

/**
 * Send a message. Works for both DMs and server channels.
 *
 * @param {Object} context  - { serverId, channelId } OR { groupId }
 * @param {Object} message  - { senderId, content, type? }
 *
 * NOT: senderName ve senderPhoto artık mesajda saklanmıyor.
 *      Bunlar profiles tablosundan JOIN ile getirilecek.
 */
export async function sendMessage(context, message) {
  try {
    const channelId = context.channelId || context.groupId;
    if (!channelId) {
      throw new Error("messageService: must provide channelId or groupId");
    }

    // Mesaj tipini belirle (GIF URL'leri için otomatik algıla)
    let msgType = message.type || "text";
    if (
      msgType === "text" &&
      message.content &&
      (message.content.match(/\.(gif)$/i) ||
        message.content.includes("tenor.com") ||
        message.content.includes("giphy.com") ||
        message.content.includes("klipy"))
    ) {
      msgType = "gif";
    }

    const { error } = await supabase.from("messages").insert({
      channel_id: channelId,
      sender_id: message.senderId,
      content: message.content,
      type: msgType,
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error sending message:", error);
    toast.error("Mesaj gönderilemedi");
    return false;
  }
}

/**
 * Edit an existing message (own messages only — enforced by RLS).
 */
export async function editMessage(messageId, senderId, content) {
  try {
    const { error } = await supabase
      .from("messages")
      .update({ content, edited_at: new Date().toISOString() })
      .eq("id", messageId)
      .eq("sender_id", senderId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error editing message:", error);
    toast.error("Mesaj düzenlenemedi");
    return false;
  }
}

/**
 * Delete a message (own messages only — enforced by RLS).
 */
export async function deleteMessage(messageId, senderId) {
  try {
    const { error } = await supabase
      .from("messages")
      .delete()
      .eq("id", messageId)
      .eq("sender_id", senderId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error deleting message:", error);
    toast.error("Mesaj silinemedi");
    return false;
  }
}

/**
 * Listen to messages in real time. Works for both DMs and server channels.
 *
 * Supabase Realtime ile yeni mesajları dinler.
 * İlk yüklemede mevcut mesajları çeker, sonra INSERT event'lerini dinler.
 *
 * @param {Object}   context  - { serverId, channelId } OR { groupId }
 * @param {Function} callback - receives an array of message objects
 * @returns {Function} unsubscribe
 */
export function listenMessages(context, callback) {
  const channelId = context?.channelId || context?.groupId;
  if (!channelId) {
    callback([]);
    return () => {};
  }

  // Kullanıcı cache'i: sender bilgilerini tekrar tekrar çekmemek için
  const userCache = {};

  // Sender bilgisini getir (cache ile)
  async function getSenderInfo(senderId) {
    if (userCache[senderId]) return userCache[senderId];

    const { data } = await supabase
      .from("profiles")
      .select("id, nickname, avatar_url")
      .eq("id", senderId)
      .single();

    if (data) {
      userCache[senderId] = {
        senderId: data.id,
        senderName: data.nickname || "Bilinmeyen",
        senderPhoto: data.avatar_url || "/1.png",
      };
    } else {
      userCache[senderId] = {
        senderId,
        senderName: "Bilinmeyen",
        senderPhoto: "/1.png",
      };
    }

    return userCache[senderId];
  }

  // Mesaj satırını UI formatına dönüştür
  async function mapMessage(msg) {
    const sender = await getSenderInfo(msg.sender_id);
    return {
      id: msg.id,
      senderId: msg.sender_id,
      senderName: sender.senderName,
      senderPhoto: sender.senderPhoto,
      content: msg.content,
      type: msg.type,
      createdAt: msg.created_at
        ? { seconds: Math.floor(new Date(msg.created_at).getTime() / 1000) }
        : null,
      editedAt: msg.edited_at,
    };
  }

  let currentMessages = [];

  // 1. İlk yükleme — mevcut mesajları çek
  async function fetchInitial() {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("channel_id", channelId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("listenMessages initial fetch error:", error);
      callback([]);
      return;
    }

    const mapped = await Promise.all((data || []).map(mapMessage));
    currentMessages = mapped;
    callback([...currentMessages]);
  }

  fetchInitial();

  // 2. Realtime subscription — yeni mesajları dinle
  // Topic çağrı başına benzersiz: aynı topic'e ikinci subscribe() throw eder.
  const subscription = supabase
    .channel(`messages:${channelId}:${Date.now()}-${Math.random().toString(36).slice(2)}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `channel_id=eq.${channelId}`,
      },
      async (payload) => {
        const newMsg = await mapMessage(payload.new);
        currentMessages = [...currentMessages, newMsg];
        callback([...currentMessages]);
      }
    )
    .on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "messages",
        filter: `channel_id=eq.${channelId}`,
      },
      (payload) => {
        currentMessages = currentMessages.filter(
          (m) => m.id !== payload.old.id
        );
        callback([...currentMessages]);
      }
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "messages",
        filter: `channel_id=eq.${channelId}`,
      },
      async (payload) => {
        const updated = await mapMessage(payload.new);
        currentMessages = currentMessages.map((m) =>
          m.id === updated.id ? updated : m
        );
        callback([...currentMessages]);
      }
    )
    .subscribe();

  // Unsubscribe fonksiyonu
  return () => {
    supabase.removeChannel(subscription);
  };
}
