import { supabase, authCallbackUrl } from "../config/supabase";

// Tüm fonksiyonlar aynı şekli döndürür: { ok: boolean, ... , error?: string }
// Toast/yönlendirme sayfaların işi — servis sadece sonucu bildirir.

const messageFor = (error) => {
  const code = error?.code || "";
  const msg = (error?.message || "").toLowerCase();

  if (code === "invalid_credentials" || msg.includes("invalid login credentials"))
    return "E-posta veya şifre hatalı.";
  if (code === "email_not_confirmed" || msg.includes("email not confirmed"))
    return "E-posta adresin henüz doğrulanmamış.";
  if (code === "user_already_exists" || msg.includes("already registered"))
    return "Bu e-posta adresi zaten kayıtlı.";
  if (code === "weak_password" || msg.includes("password should be"))
    return "Şifre çok zayıf. En az 6 karakter kullan.";
  if (code === "over_email_send_rate_limit" || msg.includes("rate limit"))
    return "Çok fazla deneme yaptın. Birkaç dakika sonra tekrar dene.";
  if (msg.includes("failed to fetch") || msg.includes("network"))
    return "Sunucuya ulaşılamadı. İnternet bağlantını kontrol et.";

  return error?.message || "Beklenmeyen bir hata oluştu.";
};

// ** E-posta ile kayıt **
// İsim/soyisim/doğum tarihi metadata olarak gider; profil satırını
// handle_new_user trigger'ı bu metadata'dan doldurur.
export const register = async (name, surname, email, password, birthdate) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: authCallbackUrl(),
      data: {
        full_name: `${name} ${surname}`.trim(),
        name,
        surname,
        birthdate: birthdate || "",
      },
    },
  });

  if (error) return { ok: false, error: messageFor(error) };

  // Supabase, zaten kayıtlı bir e-postada (enumeration'ı önlemek için) hata
  // yerine identities'i boş bir user döndürür.
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    return { ok: false, error: "Bu e-posta adresi zaten kayıtlı." };
  }

  // Oturum geldiyse e-posta doğrulama kapalı demektir → doğrudan içeri alınır.
  return { ok: true, needsConfirmation: !data.session, user: data.user };
};

// ** Google ile giriş/kayıt **
// signInWithOAuth webview/tarayıcıyı Google'a yönlendirir; oturum /auth/callback'te kurulur.
//
// Masaüstünde (Tauri) OAuth dönüşü UYGULAMANIN kendi origin'ine (http://tauri.localhost)
// gelmeli. Aksi halde webview yayındaki web adresine (VITE_SITE_URL) yönlenir ve oturum
// o web origin'inin localStorage'ına yazılır → paketlenmiş uygulama (disk store) onu
// göremez, her açılışta tekrar giriş gerekir. (E-posta girişinde bu sorun yok çünkü
// signInWithPassword uygulama içinde çalışıp doğrudan store'a yazıyor.)
//
// NOT: Bu origin (http://tauri.localhost/auth/callback) Supabase → Authentication →
//      URL Configuration → Redirect URLs listesine EKLENMELİDİR.
const isTauri = () =>
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export const signInWithGoogle = async () => {
  const redirectTo = isTauri()
    ? `${window.location.origin}/auth/callback`
    : authCallbackUrl();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      queryParams: { prompt: "select_account" },
    },
  });

  if (error) return { ok: false, error: messageFor(error) };
  return { ok: true, data };
};

// ** E-posta ile giriş **
export const loginWithMail = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: messageFor(error) };
  return { ok: true, user: data.user };
};

// ** Şifre sıfırlama e-postası gönder **
export const sendPasswordReset = async (email) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${authCallbackUrl()}?type=recovery`,
  });
  if (error) return { ok: false, error: messageFor(error) };
  return { ok: true };
};

// ** Yeni şifreyi kaydet (recovery oturumu açıkken çağrılır) **
export const updatePassword = async (newPassword) => {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { ok: false, error: messageFor(error) };
  return { ok: true };
};

// ** Doğrulama e-postasını yeniden gönder **
export const resendConfirmation = async (email) => {
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: authCallbackUrl() },
  });
  if (error) return { ok: false, error: messageFor(error) };
  return { ok: true };
};
