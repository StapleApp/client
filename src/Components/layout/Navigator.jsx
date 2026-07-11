import { BsGearFill } from "react-icons/bs";
import { FaStapler } from "react-icons/fa6";
import { MdHome, MdSearch, MdOutlineMessage } from "react-icons/md";

import ProfilePanel from './ProfilePanel'
import NotificationsBell from './NotificationsBell'
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../../styles/components.css";

import { useAuth } from "../../context/AuthContext";

// Sol menü öğeleri — tek kaynaktan yönetilir.
// Bildirimler (custom) tıklanınca sayfaya gitmez, scroll dropdown açar.
const NAV_ITEMS = [
  { path: "/", label: "Ana Sayfa", icon: <MdHome size="25" /> },
  { path: "/AddFriends", label: "Arkadaş Ekle", icon: <FaStapler size="20" /> },
  { path: "/SearchServer", label: "Sunucu Ara", icon: <MdSearch size="25" /> },
  { custom: "notifications", label: "Bildirimler" },
  { path: "/DirectMessaging", label: "Mesajlar", icon: <MdOutlineMessage size="25" /> },
];

// Öğelerin genişleme animasyonu gecikmeleri (orijinal tasarımla birebir)
const ITEM_DELAYS = ["delay-75", "delay-150", "delay-225", "delay-300", "delay-300"];

const NavItem = ({ path, label, icon, badge = 0 }) => {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <div
      className={
        location.pathname === path
          ? `hovered-icon group relative`
          : `icon group hover:scale-105 relative`
      }
      onClick={() => navigate(path)}
    >
      {icon}
      {badge > 0 && (
        <span className="absolute top-1 right-2 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold leading-none border-2 border-[var(--primary-bg)]">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
      <span className="sidebar-tooltip group-hover:scale-100">{label}</span>
    </div>
  );
};

const Navigator = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { userData } = useAuth();

  return (
    <>
      <ProfilePanel
        check={isExpanded}
        setCheck={setIsExpanded}
        posX={242}
        posY={30}
        userName={userData?.nickName}
        photoURL={userData?.photoURL || "/defaults/avatars/1.png"}
        userID={userData?.friendshipID}
        memberDate={userData?.createdDate}
        about={userData?.about}
        bannerURL={userData?.profileBannerUrl}
      />
      <div
        className={`fixed flex flex-col top-0 left-0 h-screen gap-0 z-1
              w-16 transition-all duration-145 ease-linear justify-between shadow-xl
              bg-[var(--primary-bg)]`}
      >
        <div className="flex flex-col h-64">
          {/* Profil avatarı — paneli açar/kapar */}
          <div
            className={`transition-all duration-350 ease-in-out
                      ${isExpanded
                        ? 'opacity-0 -translate-y-16'
                        : 'opacity-100 translate-y-0'}`}
          >
            <div
              className="icon group cursor-pointer hover:scale-105 rounded-full"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <img
                src={userData?.photoURL || "/defaults/avatars/1.png"}
                className="w-10 h-10 rounded-full"
                alt={"logo"}
              />
              <span className="sidebar-tooltip group-hover:scale-100">Profil</span>
            </div>
          </div>

          {/* Gezinme öğeleri */}
          {NAV_ITEMS.map((item, i) => (
            <div
              key={item.path || item.custom}
              className={`${i >= 3 ? "flex flex-col h-16 " : ""}transition-all duration-250 ease-in-out ${ITEM_DELAYS[i]}
                      ${isExpanded ? '-translate-y-15' : 'translate-y-0'}`}
            >
              {item.custom === "notifications" ? (
                <NotificationsBell />
              ) : (
                <NavItem {...item} />
              )}
              {/* Mesajlar'dan sonra ayraç (orijinal tasarım) */}
              {item.path === "/DirectMessaging" && (
                <hr className="border-[var(--primary-border)] border" />
              )}
            </div>
          ))}
        </div>

        {/* Ayarlar (altta, ayraçlı) */}
        <div
          className={`flex flex-col h-16 transition-all duration-250 ease-in-out delay-300
                     ${isExpanded ? '-translate-y-0' : 'translate-y-0'}`}
        >
          <hr className="border-[var(--primary-border)] border" />
          <NavItem
            path="/Settings"
            label="Ayarlar"
            icon={<BsGearFill size="22" />}
          />
        </div>
      </div>
    </>
  );
};

export default Navigator;
