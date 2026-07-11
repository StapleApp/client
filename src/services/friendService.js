import { supabase } from "../config/supabase";
import { createNotification } from "./notificationService";

// ** FriendshipID (friendship_code) ile Kullanıcı Arama **
export const GetUserByFriendshipID = async (friendshipCode) => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("friendship_code", friendshipCode)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null; // No rows
      throw error;
    }

    // Firebase uyumlu format
    return {
      userID: data.id,
      photoURL: data.avatar_url || "",
      nickName: data.nickname || "",
      name: data.name || "",
      surname: data.surname || "",
      email: data.email || "",
      friendshipID: data.friendship_code || "",
      status: data.status || "offline",
      lastSeen: data.last_seen || null,
    };
  } catch (error) {
    console.error("Error fetching user by friendshipID:", error);
    return null;
  }
};

// ** Arkadaş Ekleme (tek yönlü ilişki yazar) **
export const AddFriend = async (uid, friendID, relation) => {
  try {
    const status = relation === "Friend" ? "accepted" : "pending";

    const { error } = await supabase
      .from("friendships")
      .upsert(
        {
          user_id: uid,
          friend_id: friendID,
          status,
        },
        { onConflict: "user_id,friend_id" }
      );

    if (error) throw error;
  } catch (error) {
    console.error("Error adding/updating friend:", error);
  }
};

// ** Arkadaşlık isteği gönder — bildirim oluşturur. **
// Dönüş: { ok, reason }
//   reason: "sent" | "already_sent" | "already_friends" | "incoming_exists" | "self" | "error"
export const sendFriendRequest = async (fromUser, toUid) => {
  try {
    const from = fromUser.userID;
    if (!from || !toUid) return { ok: false, reason: "error" };
    if (from === toUid) return { ok: false, reason: "self" };

    // Mevcut ilişkiyi iki yönde de kontrol et (çift istek engeli)
    const { data: existing } = await supabase
      .from("friendships")
      .select("user_id, friend_id, status")
      .or(
        `and(user_id.eq.${from},friend_id.eq.${toUid}),and(user_id.eq.${toUid},friend_id.eq.${from})`
      );

    if (existing && existing.length > 0) {
      if (existing.some((r) => r.status === "accepted"))
        return { ok: false, reason: "already_friends" };
      // Ben zaten ona pending istek attıysam
      if (existing.some((r) => r.user_id === from && r.status === "pending"))
        return { ok: false, reason: "already_sent" };
      // O bana zaten istek attıysa
      if (existing.some((r) => r.user_id === toUid && r.status === "pending"))
        return { ok: false, reason: "incoming_exists" };
    }

    // Pending friendship kaydı oluştur
    await supabase.from("friendships").upsert(
      {
        user_id: from,
        friend_id: toUid,
        status: "pending",
      },
      { onConflict: "user_id,friend_id" }
    );

    // Bildirim gönder
    await createNotification(toUid, {
      type: "friend_request",
      from_user_id: from,
      data: {
        user: fromUser.nickName || fromUser.name || "Birisi",
        fromUid: from,
        message: "Size arkadaşlık isteği gönderdi",
      },
    });

    return { ok: true, reason: "sent" };
  } catch (error) {
    console.error("Error sending friend request:", error);
    return { ok: false, reason: "error" };
  }
};

// ** Bana gelen bekleyen istekler (friend_id = ben, status = pending) **
export const getIncomingRequests = async (uid) => {
  try {
    const { data, error } = await supabase
      .from("friendships")
      .select("user_id, created_at")
      .eq("friend_id", uid)
      .eq("status", "pending");
    if (error) throw error;
    return (data || []).map((r) => ({ uid: r.user_id, createdAt: r.created_at }));
  } catch (error) {
    console.error("Error getting incoming requests:", error);
    return [];
  }
};

// ** Benim gönderdiğim bekleyen istekler (user_id = ben, status = pending) **
export const getOutgoingRequests = async (uid) => {
  try {
    const { data, error } = await supabase
      .from("friendships")
      .select("friend_id, created_at")
      .eq("user_id", uid)
      .eq("status", "pending");
    if (error) throw error;
    return (data || []).map((r) => ({ uid: r.friend_id, createdAt: r.created_at }));
  } catch (error) {
    console.error("Error getting outgoing requests:", error);
    return [];
  }
};

// ** Bana gelen isteği reddet (gönderen → ben satırını sil) **
export const rejectFriendRequest = async (myUid, fromUid) => {
  try {
    await supabase
      .from("friendships")
      .delete()
      .eq("user_id", fromUid)
      .eq("friend_id", myUid)
      .eq("status", "pending");
    return true;
  } catch (error) {
    console.error("Error rejecting friend request:", error);
    return false;
  }
};

// ** Gönderdiğim isteği iptal et (ben → hedef satırını sil) **
export const cancelFriendRequest = async (myUid, toUid) => {
  try {
    await supabase
      .from("friendships")
      .delete()
      .eq("user_id", myUid)
      .eq("friend_id", toUid)
      .eq("status", "pending");
    return true;
  } catch (error) {
    console.error("Error canceling friend request:", error);
    return false;
  }
};

// ** Arkadaşlık isteğini kabul et — iki yönlü ilişkiyi kurar. **
export const acceptFriendRequest = async (myUid, fromUid) => {
  try {
    // İlk yön: gönderen → ben (pending → accepted)
    await supabase
      .from("friendships")
      .update({ status: "accepted" })
      .eq("user_id", fromUid)
      .eq("friend_id", myUid);

    // İkinci yön: ben → gönderen (accepted)
    await supabase.from("friendships").upsert(
      {
        user_id: myUid,
        friend_id: fromUid,
        status: "accepted",
      },
      { onConflict: "user_id,friend_id" }
    );
  } catch (error) {
    console.error("Error accepting friend request:", error);
  }
};

// ** Arkadaş Listesine Ulaşma **
export const getFriendsList = async (uid) => {
  try {
    const { data, error } = await supabase
      .from("friendships")
      .select("friend_id, status, created_at")
      .eq("user_id", uid)
      .eq("status", "accepted");

    if (error) throw error;

    return (data || []).map((row) => ({
      uid: row.friend_id,
      relation: "Friend",
      relationDate: row.created_at,
    }));
  } catch (error) {
    console.error("Error getting friends list:", error);
    return [];
  }
};
