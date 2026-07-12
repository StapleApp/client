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

    const row = {
      channel_id: channelId,
      sender_id: message.senderId,
      content: message.content,
      type: msgType,
    };
    // reply_to'yu yalnızca gerçek bir yanıtta ekle. Böylece reply_to kolonu
    // henüz eklenmemişse (supabase_fixes.sql çalıştırılmadıysa) normal
    // mesajlaşma çalışmaya devam eder — sadece yanıt özelliği devre dışı kalır.
    if (message.replyTo) row.reply_to = message.replyTo;

    const { data, error } = await supabase
      .from("messages")
      .insert(row)
      .select("id")
      .single();

    if (error) throw error;
    // Yeni mesajın id'si (yanıt bildirimi mesaja link verebilsin); truthy.
    return data?.id || true;
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
 * Delete a message. Kendi mesajı ise senderId ile; MANAGE_MESSAGES yetkisiyle
 * başkasının mesajını silerken { moderate: true } geç → sender filtresi kalkar,
 * izin RLS'te (has_server_permission) doğrulanır.
 */
export async function deleteMessage(messageId, senderId, { moderate = false } = {}) {
  try {
    let query = supabase.from("messages").delete().eq("id", messageId);
    if (!moderate) query = query.eq("sender_id", senderId);
    const { error } = await query;

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error deleting message:", error);
    toast.error("Mesaj silinemedi");
    return false;
  }
}

/**
 * Mesajı sabitle / sabiti kaldır. Yetki RPC içinde doğrulanır
 * (sunucu kanalında MANAGE_MESSAGES, DM/grupta kanal üyeliği).
 */
export async function setMessagePinned(messageId, pinned) {
  try {
    const { error } = await supabase.rpc("set_message_pinned", {
      _message_id: messageId,
      _pinned: pinned,
    });
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error pinning message:", error);
    toast.error(error?.message || "Mesaj sabitlenemedi");
    return false;
  }
}

/**
 * Bir kanaldaki sabitlenmiş mesajları getir (en yeni → en eski).
 * Üst sabit-mesaj çubuğu için; yüklü olmayan mesajları da kapsar.
 */
export async function getPinnedMessages(channelId) {
  if (!channelId) return [];
  try {
    const { data, error } = await supabase
      .from("messages")
      .select("id, content, type, sender_id, created_at")
      .eq("channel_id", channelId)
      .eq("pinned", true)
      .order("created_at", { ascending: false });
    if (error) throw error;

    const rows = data || [];
    // Gönderen adlarını tek seferde çöz
    const ids = [...new Set(rows.map((r) => r.sender_id))];
    const nameMap = {};
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, nickname")
        .in("id", ids);
      (profs || []).forEach((p) => (nameMap[p.id] = p.nickname || "Bilinmeyen"));
    }

    return rows.map((r) => ({
      id: r.id,
      content: r.content,
      type: r.type,
      senderId: r.sender_id,
      senderName: nameMap[r.sender_id] || "Bilinmeyen",
      rawCreatedAt: r.created_at,
    }));
  } catch (error) {
    console.error("Error fetching pinned messages:", error);
    return [];
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
    return { unsubscribe: () => {}, loadMore: async () => 0 };
  }

  // Kullanıcı cache'i: sender bilgilerini tekrar tekrar çekmemek için
  const userCache = {};
  // Yanıtlanan mesaj önizleme cache'i (reply_to id -> {senderName, content, type})
  const replyCache = {};

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
        senderPhoto: data.avatar_url || "/defaults/avatars/1.png",
      };
    } else {
      userCache[senderId] = {
        senderId,
        senderName: "Bilinmeyen",
        senderPhoto: "/defaults/avatars/1.png",
      };
    }

    return userCache[senderId];
  }

  // Yanıtlanan mesajın önizlemesini getir (cache ile). Yoksa (silinmiş) null.
  async function getReplyPreview(replyId) {
    if (!replyId) return null;
    if (replyCache[replyId] !== undefined) return replyCache[replyId];

    const { data } = await supabase
      .from("messages")
      .select("id, content, type, sender_id")
      .eq("id", replyId)
      .single();

    if (!data) {
      replyCache[replyId] = null;
      return null;
    }

    const sender = await getSenderInfo(data.sender_id);
    replyCache[replyId] = {
      id: data.id,
      senderName: sender.senderName,
      content: data.content,
      type: data.type,
    };
    return replyCache[replyId];
  }

  // Mesaj satırını UI formatına dönüştür
  async function mapMessage(msg) {
    const sender = await getSenderInfo(msg.sender_id);
    const replyPreview = await getReplyPreview(msg.reply_to);
    return {
      id: msg.id,
      senderId: msg.sender_id,
      senderName: sender.senderName,
      senderPhoto: sender.senderPhoto,
      content: msg.content,
      type: msg.type,
      replyTo: msg.reply_to || null,
      replyPreview,
      createdAt: msg.created_at
        ? { seconds: Math.floor(new Date(msg.created_at).getTime() / 1000) }
        : null,
      rawCreatedAt: msg.created_at,
      editedAt: msg.edited_at,
      pinned: msg.pinned || false,
    };
  }

  let currentMessages = [];
  const limitCount = 50;

  // 1. İlk yükleme — en yeni 50 mesajı çek
  async function fetchInitial() {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("channel_id", channelId)
      .order("created_at", { ascending: false })
      .limit(limitCount);

    if (error) {
      console.error("listenMessages initial fetch error:", error);
      callback([], false);
      return;
    }

    const reversed = [...(data || [])].reverse();
    const mapped = await Promise.all(reversed.map(mapMessage));
    currentMessages = mapped;
    callback([...currentMessages], data.length === limitCount);
  }

  fetchInitial();

  // 2. Realtime subscription — yeni mesajları dinle
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

  const unsubscribe = () => {
    supabase.removeChannel(subscription);
  };

  // 3. Geçmiş mesajları yükle
  const loadMore = async () => {
    if (currentMessages.length === 0) return 0;

    const oldestMsg = currentMessages[0];
    const oldestTime = oldestMsg.rawCreatedAt || (oldestMsg.createdAt?.seconds
      ? new Date(oldestMsg.createdAt.seconds * 1000).toISOString()
      : null);

    if (!oldestTime) return 0;

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("channel_id", channelId)
      .lt("created_at", oldestTime)
      .order("created_at", { ascending: false })
      .limit(limitCount);

    if (error || !data || data.length === 0) return 0;

    const reversed = [...data].reverse();
    const mapped = await Promise.all(reversed.map(mapMessage));
    currentMessages = [...mapped, ...currentMessages];
    callback([...currentMessages], data.length === limitCount);
    return data.length;
  };

  const loadUntilMessage = async (targetId) => {
    if (currentMessages.length === 0) return false;

    // 1. Hedef mesajın oluşturulma zamanını al
    const { data: targetMsg, error: targetError } = await supabase
      .from("messages")
      .select("created_at")
      .eq("id", targetId)
      .single();

    if (targetError || !targetMsg) return false;

    const oldestMsg = currentMessages[0];
    const oldestTime = oldestMsg.rawCreatedAt || (oldestMsg.createdAt?.seconds
      ? new Date(oldestMsg.createdAt.seconds * 1000).toISOString()
      : null);

    if (!oldestTime) return false;

    // Hedef mesaj zaten en eski yüklü mesajdan daha yeniyse, listededir veya yüklenmiştir
    if (targetMsg.created_at >= oldestTime) return true;

    // 2. Hedef mesaj ile en eski mesaj arasındaki tüm geçmiş mesaj köprüsünü çek
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("channel_id", channelId)
      .gte("created_at", targetMsg.created_at)
      .lt("created_at", oldestTime)
      .order("created_at", { ascending: true }); // kronolojik sıra

    if (error || !data || data.length === 0) return false;

    const mapped = await Promise.all(data.map(mapMessage));
    currentMessages = [...mapped, ...currentMessages];
    callback([...currentMessages]);
    return true;
  };

  return {
    unsubscribe,
    loadMore,
    loadUntilMessage,
  };
}
