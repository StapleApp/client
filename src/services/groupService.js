import { supabase } from "../config/supabase";

// DM veya Group DM kanal bilgisini getir
export const getGroupById = async (channelId) => {
  try {
    const { data: channel, error } = await supabase
      .from("channels")
      .select("*")
      .eq("id", channelId)
      .in("type", ["dm", "group_dm"])
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        console.warn("No channel found with ID:", channelId);
        return null;
      }
      throw error;
    }

    // Kanal üyelerini getir
    const { data: members } = await supabase
      .from("channel_members")
      .select("user_id")
      .eq("channel_id", channelId);

    // Firebase uyumlu format
    return {
      id: channel.id,
      groupName: channel.name || "",
      type: channel.type,
      users: (members || []).map((m) => m.user_id),
      created_at: channel.created_at,
    };
  } catch (error) {
    console.error("Error fetching group by ID:", error);
    return null;
  }
};

// Yeni DM veya Group DM oluştur
export async function createGroup(groupName, users) {
  try {
    const type = users.length === 2 ? "dm" : "group_dm";

    // Kanal ID'sini client'ta üret → INSERT'te RETURNING'e gerek kalmaz.
    // (DM kanalının SELECT RLS politikası "kanal üyesi olmak" ister; üyeler
    //  henüz eklenmediği için returning satırı gizlenir ve .single() patlardı.)
    const channelId = crypto.randomUUID();

    const { error: channelError } = await supabase.from("channels").insert({
      id: channelId,
      type,
      name: type === "group_dm" ? groupName : null,
      server_id: null,
    });

    if (channelError) throw channelError;

    // Üyeleri ekle
    const memberRows = users.map((userId) => ({
      channel_id: channelId,
      user_id: userId,
    }));

    const { error: membersError } = await supabase
      .from("channel_members")
      .insert(memberRows);

    if (membersError) throw membersError;

    return channelId;
  } catch (error) {
    console.error("Error creating group:", error);
    throw error;
  }
}

// İki kullanıcı arasındaki mevcut DM kanalını bul
export const findDMGroup = async (user1Id, user2Id) => {
  try {
    // user1'in DM kanallarını bul
    const { data: user1Channels, error } = await supabase
      .from("channel_members")
      .select("channel_id")
      .eq("user_id", user1Id);

    if (error) throw error;
    if (!user1Channels || user1Channels.length === 0) return null;

    const channelIds = user1Channels.map((c) => c.channel_id);

    // Bu kanallardan user2'nin de üyesi olduğu DM kanalını bul
    const { data: sharedChannels, error: sharedError } = await supabase
      .from("channel_members")
      .select("channel_id")
      .eq("user_id", user2Id)
      .in("channel_id", channelIds);

    if (sharedError) throw sharedError;
    if (!sharedChannels || sharedChannels.length === 0) return null;

    // Bu kanallardan type='dm' olanı bul
    for (const sc of sharedChannels) {
      const { data: channel } = await supabase
        .from("channels")
        .select("*")
        .eq("id", sc.channel_id)
        .eq("type", "dm")
        .single();

      if (channel) {
        const { data: members } = await supabase
          .from("channel_members")
          .select("user_id")
          .eq("channel_id", channel.id);

        return {
          id: channel.id,
          groupName: channel.name || "",
          type: channel.type,
          users: (members || []).map((m) => m.user_id),
        };
      }
    }

    return null;
  } catch (error) {
    console.error("Error finding DM group:", error);
    return null;
  }
};

// İki kullanıcı arasındaki DM kanalını bul, yoksa oluştur → kanal ID döndürür
export const getOrCreateDMChannel = async (user1Id, user2Id) => {
  const existing = await findDMGroup(user1Id, user2Id);
  if (existing) return existing.id;
  return await createGroup(null, [user1Id, user2Id]);
};

// DM'lere genel bakış: karşı kullanıcı ID'sine göre son mesaj + okunmamış sayısı.
// Migration (last_read_at) yoksa graceful boş döner — DM'ler yine çalışır.
export const getDMOverview = async (userId) => {
  try {
    const { data: myRows, error } = await supabase
      .from("channel_members")
      .select("channel_id, last_read_at")
      .eq("user_id", userId);
    if (error) throw error;
    if (!myRows || myRows.length === 0) return {};

    const channelIds = myRows.map((r) => r.channel_id);
    const lastReadMap = {};
    myRows.forEach((r) => (lastReadMap[r.channel_id] = r.last_read_at));

    const { data: dmChannels } = await supabase
      .from("channels")
      .select("id, type")
      .in("id", channelIds)
      .eq("type", "dm");

    const result = {}; // otherUserId -> { channelId, lastContent, lastType, lastAt, lastSenderId, unread }

    await Promise.all(
      (dmChannels || []).map(async (ch) => {
        const { data: mem } = await supabase
          .from("channel_members")
          .select("user_id")
          .eq("channel_id", ch.id)
          .neq("user_id", userId);
        const otherId = mem?.[0]?.user_id;
        if (!otherId) return;

        const { data: lastMsgs } = await supabase
          .from("messages")
          .select("content, type, created_at, sender_id")
          .eq("channel_id", ch.id)
          .order("created_at", { ascending: false })
          .limit(1);
        const last = lastMsgs?.[0] || null;

        let unread = 0;
        if (last) {
          let q = supabase
            .from("messages")
            .select("id", { count: "exact", head: true })
            .eq("channel_id", ch.id)
            .neq("sender_id", userId);
          const lastRead = lastReadMap[ch.id];
          if (lastRead) q = q.gt("created_at", lastRead);
          const { count } = await q;
          unread = count || 0;
        }

        result[otherId] = {
          channelId: ch.id,
          lastContent: last?.content || "",
          lastType: last?.type || "text",
          lastAt: last?.created_at || null,
          lastSenderId: last?.sender_id || null,
          unread,
        };
      })
    );

    return result;
  } catch (error) {
    console.error("Error building DM overview:", error);
    return {};
  }
};

// DM kanalını okundu işaretle (last_read_at = now)
export const markDmRead = async (channelId, userId) => {
  try {
    await supabase
      .from("channel_members")
      .update({ last_read_at: new Date().toISOString() })
      .eq("channel_id", channelId)
      .eq("user_id", userId);
  } catch (error) {
    console.error("Error marking DM read:", error);
  }
};

// Kullanıcının tüm DM kanallarını getir
export const getUserDMChannels = async (userId) => {
  try {
    const { data: memberRows, error } = await supabase
      .from("channel_members")
      .select("channel_id")
      .eq("user_id", userId);

    if (error) throw error;
    if (!memberRows || memberRows.length === 0) return [];

    const channelIds = memberRows.map((m) => m.channel_id);

    const { data: channels, error: channelError } = await supabase
      .from("channels")
      .select("*")
      .in("id", channelIds)
      .in("type", ["dm", "group_dm"]);

    if (channelError) throw channelError;

    // Her kanal için üyeleri getir
    const result = [];
    for (const channel of channels || []) {
      const { data: members } = await supabase
        .from("channel_members")
        .select("user_id")
        .eq("channel_id", channel.id);

      result.push({
        id: channel.id,
        groupName: channel.name || "",
        type: channel.type,
        users: (members || []).map((m) => m.user_id),
        created_at: channel.created_at,
      });
    }

    return result;
  } catch (error) {
    console.error("Error getting user DM channels:", error);
    return [];
  }
};
