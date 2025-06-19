import React, { useState ,useEffect } from "react";
import { FaEye, FaEyeSlash } from 'react-icons/fa'; 
import { useNavigate } from "react-router-dom";
import toast from 'react-hot-toast';
import { loginWithMail , signInWithGoogle} from "../../firebase"
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getUser } from "../../firebase";

const Login = () => {
  // E-posta, şifre ve diğer seçenekleri tutan state'ler
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); // Şifreyi göster/gizle
  const [rememberMe, setRememberMe] = useState(false);     // Beni hatırla seçeneği

  const navigate = useNavigate(); // Yönlendirme için hook
  const auth = getAuth();         // Firebase auth nesnesi

  // Kullanıcının oturum durumunu kontrol eder
  const handleAuthState = () => {
    onAuthStateChanged(auth, async (user) => {
      const userInfo = await getUser(user.uid);
      if (user) {
        try {
          // Kullanıcının profilinde nickname yoksa profil oluşturma sayfasına yönlendir
          userInfo.nickName === "" 
            ? navigate('/create_profile') 
            : navigate('/home'); // Varsa ana sayfaya yönlendir
            window.location.reload()
        } catch (error) {
          console.error("Nickname kontrol hatası:", error);
        }
      } else {
        console.log("No user is signed in.");
      }
    });
  };

  // Giriş formu gönderildiğinde çalışır
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // E-posta ve şifre ile giriş yapılır
      const user = await loginWithMail(email, password, navigate);

      if (user) {
        // Kullanıcı bilgisi (e-posta + UID) localStorage veya sessionStorage'a kaydedilir
        const userJSONData = { email, token: user.uid };
        rememberMe
          ? localStorage.setItem("user", JSON.stringify(userJSONData))
          : sessionStorage.setItem("user", JSON.stringify(userJSONData));

        handleAuthState(); // Giriş sonrası yönlendirme yapılır
      }
    } catch (error) {
      toast.error("Login failed"); // Hata mesajı
      console.log(error);
    }
  };

  // Google ile giriş yapıldığında çalışır
  const googleAuthFunc = async (e) => {
    e.preventDefault();

    try {
      // Google ile giriş yapılır
      const user = await signInWithGoogle(navigate);
      
      if(user){
        // Giriş başarılıysa kullanıcı bilgisi localStorage'a kaydedilir
        localStorage.setItem("user", JSON.stringify(user));
        console.log(user);

        handleAuthState(); // Giriş sonrası yönlendirme
      }

    } catch (error) {
      toast.error("Registration failed:", error.message);
      console.log(error);
    }
  };

  // Şifre görünürlüğünü değiştirir
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Sayfa ilk yüklendiğinde daha önce giriş yapılmışsa doğrudan /home sayfasına yönlendir
  useEffect(() => {
    const storedUser = localStorage.getItem("user") || sessionStorage.getItem("user");
    if (storedUser) {
      navigate("/home");
    }
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen -100">
      <div className="w-full max-w-md p-12 bg-white border border-gray-300 rounded-2xl shadow-md">
        <h2 className="mb-8 text-center text-2xl font-bold tracking-tight text-gray-900">
          Welcome to STAPLE
        </h2>
  
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              autoComplete="email"
              className="block w-full rounded-md bg-white px-3 py-2 text-gray-900 outline-none border border-gray-300 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
  
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              autoComplete="current-password"
              className="block w-full rounded-md bg-white px-3 py-2 text-gray-900 outline-none border border-gray-300 focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
  
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={() => setRememberMe(!rememberMe)}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="remember-me" className="ml-2 text-sm text-gray-900">
                Remember me
              </label>
            </div>
            <button 
              type="button" 
              className="text-sm font-semibold text-indigo-600 hover:text-indigo-500"
              onClick={() => navigate("/forgetPassword")}
            >
              Forgot password?
            </button>
          </div>
  
          <button
            type="submit"
            className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-white font-semibold shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            Log in
          </button>
        </form>
  
        <div className="mt-6 flex items-center justify-between">
          <div className="w-24 border-t border-gray-300"></div>
          <span className="px-5 text-gray-500">Or continue with</span>
          <div className="w-24 border-t border-gray-300"></div>
        </div>
  
        <div className="mt-6 flex justify-center">
          <button
            onClick={googleAuthFunc}
            className="flex items-center border-2 border-gray-300 px-6 py-2 rounded-lg text-gray-900 hover:bg-gray-100 hover:border-gray-600 gap-x-2"
          >
            <img
              src="https://img.icons8.com/?size=100&id=17949&format=png&color=000000"
              alt="Google Logo"
              className="h-8 w-8"
            />
            Sign in with Google
          </button>
        </div>
  
        <div className="flex flex-row justify-center items-center mt-5 text-sm text-gray-500">
          Not a member?
          <button 
            type="button" 
            className="ml-1 font-semibold text-indigo-600 hover:text-indigo-500"
            onClick={() => navigate("/signin")}
          >
            Register Now
          </button>
        </div>

      </div>
    </div>
  );
}

export default Login;
