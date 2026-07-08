import { supabase } from "../config/supabase";
import toast from "react-hot-toast";

// ** Server oluştur (server + default role + default channels + owner membership) **
async function writeServerData(serverName, ownerID) {
  // 1. Sunucuyu oluştur
  const { data: server, error: serverError } = await supabase
    .from("servers")
    .insert({
      name: serverName,
      owner_id: ownerID,
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

  return server;
}

export const saveServerToFirestore = async (serverName, ownerID, navigate) => {
  try {
    await writeServerData(serverName, ownerID);
    toast.success("Server başarıyla oluşturuldu!");
    navigate("/home");
  } catch (error) {
    console.error("Error creating server:", error);
    toast.error("Failed to create server. Please try again.");
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
    };
  } catch (error) {
    console.error("Error fetching server by ID:", error);
    return null;
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

// Sunucunun kanal (Rooms) listesini güncelle
export const saveServerRooms = async (serverID, rooms) => {
  try {
    // Mevcut kanalları sil ve yenilerini ekle (basit upsert yaklaşımı)
    // Her room için upsert yap
    for (const room of rooms) {
      const channelData = {
        id: room.RoomID,
        server_id: serverID,
        name: room.RoomName,
        type: room.Type === "VoiceRoom" ? "voice" : "text",
        position: room.Position || 0,
      };

      // UUID formatında mı kontrol et — yeni kanallar timestamp ID ile geliyor olabilir
      const isUUID =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          room.RoomID
        );

      if (isUUID) {
        await supabase
          .from("channels")
          .upsert(channelData, { onConflict: "id" });
      } else {
        // Yeni kanal — ID'yi Supabase üretsin
        delete channelData.id;
        await supabase.from("channels").insert(channelData);
      }
    }

    // Artık listede olmayan kanalları sil
    const roomIds = rooms
      .map((r) => r.RoomID)
      .filter((id) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
      );

    if (roomIds.length > 0) {
      await supabase
        .from("channels")
        .delete()
        .eq("server_id", serverID)
        .not("id", "in", `(${roomIds.join(",")})`);
    }

    return true;
  } catch (error) {
    console.error("Error saving server rooms:", error);
    toast.error("Kanallar kaydedilemedi");
    return false;
  }
};
