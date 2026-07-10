import { useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { updatePassword } from "../../services/authService";
import { useAuth } from "../../context/AuthContext";

// Şifre sıfırlama bağlantısı Supabase'de geçici bir oturum açar; yeni şifre
// bu oturumla kaydedilir. Oturum yoksa kullanıcı buraya doğrudan gelmiştir.
const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const { currentUser, clearPasswordRecovery, signOut } = useAuth();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;

    if (password.length < 6) {
      toast.error("Şifre en az 6 karakter olmalı.");
      return;
    }
    if (password !== confirm) {
      toast.error("Şifreler eşleşmiyor.");
      return;
    }

    setBusy(true);
    const res = await updatePassword(password);
    setBusy(false);

    if (!res.ok) {
      toast.error(res.error);
      return;
    }

    clearPasswordRecovery();
    toast.success("Şifren güncellendi. Yeni şifrenle giriş yap.");
    // Recovery oturumunu kapat ki kullanıcı bilerek yeniden giriş yapsın.
    await signOut();
    navigate("/login", { replace: true });
  };

  if (!currentUser) {
    return (
      <div className="fixed left-0 top-0 background flex items-center justify-center min-h-screen w-full">
        <div className="w-full max-w-md p-10 bg-white border border-gray-300 rounded-2xl shadow-md text-center">
          <h2 className="mb-3 text-xl font-bold text-gray-900">
            Bağlantı geçersiz
          </h2>
          <p className="mb-6 text-sm text-gray-600">
            Şifre sıfırlama bağlantısı süresi dolmuş ya da hiç açılmamış.
          </p>
          <button
            onClick={() => navigate("/forgetPassword", { replace: true })}
            className="w-full rounded-md bg-indigo-600 px-3 py-2 text-white font-semibold hover:bg-indigo-500"
          >
            Yeni bağlantı iste
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed left-0 top-0 background flex items-center justify-center min-h-screen w-full">
      <div className="w-full max-w-md p-12 bg-white border border-gray-300 rounded-2xl shadow-md">
        <h2 className="mb-8 text-center text-2xl font-bold tracking-tight text-gray-900">
          Yeni Şifre Belirle
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              id="new-password"
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Yeni şifre"
              required
              autoComplete="new-password"
              className="block w-full rounded-md bg-white px-3 py-2 text-gray-900 outline-none border border-gray-300 focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
            >
              {show ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>

          <input
            id="confirm-password"
            type={show ? "text" : "password"}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Yeni şifre (tekrar)"
            required
            autoComplete="new-password"
            className="block w-full rounded-md bg-white px-3 py-2 text-gray-900 outline-none border border-gray-300 focus:ring-2 focus:ring-indigo-500"
          />

          <button
            type="submit"
            disabled={busy}
            className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-white font-semibold shadow-sm hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {busy ? "Kaydediliyor…" : "Şifreyi Kaydet"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
