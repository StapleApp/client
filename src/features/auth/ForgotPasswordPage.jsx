import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from 'react-hot-toast';
import { sendPasswordReset } from "../../services/authService";

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;

    setBusy(true);
    const res = await sendPasswordReset(email);
    setBusy(false);

    if (!res.ok) {
      toast.error(res.error);
      return;
    }

    setSent(true);
    toast.success("Şifre sıfırlama bağlantısı gönderildi!");
  };

  if (sent) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-full max-w-md p-12 bg-white border border-gray-300 rounded-2xl shadow-md text-center">
          <h2 className="mb-3 text-2xl font-bold tracking-tight text-gray-900">
            E-postanı kontrol et
          </h2>
          <p className="mb-6 text-sm text-gray-600">
            <span className="font-semibold">{email}</span> adresine bir şifre
            sıfırlama bağlantısı gönderdik. Bağlantı kısa süre içinde geçerliliğini
            yitirir.
          </p>
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
          >
            Giriş sayfasına dön
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-full max-w-md p-12 bg-white border border-gray-300 rounded-2xl shadow-md">
        <h2 className="mt-2 text-center text-2xl font-bold tracking-tight text-gray-900">
          Şifremi Unuttum
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
                  placeholder="Email Address"
                  required
                  autoComplete="email"
                  className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm"
                />
              </div>
            </div>
            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={busy}
                className="flex-1 justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {busy ? "Gönderiliyor…" : "Bağlantı Gönder"}
              </button>
              <button
                type="button"
                className="flex-1 justify-center rounded-md bg-gray-400 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-gray-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-600"
                onClick={() => navigate("/login")}
              >
                İptal
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
