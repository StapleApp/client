import { supabase } from "../config/supabase";
import toast from "react-hot-toast";

// **E-posta ile Kayıt Olma**
export const register = async (name, surname, email, password, birthdate, navigate) => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: `${name} ${surname}`.trim(),
        },
      },
    });

    if (error) throw error;

    // Profili güncelle (trigger sadece name ve email yazıyor)
    if (data.user) {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          name,
          surname,
          birthdate: birthdate || null,
        })
        .eq("id", data.user.id);

      if (profileError) {
        console.warn("Profile update after register failed:", profileError);
      }
    }

    toast.success("Kayıt başarılı!");
    navigate("/login");
    return data.user;
  } catch (error) {
    toast.error(error.message);
    console.error("Register error:", error.message);
    return null;
  }
};

// **Google ile giriş/kayıt fonksiyonu**
export const signInWithGoogle = async () => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + "/home",
      },
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Google Auth Error:", error);
    toast.error("Google ile giriş yapılırken bir hata oluştu.");
    throw error;
  }
};

// ** Login **
export const loginWithMail = async (email, password) => {
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    toast.success("Giriş başarılı!");
    return true;
  } catch (error) {
    console.error("Login error:", error.message);
    toast.error("Geçersiz e-posta veya şifre");
    return false;
  }
};

// ** Şifre sıfırlama **
export const handleResetPassword = async (email) => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/login",
    });
    if (error) throw error;
    toast.success("Şifre sıfırlama bağlantısı gönderildi!");
  } catch (error) {
    console.error("Hata: " + error.message);
    toast.error("Şifre sıfırlama bağlantısı gönderilemedi");
  }
};
