import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import {
  Edit2,
  Check,
  Moon,
  BellOff,
  Wifi,
  WifiOff,
  Mail,
  Calendar,
  ChevronsDown,
  ChevronsUp,
  ArrowLeft,
  Menu,
  X,
  Home,
  Compass,
  UserPlus,
  Settings,
  User,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useMobileMenu } from "../../context/MobileMenuContext";
import Navigator from "../../Components/layout/Navigator";

import { updateUserStatus, updateUserProfile } from "../../services/userService";

const ProfilePage = () => {
  const { userData, refreshUserData } = useAuth();
  const { isMobile, isOpen, setIsOpen } = useMobileMenu();
  const navigate = useNavigate();

  const [profileData, setProfileData] = useState({
    name: "",
    surname: "",
    nickname: "",
    email: "",
    birthdate: "",
    createdDate: "",
    friendshipId: "",
    about: "",
    status: "online",
    isEditing: false,
    profileImage: "",
  });

  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    if (userData) {
      setProfileData((prev) => ({
        ...prev,
        name: userData.name || "",
        surname: userData.surname || "",
        nickname: userData.nickName || "",
        birthdate: userData.birthdate || userData.bithdate || "",
        createdDate: userData.createdDate || "",
        friendshipId: userData.friendshipID || "",
        email: userData.email || "@",
        profileImage: userData.photoURL || "/defaults/avatars/1.png",
        status: userData.status || "online",
        about: userData.about || "",
      }));
    }
  }, [userData]);

  const statusOptions = [
    { id: "online", label: "Çevrimiçi", icon: <Wifi size={18} /> },
    { id: "offline", label: "Çevrimdışı", icon: <WifiOff size={18} /> },
    { id: "sleeping", label: "Uykuda", icon: <Moon size={18} /> },
    { id: "dnd", label: "Rahatsız Etmeyin", icon: <BellOff size={18} /> },
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case "online":
        return "bg-green-500";
      case "offline":
        return "bg-gray-500";
      case "sleeping":
        return "bg-blue-500";
      case "dnd":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const handleEditToggle = () => {
    setProfileData({
      ...profileData,
      isEditing: !profileData.isEditing,
    });
  };

  // "Hakkımda"yı Firestore'a kaydet
  const handleSaveAbout = async () => {
    setProfileData((prev) => ({ ...prev, isEditing: false }));
    if (userData?.userID) {
      await updateUserProfile(userData.userID, { about: profileData.about });
      await refreshUserData();
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData({
      ...profileData,
      [name]: value,
    });
  };

  const handleStatusChange = async (status) => {
    setProfileData({
      ...profileData,
      status,
    });
    if (userData?.userID) {
      await updateUserStatus(userData.userID, status);
    }
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const renderBirthdate = () => {
    if (!profileData.birthdate) return "Girilmedi";
    if (profileData.birthdate.seconds) {
      return new Date(profileData.birthdate.seconds * 1000).toLocaleDateString("tr-TR");
    }
    if (typeof profileData.birthdate === "string") {
      return profileData.birthdate;
    }
    return "Girilmedi";
  };

  const renderCreatedDate = () => {
    if (!profileData.createdDate) return "";
    if (profileData.createdDate.seconds) {
      return new Date(profileData.createdDate.seconds * 1000).toLocaleDateString("tr-TR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    }
    return "";
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 60 }}
      transition={{ duration: 0.15 }}
      className="background fixed top-0 left-0 w-full h-screen bg-[var(--secondary-bg)] text-[var(--secondary-text)] flex flex-col overflow-hidden"
      style={{ paddingLeft: isMobile ? "0px" : "64px" }}
    >
      {isMobile && (
        <div className="flex items-center h-[60px] px-5 py-4 bg-[var(--primary-bg)] border-b-2 border-[var(--primary-border)] text-[var(--secondary-text)] shrink-0 z-30">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-lg hover:bg-[var(--secondary-bg)] transition-colors mr-3 text-[var(--secondary-text)]"
            aria-label="Geri Git"
          >
            <ArrowLeft size={20} />
          </button>
          <button
            onClick={() => setIsOpen(true)}
            className="p-1.5 rounded-lg hover:bg-[var(--secondary-bg)] transition-colors mr-3 text-[var(--secondary-text)]"
            aria-label="Menüyü Aç"
          >
            <Menu size={20} />
          </button>
          <span className="font-bold truncate text-lg">Profil</span>
        </div>
      )}



      <div className="flex-1 overflow-y-auto bg-[var(--primary-bg)]">
        <div className="min-h-full w-full flex justify-center items-start py-12 px-4 relative">
          <motion.div
            className="bg-[var(--secondary-bg)] rounded-2xl p-8 shadow-2xl w-full max-w-3xl relative"
            style={{
              perspective: "1000px",
              height: "600px",
              transformStyle: "preserve-3d",
            }}
            animate={{ rotateX: isFlipped ? 180 : 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          >
            {/* Ön Yüz */}
            <div
              className="absolute w-full h-full top-0 left-0 rounded-2xl"
              style={{
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
              }}
            >
              <div className="flex flex-col items-center justify-center text-center h-full gap-6 px-6">
                <div className="relative">
                  <div
                    onClick={() => navigate("/ProfileSettings")}
                    title="Profil fotoğrafını değiştir"
                    className="w-36 h-36 rounded-full overflow-hidden bg-[var(--secondary-bg)] cursor-pointer ring-0 hover:ring-4 hover:ring-[var(--tertiary-border)] transition-all"
                  >
                    <img
                      src={profileData.profileImage || "/defaults/avatars/1.png"}
                      alt="Profil"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div
                    className={`absolute bottom-2 right-2 w-6 h-6 rounded-full border-2 border-[var(--primary-bg)] ${getStatusColor(
                      profileData.status
                    )}`}
                  ></div>
                </div>

                <h1 className="text-3xl font-bold">
                  {profileData.name} {profileData.surname}
                </h1>

                <div className="text-[var(--quaternary-text)]">
                  @{profileData.nickname}
                </div>

                <div className="flex flex-col items-center text-sm text-[var(--quaternary-text)] gap-2">
                  <div className="flex items-center gap-2">
                    <Mail size={16} />
                    <span>{profileData.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar size={16} />
                    <span>
                      Doğum Tarihi: {renderBirthdate()}
                    </span>
                  </div>
                  {profileData.createdDate && (
                    <div>
                      Katılma Tarihi: {renderCreatedDate()}
                    </div>
                  )}
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-[var(--quaternary-text)] mb-2">
                    Durum
                  </h2>
                  <div className="flex flex-wrap justify-center gap-2">
                    {statusOptions.map((option) => (
                      <motion.button
                        key={option.id}
                        onClick={() => handleStatusChange(option.id)}
                        whileTap={{ scale: 0.95 }}
                        transition={{ duration: 0.25 }}
                        whileHover={{ scale: 1.1 }}
                        className={`flex items-center gap-2 py-2 px-4 rounded-full font-medium
                          ${
                            profileData.status === option.id
                              ? "bg-[var(--tertiary-bg)] text-[var(--tertiary-text)]"
                              : "bg-[var(--primary-bg)] text-[var(--primary-text)]"
                          }
                          `}
                        style={{
                          transition:
                            "background-color 0.3s ease, color 0.3s ease, transform 0.2s ease",
                        }}
                      >
                        {option.icon} {option.label}
                      </motion.button>
                    ))}
                  </div>
                </div>

                <motion.button
                  onClick={handleFlip}
                  className="text-[var(--quaternary-text)] flex justify-center items-center p-2 rounded-full"
                  animate={{ y: [0, 10, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <ChevronsDown size={32} strokeWidth={2} />
                </motion.button>
              </div>
            </div>

            {/* Arka Yüz */}
            <div
              className="absolute w-full h-full top-0 left-0 rounded-2xl p-8"
              style={{
                transform: "rotateX(180deg)",
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
              }}
            >
              <div className="flex flex-col items-center justify-center h-full gap-6 px-6 text-center">
                <h2 className="text-2xl font-bold text-[var(--primary-text)] mb-2">
                  Hakkımda
                </h2>

                <AnimatePresence mode="wait">
                  {profileData.isEditing ? (
                    <motion.textarea
                      key="textarea"
                      initial={{ opacity: 0, height: 0, y: -10 }}
                      animate={{ opacity: 1, height: "10rem", y: 0 }}
                      exit={{ opacity: 0, height: 0, y: -10 }}
                      transition={{ duration: 0.4, ease: "easeInOut" }}
                      name="about"
                      value={profileData.about}
                      onChange={handleInputChange}
                      className="w-full p-4 rounded-lg bg-[var(--primary-bg)] text-[var(--primary-text)] resize-none focus:outline-none overflow-hidden"
                      placeholder="Kendinizden bahsedin..."
                    />
                  ) : (
                    <motion.p
                      key="paragraph"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.4 }}
                      className="text-[var(--quaternary-text)] text-lg leading-relaxed text-center"
                    >
                      {profileData.about ||
                        "Hakkınızda henüz bir bilgi girilmedi."}
                    </motion.p>
                  )}
                </AnimatePresence>

                <div className="absolute top-4 right-4 z-10">
                  {profileData.isEditing ? (
                    <button
                      onClick={handleSaveAbout}
                      className="bg-green-500 text-white p-3 rounded-full shadow hover:bg-green-600 transition-colors"
                      title="Kaydet"
                    >
                      <Check size={20} />
                    </button>
                  ) : (
                    <button
                      onClick={handleEditToggle}
                      className="bg-[var(--tertiary-bg)] text-[var(--tertiary-text)] p-3 rounded-full shadow hover:bg-[var(--tertiary-bg-hover)] transition-colors"
                      title="Düzenle"
                    >
                      <Edit2 size={20} />
                    </button>
                  )}
                </div>

                <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                  <motion.button
                    onClick={handleFlip}
                    className="text-[var(--quaternary-text)] flex justify-center items-center p-2 rounded-full"
                    animate={{ y: [0, 10, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <ChevronsUp size={32} strokeWidth={2} />
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
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
                <div className="w-64 h-full bg-[var(--primary-bg)]/90 backdrop-blur-md flex flex-col relative p-5 overflow-y-auto gap-5 text-left">
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
                        navigate("/Profile");
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

export default ProfilePage;
