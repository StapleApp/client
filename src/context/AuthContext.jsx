import { createContext, useContext, useState, useEffect, useRef } from "react";
import { supabase } from "../config/supabase";
import { ensureUserDoc, getUser } from "../services/userService";

const AuthContext = createContext();

// Supabase user'ını eski Firebase alan adlarıyla zenginleştir (UI bunlara bakıyor)
const toLegacyUser = (user) => ({
  uid: user.id,
  email: user.email,
  displayName: user.user_metadata?.full_name || "",
  photoURL: user.user_metadata?.avatar_url || "",
  ...user,
});

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  // Şifre sıfırlama bağlantısıyla gelindi mi? (/reset-password'a yönlendirmek için)
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  // Profili aynı kullanıcı için tekrar tekrar çekmeyelim (TOKEN_REFRESHED her
  // saat başı tetikleniyor; ensureUserDoc'u her seferinde çağırmak gereksiz).
  const profileLoadedFor = useRef(null);

  const refreshUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const data = await getUser(user.id);
    setUserData(data);
    return data;
  };

  // Hesabı tamamen sil — delete_own_account RPC'si auth.users satırını siler,
  // cascade ile profil ve tüm ilişkili veriler gider. Böylece e-posta boşalır
  // ve aynı adresle yeniden kayıt olunabilir.
  const deleteAccount = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, reason: "no-user" };
    try {
      const { error } = await supabase.rpc("delete_own_account");
      if (error) throw error;

      await supabase.auth.signOut();
      return { ok: true };
    } catch (error) {
      console.error("Delete account error:", error);
      return { ok: false, reason: error.message || "unknown" };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Sign out error:", error);
    }
    // onAuthStateChange SIGNED_OUT state'i temizler, ama sunucu hata verse bile
    // kullanıcıyı dışarıda bırakmak için burada da temizliyoruz.
    profileLoadedFor.current = null;
    setCurrentUser(null);
    setUserData(null);
  };

  useEffect(() => {
    let cancelled = false;

    // Supabase hiç cevap vermezse uygulama sonsuza kadar spinner'da kalmasın.
    // getSession lokal storage'dan okur, normalde anında döner.
    const failSafe = setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, 8000);

    const applySession = async (session) => {
      if (cancelled) return;
      const user = session?.user ?? null;

      if (!user) {
        profileLoadedFor.current = null;
        setCurrentUser(null);
        setUserData(null);
        setLoading(false);
        return;
      }

      setCurrentUser(toLegacyUser(user));

      if (profileLoadedFor.current !== user.id) {
        profileLoadedFor.current = user.id;
        try {
          const data = await ensureUserDoc(user);
          if (!cancelled) setUserData(data);
        } catch (error) {
          console.error("Supabase kullanıcı verisi alınamadı:", error);
          // Tekrar denenebilsin diye işareti geri al
          profileLoadedFor.current = null;
          if (!cancelled) setUserData(null);
        }
      }

      if (!cancelled) setLoading(false);
    };

    // onAuthStateChange abone olur olmaz INITIAL_SESSION ile mevcut oturumu
    // verir; detectSessionInUrl'in URL'deki token'ı işlemesini de bekler.
    // Bu yüzden ayrıca getSession() çağırmıyoruz — çift ensureUserDoc yarışı olurdu.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "PASSWORD_RECOVERY") setPasswordRecovery(true);
        if (event === "SIGNED_OUT") setPasswordRecovery(false);
        applySession(session);
      }
    );

    return () => {
      cancelled = true;
      clearTimeout(failSafe);
      subscription?.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userData,
        loading,
        passwordRecovery,
        clearPasswordRecovery: () => setPasswordRecovery(false),
        signOut,
        refreshUserData,
        deleteAccount,
      }}
    >
      {loading ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
            width: "100vw",
            color: "#EEEEEE",
            fontFamily: "sans-serif",
            gap: "12px",
          }}
        >
          <span
            style={{
              width: "20px",
              height: "20px",
              border: "3px solid #EEEEEE",
              borderTopColor: "transparent",
              borderRadius: "50%",
              display: "inline-block",
              animation: "staple-spin 0.8s linear infinite",
            }}
          />
          <span>Loading Staple…</span>
          <style>{`@keyframes staple-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
