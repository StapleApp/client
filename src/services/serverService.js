import { supabase } from "../config/supabase";
import toast from "react-hot-toast";

// ** Server oluştur (server + default role + default channels + owner membership) **
// serverInfo: { name, description?, type?, iconUrl?, bannerUrl?, tags? }
async function writeServerData(serverInfo, ownerID) {
  const {
    name,
    description = "",
    type = "public",
    iconUrl = "",
    bannerUrl = "",
    tags = [],
  } = serverInfo;

  // 1. Sunucuyu oluştur
  const { data: server, error: serverError } = await supabase
    .from("servers")
    .insert({
      name,
      owner_id: ownerID,
      description: description || null,
      type: type === "private" ? "private" : "public",
      icon_url: iconUrl || null,
      banner_url: bannerUrl || null,
    })
    .select()
    .single();

  if (serverError) throw serverError;

  // 2. Admin rolünü oluştur
  const { data: adminRole, error: roleError } = await supabase
    .from("roles")
    .insert({
      server_id: server.id,
      name: "Admin",
      color: "#FF5733",
      permissions: ["MANAGE_MESSAGES", "BAN_MEMBERS", "MANAGE_ROLES"],
      position: 0,
    })
    .select()
    .single();

  if (roleError) throw roleError;

  // 3. Varsayılan kanalları oluştur
  const { error: channelError } = await supabase.from("channels").insert([
    {
      server_id: server.id,
      type: "text",
      name: "General",
      position: 1,
    },
    {
      server_id: server.id,
      type: "voice",
      name: "General",
      position: 2,
    },
  ]);

  if (channelError) throw channelError;

  // 4. Sahibi üye olarak ekle
  const { error: memberError } = await supabase.from("server_members").insert({
    server_id: server.id,
    user_id: ownerID,
    role_id: adminRole.id,
  });

  if (memberError) throw memberError;

  // 5. Etiketleri ekle (varsa) — temizle, tekilleştir, sınırla
  const cleanTags = [
    ...new Set(
      (tags || [])
        .map((t) => String(t).trim().toLowerCase())
        .filter((t) => t.length > 0 && t.length <= 24)
    ),
  ].slice(0, 8);

  if (cleanTags.length > 0) {
    const { error: tagError } = await supabase.from("server_tags").insert(
      cleanTags.map((tag) => ({ server_id: server.id, tag }))
    );
    if (tagError) console.error("Etiketler eklenemedi:", tagError);
  }

  return server;
}

export const saveServerToFirestore = async (serverInfo, ownerID, navigate) => {
  try {
    const server = await writeServerData(serverInfo, ownerID);
    toast.success("Sunucu başarıyla oluşturuldu!");
    navigate(`/server/${server.id}`);
  } catch (error) {
    console.error("Error creating server:", error);
    toast.error("Sunucu oluşturulamadı. Lütfen tekrar deneyin.");
  }
};

// Kullanıcının üyesi olduğu sunucuları getir
export const getServersList = async (uid) => {
  try {
    const { data, error } = await supabase
      .from("server_members")
      .select(`
        server_id,
        joined_at,
        servers (
          id, name, owner_id, icon_url, banner_url, description, type, created_at
        )
      `)
      .eq("user_id", uid);

    if (error) throw error;

    return (data || []).map((row) => ({
      serverID: row.servers.id,
      ServerId: row.servers.id,
      ServerName: row.servers.name,
      ServerOwnerID: row.servers.owner_id,
      ServerPhotoURL: row.servers.icon_url || "",
      ServerBannerURL: row.servers.banner_url || "",
      ServerDescription: row.servers.description || "",
      ServerType: row.servers.type || "public",
      CreatedDate: row.servers.created_at,
    }));
  } catch (error) {
    console.error("Error getting servers list:", error);
    return [];
  }
};

export const getServerById = async (serverID) => {
  try {
    // Sunucu verisini getir
    const { data: server, error: serverError } = await supabase
      .from("servers")
      .select("*")
      .eq("id", serverID)
      .single();

    if (serverError) throw serverError;
    if (!server) return null;

    // Kanalları getir
    const { data: channels } = await supabase
      .from("channels")
      .select("*")
      .eq("server_id", serverID)
      .order("position", { ascending: true });

    // Kategorileri getir (tablo yoksa/hata varsa graceful: kategorisiz devam)
    const { data: categories } = await supabase
      .from("channel_categories")
      .select("*")
      .eq("server_id", serverID)
      .order("position", { ascending: true });

    // Üyeleri getir
    const { data: members } = await supabase
      .from("server_members")
      .select("user_id, role_id, joined_at")
      .eq("server_id", serverID);

    // Rolleri getir
    const { data: roles } = await supabase
      .from("roles")
      .select("*")
      .eq("server_id", serverID)
      .order("position", { ascending: true });

    // Etiketleri getir
    const { data: tags } = await supabase
      .from("server_tags")
      .select("tag")
      .eq("server_id", serverID);

    // Firebase uyumlu format
    return {
      ServerId: server.id,
      ServerName: server.name,
      ServerOwnerID: server.owner_id,
      ServerPhotoURL: server.icon_url || "",
      ServerBannerURL: server.banner_url || "",
      ServerDescription: server.description || "",
      ServerType: server.type || "public",
      CreatedDate: server.created_at,
      Rooms: (channels || []).map((ch) => ({
        RoomID: ch.id,
        RoomName: ch.name,
        Type: ch.type === "voice" ? "VoiceRoom" : "TextRoom",
        Position: ch.position,
        CategoryID: ch.category_id ?? null,
      })),
      Categories: (categories || []).map((c) => ({
        CategoryID: c.id,
        CategoryName: c.name,
        Position: c.position,
      })),
      Users: (members || []).map((m) => ({
        UserID: m.user_id,
        RoleID: m.role_id || "member",
        JoinDate: m.joined_at,
      })),
      Roles: (roles || []).map((r) => ({
        RoleID: r.id,
        RoleName: r.name,
        RoleColor: r.color,
        Permissions: r.permissions || [],
      })),
      ServerTags: (tags || []).map((t) => t.tag),
    };
  } catch (error) {
    console.error("Error fetching server by ID:", error);
    return null;
  }
};

// ** Sunucu meta verisini güncelle (sahibi) + etiketleri değiştir **
export const updateServer = async (serverID, info) => {
  try {
    const { name, description, type, iconUrl, bannerUrl, tags } = info;

    const { error } = await supabase
      .from("servers")
      .update({
        name,
        description: description || null,
        type: type === "private" ? "private" : "public",
        icon_url: iconUrl || null,
        banner_url: bannerUrl || null,
      })
      .eq("id", serverID);

    if (error) throw error;

    // Etiketleri değiştir: eskileri sil, yenileri ekle
    if (Array.isArray(tags)) {
      await supabase.from("server_tags").delete().eq("server_id", serverID);
      const clean = [
        ...new Set(
          tags
            .map((t) => String(t).trim().toLowerCase())
            .filter((t) => t.length > 0 && t.length <= 24)
        ),
      ].slice(0, 8);
      if (clean.length > 0) {
        await supabase
          .from("server_tags")
          .insert(clean.map((tag) => ({ server_id: serverID, tag })));
      }
    }

    toast.success("Sunucu güncellendi");
    return true;
  } catch (error) {
    console.error("Error updating server:", error);
    toast.error(error?.message || "Sunucu güncellenemedi");
    return false;
  }
};

// ** Sunucuyu sil (sahibi) — cascade ile kanallar/üyeler/roller gider **
export const deleteServer = async (serverID) => {
  try {
    const { error } = await supabase.from("servers").delete().eq("id", serverID);
    if (error) throw error;
    toast.success("Sunucu silindi");
    return true;
  } catch (error) {
    console.error("Error deleting server:", error);
    toast.error(error?.message || "Sunucu silinemedi");
    return false;
  }
};

// Herkese açık sunucuları getir (keşfet / arama sayfası için)
export const getPublicServers = async () => {
  try {
    const { data, error } = await supabase
      .from("servers")
      .select("*, server_members(count)")
      .eq("type", "public");

    if (error) throw error;

    return (data || []).map((server) => ({
      serverID: server.id,
      name: server.name,
      description: server.description || "",
      tags: [], // Etiketler ayrı tablo, gerekirse join edilir
      photo: server.icon_url || "",
      ownerID: server.owner_id,
      memberCount: server.server_members?.[0]?.count || 0,
    }));
  } catch (error) {
    console.error("Error fetching public servers:", error);
    return [];
  }
};

// Sunucuya katıl
export const joinServer = async (serverID, uid) => {
  try {
    // Zaten üye mi kontrol et
    const { data: existing } = await supabase
      .from("server_members")
      .select("user_id")
      .eq("server_id", serverID)
      .eq("user_id", uid)
      .maybeSingle();

    if (existing) {
      toast("Zaten bu sunucudasın");
      return true;
    }

    const { error } = await supabase.from("server_members").insert({
      server_id: serverID,
      user_id: uid,
    });

    if (error) throw error;

    toast.success("Sunucuya katıldın!");
    return true;
  } catch (error) {
    console.error("Error joining server:", error);
    toast.error("Sunucuya katılırken bir hata oluştu");
    return false;
  }
};

// ** Kanal işlemleri — granüler (her biri DB'ye tek işlem yazar) **

// Yeni kanal oluştur → DB'nin ürettiği gerçek UUID'li satırı döndürür
export const createChannel = async (serverID, { name, type, position, categoryId = null }) => {
  try {
    const payload = {
      server_id: serverID,
      name,
      type: type === "voice" ? "voice" : "text",
      position: position ?? 0,
    };
    // category_id'yi yalnızca kategoriye eklerken gönder — böylece migration
    // henüz çalışmadıysa (kolon yoksa) kategorisiz kanal ekleme bozulmaz.
    if (categoryId) payload.category_id = categoryId;

    const { data, error } = await supabase
      .from("channels")
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data; // { id, server_id, name, type, position, category_id, ... }
  } catch (error) {
    console.error("Error creating channel:", error);
    toast.error("Kanal oluşturulamadı");
    return null;
  }
};

// Kanalı yeniden adlandır
export const renameChannel = async (channelID, name) => {
  try {
    const { error } = await supabase
      .from("channels")
      .update({ name })
      .eq("id", channelID);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error renaming channel:", error);
    toast.error("Kanal adı güncellenemedi");
    return false;
  }
};

// Kanalı sil — SECURITY DEFINER RPC üzerinden (RLS drift'ine karşı güvenli,
// sahiplik kontrolü ve net hata mesajı fonksiyonun içinde).
export const deleteChannelById = async (channelID) => {
  try {
    const { error } = await supabase.rpc("delete_server_channel", {
      _channel_id: channelID,
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error deleting channel:", error);
    // Fonksiyon henüz DB'ye eklenmediyse net uyarı ver
    if (error?.code === "PGRST202" || /function.*does not exist/i.test(error?.message || "")) {
      toast.error("Silme fonksiyonu DB'de yok — supabase_fixes.sql'i çalıştırın");
    } else {
      toast.error(error?.message || "Kanal silinemedi");
    }
    return false;
  }
};

// Kanal sırasını (position) toplu güncelle — drag & drop sonrası
export const reorderChannels = async (updates) => {
  try {
    // updates: [{ id, position }]
    await Promise.all(
      updates.map(({ id, position }) =>
        supabase.from("channels").update({ position }).eq("id", id)
      )
    );
    return true;
  } catch (error) {
    console.error("Error reordering channels:", error);
    toast.error("Kanal sırası kaydedilemedi");
    return false;
  }
};

// Kanal yerleşimini (kategori + sıra) toplu güncelle — drag/taşıma sonrası
export const saveChannelPlacements = async (updates) => {
  try {
    // updates: [{ id, categoryId, position }]
    await Promise.all(
      updates.map(({ id, categoryId, position }) =>
        supabase
          .from("channels")
          .update({ category_id: categoryId ?? null, position })
          .eq("id", id)
      )
    );
    return true;
  } catch (error) {
    console.error("Error saving channel placements:", error);
    toast.error("Kanal düzeni kaydedilemedi");
    return false;
  }
};

// ** Kategori işlemleri **

// Yeni kategori — ID client'ta üretilir (RETURNING/RLS tuzağı yok)
export const createCategory = async (serverID, { name, position }) => {
  try {
    const id = crypto.randomUUID();
    const { error } = await supabase.from("channel_categories").insert({
      id,
      server_id: serverID,
      name: name || "Yeni Kategori",
      position: position ?? 0,
    });
    if (error) throw error;
    return { id, name: name || "Yeni Kategori", position: position ?? 0 };
  } catch (error) {
    console.error("Error creating category:", error);
    toast.error("Kategori oluşturulamadı");
    return null;
  }
};

export const renameCategory = async (categoryID, name) => {
  try {
    const { error } = await supabase
      .from("channel_categories")
      .update({ name })
      .eq("id", categoryID);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error renaming category:", error);
    toast.error("Kategori adı güncellenemedi");
    return false;
  }
};

// Kategori sil — içindeki kanallar FK ON DELETE SET NULL ile kategorisiz kalır
export const deleteCategory = async (categoryID) => {
  try {
    const { error } = await supabase
      .from("channel_categories")
      .delete()
      .eq("id", categoryID);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error deleting category:", error);
    toast.error("Kategori silinemedi");
    return false;
  }
};

export const reorderCategories = async (updates) => {
  try {
    // updates: [{ id, position }]
    await Promise.all(
      updates.map(({ id, position }) =>
        supabase.from("channel_categories").update({ position }).eq("id", id)
      )
    );
    return true;
  } catch (error) {
    console.error("Error reordering categories:", error);
    toast.error("Kategori sırası kaydedilemedi");
    return false;
  }
};
