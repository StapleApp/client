import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { User, Edit2, Check, Moon, BellOff, Wifi, WifiOff, Mail, Calendar, Hash } from "lucide-react";
import { useAuth } from "../context/AuthContext";

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
        about: "",
        status: "online",
        isEditing: false,
        profileImage: "",
    });

    // userData'dan ilk değerleri al
    useEffect(() => {
        if (userData) {
            setProfileData((prev) => ({
                ...prev,
                name: userData.name || "",
                surname: userData.surname || "",
                nickname: userData.nickName ||"",
                birthdate: userData.birthdate || "",
                createdDate: userData.createdDate || "",
                friendshipId: userData.friendshipID || "",
                email: userData.email || "@",
                profileImage: userData.photoURL || "/api/placeholder/150/150",
            }));
        }
    }, [userData]);

    console.log(profileData)

    const statusOptions = [
        { id: "online", label: "Çevrimiçi", icon: <Wifi size={18} /> },
        { id: "offline", label: "Çevrimdışı", icon: <WifiOff size={18} /> },
        { id: "sleeping", label: "Uykuda", icon: <Moon size={18} /> },
        { id: "dnd", label: "Rahatsız Etmeyin", icon: <BellOff size={18} /> }
    ];

    const getStatusColor = (status) => {
        switch (status) {
            case "online": return "bg-green-500";
            case "offline": return "bg-gray-500";
            case "sleeping": return "bg-blue-500";
            case "dnd": return "bg-red-500";
            default: return "bg-gray-500";
        }
    };

    const handleEditToggle = () => {
        setProfileData({
            ...profileData,
            isEditing: !profileData.isEditing
        });
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setProfileData({
            ...profileData,
            [name]: value
        });
    };

    const handleStatusChange = (status) => {
        setProfileData({
            ...profileData,
            status
        });
    };

    return(
        <motion.div
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}  
            exit={{ opacity: 0, x: 100 }}  
            transition={{ duration: 0.3 }}  
            className="fixed top-0 left-0 w-full h-screen overflow-y-auto"
        >
            <div className="background bg-[var(--primary-bg)] text-[var(--primary-text)] min-h-screen w-full">
                {/* Profile Content */}
                <div className="max-w-4xl mx-auto px-4 py-10">
                    {/* Profile Picture & Basic Info */}
                    <div className="bg-[var(--secondary-bg)] rounded-lg p-6 shadow-lg mb-6">
                        <div className="flex items-start gap-6">
                            {/* Profile Picture */}
                            <div className="relative">
                                <div className="w-40 h-40 rounded-full overflow-hidden bg-[var(--secondary-bg)]">
                                    <img 
                                        src={profileData.profileImage} 
                                        alt="Profil" 
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className={`absolute bottom-2 right-2 w-6 h-6 rounded-full border-2 border-[var(--primary-bg)] ${getStatusColor(profileData.status)}`}></div>
                            </div>

                            {/* User Info */}
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h1 className="text-3xl font-bold mb-2">
                                            {profileData.name} {profileData.surname}
                                        </h1>
                                        <div className="flex items-center gap-2 text-[var(--quaternary-text)]">
                                            <span>{profileData.nickname}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-[var(--quaternary-text)] mt-1">
                                            <Mail size={16} />
                                            <span>{profileData.email}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-[var(--quaternary-text)] mt-1">
                                            <Calendar size={16} />
                                            <span>Doğum Tarihi: {new Date(profileData.birthdate.seconds * 1000).toLocaleDateString('tr-TR')}</span>
                                        </div>
                                        <div className="text-sm text-[var(--quaternary-text)] mt-2">
                                            Katılma Tarihi: {new Date(profileData.createdDate.seconds * 1000).toLocaleDateString('tr-TR', {
                                            day: "2-digit",
                                            month: "2-digit",
                                            year: "numeric",
                                            })}
                                        </div>
                                    </div>
                                    <button 
                                        onClick={handleEditToggle}
                                        className="bg-[var(--tertiary-bg)] text-[var(--tertiary-text)] p-2 rounded-full shadow-lg"
                                    >
                                        {profileData.isEditing ? <Check size={20} /> : <Edit2 size={20} />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Status Section */}
                    <div className="bg-[var(--secondary-bg)] rounded-lg p-6 shadow-lg mb-6">
                        <h2 className="text-xl mb-3 font-semibold text-[var(--quaternary-text)]">Durum</h2>
                        <div className="flex flex-wrap gap-2">
                            {statusOptions.map(option => (
                                <button
                                    key={option.id}
                                    onClick={() => handleStatusChange(option.id)}
                                    className={`flex items-center gap-2 py-2 px-4 rounded-full ${
                                        profileData.status === option.id 
                                        ? 'bg-[var(--tertiary-bg)] text-[var(--tertiary-text)]' 
                                        : 'bg-[var(--primary-bg)] text-[var(--primary-text)]'
                                    }`}
                                >
                                    {option.icon} {option.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* About Section */}
                    <div className="bg-[var(--secondary-bg)] rounded-lg p-6 shadow-lg">
                        <h2 className="text-xl mb-3 font-semibold text-[var(--quaternary-text)]">Hakkımda</h2>
                        {profileData.isEditing ? (
                            <textarea
                                name="about"
                                value={profileData.about}
                                onChange={handleInputChange}
                                className="w-full min-h-32 p-3 rounded bg-[var(--primary-bg)] text-[var(--primary-text)]"
                            />
                        ) : (
                            <p className="whitespace-pre-wrap">{profileData.about || "Henüz bir hakkımda yazısı eklenmemiş."}</p>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default Profile;