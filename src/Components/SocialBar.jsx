import '../App.css';
import { FaUserFriends } from 'react-icons/fa';
import { AiOutlineGlobal } from "react-icons/ai";
import { useState, useRef } from "react";
import ProfilePanel from './ProfilePanel'
import icon from "../assets/360.png";

const SocialBar = () => {
    const [isFlagSetted, setIsFlagSetted] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    return (
        <>
            <div className="fixed top-0 right-0 bg-[var(--primary-bg)] h-screen w-48 shadow-xl">
                <FriendsBarExpand isFlagSetted={isFlagSetted} 
                toggleExpand={() => setIsFlagSetted(false)} />

                <ServerBarExpand isFlagSetted={isFlagSetted} 
                toggleExpand={() => setIsFlagSetted(true)} />
                
                {!isFlagSetted && (
                    <FriendList isExpanded={isExpanded} setIsExpanded={setIsExpanded} />
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
                "icon fixed group cursor-pointer rounded-md w-22 top-0 right-0" : 
                "hovered-icon fixed group cursor-pointer rounded-md w-22 top-0 right-0"}
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
                "icon fixed group cursor-pointer rounded-md w-22 top-0 right-25" : 
                "hovered-icon fixed group cursor-pointer rounded-md w-22 top-0 right-25"}
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
            rounded-md text-xs font-bold max-h-[calc(100vh-84px)]
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
        </div>
    )
}

const FriendList = ({isExpanded, setIsExpanded}) => {

    const [position, setPosition] = useState({ top: 0, left: 0 });
    const userRefs = useRef({}); // Her kullanıcı için ref saklamak için obje
    const [selectedUser, setSelectedUser] = useState(null);

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
            rounded-md text-xs font-bold max-h-[calc(100vh-84px)]
            shadow-xl mx-auto mt-16"
            >
            <div className="grid gap-2 p-1">
                {Array(100).fill("Chiramii").map((user, UID) => (
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
        </div>
    )
}

export default SocialBar;