import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Check, Loader2, ArrowLeft } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { updateUserProfile } from "../../services/userService";
import ImagePicker from "../../Components/ImagePicker";
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

    setSaving(true);
    const ok = await updateUserProfile(userData.userID, {
      nickName: nickName.trim(),
      about: about.trim(),
      photoURL,
      profileBannerUrl: bannerUrl,
    });
    await refreshUserData();
    setSaving(false);
    ok ? toast.success("Profil güncellendi") : toast.error("Kaydedilemedi");
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
    </motion.div>
  );
};

export default ProfileSettings;
