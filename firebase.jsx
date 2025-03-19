import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail,signInWithEmailAndPassword} from "firebase/auth";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, doc, setDoc,getDocs,where,query,collection,serverTimestamp } from "firebase/firestore"; 
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
export const register = async (name, surname, nickname, email, password,birthdate, navigate) => {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        await sendEmailVerification(user);
        toast.success("Verification email sent! Please check your inbox.");
        
        const checkEmailVerification = setInterval(async () => {
            await user.reload();
            if (user.emailVerified) {
                clearInterval(checkEmailVerification);
                toast.success("Email Confirmed");

                await writeUserData(user.uid, name, surname, nickname, birthdate ,user.email,user.photoURL);
                navigate("/login");
            }
        }, 3000);
    } catch (error) {
        toast.error(error.message);
        console.error("Error:", error.message);
    }
};

// **Google ile kayıt fonksiyonu**
export const signInWithGoogle = async (navigate) => {
    try {
        const result = await signInWithPopup(auth, provider_google);
        const user = result.user;
        console.log("User Info:", user);

        const userName = user.displayName.split(" ")[0];
        const userSurname = user.displayName.split(" ")[1];
        const userNickname = "User" + Math.floor(Math.random() * 10000);
        
        const usersRef = collection(db, "Users");
        
        // Kullanıcıyı Firestore'da ara
        const q = query(usersRef, where("email", "==", user.email));
        const querySnapshot = await getDocs(q);

        // Eğer kullanıcı zaten varsa, direk "home" sayfasına geç
        if (!querySnapshot.empty) {
            console.log("User already exists, redirecting to home.");
            navigate("/home");
            return;
        }

        // Eğer kullanıcı yoksa, Firestore'a ekle ve "home" sayfasına geç
        await writeUserData(user.uid, userName, userSurname, userNickname, "--", user.email, user.photoURL);
        navigate("/home");

    } catch (error) {
        console.error("Google Auth Error:", error);
        toast.error("An error occurred while signing in with Google.");
    }
};


// **Kullanıcı bilgilerini Firestore'a yazma fonksiyonu**
async function writeUserData(uid, name, surname, nickname,birthdate, email, photoURL) {
    const friendshipID = await createFriendshipID();
    
    try {
        await setDoc(doc(db, "Users", uid), {
            userID: uid,
            photoURL: photoURL,
            name: name,
            surname: surname,
            nickname: nickname,
            bithdate:birthdate,
            createdDate:serverTimestamp(),
            email: email,
            friendshipID: friendshipID,

        });

        console.log("User data added to Firestore");
    } catch (error) {
        console.error("Database write failed:", error);
    }
}

// ** Login **
export const loginWithMail = async (email, password, navigate) => {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log("User authenticated:", userCredential.user);
        toast.success("Login successful!");

        navigate("/home");
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

export default app;
