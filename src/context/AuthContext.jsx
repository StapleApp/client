import { createContext, useContext, useState, useEffect } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";

// AuthContext: Uygulamanın herhangi bir yerinden erişilebilecek kullanıcı verisi sağlayan context
const AuthContext = createContext();

// AuthProvider bileşeni, tüm alt bileşenlere kullanıcı verisini sağlar
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);   // Firebase auth ile giriş yapan kullanıcı
  const [userData, setUserData] = useState(null);         // Firestore'dan çekilen kullanıcıya ait diğer bilgiler

  const auth = getAuth();          // Firebase authentication örneği
  const db = getFirestore();       // Firestore veritabanı örneği

  useEffect(() => {
    // Firebase üzerinden kullanıcı oturum durumunu izler
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Giriş yapan kullanıcı varsa state'e ata
        setCurrentUser(user);

        try {
          // Firestore'dan kullanıcı bilgilerini al
          const userDoc = await getDoc(doc(db, "Users", user.uid));
          if (userDoc.exists()) {
            setUserData(userDoc.data()); // Kullanıcı verisi mevcutsa state'e ata
          } else {
            setUserData(null); // Kullanıcı dokümanı yoksa null olarak ayarla
          }
        } catch (error) {
          console.error("Kullanıcı verisi alınamadı:", error);
          setUserData(null); // Hata oluşursa kullanıcı verisini sıfırla
        }
      } else {
        // Kullanıcı çıkış yaptıysa verileri sıfırla
        setCurrentUser(null);
        setUserData(null);
      }
    });

    // Bileşen unmount olduğunda dinleyiciyi iptal et
    return () => unsubscribe();
  }, [auth, db]);

  return (
    // Sağlanan context ile tüm çocuk bileşenler currentUser ve userData'ya erişebilir
    <AuthContext.Provider value={{ currentUser, userData }}>
      {children}
    </AuthContext.Provider>
  );
};

// useAuth: Diğer bileşenlerin kolayca AuthContext'e erişmesini sağlayan custom hook
export const useAuth = () => useContext(AuthContext);
