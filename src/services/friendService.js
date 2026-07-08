import {
  doc,
  getDoc,
  getDocs,
  where,
  query,
  collection,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { createNotification } from "./notificationService";

// ** FriendshipID ile Kullanıcı Arama **
export const GetUserByFriendshipID = async (friendshipID) => {
  try {
    const usersRef = collection(db, "Users");
    const q = query(usersRef, where("friendshipID", "==", friendshipID));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const userData = querySnapshot.docs[0].data();
      return userData;
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error fetching user by friendshipID:", error);
    return null;
  }
};

// ** Arkadaş Ekleme (alt seviye: tek yönlü ilişki yazar, bildirim atmaz) **
export const AddFriend = async (uid, friendID, relation) => {
  try {
    const userRef = doc(db, "Users", uid);

    const newFriendData = {
      [`friends.${friendID}`]: {
        relation: relation,
        relationDate: serverTimestamp(),
      },
    };

    await updateDoc(userRef, newFriendData);
  } catch (error) {
    console.error("Error adding/updating friend:", error);
  }
};

// ** Arkadaşlık isteği gönder — sadece bildirim oluşturur. **
// İlişki, karşı taraf isteği kabul edince kurulur (acceptFriendRequest).
export const sendFriendRequest = async (fromUser, toUid) => {
  try {
    await createNotification(toUid, {
      type: "friend",
      user: fromUser.nickName || fromUser.name || "Birisi",
      fromUid: fromUser.userID,
      message: "Size arkadaşlık isteği gönderdi",
      read: false,
    });
    return true;
  } catch (error) {
    console.error("Error sending friend request:", error);
    return false;
  }
};

// ** Arkadaşlık isteğini kabul et — iki yönlü ilişkiyi kurar. **
export const acceptFriendRequest = async (myUid, fromUid) => {
  await AddFriend(myUid, fromUid, "Friend");
  await AddFriend(fromUid, myUid, "Friend");
};

// ** Arkadaş Listesine Ulaşma **
export const getFriendsList = async (uid) => {
  try {
    const userRef = doc(db, "Users", uid);
    const docSnap = await getDoc(userRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      const allFriends = data.friends || {};

      const filteredFriendsArray = Object.entries(allFriends)
        .filter(([, info]) => info.relation === "Friend")
        .map(([uid, info]) => ({
          uid,
          ...info,
        }));

      return filteredFriendsArray;
    } else {
      return [];
    }
  } catch (error) {
    console.error("Error getting friends list:", error);
    return [];
  }
};
