// Sunucu rol izinleri — tek kaynak. roles.permissions text[] içinde bu anahtarlar tutulur.
// ADMINISTRATOR tüm izinleri kapsar; sunucu sahibi her zaman tam yetkilidir.

export const PERMISSIONS = {
  ADMINISTRATOR: {
    label: "Yönetici",
    desc: "Tüm izinlere sahip olur ve tüm kısıtlamaları geçer.",
  },
  MANAGE_CHANNELS: {
    label: "Kanalları Yönet",
    desc: "Kanal ve kategori ekle, sil, yeniden adlandır, taşı.",
  },
  MANAGE_ROLES: {
    label: "Rolleri Yönet",
    desc: "Rol oluştur, düzenle, sil ve üyelere rol ata.",
  },
  KICK_MEMBERS: {
    label: "Üyeleri At",
    desc: "Üyeleri sunucudan çıkar.",
  },
  MANAGE_SERVER: {
    label: "Sunucuyu Yönet",
    desc: "Sunucu adı, açıklaması ve ayarlarını değiştir.",
  },
  MANAGE_MESSAGES: {
    label: "Mesajları Yönet",
    desc: "Başkalarının mesajlarını sil.",
  },
};

// UI'da gösterim sırası (Yönetici en üstte, geri kalanlar mantıksal grupta)
export const PERMISSION_ORDER = [
  "ADMINISTRATOR",
  "MANAGE_SERVER",
  "MANAGE_ROLES",
  "MANAGE_CHANNELS",
  "MANAGE_MESSAGES",
  "KICK_MEMBERS",
];

// Yeni sunucuda oluşturulan varsayılan roller
export const DEFAULT_ADMIN_PERMISSIONS = ["ADMINISTRATOR"];
export const DEFAULT_MEMBER_PERMISSIONS = [];

// Bir kullanıcının belirli bir izne sahip olup olmadığını hesapla.
// serverData: getServerById çıktısı (ServerOwnerID, Users[], Roles[]).
export const hasPermission = (serverData, userId, permission) => {
  if (!serverData || !userId) return false;
  // Sahip her zaman tam yetkili
  if (serverData.ServerOwnerID === userId) return true;

  const membership = (serverData.Users || []).find((u) => u.UserID === userId);
  if (!membership) return false;

  const role = (serverData.Roles || []).find((r) => r.RoleID === membership.RoleID);
  if (!role) return false;

  const perms = role.Permissions || [];
  return perms.includes("ADMINISTRATOR") || perms.includes(permission);
};

// Bir üyenin sahip mi olduğunu (owner) döndürür
export const isServerOwner = (serverData, userId) =>
  !!serverData && !!userId && serverData.ServerOwnerID === userId;
