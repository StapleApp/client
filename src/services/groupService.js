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

    // Kanal oluştur
    const { data: channel, error: channelError } = await supabase
      .from("channels")
      .insert({
        type,
        name: type === "group_dm" ? groupName : null,
        server_id: null,
      })
      .select()
      .single();

    if (channelError) throw channelError;

    // Üyeleri ekle
    const memberRows = users.map((userId) => ({
      channel_id: channel.id,
      user_id: userId,
    }));

    const { error: membersError } = await supabase
      .from("channel_members")
      .insert(memberRows);

    if (membersError) throw membersError;

    return channel.id;
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
