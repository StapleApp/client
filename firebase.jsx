import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail,signInWithEmailAndPassword} from "firebase/auth";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, doc, setDoc, getDocs, getDoc, where, query, collection, serverTimestamp, updateDoc, addDoc, arrayUnion, onSnapshot } from "firebase/firestore"; 
import toast from 'react-hot-toast';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL
};


// ** Firebase başlat **
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider_google = new GoogleAuthProvider();
const db = getFirestore(app); 


// **E-posta ile Kayıt Olma**
export const register = async (name, surname, email, password, birthdate, navigate) => {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        //await sendEmailVerification(user);
        toast.success("Verification email sent! Please check your inbox.");
        
        const checkEmailVerification = setInterval(async () => {
            await user.reload();
            if (true) { //user.emailVerified
                clearInterval(checkEmailVerification);
                toast.success("Email Confirmed");

                await writeUserData(user.uid, name, surname, birthdate ,user.email,user.photoURL);
                
                navigate("/login");
                window.location.reload()
            }
        }, 3000);
        return user;
    } catch (error) {
        toast.error(error.message);
        console.error("Error:", error.message);
        return null;
    }
};

// **Google ile kayıt fonksiyonu**
export const signInWithGoogle = async (navigate) => {
    try {
        const result = await signInWithPopup(auth, provider_google);
        const user = result.user;

        const userName = user.displayName.split(" ")[0];
        const userSurname = user.displayName.split(" ")[1];
        
        const usersRef = collection(db, "Users");
        
        // Kullanıcıyı Firestore'da ara
        const q = query(usersRef, where("email", "==", user.email));
        const querySnapshot = await getDocs(q);

        // Eğer kullanıcı zaten varsa, direk "home" sayfasına geç
        if (!querySnapshot.empty) {
            console.log("User already exists, redirecting to home.");
            navigate("/home");
            return user; // 🔥 Burada user'ı dön
        }

        // Eğer kullanıcı yoksa, Firestore'a ekle ve "home" sayfasına geç
        await writeUserData(user.uid, userName, userSurname, "--", user.email);

        return user; // 🔥 Yeni kullanıcıyı da dön
    } catch (error) {
        console.error("Google Auth Error:", error);
        toast.error("An error occurred while signing in with Google.");
        throw error; // Hata dışa fırlatılmalı ki try-catch yakalayabilsin
    }
};

export const saveServerToFirestore = async (serverName, ownerID, navigate) => {
    try {
        console.log("Saving server to Firestore:", serverName, ownerID);
        await writeServerData(serverName, ownerID);
        toast.success("Server başarıyla oluşturuldu!");
        navigate("/home");
    } catch (error) {
        console.error("Error creating server:", error);
        toast.error("Failed to create server. Please try again.");
    }
}


// **Kullanıcı bilgilerini Firestore'a yazma fonksiyonu**
async function writeUserData(uid, name, surname,birthdate, email) {
    const friendshipID = await createFriendshipID();
    
    try {
        await setDoc(doc(db, "Users", uid), {
            userID: uid,
            photoURL: "",
            nickName:"",
            name: name,
            surname: surname,
            bithdate:birthdate,
            createdDate:serverTimestamp(),
            email: email,
            friendshipID: friendshipID,
            friends: {},
            servers: [],
            groups: []
        });

        console.log("User data added to Firestore");
    } catch (error) {
        console.error("Database write failed:", error);
    }
}

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
                        "MANAGE_ROLES"
                    ]
                }
            ],
            Rooms: [
                {
                    RoomID: "0",
                    RoomName: "General",
                    Type: "TextRoom",
                    Position: 1,
                    Messages: [
                        {
                            MessageID: "1",
                            SenderID: "1",
                            SendDate: 1234567890,
                            Type: "sent",
                            Message: "Hello, how are you?"
                        },
                        {
                            MessageID: "2",
                            SenderID: "1",
                            SendDate: 1234567891,
                            Type: "edited",
                            Message: "Hello, how are you doing?"
                        },
                        {
                            MessageID: "3",
                            SenderID: "1",
                            SendDate: 1234567892,
                            Type: "deleted",
                            Message: ""
                        }
                    ]
                },
                {
                    RoomID: "1",
                    RoomName: "General",
                    Type: "VoiceRoom",
                    Position: 2,
                    GroupName: "",
                }

            ],
            Users: [
                {
                    UserID: ownerID,
                    RoleID: "0",
                    JoinDate: 1234567890
                }
            ]
        });

        console.log("Server data added to Firestore");
    } catch (error) {
        console.error("Database write failed:", error);
    }
}

// ** Login **
export const loginWithMail = async (email, password, navigate) => {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        toast.success("Login successful!");
        return true;
    } catch (error) {
        console.error("Login error:", error.message);
        toast.error("Invalid email or password");
        return false;
    }
};

// ** Şifre sıfırlama **
export const handleResetPassword = async (email) => {
    try {
        await sendPasswordResetEmail(auth, email);
        console.log("Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.");
    } catch (error) {
        console.log("Hata: " + error.message);
    }
};

// ** Friendship ID oluşturan fonksiyon **
const createFriendshipID = async () => {
    const usersRef = collection(db, "Users"); 
    let friendshipID;
    let isUnique = false;
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    while (!isUnique) {
        friendshipID = Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");        
        const q = query(usersRef, where("friendshipID", "==", friendshipID));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            isUnique = true; 
        }
    }

    return friendshipID; 
};


const createServerID = async () => {
      const usersRef = collection(db, "Servers"); 
      let ServerID;
      let isUnique = false;
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  
      while (!isUnique) {
          ServerID = Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");        
          const q = query(usersRef, where("ServerID", "==", ServerID));
          const querySnapshot = await getDocs(q);
  
          if (querySnapshot.empty) {
              isUnique = true; 
          }
      }
    return ServerID;
}

// ** Nickname Güncelleme **
export const UpdateNickname = async (uid, newValue) => {
    try {
        const userDocRef = doc(db, "Users", uid);
        await updateDoc(userDocRef, {
            nickName: newValue
        });

        console.log("User name updated in Firestore");
    } catch (error) {
        console.error("Database update failed:", error);
    }
};

// ** FrinedshipID ile Kullanıcı Arama ** 
export const GetUserByFriendshipID = async (friendshipID) => {
    try {
        const usersRef = collection(db, "Users");
        const q = query(usersRef, where("friendshipID", "==", friendshipID));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const userData = querySnapshot.docs[0].data(); // İlk eşleşen kaydı al
            return userData; // Kullanıcı verisini döndür
        } else {
            return null; // Kullanıcı bulunamadı
        }
    } catch (error) {
        console.error("Error fetching user by friendshipID:", error);
        return null; // Hata durumunda null döndür
    }
};

// ** Arkadaş Ekleme **
export const AddFriend = async (uid,friendID,relation) => {
    try {
        const userRef = doc(db, "Users", uid);

        // Yeni arkadaş verisi
        const newFriendData = {
            [`friends.${friendID}`]: {
                relation: relation,
                relationDate: serverTimestamp()
            }
        };

        await updateDoc(userRef, newFriendData);
        console.log("Friend added successfully");
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

            // "Friend" olanları dizi olarak döndür
            const filteredFriendsArray = Object.entries(allFriends)
                .filter(([_, info]) => info.relation === "Friend")
                .map(([uid, info]) => ({
                    uid,
                    ...info
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

// Kullanıcının üyesi olduğu sunucuları getir
export const getServersList = async (uid) => {
    try {
        
        const serversRef = collection(db, "Servers");
        const querySnapshot = await getDocs(serversRef);

        const userServers = [];

        querySnapshot.forEach((doc) => {
            const serverData = doc.data();
            const users = serverData.Users || [];

            const isMember = users.some(user => user.UserID === uid);

            if (isMember) {
                userServers.push({
                    serverID: doc.id, // belge ID'si
                    ...serverData
                });
            }
        });

        return userServers;
    } catch (error) {
        console.error("Error getting servers list:", error);
        return [];
    }
}


// ** ID ile Kullanıcıya Ulaşma **
export const getUser = async (uid) => {
    try {
        const userDocRef = doc(collection(db, "Users"), uid);
        const userSnap = await getDoc(userDocRef);

        if (userSnap.exists()) {
            return userSnap.data(); // Belge varsa verisini döndür
        } else {
            console.warn("No user found with uid:", uid);
            return null; // Belge yoksa null döndür
        }
    } catch (error) {
        console.error("Error fetching user by uid:", error);
        return null; // Hata durumunda null döndür
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

export const getGroupById = async (groupID) => {
    try {
        const groupRef = doc(db, "Groups", groupID);
        const groupSnap = await getDoc(groupRef);

        if (groupSnap.exists()) {
            return { id: groupID, ...groupSnap.data() }; // id alanı eklendi
        } else {
            console.warn("No group found with ID:", groupID);
            return null;
        }
    } catch (error) {
        console.error("Error fetching group by ID:", error);
        return null;
    }
}

export async function createGroup(groupName, users) {
    try {
        const groupsCollectionRef = collection(db, 'Groups');
        const docRef = await addDoc(groupsCollectionRef, {
            groupName,
            users,
            messages: []
        });

        for (const userId of users) {
            const userDocRef = doc(db, 'Users', userId);
            await updateDoc(userDocRef, {
                groups: arrayUnion(docRef.id)
            });
        }

        return docRef.id;
    } catch (error) {
        console.error('Error creating group:', error);
        throw error;
    }
}

// Mesajları çekme fonksiyonu
export const getMessages = async (roomID) => {
    try {
        const roomRef = doc(db, "Rooms", roomID);
        const roomSnap = await getDoc(roomRef);

        if (roomSnap.exists()) {
            return roomSnap.data().Messages || []; // Mesajları döndür
        } else {
            console.warn("No room found with ID:", roomID);
            return []; // Belge yoksa boş dizi döndür
        }
    } catch (error) {
        console.error("Error fetching messages by room ID:", error);
        return []; // Hata durumunda boş dizi döndür
    }
};

// Gruba mesaj ekle
export const sendMessageToGroup = async (groupID, messageObj) => {
    try {
        const groupRef = doc(db, "Groups", groupID);
        await updateDoc(groupRef, {
            messages: arrayUnion(messageObj)
        });
    } catch (error) {
        console.error("Error sending message:", error);
    }
};

// Grubun mesajlarını anlık olarak dinle
export const listenGroupMessages = (groupID, callback) => {
    const groupRef = doc(db, "Groups", groupID);
    return onSnapshot(groupRef, (docSnap) => {
        if (docSnap.exists()) {
            callback(docSnap.data().messages || []);
        } else {
            callback([]);
        }
    });
};

export default app;
