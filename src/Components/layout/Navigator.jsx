import { BsGearFill } from "react-icons/bs";
import { FaStapler } from "react-icons/fa6";
import { MdHome, MdSearch, MdOutlineMessage } from "react-icons/md";
import { motion, AnimatePresence } from "framer-motion";

import ProfilePanel from './ProfilePanel'
import NotificationsBell from './NotificationsBell'
import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import "../../styles/components.css";

import { useAuth } from "../../context/AuthContext";
import { useNavData } from "../../context/NavDataContext";

// Sol menü öğeleri — tek kaynaktan yönetilir.
// Bildirimler (custom) tıklanınca sayfaya gitmez, scroll dropdown açar.
const NAV_ITEMS = [
  { path: "/", label: "Ana Sayfa", icon: <MdHome size="25" /> },
  { path: "/AddFriends", label: "Arkadaş Ekle", icon: <FaStapler size="20" /> },
  { path: "/SearchServer", label: "Sunucu Ara", icon: <MdSearch size="25" /> },
  { path: "/DirectMessaging", label: "Mesajlar", icon: <MdOutlineMessage size="25" /> },
  { custom: "notifications", label: "Bildirimler" },
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

// Alt kısımda listelenen sunucu ikonu — tıklayınca sunucuya gider, sağ üstte
// okunmamış bildirim rozeti taşır. Aşağıdan yukarıya sırayla belirir (stagger).
// NOT: Liste scroll konteynerinin içinde olduğundan (overflow gizli), isim
// balonu portalla body'ye render edilir; böylece kırpılmadan sağda görünür.
const ServerNavIcon = ({ server, badge, index }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const ref = useRef(null);
  const [tip, setTip] = useState(null); // { top } — hover'da hesaplanır
  const active = location.pathname.startsWith(`/server/${server.id}`);

  const showTip = () => {
    const r = ref.current?.getBoundingClientRect();
    if (r) setTip({ top: r.top + r.height / 2 });
  };

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: 16, scale: 0.5 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16, scale: 0.5 }}
      transition={{ type: "spring", stiffness: 500, damping: 30, delay: index * 0.04 }}
      onClick={() => navigate(`/server/${server.id}`)}
      onMouseEnter={showTip}
      onMouseLeave={() => setTip(null)}
      className={`${active ? "hovered-icon" : "icon"} group relative shrink-0`}
    >
      <img
        src={server.photo}
        alt={server.name}
        className="w-full h-full object-cover rounded-[9px]"
      />
      {badge > 0 && (
        <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold leading-none border-2 border-[var(--primary-bg)] z-10">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
      {tip &&
        createPortal(
          <div
            style={{ position: "fixed", left: 64, top: tip.top, transform: "translateY(-50%)" }}
            className="z-[70] ml-2 p-2 rounded-md shadow-md bg-[var(--tertiary-text)] text-[var(--tertiary-bg)] text-xs font-bold whitespace-nowrap pointer-events-none"
          >
            {server.name}
          </div>,
          document.body
        )}
    </motion.div>
  );
};

const Navigator = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { userData } = useAuth();
  const { servers, serverUnread } = useNavData();
  const location = useLocation();

  // Ana sayfada sunucular zaten listelendiğinden çubukta gösterilmez.
  const isHome = location.pathname === "/" || location.pathname === "/Home";
  const showServers = !isHome && servers.length > 0;

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
        className={`fixed flex flex-col top-0 left-0 h-screen gap-0 z-50
              w-16 transition-all duration-145 ease-linear shadow-xl
              bg-[var(--primary-bg)]/85 backdrop-blur-md border-r border-[var(--primary-border)]/20`}
      >
        <div className="flex flex-col shrink-0">
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
              {/* Bildirimler'den sonra ayraç (orijinal tasarım) */}
              {item.custom === "notifications" && (
                <hr className="border-[var(--primary-border)] border" />
              )}
            </div>
          ))}
        </div>

        {/* Katıldığın sunucular — üst ikonların altındaki çizgi ile ayarların
            üstündeki çizgi ARASINDA kalır. Taşarsa yalnızca bu alan dikey scroll
            olur; üst ikonlar ve ayarlar sabit kalır. Ana sayfada gizlidir ve
            aşağıdan yukarıya animasyonla belirir. */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden no-scrollbar flex flex-col">
          <AnimatePresence>
            {showServers && (
              <motion.div
                key="server-nav-list"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 24 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="mt-auto flex flex-col-reverse items-center py-1"
              >
                {servers.map((s, i) => (
                  <ServerNavIcon
                    key={s.id}
                    server={s}
                    badge={serverUnread[s.id] || 0}
                    index={i}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Ayarlar (altta sabit, ayraçla ayrılır) */}
        <div
          className={`flex flex-col shrink-0 transition-all duration-250 ease-in-out delay-300
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
