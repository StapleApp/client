import { supabase } from "../config/supabase";
import toast from "react-hot-toast";

// ** Rol oluştur ** → oluşturulan satırı döndürür
export const createRole = async (serverId, { name, color, permissions, position }) => {
  try {
    const { data, error } = await supabase
      .from("roles")
      .insert({
        server_id: serverId,
        name: name || "Yeni Rol",
        color: color || "#B9BBBE",
        permissions: permissions || [],
        position: position ?? 1,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error creating role:", error);
    toast.error("Rol oluşturulamadı");
    return null;
  }
};

// ** Rolü güncelle (isim / renk / izinler — verilen alanlar) **
export const updateRole = async (roleId, { name, color, permissions }) => {
  try {
    const patch = {};
    if (name !== undefined) patch.name = name;
    if (color !== undefined) patch.color = color;
    if (permissions !== undefined) patch.permissions = permissions;
    if (Object.keys(patch).length === 0) return true;

    const { error } = await supabase.from("roles").update(patch).eq("id", roleId);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error updating role:", error);
    toast.error("Rol güncellenemedi");
    return false;
  }
};

// ** Rolü sil ** — role_id FK'si ON DELETE SET NULL, o roldeki üyeler rolsüz kalır
export const deleteRole = async (roleId) => {
  try {
    const { error } = await supabase.from("roles").delete().eq("id", roleId);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error deleting role:", error);
    toast.error("Rol silinemedi");
    return false;
  }
};

// ** Bir üyenin rolünü değiştir — SECURITY DEFINER RPC (MANAGE_ROLES kontrolü içeride) **
export const assignMemberRole = async (serverId, userId, roleId) => {
  try {
    const { error } = await supabase.rpc("set_member_role", {
      _server_id: serverId,
      _user_id: userId,
      _role_id: roleId,
    });
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error assigning role:", error);
    toast.error(error?.message || "Rol atanamadı");
    return false;
  }
};

// ** Üyeyi sunucudan at — RPC (KICK_MEMBERS kontrolü, sahip/kendini atma engelli) **
export const kickMember = async (serverId, userId) => {
  try {
    const { error } = await supabase.rpc("kick_server_member", {
      _server_id: serverId,
      _user_id: userId,
    });
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error kicking member:", error);
    toast.error(error?.message || "Üye atılamadı");
    return false;
  }
};
