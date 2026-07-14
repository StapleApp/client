import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Check, Loader2, ArrowLeft, Menu, Home, Compass, UserPlus, Settings, User, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useMobileMenu } from "../../context/MobileMenuContext";
import { updateUserProfile } from "../../services/userService";
import ImagePicker from "../../Components/ImagePicker";
import Navigator from "../../Components/layout/Navigator";
import {
  DEFAULT_AVATARS,
  DEFAULT_AVATAR,
  DEFAULT_PROFILE_BANNERS,
} from "../../config/defaults";
import profileBanner from "../../assets/backgrounds/profile-banner.png";

const Label = ({ children }) => (
  <label className="block mb-2 text-sm font-medium text-[var(--secondary-text)]">
    {children}
  </label>
);

const ProfileSettings = () => {
  const navigate = useNavigate();
  const { userData, currentUser, refreshUserData } = useAuth();
  const { isMobile, isOpen, setIsOpen } = useMobileMenu();

  const [nickName, setNickName] = useState("");
  const [about, setAbout] = useState("");
  const [photoURL, setPhotoURL] = useState(DEFAULT_AVATAR);
  const [bannerUrl, setBannerUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!currentUser) navigate("/login");
  }, [currentUser, navigate]);

  useEffect(() => {
    if (userData) {
      setNickName(userData.nickName || "");
      setAbout(userData.about || "");
      setPhotoURL(userData.photoURL || DEFAULT_AVATAR);
      setBannerUrl(userData.profileBannerUrl || "");
    }
  }, [userData]);

  const handleSave = async () => {
    if (!userData?.userID || saving) return;
    if (!nickName.trim()) return toast.error("Takma ad boş olamaz");
    if (nickName.trim().length > 12) return toast.error("Takma ad 12 karakterden kısa olmalı");

    const updateData = {
      nickName: nickName.trim(),
      about: about.trim(),
      photoURL,
      profileBannerUrl: bannerUrl,
    };

    console.log("[ProfileSettings] Kaydedilen değerler:", updateData);

    setSaving(true);
    const ok = await updateUserProfile(userData.userID, updateData);
    const refreshed = await refreshUserData();

    console.log("[ProfileSettings] refreshUserData sonucu:", {
      profileBannerUrl: refreshed?.profileBannerUrl,
      photoURL: refreshed?.photoURL,
    });

    setSaving(false);
    ok ? toast.success("Profil güncellendi") : toast.error("Kaydedilemedi");
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 60 }}
      transition={{ duration: 0.15 }}
      className="background fixed top-0 left-0 w-full h-screen bg-[var(--secondary-bg)] text-[var(--secondary-text)] flex flex-col overflow-hidden"
      style={{ paddingLeft: isMobile ? "0px" : "var(--navigator-width, 64px)", transition: "padding-left 0.2s ease-in-out" }}
    >
      {isMobile && (
        <div className="flex items-center h-[60px] px-5 py-4 bg-[var(--primary-bg)] border-b-2 border-[var(--primary-border)] text-[var(--secondary-text)] shrink-0 z-30">
          <button
            onClick={() => setIsOpen(true)}
            className="p-1.5 rounded-lg hover:bg-[var(--secondary-bg)] transition-colors mr-3 text-[var(--secondary-text)]"
            aria-label="Menüyü Aç"
          >
            <Menu size={20} />
          </button>
          <span className="font-bold truncate text-lg">Profili Düzenle</span>
        </div>
      )}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate("/Settings")}
            className="p-2 rounded-lg hover:bg-[var(--primary-bg)] transition-colors"
            title="Ayarlara dön"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-3xl font-bold">Profili Düzenle</h1>
        </div>

        {/* Kart önizleme */}
        <div className="rounded-2xl overflow-hidden border border-[var(--primary-border)] mb-6">
          <div
            className="h-28 bg-cover bg-center bg-[var(--primary-bg)]"
            style={{ backgroundImage: `url(${bannerUrl || profileBanner})` }}
          />
          <div className="bg-[var(--primary-bg)] px-5 pb-4 flex items-end gap-3 -mt-8">
            <img
              src={photoURL}
              alt=""
              className="w-16 h-16 rounded-full border-4 border-[var(--primary-bg)] object-cover bg-[var(--secondary-bg)]"
            />
            <div className="pb-1">
              <p className="font-bold">{nickName || "Takma ad"}</p>
              <p className="text-xs text-[var(--primary-text)]">
                {userData?.name} {userData?.surname}
              </p>
            </div>
          </div>
        </div>

        <section className="bg-[var(--primary-bg)] rounded-2xl p-6 shadow-xl border border-[var(--primary-border)] space-y-6">
          <div>
            <Label>Profil Fotoğrafı</Label>
            <ImagePicker
              value={photoURL}
              onChange={(url) => setPhotoURL(url || DEFAULT_AVATAR)}
              defaults={DEFAULT_AVATARS}
              uid={userData?.userID}
              bucket="avatars"
              aspect="square"
              allowClear={false}
            />
          </div>

          <div>
            <Label>Profil Kartı Bannerı</Label>
            <ImagePicker
              value={bannerUrl}
              onChange={setBannerUrl}
              defaults={DEFAULT_PROFILE_BANNERS}
              uid={userData?.userID}
              bucket="profile-banners"
              aspect="wide"
            />
          </div>

          <div>
            <Label>Takma Ad</Label>
            <input
              type="text"
              value={nickName}
              onChange={(e) => setNickName(e.target.value)}
              maxLength={12}
              placeholder="Takma adın"
              className="w-full px-4 py-2 rounded-xl bg-[var(--secondary-bg)] text-[var(--secondary-text)] border-2 border-[var(--primary-border)] focus:outline-none focus:border-[var(--tertiary-border)] transition-colors"
            />
          </div>

          <div>
            <Label>Hakkımda</Label>
            <textarea
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              maxLength={200}
              rows={3}
              placeholder="Kendinden bahset..."
              className="w-full px-4 py-2 rounded-xl bg-[var(--secondary-bg)] text-[var(--secondary-text)] border-2 border-[var(--primary-border)] focus:outline-none focus:border-[var(--tertiary-border)] resize-none transition-colors"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 rounded-xl bg-[var(--tertiary-bg)] text-[var(--tertiary-text)] font-semibold hover:bg-[var(--quaternary-bg)] disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </section>
      </div>
      </div>
      {/* Mobile Drawer */}
      {isMobile && (
        <AnimatePresence>
          {isOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 bg-black/60 z-40 transition-opacity duration-200"
                onClick={() => setIsOpen(false)}
              />
              {/* Drawer Container */}
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="fixed top-0 bottom-0 left-0 z-50 flex w-[320px] shadow-2xl"
              >
                {/* Left: Navigator */}
                <div className="w-16 h-full shrink-0 relative z-20 bg-[var(--primary-bg)]/90 backdrop-blur-md border-r border-[var(--primary-border)]/20">
                  <Navigator />
                </div>
                {/* Right: Navigation Options */}
                <div className="w-64 h-full bg-[var(--primary-bg)]/90 backdrop-blur-md flex flex-col relative z-10 p-5 overflow-y-auto gap-5 text-left">
                  {/* Header */}
                  <div className="flex justify-between items-center pb-2 border-b border-[var(--primary-border)]/25 shrink-0">
                    <span className="font-bold text-sm text-[var(--secondary-text)] uppercase tracking-widest font-mono">Seçenekler</span>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="p-1 rounded-lg hover:bg-[var(--secondary-bg)] transition-colors text-[var(--secondary-text)] active:scale-95"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* Navigation Links */}
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                    <button
                      onClick={() => {
                        navigate("/");
                        setIsOpen(false);
                      }}
                      className="flex items-center gap-3 w-full p-2.5 rounded-xl bg-[var(--secondary-bg)]/40 hover:bg-[var(--secondary-bg)] border border-[var(--primary-border)]/30 hover:border-[var(--tertiary-border)]/40 text-sm font-semibold text-[var(--secondary-text)] transition-all active:scale-95"
                    >
                      <Home size={18} className="text-[var(--tertiary-bg)]" />
                      <span>Ana Sayfa</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        navigate("/servers");
                        setIsOpen(false);
                      }}
                      className="flex items-center gap-3 w-full p-2.5 rounded-xl bg-[var(--secondary-bg)] hover:bg-[var(--secondary-bg)] border border-[var(--primary-border)]/30 hover:border-[var(--tertiary-border)]/40 text-sm font-semibold text-[var(--secondary-text)] transition-all active:scale-95"
                    >
                      <Compass size={18} className="text-[var(--tertiary-bg)]" />
                      <span>Sunucu Keşfet</span>
                    </button>

                    <button
                      onClick={() => {
                        navigate("/AddFriends");
                        setIsOpen(false);
                      }}
                      className="flex items-center gap-3 w-full p-2.5 rounded-xl bg-[var(--secondary-bg)]/40 hover:bg-[var(--secondary-bg)] border border-[var(--primary-border)]/30 hover:border-[var(--tertiary-border)]/40 text-sm font-semibold text-[var(--secondary-text)] transition-all active:scale-95"
                    >
                      <UserPlus size={18} className="text-[var(--tertiary-bg)]" />
                      <span>Arkadaş Ekle</span>
                    </button>

                    <button
                      onClick={() => {
                        navigate("/settings");
                        setIsOpen(false);
                      }}
                      className="flex items-center gap-3 w-full p-2.5 rounded-xl bg-[var(--secondary-bg)]/40 hover:bg-[var(--secondary-bg)] border border-[var(--primary-border)]/30 hover:border-[var(--tertiary-border)]/40 text-sm font-semibold text-[var(--secondary-text)] transition-all active:scale-95"
                    >
                      <Settings size={18} className="text-[var(--tertiary-bg)]" />
                      <span>Ayarlar</span>
                    </button>

                    <button
                      onClick={() => {
                        navigate("/ProfileSettings");
                        setIsOpen(false);
                      }}
                      className="flex items-center gap-3 w-full p-2.5 rounded-xl bg-[var(--secondary-bg)]/40 hover:bg-[var(--secondary-bg)] border border-[var(--primary-border)]/30 hover:border-[var(--tertiary-border)]/40 text-sm font-semibold text-[var(--secondary-text)] transition-all active:scale-95"
                    >
                      <User size={18} className="text-[var(--tertiary-bg)]" />
                      <span>Profili Düzenle</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      )}
    </motion.div>
  );
};

export default ProfileSettings;
