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
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import SocialBar from "../Components/SocialBar";

const Profile = () => {
  const { userData } = useAuth();

  const [profileData, setProfileData] = useState({
    name: "",
    surname: "",
    nickname: "",
    email: "",
    birthdate: "",
    createdDate: "",
    friendshipId: "",
    about:
      "Merhaba! Ben bir yazılım geliştiricisiyim ve yeni teknolojileri öğrenmekten keyif alıyorum.",
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
        birthdate: userData.birthdate || "",
        createdDate: userData.createdDate || "",
        friendshipId: userData.friendshipID || "",
        email: userData.email || "@",
        profileImage: userData.photoURL || "/1.png",
        about:
          userData.about ||
          "Merhaba! Ben bir yazılım geliştiricisiyim ve yeni teknolojileri öğrenmekten keyif alıyorum.",
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData({
      ...profileData,
      [name]: value,
    });
  };

  const handleStatusChange = (status) => {
    setProfileData({
      ...profileData,
      status,
    });
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 100 }}
      transition={{ duration: 0.3 }}
      className="fixed top-0 left-0 w-full h-screen overflow-y-auto"
    >
      <SocialBar />
      <div className="background bg-[var(--primary-bg)] text-[var(--primary-text)] min-h-screen w-full flex justify-center items-start py-12 px-4">
        {/* Flip Card Wrapper */}
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
                <div className="w-36 h-36 rounded-full overflow-hidden bg-[var(--secondary-bg)]">
                  <img
                    src={profileData.profileImage}
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
                    Doğum Tarihi:{" "}
                    {new Date(
                      profileData.birthdate.seconds * 1000
                    ).toLocaleDateString("tr-TR")}
                  </span>
                </div>
                <div>
                  Katılma Tarihi:{" "}
                  {new Date(
                    profileData.createdDate.seconds * 1000
                  ).toLocaleDateString("tr-TR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}
                </div>
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
                    onClick={handleEditToggle}
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
    </motion.div>
  );
};

export default Profile;
