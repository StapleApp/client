import {
  doc,
  setDoc,
  getDoc,
  collection,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { generateUniqueId } from "./idService";

// ** Friendship ID oluşturan fonksiyon **
export const createFriendshipID = () => generateUniqueId("Users", "friendshipID");

// **Kullanıcı bilgilerini Firestore'a yazma fonksiyonu**
export async function writeUserData(uid, name, surname, birthdate, email) {
  const friendshipID = await createFriendshipID();

  try {
    await setDoc(doc(db, "Users", uid), {
      userID: uid,
      photoURL: "",
      nickName: "",
      name: name,
      surname: surname,
      birthdate: birthdate,
      createdDate: serverTimestamp(),
      email: email,
      friendshipID: friendshipID,
      friends: {},
      servers: [],
      groups: [],
    });
  } catch (error) {
    console.error("Database write failed:", error);
  }
}

// ** Nickname Güncelleme **
export const UpdateNickname = async (uid, newValue, photo) => {
  try {
    const userDocRef = doc(db, "Users", uid);
    await updateDoc(userDocRef, {
      nickName: newValue,
      photoURL: photo,
    });
  } catch (error) {
    console.error("Database update failed:", error);
  }
};

// ** ID ile Kullanıcıya Ulaşma **
export const getUser = async (uid) => {
  try {
    const userDocRef = doc(collection(db, "Users"), uid);
    const userSnap = await getDoc(userDocRef);

    if (userSnap.exists()) {
      return userSnap.data();
    } else {
      console.warn("No user found with uid:", uid);
      return null;
    }
  } catch (error) {
    console.error("Error fetching user by uid:", error);
    return null;
  }
};

// Users dokümanı yoksa oluştur (kayıt sırasında yazılamamış hesaplar için güvenlik ağı)
export const ensureUserDoc = async (user) => {
  if (!user) return null;
  const userRef = doc(db, "Users", user.uid);
  const snap = await getDoc(userRef);
  if (snap.exists()) return snap.data();

  // Doküman yok → mevcut Auth bilgileriyle yenisini oluştur
  const friendshipID = await createFriendshipID();
  const nameParts = (user.displayName || "").trim().split(" ");
  const data = {
    userID: user.uid,
    photoURL: user.photoURL || "",
    nickName: "",
    name: nameParts[0] || "",
    surname: nameParts.slice(1).join(" ") || "",
    birthdate: "",
    createdDate: serverTimestamp(),
    email: user.email || "",
    friendshipID: friendshipID,
    friends: {},
    servers: [],
    groups: [],
  };

  try {
    await setDoc(userRef, data);
    console.warn("Missing user document created for", user.uid);
  } catch (error) {
    console.error("Failed to auto-create user document:", error);
    return null;
  }
  return data;
};

export const updateUserStatus = async (uid, status) => {
  try {
    const userDocRef = doc(db, "Users", uid);
    await updateDoc(userDocRef, { status });
  } catch (error) {
    console.error("Error updating status:", error);
  }
};

// ** Profil alanlarını güncelle (nickName, photoURL, about, vb.) **
export const updateUserProfile = async (uid, data) => {
  try {
    await updateDoc(doc(db, "Users", uid), data);
    return true;
  } catch (error) {
    console.error("Error updating profile:", error);
    return false;
  }
};
