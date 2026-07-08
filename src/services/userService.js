import { supabase } from "../config/supabase";

// ** Nickname ve avatar güncelleme **
export const UpdateNickname = async (uid, newValue, photo) => {
  try {
    const { error } = await supabase
      .from("profiles")
      .update({
        nickname: newValue,
        avatar_url: photo,
      })
      .eq("id", uid);

    if (error) throw error;
  } catch (error) {
    console.error("Database update failed:", error);
  }
};

// ** ID ile Kullanıcıya Ulaşma **
export const getUser = async (uid) => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", uid)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No rows returned
        console.warn("No user found with uid:", uid);
        return null;
      }
      throw error;
    }

    // Firebase uyumlu alan adları döndür (geçiş kolaylığı için)
    return mapProfileToLegacy(data);
  } catch (error) {
    console.error("Error fetching user by uid:", error);
    return null;
  }
};

// Supabase profil verisini eski Firebase formatına dönüştür
// Böylece UI bileşenlerinde minimum değişiklik gerekir
export const mapProfileToLegacy = (profile) => {
  if (!profile) return null;
  return {
    userID: profile.id,
    photoURL: profile.avatar_url || "",
    nickName: profile.nickname || "",
    name: profile.name || "",
    surname: profile.surname || "",
    birthdate: profile.birthdate || "",
    createdDate: profile.created_at,
    email: profile.email || "",
    friendshipID: profile.friendship_code || "",
    status: profile.status || "offline",
    about: profile.about || "",
    favoriteGifs: profile.favorite_gifs || [],
    // Bu alanlar artık ayrı tablolarda; geriye uyumluluk için boş döndür
    friends: {},
    servers: [],
    groups: [],
  };
};

// Users dokümanı yoksa oluştur (kayıt sırasında trigger çalışmamışsa güvenlik ağı)
export const ensureUserDoc = async (user) => {
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (data) return mapProfileToLegacy(data);

  // Profil yok → oluştur
  const nameParts = (user.user_metadata?.full_name || "").trim().split(" ");
  const friendshipCode = generateFriendshipCode();

  const profileData = {
    id: user.id,
    avatar_url: user.user_metadata?.avatar_url || "",
    nickname: "",
    name: nameParts[0] || "",
    surname: nameParts.slice(1).join(" ") || "",
    birthdate: null,
    email: user.email || "",
    friendship_code: friendshipCode,
    status: "online",
  };

  try {
    const { error: insertError } = await supabase
      .from("profiles")
      .insert(profileData);

    if (insertError) throw insertError;
    console.warn("Missing user document created for", user.id);
  } catch (err) {
    console.error("Failed to auto-create user document:", err);
    return null;
  }

  return mapProfileToLegacy(profileData);
};

// 10 haneli rastgele friendship code üret
function generateFriendshipCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 10; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export const updateUserStatus = async (uid, status) => {
  try {
    const { error } = await supabase
      .from("profiles")
      .update({ status })
      .eq("id", uid);

    if (error) throw error;
  } catch (error) {
    console.error("Error updating status:", error);
  }
};

// ** Profil alanlarını güncelle (nickname, avatar_url, about, vb.) **
export const updateUserProfile = async (uid, data) => {
  try {
    // Firebase alan adlarını Supabase'e çevir
    const mapped = {};
    if ("nickName" in data) mapped.nickname = data.nickName;
    if ("photoURL" in data) mapped.avatar_url = data.photoURL;
    if ("about" in data) mapped.about = data.about;
    if ("name" in data) mapped.name = data.name;
    if ("surname" in data) mapped.surname = data.surname;
    if ("status" in data) mapped.status = data.status;
    if ("favoriteGifs" in data) mapped.favorite_gifs = data.favoriteGifs;
    // Supabase alan adları doğrudan geçenleri de kabul et
    if ("nickname" in data) mapped.nickname = data.nickname;
    if ("avatar_url" in data) mapped.avatar_url = data.avatar_url;
    if ("favorite_gifs" in data) mapped.favorite_gifs = data.favorite_gifs;

    const { error } = await supabase
      .from("profiles")
      .update(mapped)
      .eq("id", uid);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error updating profile:", error);
    return false;
  }
};

// ** Kullanıcının verisini sil **
export const deleteUserDoc = async (uid) => {
  // Bildirimleri sil
  try {
    await supabase.from("notifications").delete().eq("user_id", uid);
  } catch (error) {
    console.warn("Could not clear notifications during account delete:", error);
  }
  // Profili sil (cascade ile ilişkili veriler de silinir)
  await supabase.from("profiles").delete().eq("id", uid);
};

// Kullanıcının grup (DM kanal) listesini getir
export const getUserGroups = async (uid) => {
  try {
    const { data, error } = await supabase
      .from("channel_members")
      .select("channel_id")
      .eq("user_id", uid);

    if (error) throw error;
    return (data || []).map((row) => row.channel_id);
  } catch (error) {
    console.error("Error getting user groups:", error);
    return [];
  }
};
