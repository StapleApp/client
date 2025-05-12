// src/contexts/AuthContext.js

import { createContext, useContext, useState, useEffect } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";

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
    // Firebase Auth dinleyicisi
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);

      if (user) {
        setCurrentUser(user);
        try {
          const userRef = doc(db, "Users", user.uid);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            setUserData(userSnap.data());
          } else {
            setUserData(null);
          }
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

    return () => unsubscribe(); // Temizlik
  }, [auth, db]);

  return (
    <AuthContext.Provider value={{ currentUser, userData, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// 3. Custom hook: Context'e erişimi kolaylaştırır
export const useAuth = () => useContext(AuthContext);
