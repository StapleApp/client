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

// ** Arkadaş Ekleme **
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
    console.log("Friend added successfully");

    // Create a notification for the target user
    try {
      const senderDoc = await getDoc(doc(db, "Users", uid));
      const senderName = senderDoc.exists()
        ? senderDoc.data().nickName || senderDoc.data().name
        : "Birisi";

      await createNotification(friendID, {
        type: "friend",
        user: senderName,
        message: "Size arkadaşlık isteği gönderdi",
        read: false,
      });
    } catch (notifError) {
      // Don't fail the friend add if notification fails
      console.warn("Could not create notification:", notifError);
    }
  } catch (error) {
    console.error("Error adding/updating friend:", error);
  }
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
        .filter(([_, info]) => info.relation === "Friend")
        .map(([uid, info]) => ({
          uid,
          ...info,
        }));

      return filteredFriendsArray;
    } else {
      console.log("No such user document!");
      return [];
    }
  } catch (error) {
    console.error("Error getting friends list:", error);
    return [];
  }
};
