import '../App.css';
import { FaUserFriends } from 'react-icons/fa';
import { AiOutlineGlobal } from "react-icons/ai";
import { useState, useRef ,useEffect} from "react";
import ProfilePanel from './ProfilePanel'
import { useAuth } from "../context/AuthContext";
import { getFriendsList } from '../../firebase';
import icon from "../assets/360.png";
import { getUser } from '../../firebase';
import { useNavigate } from "react-router-dom";

const SocialBar = () => {
    const [isFlagSetted, setIsFlagSetted] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const { currentUser, userData } = useAuth();
    return (
        <>
            <div className="fixed top-0 right-0 bg-[var(--primary-bg)] h-screen w-48 shadow-xl">
                <FriendsBarExpand isFlagSetted={isFlagSetted} 
                toggleExpand={() => setIsFlagSetted(false)} />

                <ServerBarExpand isFlagSetted={isFlagSetted} 
                toggleExpand={() => setIsFlagSetted(true)} />
                
                {!isFlagSetted && (
                    <FriendList isExpanded={isExpanded} setIsExpanded={setIsExpanded} userData={userData}/>
                )}

                {isFlagSetted && (
                    <ServerList isExpanded={isExpanded} setIsExpanded={setIsExpanded} />
                )}
            </div>
        </>
    );
};

const FriendsBarExpand = ({ toggleExpand, isFlagSetted }) => {
    return (
        <div 
            className={isFlagSetted ?
                "icon fixed group cursor-pointer rounded-md w-18 top-0 right-2 mr-2" : 
                "hovered-icon fixed group cursor-pointer rounded-md w-18 top-0 right-2 mr-2"}
            onClick={toggleExpand}
        >
            <FaUserFriends size="25" />         
        </div>
    )
}

const ServerBarExpand = ({ toggleExpand, isFlagSetted}) => {
    return (
        <div 
            className={!isFlagSetted ?
                "icon fixed group cursor-pointer rounded-md w-18 top-0 right-26 " : 
                "hovered-icon fixed group cursor-pointer rounded-md w-18 top-0 right-26"}
            onClick={toggleExpand}
        >
            <AiOutlineGlobal size="25" />        
        </div>
    )
}
 
const RightBarImg = ({ src, toggleExpand }) => {

    return (
        <>
            <div
            className="group cursor-pointer rounded-full"
            onClick={toggleExpand}
            >
            <img src={src} className="w-10 h-10 rounded-full" alt={"logo"} />
            </div>
        </>
    );
};

const ServerList = ({isExpanded, setIsExpanded}) => {

    const [position, setPosition] = useState({ top: 0, left: 0 });
    const userRefs = useRef({}); // Her kullanıcı için ref saklamak için obje
    const [selectedUser, setSelectedUser] = useState(null);
    const navigate = useNavigate();

    const handleUserClick = (id, name) => {
        if (userRefs.current[id]) {
            const rect = userRefs.current[id].getBoundingClientRect();

            let top = rect.top;
            let left = rect.right;

            setPosition({ top, left });

            // Seçilen kullanıcıyı state'e kaydet
            setSelectedUser({ id, name });
            setIsExpanded(true);
        }
    };

    return (
        <div className="flex-1 overflow-y-auto w-40 mb-1 
            bg-[var(--secondary-bg)] text-[var(--primary-text)] 
            rounded-md text-xs font-bold max-h-[calc(100vh-74px)]
            shadow-xl mx-auto mt-16"
        >
            <div className="grid gap-2 p-1">
                {Array(5).fill("Sunucu").map((user, UID) => (
                    <div key={UID} ref={(element) => (userRefs.current[UID] = element)}
                        onClick={() => handleUserClick(UID, user)}
                        className="flex items-center w-full h-14 bg-[var(--primary-bg)] rounded-md p-2
                        border-3 border-[var(--primary-border)] shadow-xl
                        hover:border-3 hover:border-[var(--tertiary-border)]
                        transition-all duration-300 ease-linear hover:scale-105 cursor-pointer">
                        <span className="group cursor-pointer ml-1 mr-3 rounded-full">
                            <RightBarImg src={icon} toggleExpand={() => setIsExpanded(true)} />
                        </span>
                        <span>{user + UID}</span>
                    </div>
                ))}

                {selectedUser && (
                    <ProfilePanel 
                        check={isExpanded} 
                        setCheck={setIsExpanded}
                        posX={position.left} 
                        posY={position.top}
                        userName={selectedUser.name} 
                        userID={selectedUser.id}
                    />
                )}
            </div>
            <div 
            onClick={() => navigate("/create-server")}
            className="text-center p-2 mt-2 cursor-pointer text-sm font-semibold
               hover:underline hover:text-[var(--accent-color)] transition-all duration-200"
            >
            Sunucu Oluştur
            </div>
            

        </div>
    )
}

const FriendList = ({ isExpanded, setIsExpanded, userData }) => {
    const [friends, setFriends] = useState([]);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const userRefs = useRef({});
    const [selectedUser, setSelectedUser] = useState(null);

    useEffect(() => {
        const fetchFriends = async () => {
            if (userData) {
                const friendList = await getFriendsList(userData.userID);

                // UID listesi üzerinden isimleri çek
                const fullFriendData = await Promise.all(
                    friendList.map(async (friend) => {
                        const userInfo = await getUser(friend.uid);
                        console.log("ananasaldırdım" , userInfo)
                        return { uid: friend.uid, nickName: userInfo.nickName , friendshipID: userInfo.friendshipID};
                    })
                );
    
                setFriends(fullFriendData);
            }
        };
    
        fetchFriends();
    }, [userData]);
    

    const handleUserClick = (uid, nickName, friendshipID) => {
        if (userRefs.current[uid]) {
            console.log(userRefs)
            const rect = userRefs.current[uid].getBoundingClientRect();
            setPosition({ top: rect.top, left: rect.right });
    
            // 👇 Artık friendshipID'yi profile panelde göstermek için gönderiyoruz
            setSelectedUser({ userID: uid, id: friendshipID, nickName: nickName });
            setIsExpanded(true);
        }
    };
    

    return (
        <div className="flex-1 overflow-y-auto w-40 mb-1 
            bg-[var(--secondary-bg)] text-[var(--primary-text)] 
            rounded-md text-xs font-bold max-h-[calc(100vh-74px)]
            shadow-xl mx-auto mt-16">
            
            <div className="grid gap-2 p-1">
            {friends.map((user) => (
            <div
                key={user.uid}
                ref={(el) => (userRefs.current[user.uid] = el)}
                onClick={() => handleUserClick(user.uid, user.nickName, user.friendshipID)}
                className="flex items-center w-full h-14 bg-[var(--primary-bg)] rounded-md p-2
                    border-3 border-[var(--primary-border)] shadow-xl
                    hover:border-3 hover:border-[var(--tertiary-border)]
                    transition-all duration-300 ease-linear hover:scale-105 cursor-pointer"
            >
                <span className="group cursor-pointer ml-1 mr-3 rounded-full">
                    <RightBarImg src={icon} toggleExpand={() => setIsExpanded(true)} />
                </span>
                <span>{user.nickName}</span> {/* 👈 Burada artık isim gözüküyor */}
            </div>
        ))}


                {selectedUser && (
                    <ProfilePanel 
                        check={isExpanded} 
                        setCheck={setIsExpanded}
                        posX={position.left} 
                        posY={position.top}
                        userName={selectedUser.nickName} 
                        userID={selectedUser.id} // friendship ID
                        UID={selectedUser.userID} // user ID
                    />
                )}
            </div>
        </div>
    );
};



export default SocialBar;