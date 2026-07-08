import { createContext, useContext, useState, useEffect } from "react";
import {
  getAuth,
  onAuthStateChanged,
  signOut as firebaseSignOut,
  deleteUser,
} from "firebase/auth";
import { ensureUserDoc, getUser, deleteUserDoc } from "../services/userService";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  const auth = getAuth();

  // Re-fetch the current user's Firestore doc (after profile edits, etc.)
  const refreshUserData = async () => {
    if (auth.currentUser) {
      const data = await getUser(auth.currentUser.uid);
      setUserData(data);
    }
  };

  // Hesabı tamamen sil: önce (giriş yapılıyken) Firestore verisi, sonra Auth kaydı.
  // Dönüş: { ok } veya { ok: false, reason }.
  const deleteAccount = async () => {
    const user = auth.currentUser;
    if (!user) return { ok: false, reason: "no-user" };
    try {
      // Auth kaydı silinince Firestore kuralları erişimi engeller — bu yüzden
      // önce dokümanı sileriz.
      await deleteUserDoc(user.uid);
      await deleteUser(user);
      localStorage.removeItem("user");
      sessionStorage.removeItem("user");
      setCurrentUser(null);
      setUserData(null);
      return { ok: true };
    } catch (error) {
      console.error("Delete account error:", error);
      return { ok: false, reason: error.code || "unknown" };
    }
  };

  // Sign out function — clears Firebase auth + localStorage + sessionStorage
  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      localStorage.removeItem("user");
      sessionStorage.removeItem("user");
      setCurrentUser(null);
      setUserData(null);
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  useEffect(() => {
    // Safety net: if Firebase never responds, don't leave the app blank forever
    const failSafe = setTimeout(() => setLoading(false), 5000);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      clearTimeout(failSafe);
      // NOT: burada setLoading(true) YOK. Aksi halde her token yenilemesinde
      // tüm uygulama ağacı yeniden mount olur (aktif sesli görüşme kopardı).

      if (user) {
        setCurrentUser(user);
        try {
          const data = await ensureUserDoc(user);
          setUserData(data);
        } catch (error) {
          console.error("Firestore kullanıcı verisi alınamadı:", error);
          setUserData(null);
        }
      } else {
        setCurrentUser(null);
        setUserData(null);
      }

      setLoading(false);
    });

    return () => {
      clearTimeout(failSafe);
      unsubscribe();
    };
  }, [auth]);

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
