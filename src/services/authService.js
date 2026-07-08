import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { collection, where, query, getDocs } from "firebase/firestore";
import { auth, googleProvider, db } from "../config/firebase";
import { writeUserData } from "./userService";
import toast from "react-hot-toast";

// **E-posta ile Kayıt Olma**
export const register = async (name, surname, email, password, birthdate, navigate) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    //await sendEmailVerification(user);
    toast.success("Verification email sent! Please check your inbox.");

    const checkEmailVerification = setInterval(async () => {
      await user.reload();
      // NOTE: e-posta doğrulama şimdilik kapalı. Açmak için üstteki
      // sendEmailVerification'ı geri al ve buradaki koşulu user.emailVerified yap.
      // eslint-disable-next-line no-constant-condition
      if (true) {
        clearInterval(checkEmailVerification);
        toast.success("Email Confirmed");

        await writeUserData(
          user.uid,
          name,
          surname,
          birthdate,
          user.email,
          user.photoURL
        );

        navigate("/login");
      }
    }, 3000);
    return user;
  } catch (error) {
    toast.error(error.message);
    console.error("Error:", error.message);
    return null;
  }
};

// **Google ile giriş/kayıt fonksiyonu**
// Yönlendirmeyi çağıran bileşen (auth state üzerinden) yapar.
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    const usersRef = collection(db, "Users");

    // Kullanıcı Firestore'da yoksa oluştur
    const q = query(usersRef, where("email", "==", user.email));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      const userName = (user.displayName || "").split(" ")[0] || "";
      const userSurname = (user.displayName || "").split(" ")[1] || "";
      await writeUserData(user.uid, userName, userSurname, "--", user.email);
    }

    return user;
  } catch (error) {
    console.error("Google Auth Error:", error);
    toast.error("An error occurred while signing in with Google.");
    throw error;
  }
};

// ** Login **
export const loginWithMail = async (email, password) => {
  try {
    await signInWithEmailAndPassword(auth, email, password);
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
  } catch (error) {
    console.error("Hata: " + error.message);
  }
};
