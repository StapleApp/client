import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { FaPowerOff } from "react-icons/fa6";
import { Check, Loader2, Trash2, AlertTriangle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { updateUserProfile } from "../../services/userService";
import AvatarUpload from "../../Components/AvatarUpload";

const AVATARS = ["/0.png", "/1.png", "/2.png", "/3.png", "/4.png", "/5.png", "/6.png", "/7.png"];

const SettingsPage = () => {
  const navigate = useNavigate();
  const { userData, currentUser, signOut, refreshUserData, deleteAccount } = useAuth();

  const [nickName, setNickName] = useState("");
  const [about, setAbout] = useState("");
  const [photoURL, setPhotoURL] = useState("/1.png");
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
    }
  }, [currentUser, navigate]);

  useEffect(() => {
    if (userData) {
      setNickName(userData.nickName || "");
      setAbout(userData.about || "");
      setPhotoURL(userData.photoURL || "/1.png");
    }
  }, [userData]);

  const handleSave = async () => {
    if (!userData?.userID) return;
    if (nickName.trim().length > 12) {
      toast.error("Takma ad 12 karakterden kısa olmalı");
      return;
    }
    setSaving(true);
    const ok = await updateUserProfile(userData.userID, {
      nickName: nickName.trim(),
      about: about.trim(),
      photoURL,
    });
    await refreshUserData();
    setSaving(false);
    ok ? toast.success("Profil güncellendi") : toast.error("Kaydedilemedi");
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    const result = await deleteAccount();
    setDeleting(false);
    setShowDeleteConfirm(false);

    if (result.ok) {
      toast.success("Hesabınız silindi.");
      navigate("/signin");
    } else if (result.reason === "auth/requires-recent-login") {
      toast.error(
        "Güvenlik için lütfen çıkış yapıp tekrar giriş yapın, sonra tekrar deneyin."
      );
    } else {
      toast.error("Hesap silinemedi. Lütfen tekrar deneyin.");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 60 }}
      transition={{ duration: 0.15 }}
      className="background fixed top-0 left-0 w-full h-screen overflow-y-auto bg-[var(--secondary-bg)] text-[var(--secondary-text)]"
      style={{ paddingLeft: "80px" }}
    >
      <div className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-8">Ayarlar</h1>

        {/* Hesap / Profil */}
        <section className="bg-[var(--primary-bg)] rounded-2xl p-6 shadow-xl border border-[var(--primary-border)] mb-6">
          <h2 className="text-lg font-semibold mb-4 text-[var(--quaternary-text)]">
            Profil
          </h2>

          {/* Seçili avatar önizleme */}
          <div className="flex items-center gap-4 mb-5">
            <img
              src={photoURL}
              alt="Avatar"
              className="w-20 h-20 rounded-full border-4 border-[var(--tertiary-border)] object-cover"
            />
            <div>
              <p className="font-bold text-lg">
                {userData?.name} {userData?.surname}
              </p>
              <p className="text-sm text-[var(--primary-text)]">
                {userData?.email}
              </p>
              <p className="text-xs text-[var(--primary-text)]">
                #{userData?.friendshipID}
              </p>
            </div>
          </div>

          {/* Avatar seçici */}
          <label className="block text-sm font-medium mb-2">
            Profil Fotoğrafı
          </label>
          <div className="grid grid-cols-8 gap-2 mb-3">
            {AVATARS.map((img) => (
              <button
                key={img}
                type="button"
                onClick={() => setPhotoURL(img)}
                className={`rounded-full overflow-hidden border-4 transition-all hover:scale-105 ${
                  photoURL === img
                    ? "border-[var(--tertiary-border)] scale-105"
                    : "border-transparent"
                }`}
              >
                <img src={img} alt="" className="w-full aspect-square object-cover" />
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 mb-5">
            <AvatarUpload
              uid={userData?.userID}
              onUploaded={(url) => setPhotoURL(url)}
            />
            {!AVATARS.includes(photoURL) && (
              <span className="text-xs text-[var(--quaternary-text)]">
                Yüklenen fotoğraf seçili
              </span>
            )}
          </div>

          {/* Takma ad */}
          <label className="block text-sm font-medium mb-2">Takma Ad</label>
          <input
            type="text"
            value={nickName}
            onChange={(e) => setNickName(e.target.value)}
            maxLength={12}
            placeholder="Takma adın"
            className="w-full mb-5 px-4 py-2 rounded-xl bg-[var(--secondary-bg)] text-[var(--secondary-text)] border-2 border-[var(--primary-border)] focus:outline-none focus:border-[var(--tertiary-border)] transition-colors"
          />

          {/* Hakkında */}
          <label className="block text-sm font-medium mb-2">Hakkımda</label>
          <textarea
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            maxLength={200}
            rows={3}
            placeholder="Kendinden bahset..."
            className="w-full mb-5 px-4 py-2 rounded-xl bg-[var(--secondary-bg)] text-[var(--secondary-text)] border-2 border-[var(--primary-border)] focus:outline-none focus:border-[var(--tertiary-border)] resize-none transition-colors"
          />

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 rounded-xl bg-[var(--tertiary-bg)] text-[var(--tertiary-text)] font-semibold hover:bg-[var(--quaternary-bg)] disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </section>

        {/* Hesap işlemleri */}
        <section className="bg-[var(--primary-bg)] rounded-2xl p-6 shadow-xl border border-[var(--primary-border)]">
          <h2 className="text-lg font-semibold mb-4 text-[var(--quaternary-text)]">
            Hesap
          </h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-6 py-3 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors"
            >
              <FaPowerOff size={18} />
              Çıkış Yap
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-3 px-6 py-3 rounded-xl bg-transparent text-red-400 font-semibold border-2 border-red-500/60 hover:bg-red-500 hover:text-white transition-colors"
            >
              <Trash2 size={18} />
              Hesabı Sil
            </button>
          </div>
        </section>
      </div>

      {/* Hesap silme onay penceresi */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4"
            onClick={() => !deleting && setShowDeleteConfirm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl bg-[var(--primary-bg)] border-2 border-[var(--primary-border)] shadow-2xl p-6 text-[var(--secondary-text)]"
            >
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-14 h-14 rounded-full bg-red-500/15 border-2 border-red-500 flex items-center justify-center">
                  <AlertTriangle size={26} className="text-red-400" />
                </div>
                <h3 className="text-xl font-bold">Hesabı silmek istediğinizden emin misiniz?</h3>
                <p className="text-sm text-[var(--primary-text)]">
                  Bu işlem <span className="font-semibold text-red-400">geri alınamaz</span>.
                  Hesabınız ve tüm verileriniz kalıcı olarak silinecek.
                </p>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--secondary-bg)] text-[var(--secondary-text)] font-semibold border-2 border-[var(--primary-border)] hover:border-[var(--tertiary-border)] disabled:opacity-50 transition-colors"
                >
                  Vazgeç
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 disabled:opacity-50 transition-colors"
                >
                  {deleting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" /> Siliniyor...
                    </>
                  ) : (
                    <>
                      <Trash2 size={18} /> Evet, Sil
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default SettingsPage;
