import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { FaPowerOff } from "react-icons/fa6";
import { Loader2, Trash2, AlertTriangle, Pencil } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const SettingsPage = () => {
  const navigate = useNavigate();
  const { userData, currentUser, signOut, deleteAccount } = useAuth();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!currentUser) navigate("/login");
  }, [currentUser, navigate]);

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

        {/* Profil özeti + düzenle */}
        <section className="bg-[var(--primary-bg)] rounded-2xl p-6 shadow-xl border border-[var(--primary-border)] mb-6">
          <h2 className="text-lg font-semibold mb-4 text-[var(--quaternary-text)]">
            Profil
          </h2>
          <div className="flex items-center gap-4">
            <img
              src={userData?.photoURL || "/defaults/avatars/1.png"}
              alt="Avatar"
              className="w-16 h-16 rounded-full border-4 border-[var(--tertiary-border)] object-cover"
            />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-lg truncate">
                {userData?.nickName || `${userData?.name || ""} ${userData?.surname || ""}`}
              </p>
              <p className="text-sm text-[var(--primary-text)] truncate">
                {userData?.email}
              </p>
              <p className="text-xs text-[var(--primary-text)]">
                #{userData?.friendshipID}
              </p>
            </div>
            <button
              onClick={() => navigate("/ProfileSettings")}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--tertiary-bg)] text-[var(--tertiary-text)] font-semibold text-sm hover:bg-[var(--quaternary-bg)] transition-colors shrink-0"
            >
              <Pencil size={15} /> Profili Düzenle
            </button>
          </div>
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
