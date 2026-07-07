// src/contexts/AuthContext.js

import { createContext, useContext, useState, useEffect } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { ensureUserDoc } from "../../firebase";

// 1. Context oluştur
const AuthContext = createContext();

// 2. Provider bileşeni
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);     // Firebase Auth kullanıcısı
  const [userData, setUserData] = useState(null);           // Firestore'daki ek kullanıcı verisi
  const [loading, setLoading] = useState(true);             // Veriler yükleniyor mu?

  const auth = getAuth();
  const db = getFirestore();

  useEffect(() => {
    // Safety net: if Firebase never responds (e.g. missing/invalid config),
    // don't leave the whole app blank forever — stop loading after a timeout.
    const failSafe = setTimeout(() => setLoading(false), 5000);

    // Firebase Auth dinleyicisi
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      clearTimeout(failSafe);
      setLoading(true);

      if (user) {
        setCurrentUser(user);
        try {
          // Doküman varsa getir, yoksa otomatik oluştur (güvenlik ağı)
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
    }; // Temizlik
  }, [auth, db]);

  return (
    <AuthContext.Provider value={{ currentUser, userData, loading }}>
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

// 3. Custom hook: Context'e erişimi kolaylaştırır
export const useAuth = () => useContext(AuthContext);
