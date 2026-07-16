import { supabase } from "../config/supabase";

// ** Nickname, avatar ve banner güncelleme **
export const UpdateNickname = async (uid, newValue, photo, banner) => {
  const updateData = {
    nickname: newValue,
    avatar_url: photo,
  };
  if (banner) {
    updateData.profile_banner_url = banner;
  }
  const { error } = await supabase
    .from("profiles")
    .update(updateData)
    .eq("id", uid);

  if (error) {
    console.error("Database update failed:", error);
    throw error;
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

// ** ID listesi ile avatar haritası (id -> avatar_url) — sesli kanal rozetleri gibi hafif kullanımlar için **
export const getAvatarsByIds = async (ids) => {
  const uniq = [...new Set((ids || []).filter(Boolean))];
  if (!uniq.length) return {};
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, avatar_url")
      .in("id", uniq);
    if (error) throw error;
    const map = {};
    (data || []).forEach((p) => {
      map[p.id] = p.avatar_url || "/defaults/avatars/1.png";
    });
    return map;
  } catch (error) {
    console.error("Error fetching avatars by ids:", error);
    return {};
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
    lastSeen: profile.last_seen || null,
    profileBannerUrl: profile.profile_banner_url || "",
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

// Çevrimiçi sayılma penceresi: son bu kadar süre içinde heartbeat atıldıysa çevrimiçi
export const ONLINE_WINDOW_MS = 90 * 1000;

// Presence heartbeat — uygulama açıkken periyodik çağrılır
export const updateLastSeen = async (uid) => {
  if (!uid) return;
  try {
    await supabase
      .from("profiles")
      .update({ last_seen: new Date().toISOString() })
      .eq("id", uid);
  } catch (error) {
    // Sessiz geç — heartbeat'in başarısızlığı akışı bozmamalı
    console.debug("last_seen update failed:", error?.message);
  }
};

// Gösterilecek gerçek durum: kullanıcının tercihi + son görülme zamanı.
// last_seen eskiyse (ya da yoksa) çevrimdışı; "offline" tercihi (görünmez)
// her zaman çevrimdışı gösterilir; aksi hâlde tercih edilen renk.
export const resolveStatus = (status, lastSeen) => {
  if (status === "offline") return "offline";
  if (!lastSeen) return "offline";
  const seen = new Date(lastSeen).getTime();
  if (Number.isNaN(seen) || Date.now() - seen > ONLINE_WINDOW_MS) return "offline";
  return status || "online";
};

// ** Görsel yükle → verilen Storage bucket'ına koy, herkese açık URL döndür **
export const MEDIA_MAX_BYTES = 4 * 1024 * 1024; // 4 MB

export const uploadMedia = async (bucket, uid, file) => {
  if (!bucket || !uid || !file) throw new Error("Eksik parametre");
  if (!file.type.startsWith("image/")) {
    throw new Error("Yalnızca resim dosyası yükleyebilirsin.");
  }
  if (file.size > MEDIA_MAX_BYTES) {
    throw new Error("Dosya çok büyük (en fazla 4 MB).");
  }

  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  // Klasör = kullanıcı id'si (RLS bunu zorunlu tutuyor). Zaman damgalı ad → cache kırılır.
  const path = `${uid}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: true,
    contentType: file.type,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
};

// Geriye uyumluluk: avatar için kısayol
export const uploadAvatar = (uid, file) => uploadMedia("avatars", uid, file);

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
    if ("profileBannerUrl" in data) mapped.profile_banner_url = data.profileBannerUrl;
    if ("favoriteGifs" in data) mapped.favorite_gifs = data.favoriteGifs;
    // Supabase alan adları doğrudan geçenleri de kabul et
    if ("nickname" in data) mapped.nickname = data.nickname;
    if ("avatar_url" in data) mapped.avatar_url = data.avatar_url;
    if ("favorite_gifs" in data) mapped.favorite_gifs = data.favorite_gifs;

    console.log("[updateUserProfile] uid:", uid);
    console.log("[updateUserProfile] gelen data:", data);
    console.log("[updateUserProfile] mapped:", mapped);

    const { data: result, error } = await supabase
      .from("profiles")
      .update(mapped)
      .eq("id", uid)
      .select();

    if (error) throw error;

    console.log("[updateUserProfile] Güncellenen veri:", result);

    if (!result || result.length === 0) {
      console.warn("[updateUserProfile] 0 satır güncellendi — uid eşleşmedi veya RLS engeli");
      return false;
    }

    return true;
  } catch (error) {
    console.error("[updateUserProfile] HATA:", error);
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
