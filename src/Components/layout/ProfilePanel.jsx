import { useNavigate } from "react-router-dom";
import { IoPersonAdd } from "react-icons/io5";
import { CgProfile } from "react-icons/cg";
import { FaTelegramPlane } from "react-icons/fa";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import profileBanner from "../../assets/backgrounds/profile-banner.png";
import { findDMGroup, createGroup } from "../../services/groupService";
import { getUser } from "../../services/userService";
import { getFriendsList } from "../../services/friendService";
import { useAuth } from "../../context/AuthContext";

const getOpacityColor = (hex, opacityHex = "26") => {
  if (!hex) return "rgba(255, 255, 255, 0.1)";
  if (hex.startsWith("#")) {
    if (hex.length === 4) {
      const r = hex[1];
      const g = hex[2];
      const b = hex[3];
      return `#${r}${r}${g}${g}${b}${b}${opacityHex}`;
    }
    return hex.slice(0, 7) + opacityHex;
  }
  return hex;
};

const ProfilePanel = ({
  check,
  setCheck,
  posX,
  posY,
  userName,
  photoURL,
  userID,
  memberDate,
  UID,
  about,
  bannerURL,
  roleColor,
  roleName,
}) => {
  const formattedUID = `${userID}`.padStart(6, "0");
  const panelRef = useRef(null);
  const { userData } = useAuth();

  const [isFriend, setIsFriend] = useState(false);
  useEffect(() => {
    let cancelled = false;
    if (!check || !UID || !userData?.userID) return;
    getFriendsList(userData.userID).then((list) => {
      if (!cancelled) setIsFriend(list.some((f) => f.uid === UID));
    });
    return () => {
      cancelled = true;
    };
  }, [check, UID, userData?.userID]);

  const clampPosition = (x, y, panelWidth, panelHeight) => {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    let clampedX = Math.min(Math.max(x, 0), screenWidth - panelWidth);
    let clampedY = Math.min(Math.max(y, 0), screenHeight - panelHeight);
    return { clampedX, clampedY };
  };

  const panelWidth = 330;
  // Dinamik olarak yüksekliği rollerin varlığına göre ayarla
  const panelHeight = roleName ? 356 : 304;

  const { clampedX, clampedY } = clampPosition(
    posX,
    posY,
    panelWidth,
    panelHeight
  );

  let creadetDateText = "Üyelik tarihi yok";

  if (memberDate) {
    let createdDate = null;
    if (typeof memberDate === "object" && memberDate !== null && "seconds" in memberDate) {
      createdDate = new Date(memberDate.seconds * 1000);
    } else {
      createdDate = new Date(memberDate);
    }

    if (createdDate && !isNaN(createdDate.getTime())) {
      const formattedDate = createdDate.toLocaleDateString("tr-TR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      creadetDateText = formattedDate + " Katıldı";
    }
  }

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        check &&
        panelRef.current &&
        !panelRef.current.contains(event.target)
      ) {
        setCheck(false);
      }
    };

    if (check) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [check, setCheck]);

  const borderStyle = {
    background: roleColor
      ? `linear-gradient(to bottom, ${roleColor}, ${roleColor}33)`
      : "linear-gradient(to bottom, rgba(255, 255, 255, 0.25), rgba(255, 255, 255, 0.08))",
    boxShadow: roleColor
      ? `0 10px 30px -10px ${roleColor}40, 0 1px 20px -5px ${roleColor}20`
      : "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
  };

  return (
    <motion.div
      ref={panelRef}
      initial={{ opacity: 0, scale: 0.95, y: 15 }}
      animate={
        check
          ? { opacity: 1, scale: 1, y: 0 }
          : { opacity: 0, scale: 0.95, y: 15 }
      }
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="fixed z-[9999] ml-1 p-[2px] rounded-2xl overflow-hidden"
      style={{
        top: `${clampedY - 32}px`,
        left: `${clampedX - 180}px`,
        width: `${panelWidth}px`,
        height: `${panelHeight}px`,
        pointerEvents: check ? "auto" : "none",
        ...borderStyle,
      }}
    >
      <div className="w-full h-full bg-[var(--primary-bg)] rounded-[15px] flex flex-col overflow-hidden">
        {/* Üst Banner */}
        <div className="relative h-20 w-full shrink-0 overflow-hidden">
          <img
            className="w-full h-full object-cover select-none"
            src={bannerURL || profileBanner}
            alt="Profile Banner"
          />
          {/* İnce parlayan sarı şerit */}
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--tertiary-bg)] to-transparent opacity-80 shadow-[0_0_8px_var(--tertiary-bg)] pointer-events-none" />
        </div>

        {/* Profil Detayları */}
        <div className="flex-1 p-3 flex flex-col justify-between min-h-0 relative">
          {/* Aşağı doğru süzülen sarı degrade (kartın yaklaşık yarısına kadar gidiyor) */}
          <div className="absolute top-0 left-0 right-0 h-36 bg-gradient-to-b from-[var(--tertiary-bg)]/18 to-transparent pointer-events-none" />
          <div className="space-y-2.5 relative">
            {/* Avatar & İsim Satırı */}
            <div className="flex items-center gap-2.5">
              <ProfilePicture
                src={photoURL || "/defaults/avatars/1.png"}
                isMe={userData && userData.friendshipID === userID}
                roleColor={roleColor}
              />
              <div className="min-w-0 flex-1">
                <div className="font-extrabold text-white text-[15px] truncate leading-snug">
                  {userName}
                </div>
                <div className="text-[11px] text-[var(--primary-text)] font-mono mt-0.5 opacity-70">
                  {"#" + formattedUID}
                </div>
              </div>
            </div>

            {/* Hakkında */}
            <div className="space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--primary-text)] px-0.5">
                Hakkında
              </div>
              <div className="text-xs bg-[#1a1f26] text-[var(--secondary-text)] p-2.5 rounded-xl min-h-[50px] max-h-[60px] overflow-y-auto select-text text-left border border-white/5 leading-normal">
                {about || "Kullanıcı hakkında bilgi girmemiş."}
              </div>
            </div>

            {/* Rol Etiketi */}
            {roleName && (
              <div className="space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--primary-text)] px-0.5">
                  Roller
                </div>
                <div className="flex flex-wrap gap-1.5 mt-0.5">
                  <span
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold"
                    style={{
                      backgroundColor: getOpacityColor(roleColor, "26"),
                      color: roleColor || "#B9BBBE",
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: roleColor || "#B9BBBE" }}
                    />
                    {roleName}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Alt Bilgi & Butonlar */}
          <div className="pt-2 border-t border-[var(--primary-border)]/30 flex items-center justify-between">
            <div className="text-[10px] text-[var(--primary-text)] font-semibold opacity-90 select-none">
              {creadetDateText}
            </div>

            {userData && userData.friendshipID === userID ? (
              <div className="flex gap-2">
                <ProfileButton />
              </div>
            ) : (
              userData && (
                <div className="flex gap-2">
                  {!isFriend && <AddFriendButton friendshipCode={userID} />}
                  <DMButton userID={UID} userData={userData} />
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const ProfileButton = () => {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate("/Profile")}
      className="px-3 py-1.5 rounded-xl bg-[var(--tertiary-bg)] text-[var(--tertiary-text)] hover:bg-[var(--quaternary-bg)] text-xs font-bold transition-all hover:scale-[1.03] flex items-center gap-1.5 shadow-md shrink-0"
    >
      <span>Profil</span>
      <CgProfile size="14" />
    </button>
  );
};

const AddFriendButton = ({ friendshipCode }) => {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() =>
        navigate("/AddFriends", {
          state: friendshipCode ? { friendshipID: friendshipCode } : undefined,
        })
      }
      className="px-3 py-1.5 rounded-xl bg-[var(--tertiary-bg)] text-[var(--tertiary-text)] hover:bg-[var(--quaternary-bg)] text-xs font-bold transition-all hover:scale-[1.03] flex items-center gap-1.5 shadow-md shrink-0"
    >
      <span>Ekle</span>
      <IoPersonAdd size="14" />
    </button>
  );
};

const DMButton = ({ userID, userData }) => {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={async () => {
        const group = await findDMGroup(userData.userID, userID);
        if (group) {
          navigate(`/DirectMessaging`, { state: { userID } });
          return;
        }
        const friendData = await getUser(userID);
        const groupID = await createGroup(
          (friendData?.nickName || "Arkadaş") + " & " + userData.nickName,
          [userData.userID, userID]
        );
        if (groupID) {
          navigate(`/DirectMessaging`, { state: { userID } });
        }
      }}
      className="px-3 py-1.5 rounded-xl bg-[var(--tertiary-bg)] text-[var(--tertiary-text)] hover:bg-[var(--quaternary-bg)] text-xs font-bold transition-all hover:scale-[1.03] flex items-center gap-1.5 shadow-md shrink-0"
    >
      <span>DM</span>
      <FaTelegramPlane size="14" />
    </button>
  );
};

const ProfilePicture = ({ src, isMe, roleColor }) => {
  const navigate = useNavigate();
  const ringColor = roleColor || "var(--primary-border)";
  const style = {
    borderColor: ringColor,
    boxShadow: roleColor ? `0 0 10px ${ringColor}60` : "none",
  };
  
  return (
    <div
      onClick={isMe ? () => navigate("/Profile") : undefined}
      className={`relative flex items-center justify-center w-14 h-14 my-auto ml-1 mr-1.5 shadow-lg rounded-full border-2 select-none shrink-0 ${
        isMe ? "cursor-pointer hover:scale-105 transition-transform" : ""
      }`}
      style={style}
    >
      <img src={src} className="rounded-full h-[50px] w-[50px] object-cover" />
    </div>
  );
};

export default ProfilePanel;
