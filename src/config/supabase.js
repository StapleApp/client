import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "Missing Supabase env vars. Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file."
  );
}

// detectSessionInUrl, istemci ilk kurulduğunda adres çubuğundaki token'ı
// tüketip URL'i temizler. Bu yüzden hash/query'yi ONDAN ÖNCE yakalıyoruz —
// /auth/callback sayfası "recovery mi, hata mı?" sorusunu buradan cevaplıyor.
export const initialAuthUrl = {
  hash: typeof window !== "undefined" ? window.location.hash : "",
  search: typeof window !== "undefined" ? window.location.search : "",
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // E-posta / OAuth dönüşlerindeki token'ı otomatik oturuma çevir
    detectSessionInUrl: true,
    // implicit: token URL hash'inde gelir. PKCE'nin aksine bağlantı başka bir
    // tarayıcıda açılsa da çalışır (code verifier localStorage'a bağlı değil).
    flowType: "implicit",
    storageKey: "staple-auth",
  },
});

// Doğrulama/OAuth dönüş adresinin kökü.
// Dev sunucusunda daima mevcut origin (localhost) kullanılır — .env'deki prod
// adresi yüzünden doğrulama bağlantısı canlı siteye gitmesin.
export const siteUrl = () => {
  if (import.meta.env.DEV) return window.location.origin;
  return (import.meta.env.VITE_SITE_URL || window.location.origin).replace(/\/$/, "");
};

export const authCallbackUrl = () => `${siteUrl()}/auth/callback`;
