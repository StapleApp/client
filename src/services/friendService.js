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
export const sendFriendRequest = async (fromUser, toUid) => {
  try {
    // Pending friendship kaydı oluştur
    await supabase.from("friendships").upsert(
      {
        user_id: fromUser.userID,
        friend_id: toUid,
        status: "pending",
      },
      { onConflict: "user_id,friend_id" }
    );

    // Bildirim gönder
    await createNotification(toUid, {
      type: "friend_request",
      from_user_id: fromUser.userID,
      data: {
        user: fromUser.nickName || fromUser.name || "Birisi",
        fromUid: fromUser.userID,
        message: "Size arkadaşlık isteği gönderdi",
      },
    });

    return true;
  } catch (error) {
    console.error("Error sending friend request:", error);
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
