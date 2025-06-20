import React, { useState } from "react";
import { FaEye, FaEyeSlash } from 'react-icons/fa'; 
import { useNavigate } from 'react-router-dom';
import { register } from "../../firebase";
import toast from 'react-hot-toast';

const SignIn = () => {
  // Form alanlarının verilerini tutan state'ler
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [birthdate, setBirthdate] = useState("");

  // Kullanıcının sözleşmeyi kabul edip etmediğini ve şifre gösterme ayarlarını tutan state'ler
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const navigate = useNavigate(); // Sayfa yönlendirmeleri için hook

  // Şifre görünürlüğünü değiştiren fonksiyon
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Onay şifresi görünürlüğünü değiştiren fonksiyon
  const togglePasswordVisibilityConfirm = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  // Form gönderildiğinde çalışacak fonksiyon
  const handleSubmit = async (e) => {
    e.preventDefault(); // Sayfanın yenilenmesini engeller

    // Ad veya soyad 12 karakterden uzunsa uyarı ver
    if (name.length > 12 || surname.length > 12) {
      toast.error("Name and Surname should be less than 12 characters");
      return;
    }

    // Kullanıcı şartları kabul etmemişse uyarı ver
    if (!agreeTerms) {
      toast.error("You must agree to the Terms & Conditions.");
      return;
    }

    // Şifreler eşleşmiyorsa uyarı ver
    if (password !== confirmPassword) {
      toast.error("Password does not match.");
      return;
    }

    // Doğum tarihinden yaş hesaplama
    const birthDate = new Date(birthdate);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    const dayDiff = today.getDate() - birthDate.getDate();

    // Ay ve gün farkına göre gerçek yaşı hesapla
    const finalAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;

    // 13 yaşından küçükse kayıt olmasına izin verme
    if (finalAge < 13) {
      toast.error("You're under 13!");
      return;
    }

    try {
      // register fonksiyonu ile kullanıcı kaydını gerçekleştir
      const user = await register(name, surname, email, password, birthdate, navigate);
      console.log(user); // Kayıt başarılıysa kullanıcıyı konsola yazdır
    } catch (error) {
      toast.error("Registration failed:", error); // Kayıt başarısızsa hata mesajı göster
      console.log(error);
    }
  };



  return (
    <div className="fixed flex background left-0 top-0 items-center justify-center min-h-screen">
      <div className="flex flex-col justify-center px-6 py-8 lg:px-8 bg-white border border-gray-300 rounded-2xl shadow-md">
        <div className="sm:mx-auto sm:w-full sm:max-w-sm">
          <h2 className="mt-10 text-center text-2xl/9 font-bold tracking-tight text-gray-900">
            Create New Account
          </h2>
        </div>
        <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="flex space-x-4">
              <div className="w-1/2">
                <div className="mt-2">
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={name}
                    onChange={e=> setName(e.target.value)}
                    placeholder="Name"
                    required
                    className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                  />
                </div>
              </div>

              <div className="w-1/2">
                <div className="mt-2">
                  <input
                    id="surname"
                    name="surname"
                    type="text"
                    value={surname}
                    onChange={e=> setSurname(e.target.value)}
                    placeholder="Surname"
                    required
                    className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                  />
                </div>
              </div>
            </div>
              <div className="mt-2">
                <input
                  id="birthdate"
                  name="birthdate"
                  type="date"
                  value={birthdate}
                  onChange={(e) => setBirthdate(e.target.value)}
                  required
                  className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400  focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                />
              </div>
            <div>
              <div className="mt-2">
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={e=> setEmail(e.target.value)}
                  placeholder="Email"
                  required
                  autoComplete="email"
                  className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                />
              </div>
          </div>

          <div className="relative mt-2">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
            />
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />} {}
            </button>
          </div>

          <div className="relative mt-2">
            <input
              id="confirm_password"
              name="confirm_password"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
            />
            <button
              type="button"
              onClick={togglePasswordVisibilityConfirm}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
            >
              {showConfirmPassword ? <FaEyeSlash /> : <FaEye />} {}
            </button>
          </div>

          <div className="flex items-center">
            <input
              id="terms"
              name="terms"
              type="checkbox"
              checked={agreeTerms}
              onChange={() => setAgreeTerms(!agreeTerms)}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
           <label htmlFor="terms" className="ml-2 text-sm text-gray-900 flex items-center">
            I agree to the
            <button 
              type="button" 
              className="ml-1 font-semibold text-indigo-600 hover:text-indigo-500"
              onClick={() => navigate("/terms")}
            >
              Terms & Conditions
            </button>
          </label>
          </div>
          <div>
            <button
              type="submit"
              className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm/6 font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              Create Account
            </button>
          </div>
        </form>

        <p className="mt-10 text-center text-sm/6 text-gray-500">
          Already have an account?{' '}
          <button 
            type="button" 
            className="font-semibold text-indigo-600 hover:text-indigo-500"
            onClick={() => navigate("/login")}
          >
            Log In
          </button>
        </p>
      </div>
    </div>
    </div>
  
  );
};

export default SignIn;