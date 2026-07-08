/**
 * ID Service — Supabase Migration
 *
 * Supabase, tüm tablolarda UUID kullanıyor ve uuid_generate_v4()
 * fonksiyonu ile otomatik üretiyor. Bu yüzden eski generateUniqueId
 * fonksiyonu artık gerekmemekte.
 *
 * Sadece friendship_code gibi insan-okunabilir kodlar için
 * generateFriendlyCode kullanılıyor.
 */

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/**
 * İnsan-okunabilir benzersiz kod üretir (friendship_code için).
 * Benzersizlik, Supabase tarafında UNIQUE constraint ile garanti altındadır.
 */
export const generateFriendlyCode = (length = 10) => {
  return Array.from(
    { length },
    () => CHARS[Math.floor(Math.random() * CHARS.length)]
  ).join("");
};

// Geriye uyumluluk — artık kullanılmıyor ama referansları kırmamak için export
export const generateUniqueId = async (_collectionName, _field, length = 10) => {
  return generateFriendlyCode(length);
};
