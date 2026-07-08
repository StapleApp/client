import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../config/supabase";
import { ensureUserDoc, getUser, deleteUserDoc } from "../services/userService";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Re-fetch the current user's profile (after profile edits, etc.)
  const refreshUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const data = await getUser(user.id);
      setUserData(data);
    }
  };

  // Hesabı tamamen sil
  const deleteAccount = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, reason: "no-user" };
    try {
      // Önce Firestore/Supabase verisini sil
      await deleteUserDoc(user.id);
      // NOT: Supabase'de client-side auth user silme mümkün değil.
      // Bu işlem bir Edge Function veya admin API ile yapılmalı.
      // Şimdilik sadece profili silip çıkış yapıyoruz.
      await supabase.auth.signOut();
      localStorage.removeItem("user");
      sessionStorage.removeItem("user");
      setCurrentUser(null);
      setUserData(null);
      return { ok: true };
    } catch (error) {
      console.error("Delete account error:", error);
      return { ok: false, reason: error.message || "unknown" };
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.removeItem("user");
      sessionStorage.removeItem("user");
      setCurrentUser(null);
      setUserData(null);
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  useEffect(() => {
    // Safety net: if Supabase never responds, don't leave the app blank forever
    const failSafe = setTimeout(() => setLoading(false), 5000);

    // İlk oturum kontrolü
    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        // currentUser'a Supabase user'ı ata, ama Firebase uyumlu alanlar ekle
        const user = session.user;
        setCurrentUser({
          uid: user.id,
          email: user.email,
          displayName: user.user_metadata?.full_name || "",
          photoURL: user.user_metadata?.avatar_url || "",
          ...user,
        });

        try {
          const data = await ensureUserDoc(user);
          setUserData(data);
        } catch (error) {
          console.error("Supabase kullanıcı verisi alınamadı:", error);
          setUserData(null);
        }
      }

      clearTimeout(failSafe);
      setLoading(false);
    };

    initSession();

    // Auth state değişikliklerini dinle
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          const user = session.user;
          setCurrentUser({
            uid: user.id,
            email: user.email,
            displayName: user.user_metadata?.full_name || "",
            photoURL: user.user_metadata?.avatar_url || "",
            ...user,
          });

          try {
            const data = await ensureUserDoc(user);
            setUserData(data);
          } catch (error) {
            console.error("Supabase kullanıcı verisi alınamadı:", error);
            setUserData(null);
          }

          setLoading(false);
        } else if (event === "SIGNED_OUT") {
          setCurrentUser(null);
          setUserData(null);
          setLoading(false);
        } else if (event === "TOKEN_REFRESHED") {
          // Token yenilemesinde loading tetikleme — aktif oturumları bozmaz
        }
      }
    );

    return () => {
      clearTimeout(failSafe);
      subscription?.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, userData, loading, signOut, refreshUserData, deleteAccount }}>
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
