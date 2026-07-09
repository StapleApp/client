import '../../styles/components.css';
import { FaUserFriends } from 'react-icons/fa';
import { AiOutlineGlobal } from "react-icons/ai";
import { useState, useRef, useEffect } from "react";
import ProfilePanel from './ProfilePanel'
import { useAuth } from "../../context/AuthContext";
import { getFriendsList } from '../../services/friendService';
import { getServersList } from '../../services/serverService';
import icon from "../../assets/360.png";
import { getUser } from '../../services/userService';
import { useNavigate } from "react-router-dom";

const SocialBar = ({ defaultTab = "friends" }) => {
    const [tab, setTab] = useState(defaultTab === "servers" ? "servers" : "friends");
    const [isExpanded, setIsExpanded] = useState(false);
    const { userData } = useAuth();

    return (
        <div className="fixed top-0 right-0 bg-[var(--primary-bg)] h-screen w-56 shadow-xl border-l border-[var(--primary-border)] flex flex-col z-20">
            {/* Sekmeler */}
            <div className="flex border-b border-[var(--primary-border)] shrink-0">
                <TabButton
                    active={tab === "friends"}
                    onClick={() => setTab("friends")}
                    icon={<FaUserFriends size="18" />}
                    label="Arkadaşlar"
                />
                <TabButton
                    active={tab === "servers"}
                    onClick={() => setTab("servers")}
                    icon={<AiOutlineGlobal size="18" />}
                    label="Sunucular"
                />
            </div>

            {/* İçerik */}
            <div className="flex-1 overflow-y-auto">
                {tab === "friends" ? (
                    <FriendList isExpanded={isExpanded} setIsExpanded={setIsExpanded} userData={userData} />
                ) : (
                    <ServerList />
                )}
            </div>
        </div>
    );
};

const TabButton = ({ active, onClick, icon, label }) => (
    <button
        onClick={onClick}
        className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-colors border-b-2 ${
            active
                ? "border-[var(--tertiary-border)] text-[var(--quaternary-text)]"
                : "border-transparent text-[var(--primary-text)] hover:text-[var(--secondary-text)]"
        }`}
    >
        {icon}
        {label}
    </button>
);

const RightBarImg = ({ src, toggleExpand }) => {
    return (
        <div
            className="group cursor-pointer rounded-full"
            onClick={toggleExpand}
        >
            <img src={src} className="w-10 h-10 rounded-full" alt={"logo"} />
        </div>
    );
};

const ServerList = () => {
    const navigate = useNavigate();
    const [servers, setServers] = useState([]);
    const { currentUser } = useAuth();

    useEffect(() => {
        const fetchServers = async () => {
            if (currentUser) {
                const serverList = await getServersList(currentUser.uid);

                const formatted = serverList.map((server) => ({
                    serverID: server.ServerId,
                    serverName: server.ServerName,
                    serverType: server.ServerType,
                    serverPhoto: server.ServerPhotoURL || icon
                }));

                setServers(formatted);
            }
        };

        fetchServers();
    }, [currentUser]);

    // Sunucular kullanıcı değildir — tıklayınca profil kartı DEĞİL, doğrudan sunucuya git.
    const handleServerClick = (serverID) => {
        navigate(`/server/${serverID}`);
    };

    return (
        <div className="p-2 text-[var(--primary-text)] text-xs font-bold">
            <div className="grid gap-2">
                {servers.map((server) => (
                    <div
                        key={server.serverID}
                        onClick={() => handleServerClick(server.serverID)}
                        className="flex items-center w-full h-14 bg-[var(--primary-bg)] rounded-md p-2
                            border-3 border-[var(--primary-border)] shadow-xl
                            hover:border-3 hover:border-[var(--tertiary-border)]
                            transition-all duration-300 ease-linear hover:scale-105 cursor-pointer"
                    >
                        <span className="ml-1 mr-3 rounded-full">
                            <img src={server.serverPhoto} className="w-10 h-10 rounded-full" alt="" />
                        </span>
                        <span className="truncate">{server.serverName}</span>
                    </div>
                ))}

                {servers.length === 0 && (
                    <p className="text-center text-[var(--primary-text)] py-4 font-normal">
                        Henüz sunucun yok.
                    </p>
                )}
            </div>

            <div
                onClick={() => navigate("/create-server")}
                className="text-center p-2 mt-2 cursor-pointer text-sm font-semibold
                    hover:underline hover:text-[var(--quaternary-text)] transition-all duration-200"
            >
                + Sunucu Oluştur
            </div>
        </div>
    );
};

const FriendList = ({ isExpanded, setIsExpanded, userData }) => {
    const [friends, setFriends] = useState([]);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const userRefs = useRef({});
    const [selectedUser, setSelectedUser] = useState(null);

    const getStatusColor = (status) => {
        switch (status) {
            case "online": return "bg-green-500";
            case "offline": return "bg-gray-500";
            case "sleeping": return "bg-blue-500";
            case "dnd": return "bg-red-500";
            default: return "bg-gray-500";
        }
    };

    useEffect(() => {
        const fetchFriends = async () => {
            if (userData) {
                const friendList = await getFriendsList(userData.userID);

                const fullFriendData = await Promise.all(
                    friendList.map(async (friend) => {
                        const userInfo = await getUser(friend.uid);
                        return {
                            uid: friend.uid,
                            nickName: userInfo.nickName,
                            friendshipID: userInfo.friendshipID,
                            photoURL: userInfo.photoURL,
                            status: userInfo.status || "offline"
                        };
                    })
                );

                setFriends(fullFriendData);
            }
        };

        fetchFriends();
    }, [userData]);

    const handleUserClick = (uid, nickName, friendshipID, photoURL) => {
        if (userRefs.current[uid]) {
            const rect = userRefs.current[uid].getBoundingClientRect();
            setPosition({ top: rect.top, left: rect.right });
            setSelectedUser({ userID: uid, id: friendshipID, photoURL: photoURL, nickName: nickName });
            setIsExpanded(true);
        }
    };

    return (
        <div className="p-2 text-[var(--primary-text)] text-xs font-bold">
            <div className="grid gap-2">
                {friends.map((user) => (
                    <div
                        key={user.uid}
                        ref={(el) => (userRefs.current[user.uid] = el)}
                        onClick={() => handleUserClick(user.uid, user.nickName, user.friendshipID, user.photoURL)}
                        className="flex items-center w-full h-14 bg-[var(--primary-bg)] rounded-md p-2
                            border-3 border-[var(--primary-border)] shadow-xl
                            hover:border-3 hover:border-[var(--tertiary-border)]
                            transition-all duration-300 ease-linear hover:scale-105 cursor-pointer relative"
                    >
                        <span className="group cursor-pointer ml-1 mr-3 rounded-full relative">
                            <RightBarImg src={user.photoURL} toggleExpand={() => setIsExpanded(true)} />
                            <span className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-[var(--primary-bg)] ${getStatusColor(user.status)}`} />
                        </span>
                        <span className="truncate">{user.nickName}</span>
                    </div>
                ))}

                {friends.length === 0 && (
                    <p className="text-center text-[var(--primary-text)] py-4 font-normal">
                        Henüz arkadaşın yok.
                    </p>
                )}

                {selectedUser && (
                    <ProfilePanel
                        check={isExpanded}
                        setCheck={setIsExpanded}
                        posX={position.left}
                        posY={position.top}
                        userName={selectedUser.nickName}
                        photoURL={selectedUser.photoURL}
                        userID={selectedUser.id}
                        UID={selectedUser.userID}
                    />
                )}
            </div>
        </div>
    );
};

export default SocialBar;
