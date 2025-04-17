import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from 'react-hot-toast';
import { handleResetPassword } from "../../firebase";


const EmailVerification = () => {

  // Kullanıcının girdiği e-posta adresini tutan state
  const [email, setEmail] = useState('');

  const navigate = useNavigate(); // Yönlendirme için hook

  // Form gönderildiğinde çalışacak fonksiyon
  const handleSubmit = async (e) => {
    e.preventDefault(); // Sayfanın yeniden yüklenmesini engeller

    try {
      // handleResetPassword fonksiyonu ile şifre sıfırlama bağlantısı gönderilir
      await handleResetPassword(email);

      // Başarılı olursa kullanıcıya bilgilendirme mesajı göster
      toast.success("Password reset link has been sent!");

      // 3 saniye sonra giriş sayfasına yönlendirilir
      setTimeout(() => {
        navigate("/login");
      }, 3000);

    } catch (error) {
      // Hata olursa kullanıcıya hata mesajı göster ve konsola yazdır
      toast.error("Password reset failed:");
      console.log(error);
    }
  };



  return (
    <div className="flex items-center justify-center min-h-screen -100">
      <div className="w-full max-w-md p-12 bg-white border border-gray-300 rounded-2xl shadow-md">
        <h2 className="mt-2 text-center text-2xl/5 font-bold tracking-tight text-gray-900">
          Email Verification
        </h2>
        <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="mt-2">
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Email Adress"
                  required
                  autoComplete="email"
                  className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                />
              </div>
            </div>
            <div className="flex space-x-4">
              <button
                type="submit"
                className="flex-1 justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm/6 font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                Verify Account
              </button>
              <button
                type="button"
                className="flex-1 justify-center rounded-md bg-gray-400 px-3 py-1.5 text-sm/6 font-semibold text-white shadow-sm hover:bg-gray-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-600"
                onClick={() => navigate("/login")}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EmailVerification;