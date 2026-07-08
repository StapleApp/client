import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  where,
  query,
  collection,
  serverTimestamp,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import { db } from "../config/firebase";
import toast from "react-hot-toast";
import { generateUniqueId } from "./idService";

// ** Server ID oluşturan fonksiyon **
// Not: alan adı "ServerId" — eski kod "ServerID" sorguluyordu, bu yüzden
// benzersizlik kontrolü hiç çalışmıyordu (gizli çakışma riski). Düzeltildi.
const createServerID = () => generateUniqueId("Servers", "ServerId");

// ** Server verisi yazma **
async function writeServerData(serverName, ownerID) {
  const serverID = await createServerID();
  try {
    await setDoc(doc(db, "Servers", serverID), {
      ServerId: serverID,
      ServerName: serverName,
      ServerOwnerID: ownerID,
      ServerPhotoURL: "",
      ServerBannerURL: "",
      ServerDescription: "",
      ServerTags: [],
      ServerType: "Public",
      CreatedDate: serverTimestamp(),
      InviteLinks: [],
      Roles: [
        {
          RoleID: "0",
          RoleColor: "#FF5733",
          RoleName: "Admin",
          Permissions: [
            "MANAGE_MESSAGES",
            "BAN_MEMBERS",
            "MANAGE_ROLES",
          ],
        },
      ],
      Rooms: [
        {
          RoomID: "0",
          RoomName: "General",
          Type: "TextRoom",
          Position: 1,
        },
        {
          RoomID: "1",
          RoomName: "General",
          Type: "VoiceRoom",
          Position: 2,
        },
      ],
      Users: [
        {
          UserID: ownerID,
          RoleID: "0",
          JoinDate: 1234567890,
        },
      ],
    });
  } catch (error) {
    console.error("Database write failed:", error);
  }
}

export const saveServerToFirestore = async (serverName, ownerID, navigate) => {
  try {
    await writeServerData(serverName, ownerID);
    toast.success("Server başarıyla oluşturuldu!");
    navigate("/home");
  } catch (error) {
    console.error("Error creating server:", error);
    toast.error("Failed to create server. Please try again.");
  }
};

// Kullanıcının üyesi olduğu sunucuları getir — FIXED: batch query instead of fetching all
export const getServersList = async (uid) => {
  try {
    // First get the user's server IDs from their document
    const userDoc = await getDoc(doc(db, "Users", uid));
    if (!userDoc.exists()) return [];
    const serverIds = userDoc.data().servers || [];
    if (serverIds.length === 0) {
      // Fallback: also check the old way for servers where user is in Users array
      // but the server ID wasn't saved to the user's servers array
      const serversRef = collection(db, "Servers");
      const querySnapshot = await getDocs(serversRef);
      const userServers = [];
      querySnapshot.forEach((doc) => {
        const serverData = doc.data();
        const users = serverData.Users || [];
        const isMember = users.some((user) => user.UserID === uid);
        if (isMember) {
          userServers.push({
            serverID: doc.id,
            ...serverData,
          });
        }
      });

      // Kendini onar: bulunan sunucuları kullanıcının servers dizisine yaz,
      // böylece bir dahaki sefere tam koleksiyon taraması gerekmez.
      if (userServers.length > 0) {
        try {
          await updateDoc(doc(db, "Users", uid), {
            servers: userServers.map((s) => s.serverID),
          });
        } catch (healError) {
          console.warn("Could not persist server list to user doc:", healError);
        }
      }

      return userServers;
    }

    // Fetch only those specific servers (batch in groups of 10 for Firestore 'in' limit)
    const results = [];
    for (let i = 0; i < serverIds.length; i += 10) {
      const batch = serverIds.slice(i, i + 10);
      const q = query(
        collection(db, "Servers"),
        where("ServerId", "in", batch)
      );
      const snap = await getDocs(q);
      snap.forEach((d) =>
        results.push({ serverID: d.id, ...d.data() })
      );
    }
    return results;
  } catch (error) {
    console.error("Error getting servers list:", error);
    return [];
  }
};

export const getServerById = async (serverID) => {
  try {
    const serverRef = doc(db, "Servers", serverID);
    const serverSnap = await getDoc(serverRef);
    if (serverSnap.exists()) {
      return serverSnap.data();
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error fetching server by ID:", error);
    return null;
  }
};

// Herkese açık sunucuları getir (keşfet / arama sayfası için)
export const getPublicServers = async () => {
  try {
    const q = query(
      collection(db, "Servers"),
      where("ServerType", "==", "Public")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((d) => {
      const data = d.data();
      return {
        serverID: d.id,
        name: data.ServerName,
        description: data.ServerDescription || "",
        tags: data.ServerTags || [],
        photo: data.ServerPhotoURL || "",
        ownerID: data.ServerOwnerID,
        memberCount: Array.isArray(data.Users) ? data.Users.length : 0,
      };
    });
  } catch (error) {
    console.error("Error fetching public servers:", error);
    return [];
  }
};

// Sunucuya katıl
export const joinServer = async (serverID, uid) => {
  try {
    const serverRef = doc(db, "Servers", serverID);
    const serverSnap = await getDoc(serverRef);
    if (!serverSnap.exists()) {
      toast.error("Sunucu bulunamadı");
      return false;
    }

    const serverData = serverSnap.data();
    const alreadyMember = (serverData.Users || []).some(
      (u) => u.UserID === uid
    );
    if (alreadyMember) {
      toast("Zaten bu sunucudasın");
      return true;
    }

    await updateDoc(serverRef, {
      Users: arrayUnion({
        UserID: uid,
        RoleID: "member",
        JoinDate: Date.now(),
      }),
    });

    // Kullanıcının sunucu listesine de ekle
    await updateDoc(doc(db, "Users", uid), {
      servers: arrayUnion(serverID),
    });

    toast.success("Sunucuya katıldın!");
    return true;
  } catch (error) {
    console.error("Error joining server:", error);
    toast.error("Sunucuya katılırken bir hata oluştu");
    return false;
  }
};

// Sunucunun kanal (Rooms) listesini güncelle
export const saveServerRooms = async (serverID, rooms) => {
  try {
    await updateDoc(doc(db, "Servers", serverID), { Rooms: rooms });
    return true;
  } catch (error) {
    console.error("Error saving server rooms:", error);
    toast.error("Kanallar kaydedilemedi");
    return false;
  }
};
