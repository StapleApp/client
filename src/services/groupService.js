import {
  doc,
  getDoc,
  collection,
  addDoc,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import { db } from "../config/firebase";

export const getGroupById = async (groupID) => {
  try {
    const groupRef = doc(db, "Groups", groupID);
    const groupSnap = await getDoc(groupRef);

    if (groupSnap.exists()) {
      return { id: groupID, ...groupSnap.data() };
    } else {
      console.warn("No group found with ID:", groupID);
      return null;
    }
  } catch (error) {
    console.error("Error fetching group by ID:", error);
    return null;
  }
};

export async function createGroup(groupName, users) {
  try {
    const groupsCollectionRef = collection(db, "Groups");
    const docRef = await addDoc(groupsCollectionRef, {
      groupName,
      users,
      // NOTE: messages are now in a subcollection, not an array
    });

    for (const userId of users) {
      const userDocRef = doc(db, "Users", userId);
      await updateDoc(userDocRef, {
        groups: arrayUnion(docRef.id),
      });
    }

    return docRef.id;
  } catch (error) {
    console.error("Error creating group:", error);
    throw error;
  }
}
