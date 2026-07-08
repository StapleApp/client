import { supabase } from "../config/supabase";

/**
 * Create a notification for a user.
 */
export const createNotification = async (targetUid, notification) => {
  try {
    const { error } = await supabase.from("notifications").insert({
      user_id: targetUid,
      type: notification.type,
      data: notification.data || {},
      from_user_id: notification.from_user_id || null,
      read: notification.read ?? false,
    });

    if (error) throw error;
  } catch (error) {
    console.error("Error creating notification:", error);
  }
};

/**
 * Listen to a user's notifications in real time (newest first).
 * @returns {Function} unsubscribe
 */
export const listenNotifications = (uid, callback) => {
  let currentNotifications = [];

  // İlk yükleme
  async function fetchInitial() {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching notifications:", error);
      callback([]);
      return;
    }

    currentNotifications = (data || []).map(mapNotification);
    callback([...currentNotifications]);
  }

  fetchInitial();

  // Realtime subscription
  const subscription = supabase
    .channel(`notifications:${uid}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${uid}`,
      },
      (payload) => {
        const newNotif = mapNotification(payload.new);
        currentNotifications = [newNotif, ...currentNotifications];
        callback([...currentNotifications]);
      }
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${uid}`,
      },
      (payload) => {
        const updated = mapNotification(payload.new);
        currentNotifications = currentNotifications.map((n) =>
          n.id === updated.id ? updated : n
        );
        callback([...currentNotifications]);
      }
    )
    .on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${uid}`,
      },
      (payload) => {
        currentNotifications = currentNotifications.filter(
          (n) => n.id !== payload.old.id
        );
        callback([...currentNotifications]);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(subscription);
  };
};

// Supabase formatını Firebase uyumlu formata dönüştür
function mapNotification(row) {
  return {
    id: row.id,
    type: row.data?.type || row.type,
    user: row.data?.user || "",
    fromUid: row.from_user_id || row.data?.fromUid || "",
    message: row.data?.message || "",
    read: row.read,
    createdAt: row.created_at
      ? { seconds: Math.floor(new Date(row.created_at).getTime() / 1000) }
      : null,
    // Ek veriler
    ...row.data,
  };
}

/**
 * Update arbitrary fields on a notification.
 */
export const updateNotification = async (uid, notificationId, data) => {
  try {
    // Supabase'de data alanı JSONB olduğundan, ek alanları data içine koy
    const updatePayload = {};
    if ("read" in data) updatePayload.read = data.read;
    if ("responded" in data || "accepted" in data) {
      // Bu alanları JSONB data'ya merge et
      const { data: existing } = await supabase
        .from("notifications")
        .select("data")
        .eq("id", notificationId)
        .single();

      updatePayload.data = {
        ...(existing?.data || {}),
        ...data,
      };
      delete updatePayload.data.read; // read ayrı sütun
    }

    const { error } = await supabase
      .from("notifications")
      .update(updatePayload)
      .eq("id", notificationId)
      .eq("user_id", uid);

    if (error) throw error;
  } catch (error) {
    console.error("Error updating notification:", error);
  }
};

/**
 * Mark a single notification as read.
 */
export const markAsRead = async (uid, notificationId) => {
  try {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", notificationId)
      .eq("user_id", uid);

    if (error) throw error;
  } catch (error) {
    console.error("Error marking notification as read:", error);
  }
};

/**
 * Mark all notifications as read.
 */
export const markAllAsRead = async (uid) => {
  try {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", uid)
      .eq("read", false);

    if (error) throw error;
  } catch (error) {
    console.error("Error marking all as read:", error);
  }
};

/**
 * Delete a single notification.
 */
export const deleteNotification = async (uid, notificationId) => {
  try {
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notificationId)
      .eq("user_id", uid);

    if (error) throw error;
  } catch (error) {
    console.error("Error deleting notification:", error);
  }
};

/**
 * Delete all notifications, optionally filtered by type.
 */
export const deleteAllNotifications = async (uid, filterType = null) => {
  try {
    let query = supabase.from("notifications").delete().eq("user_id", uid);

    if (filterType && filterType !== "all") {
      query = query.eq("type", filterType);
    }

    const { error } = await query;
    if (error) throw error;
  } catch (error) {
    console.error("Error deleting all notifications:", error);
  }
};
