// Varsayılan (hazır) görseller — dosyalar public/defaults/<tür>/ altında.
// Kullanıcı bu klasörleri doldurur; buradaki listeler dosya isimleriyle eşleşmeli.

const range = (n, dir) => Array.from({ length: n }, (_, i) => `/defaults/${dir}/${i}.png`);

// Profil avatarları (8 adet: 0-7)
export const DEFAULT_AVATARS = range(8, "avatars");
export const DEFAULT_AVATAR = "/defaults/avatars/1.png";

// Server ikonları / bannerları ve profil kartı bannerları (6'şar adet: 0-5)
export const DEFAULT_SERVER_ICONS = range(6, "server-icons");
export const DEFAULT_SERVER_BANNERS = range(6, "server-banners");
export const DEFAULT_PROFILE_BANNERS = range(6, "profile-banners");

export const DEFAULT_SERVER_ICON = DEFAULT_SERVER_ICONS[0];
export const DEFAULT_PROFILE_BANNER = DEFAULT_PROFILE_BANNERS[0];
