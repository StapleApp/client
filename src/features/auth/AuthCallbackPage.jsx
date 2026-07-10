import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { initialAuthUrl } from "../../config/supabase";
import { useAuth } from "../../context/AuthContext";

// E-posta doğrulama, şifre sıfırlama ve Google OAuth dönüşlerinin indiği yer.
// Supabase istemcisi token'ı URL'den okuyup oturuma çevirmiş olur (AuthProvider
// bunu bekledikten sonra render eder), burada sadece ne göstereceğimize karar veriyoruz.
const AuthCallbackPage = () => {
  const navigate = useNavigate();
  const { currentUser, passwordRecovery } = useAuth();

  // "working" | "error" | "confirmed"
  const [status, setStatus] = useState("working");
  const [error, setError] = useState(null);
  const [kind, setKind] = useState(null); // signup | email_change

  useEffect(() => {
    // Bilgi hem hash'te (implicit flow) hem query'de gelebilir
    const hash = new URLSearchParams((initialAuthUrl.hash || "").replace(/^#/, ""));
    const query = new URLSearchParams(initialAuthUrl.search || "");
    const param = (key) => hash.get(key) || query.get(key);

    const errCode = param("error_code");
    const errDesc = param("error_description");
    const type = param("type");

    if (errCode || errDesc) {
      setError(
        errCode === "otp_expired"
          ? "Bağlantının süresi dolmuş. Lütfen yeni bir doğrulama bağlantısı iste."
          : errDesc || "Bağlantı geçersiz."
      );
      setStatus("error");
      return;
    }

    if (!currentUser) {
      setError(
        type === "signup"
          ? "Bağlantı geçersiz ya da daha önce kullanılmış. Hesabın zaten doğrulanmış olabilir — giriş yapmayı dene."
          : "Oturum açılamadı. Bağlantı geçersiz veya süresi dolmuş olabilir."
      );
      setStatus("error");
      return;
    }

    if (passwordRecovery || type === "recovery") {
      navigate("/reset-password", { replace: true });
      return;
    }

    // E-posta doğrulaması: kullanıcıyı sessizce içeri atmak yerine onayla.
    if (type === "signup" || type === "email_change") {
      setKind(type);
      setStatus("confirmed");
      return;
    }

    // OAuth vb. → doğrudan içeri. Profil eksikse ProtectedRoute /create_profile'a yollar.
    navigate("/", { replace: true });
  }, [currentUser, passwordRecovery, navigate]);

  return (
    <div className="fixed left-0 top-0 background flex items-center justify-center min-h-screen w-full">
      <div className="w-full max-w-md p-10 bg-white border border-gray-300 rounded-2xl shadow-md text-center">
        {status === "error" && (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-3xl">
              ✕
            </div>
            <h2 className="mb-3 text-xl font-bold text-gray-900">
              Bağlantı doğrulanamadı
            </h2>
            <p className="mb-6 text-sm text-gray-600">{error}</p>
            <button
              onClick={() => navigate("/login", { replace: true })}
              className="w-full rounded-md bg-indigo-600 px-3 py-2 text-white font-semibold hover:bg-indigo-500"
            >
              Giriş sayfasına dön
            </button>
          </>
        )}

        {status === "confirmed" && (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-3xl text-green-600">
              ✓
            </div>
            <h2 className="mb-2 text-2xl font-bold tracking-tight text-gray-900">
              {kind === "email_change"
                ? "E-posta adresin güncellendi"
                : "E-postan doğrulandı"}
            </h2>
            <p className="mb-1 text-sm text-gray-600">
              Hoş geldin{currentUser?.displayName ? `, ${currentUser.displayName}` : ""}!
            </p>
            <p className="mb-6 text-sm text-gray-500">{currentUser?.email}</p>
            <button
              onClick={() => navigate("/", { replace: true })}
              className="w-full rounded-md bg-indigo-600 px-3 py-2 text-white font-semibold hover:bg-indigo-500"
            >
              Staple'a devam et
            </button>
          </>
        )}

        {status === "working" && <p className="text-gray-700">Giriş yapılıyor…</p>}
      </div>
    </div>
  );
};

export default AuthCallbackPage;
