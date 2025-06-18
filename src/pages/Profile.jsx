import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { User, Edit2, Check, Moon, BellOff, Wifi, WifiOff } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const Profile = () => {
    const { userData } = useAuth();

    // Varsayılan profil verileri
    const defaultProfileData = {
        name: "",
        surname: "",
        nickname: "",
        birthdate: "",
        createdDate: "",
        friendshipId: "",
        email: "@",
        profileImage: "/api/placeholder/150/150",
        coverImage: "",
        about: "",
        status: "online",
        isEditing: false,
    };

    // State tanımlamaları
    const [profileData, setProfileData] = useState(defaultProfileData);

    // Yardımcı fonksiyon: Profil verilerini güncelle
    const updateProfileData = (userData) => ({
        ...defaultProfileData,
        ...userData,
        profileImage: userData?.photoURL || defaultProfileData.profileImage,
    });

    // userData değiştiğinde profileData'yı güncelle
    useEffect(() => {
        if (userData) {
            setProfileData(updateProfileData(userData));
        }
    }, [userData]);

    // Durum seçenekleri
    const statusOptions = [
        { id: "online", label: "Çevrimiçi", icon: <Wifi size={18} /> },
        { id: "offline", label: "Çevrimdışı", icon: <WifiOff size={18} /> },
        { id: "sleeping", label: "Uykuda", icon: <Moon size={18} /> },
        { id: "dnd", label: "Rahatsız Etmeyin", icon: <BellOff size={18} /> },
    ];

    // Durum rengi belirleme
    const getStatusColor = (status) => {
        const statusColors = {
            online: "bg-green-500",
            offline: "bg-gray-500",
            sleeping: "bg-blue-500",
            dnd: "bg-red-500",
        };
        return statusColors[status] || "bg-gray-500";
    };

    // Düzenleme modunu aç/kapat
    const handleEditToggle = () => {
        setProfileData((prev) => ({
            ...prev,
            isEditing: !prev.isEditing,
        }));
    };

    // Input değişikliklerini işleme
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setProfileData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    // Durum değişikliğini işleme
    const handleStatusChange = (status) => {
        setProfileData((prev) => ({
            ...prev,
            status,
        }));
    };

    return (
        <>
            <motion.div
                initial={{ opacity: 0, x: -100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 100 }}
                transition={{ duration: 0.3 }}
                className="fixed top-0 left-0 w-full h-screen overflow-y-auto"
            >
                <div className="background bg-[var(--primary-bg)] text-[var(--primary-text)] min-h-screen w-full">
                    {/* Kapak Fotoğrafı */}
                    <div
                        className="w-full h-64 bg-[var(--secondary-bg)] relative"
                        style={{
                            backgroundImage: `url(${profileData.coverImage})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                        }}
                    >
                        {/* Düzenleme Butonu */}
                        <button
                            onClick={handleEditToggle}
                            className="absolute top-4 right-4 bg-[var(--tertiary-bg)] text-[var(--tertiary-text)] p-2 rounded-full shadow-lg"
                        >
                            {profileData.isEditing ? <Check size={20} /> : <Edit2 size={20} />}
                        </button>
                    </div>

                    {/* Profil İçeriği */}
                    <div className="max-w-4xl mx-auto px-4 pb-10 relative">
                        {/* Profil Resmi */}
                        <div className="relative -mt-20 mb-4 flex justify-center">
                            <div className="relative">
                                <div className="w-40 h-40 rounded-full border-4 border-[var(--primary-bg)] overflow-hidden bg-[var(--secondary-bg)]">
                                    {profileData.profileImage ? (
                                        <img
                                            src={profileData.profileImage}
                                            alt="Profil"
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <User size={64} />
                                        </div>
                                    )}
                                </div>
                                {/* Durum Göstergesi */}
                                <div
                                    className={`absolute bottom-2 right-2 w-6 h-6 rounded-full border-2 border-[var(--primary-bg)] ${getStatusColor(
                                        profileData.status
                                    )}`}
                                ></div>
                            </div>
                        </div>

                        {/* Profil Bilgileri */}
                        <div className="bg-[var(--secondary-bg)] text-[var(--secondary-text)] rounded-lg p-6 shadow-lg mb-6">
                            {/* İsim */}
                            <div className="text-center mb-6">
                                {profileData.isEditing ? (
                                    <input
                                        type="text"
                                        name="name"
                                        value={profileData.name}
                                        onChange={handleInputChange}
                                        className="text-3xl font-bold bg-[var(--tertiary-bg)] text-[var(--tertiary-text)] p-2 rounded w-full text-center"
                                    />
                                ) : (
                                    <h1 className="text-3xl font-bold">{profileData.name}</h1>
                                )}
                            </div>

                            {/* Durum */}
                            <div className="mb-6">
                                <h2 className="text-xl mb-3 font-semibold text-[var(--quaternary-text)]">Durum</h2>
                                <div className="flex flex-wrap gap-2">
                                    {statusOptions.map((option) => (
                                        <button
                                            key={option.id}
                                            onClick={() => handleStatusChange(option.id)}
                                            className={`flex items-center gap-2 py-2 px-4 rounded-full ${
                                                profileData.status === option.id
                                                    ? "bg-[var(--tertiary-bg)] text-[var(--tertiary-text)]"
                                                    : "bg-[var(--primary-bg)] text-[var(--primary-text)]"
                                            }`}
                                        >
                                            {option.icon} {option.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Hakkımda */}
                            <div>
                                <h2 className="text-xl mb-3 font-semibold text-[var(--quaternary-text)]">Hakkımda</h2>
                                {profileData.isEditing ? (
                                    <textarea
                                        name="about"
                                        value={profileData.about}
                                        onChange={handleInputChange}
                                        className="w-full min-h-32 p-3 rounded bg-[var(--primary-bg)] text-[var(--primary-text)]"
                                    />
                                ) : (
                                    <p className="whitespace-pre-wrap">{profileData.about}</p>
                                )}
                            </div>

                            {/* Resim URL'leri (Düzenleme modunda görünür) */}
                            {profileData.isEditing && (
                                <div className="mt-6 space-y-4">
                                    <div>
                                        <label className="block mb-2 text-[var(--quaternary-text)]">Profil Resmi URL</label>
                                        <input
                                            type="text"
                                            name="profileImage"
                                            value={profileData.profileImage}
                                            onChange={handleInputChange}
                                            className="w-full p-2 rounded bg-[var(--primary-bg)] text-[var(--primary-text)]"
                                            placeholder="https://example.com/profile.jpg"
                                        />
                                    </div>
                                    <div>
                                        <label className="block mb-2 text-[var(--quaternary-text)]">Kapak Fotoğrafı URL</label>
                                        <input
                                            type="text"
                                            name="coverImage"
                                            value={profileData.coverImage}
                                            onChange={handleInputChange}
                                            className="w-full p-2 rounded bg-[var(--primary-bg)] text-[var(--primary-text)]"
                                            placeholder="https://example.com/cover.jpg"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>
        </>
    );
};

export default Profile;