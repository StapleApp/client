import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../config/firebase";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/**
 * Verilen koleksiyonda `field` alanına göre benzersiz, rastgele bir ID üretir.
 * (createFriendshipID / createServerID'nin ortak hâli.)
 */
export const generateUniqueId = async (collectionName, field, length = 10) => {
  const ref = collection(db, collectionName);
  let id;
  let isUnique = false;

  while (!isUnique) {
    id = Array.from(
      { length },
      () => CHARS[Math.floor(Math.random() * CHARS.length)]
    ).join("");
    const snapshot = await getDocs(query(ref, where(field, "==", id)));
    if (snapshot.empty) {
      isUnique = true;
    }
  }

  return id;
};
