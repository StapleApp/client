import { useNavigate } from "react-router-dom";
import { IoPersonAdd } from "react-icons/io5";
import { IoMdClose } from "react-icons/io";
import { CgProfile } from "react-icons/cg";
import { FaTelegramPlane } from "react-icons/fa";
import { useEffect, useRef } from "react"; // Import useEffect and useRef
import profileBackground2_small from "../assets/profileBackground2_small.png";
import icon from "../assets/360.png";
import { getGroupById, createGroup } from "../../firebase";
import { useAuth } from "../context/AuthContext";

const ProfilePanel = ({ check, setCheck, posX, posY, userName, userID ,memberDate, UID}) => {
  const formattedUID = `${userID}`.padStart(6, '0');
  const panelRef = useRef(null); // Create a reference to the panel
  const { userData } = useAuth();

  const clampPosition = (x, y, panelWidth, panelHeight) => {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
  
    // Sağ ve sol sınırlar
    let clampedX = Math.min(Math.max(x, 0), screenWidth - panelWidth);
  
    // Üst ve alt sınırlar
    let clampedY = Math.min(Math.max(y, 0), screenHeight - panelHeight);
  
    return { clampedX, clampedY };
  };

  const panelWidth = 340;
  const panelHeight = 304;
  const { clampedX, clampedY } = clampPosition(posX, posY, panelWidth, panelHeight);

 // Database'den gelen Timestamp verisini Date nesnesine dönüştürme
  let creadetDateText = "Üyelik tarihi mevcut değil";

  if (userData && memberDate) {
    const createdDateTimestamp = memberDate;
    const createdDate = new Date(createdDateTimestamp.seconds * 1000);
    const formattedDate = createdDate.toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    creadetDateText = "Şu tarihten beri üye : " + formattedDate;
  }

  // Panel açılınca, panel dışı her yeri dinleyen listener ekledim
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (check && panelRef.current && !panelRef.current.contains(event.target)) {
        setCheck(false);
      }
    };

    // Panel açıksa diğer yerleri dinliyor
    if (check) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    // Panel kapanınca dinlemeyi durduruyor
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [check, setCheck]);

  return (
    <div
      ref={panelRef}
      className={`fixed z-10 h-76 w-80 ml-1 rounded-md
              bg-[var(--primary-bg)] shadow-xl
              transition-all duration-300 ease-in-out
              flex flex-col justify-between
              ${check 
                  ? `opacity-100 scale-100 translate-y-0` 
                  : "opacity-0 scale-95 translate-y-2 pointer-events-none"}`}
      style={{ top: `${clampedY - 32}px`, left: `${clampedX - 180}px` }}
    >
      {/* Üst Menü Öğeleri */}
      <div className="flex flex-col h-auto">
        <div className="grid grid-rows-3">
          {/* Üst Arkaplan */}
          <div className="row-span-2">
            <img className="rounded-t-md h-32 w-80" src={profileBackground2_small} />
          </div>

          {/* Ortada Duracak İkon */}
          <div className="absolute top-1/12 grid grid-cols-3 w-76">
            <ProfilePicture src={icon} />
            <div className="grid col-span-2 expanded-text bg-[var(--primary-bg)] h-6 my-auto rounded-md mr-3 p-0">
              <div className="flex text-sm justify-between">
                <span className="ml-2">{userName}</span>
                <span className="mr-2">{"#" + formattedUID}</span>
              </div>
            </div>
          </div>

          {/* Alt Arkaplan */}
          <div className="flex my-auto">
            {userData.friendshipID == userID ?
            <div className="flex gap-3 pl-1">
            <ProfileButton />
            <SideBarIconClose toggleExpand={() => setCheck(false)} />
            </div>
            :
            <>
            <ProfileButton />
            <AddFriendButton />
            <DMButton userID={UID} userData={userData} />
            <SideBarIconClose toggleExpand={() => setCheck(false)} />
            </> 
            }
          </div>
        </div>
        <textarea
          className="expanded-text text-sm bg-[var(--secondary-bg)]
                  col-span-2 m-1 pl-2 rounded-md h-14 p-0 resize-none"
          type="text"
          // value={""}
          maxLength="100"
          placeholder="Hakkında..."
        ></textarea>
      </div>

      {/* Alt Menü Öğeleri */}
      <div className="flex flex-col h-16">
        <hr className="border-[var(--primary-border)] border" />
        <div className="expanded-text h-6 rounded-md mr-3 p-0 flex my-auto">
          <span className="ml-2 text-sm expanded-text h-12">
            {creadetDateText}
          </span>
        </div>
      </div>
    </div>
  );
};

const ProfileButton = () => {
  const navigate = useNavigate();
  return (
    <>
      <div
        className="flex icon group cursor-pointer hover:scale-105 h-7 w-20 mt-1 mb-0 mx-auto"
        onClick={() => navigate("/Profile")}
      >
        <span
          className="bg-[var(--primary-bg)] text-[var(--primary-text)] text-sm font-bold mr-1"
        >
          Profil
        </span>
        <CgProfile size="15" />
      </div>
    </>
  );
};

const AddFriendButton = () => {
  const navigate = useNavigate();
  return (
    <>
      <div
        className="flex icon group cursor-pointer hover:scale-105 h-7 w-20 mt-1 mb-0 mx-auto"
        onClick={() => navigate("/AddFriends")}
      >
        <span
          className="bg-[var(--primary-bg)]
                text-[var(--primary-text)] text-sm font-bold mr-1"
        >
          Ekle
        </span>
        <IoPersonAdd size="15" />
      </div>
    </>
  );
};

const DMButton = ({ userID, userData }) => {
  const navigate = useNavigate();
  return (
    <div
      className="flex icon group cursor-pointer hover:scale-105 h-7 w-20 mt-1 mb-0 mx-auto"
      onClick={() => {
        userData.groups.forEach((groupID) => {
          getGroupById(groupID).then((group) => {
            if (group.users.includes(userID)) {
              navigate(`/DirectMessaging`);
            }
          });
        });

        createGroup("DM", [userData.userID, userID]).then((groupID) => {
          if (groupID) {
            navigate(`/DirectMessaging`);
          }
        });
      }}
    >
      <span className="bg-[var(--primary-bg)] text-[var(--primary-text)] text-sm font-bold mr-1">
        DM
      </span>
      <FaTelegramPlane size="15" />
    </div>
  );
};

const SideBarIconClose = ({ toggleExpand }) => {
  return (
    <>
      <div
        className="flex icon group cursor-pointer hover:scale-105 
        h-7 w-7 mt-1 mb-0 mx-auto rounded-full border-red-700 hover:border-red-500 text-red-700 hover:text-red-500"
        onClick={toggleExpand}
      >
        <IoMdClose size="20" />
      </div>
    </>
  );
};

const ProfilePicture = ({ src }) => {
  const navigate = useNavigate();
  return (
    <>
      <div
        className="icon group cursor-pointer hover:scale-105 w-15 h-15 my-auto ml-3 mr-2 rounded-full"
        onClick={() => navigate("/Profile")}
      >
        <img src={src} className="rounded-full h-14 w-14" />
      </div>
    </>
  );
};

export default ProfilePanel;