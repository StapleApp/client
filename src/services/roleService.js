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

// ** Bir üyenin rolünü değiştir (Faz 3'te üye menüsünden kullanılacak) **
export const assignMemberRole = async (serverId, userId, roleId) => {
  try {
    const { error } = await supabase
      .from("server_members")
      .update({ role_id: roleId })
      .eq("server_id", serverId)
      .eq("user_id", userId);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error assigning role:", error);
    toast.error("Rol atanamadı");
    return false;
  }
};
