import { BsGearFill } from "react-icons/bs";
import { FaStapler } from "react-icons/fa6";
import { MdHome, MdSearch, MdOutlineMessage } from "react-icons/md";
import { motion, AnimatePresence } from "framer-motion";
import { PanelLeftOpen, PanelLeftClose } from "lucide-react";

import NotificationsBell from './NotificationsBell'
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import "../../styles/components.css";

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

const NavItem = ({ path, label, icon, badge = 0, isNavExpanded }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = location.pathname === path;

  return (
    <div
      onClick={() => navigate(path)}
      className={`${
        isActive ? "hovered-icon" : "icon"
      } group relative transition-all duration-300 ease-in-out cursor-pointer ${
        isNavExpanded 
          ? "w-[216px] justify-start px-3.5 gap-3 rounded-[12px] h-12 mt-2 mb-2 mx-auto" 
          : "w-12 h-12 justify-center rounded-xl mt-2 mb-2 mx-auto"
      }`}
    >
      <div className="shrink-0 flex items-center justify-center">
        {icon}
      </div>
      
      <AnimatePresence>
        {isNavExpanded && (
          <motion.span
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.15, delay: 0.05 }}
            className="text-xs font-bold text-[var(--secondary-text)] truncate select-none group-hover:text-[var(--tertiary-bg)]"
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>

      {badge > 0 && (
        <span className={`absolute bg-red-500 text-white text-[10px] font-bold leading-none border-2 border-[var(--primary-bg)] rounded-full flex items-center justify-center ${
          isNavExpanded 
            ? "right-3 min-w-[18px] h-[18px] px-1" 
            : "top-1 right-2 min-w-[18px] h-[18px] px-1"
        }`}>
          {badge > 9 ? "9+" : badge}
        </span>
      )}

      {!isNavExpanded && (
        <span className="sidebar-tooltip group-hover:scale-100">{label}</span>
      )}
    </div>
  );
};

// Alt kısımda listelenen sunucu ikonu — tıklayınca sunucuya gider, sağ üstte
// okunmamış bildirim rozeti taşır. Aşağıdan yukarıya sırayla belirir (stagger).
// NOT: Liste scroll konteynerinin içinde olduğundan (overflow gizli), isim
// balonu portalla body'ye render edilir; böylece kırpılmadan sağda görünür.
const ServerNavIcon = ({ server, badge, index, isNavExpanded }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const ref = useRef(null);
  const [tip, setTip] = useState(null); // { top } — hover'da hesaplanır
  const active = location.pathname.startsWith(`/server/${server.id}`);

  const showTip = () => {
    if (isNavExpanded) return; // Genişken tooltip gösterme
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
      className={`${
        active ? "hovered-icon" : "icon"
      } group relative shrink-0 transition-all duration-300 ease-in-out ${
        isNavExpanded 
          ? "w-[216px] justify-start px-3.5 gap-3 rounded-[12px] h-12 mt-2 mb-2 mx-auto" 
          : "w-12 h-12 justify-center rounded-xl mt-2 mb-2 mx-auto"
      }`}
    >
      <div className={`rounded-[9px] overflow-hidden shrink-0 transition-all duration-300 ${
        isNavExpanded ? "w-8 h-8" : "w-10 h-10"
      }`}>
        <img
          src={server.photo}
          alt={server.name}
          className="w-full h-full object-cover"
        />
      </div>

      <AnimatePresence>
        {isNavExpanded && (
          <motion.span
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.15, delay: 0.05 }}
            className="text-xs font-bold text-[var(--secondary-text)] truncate select-none group-hover:text-[var(--tertiary-bg)]"
          >
            {server.name}
          </motion.span>
        )}
      </AnimatePresence>

      {badge > 0 && (
        <span className={`absolute bg-red-500 text-white text-[10px] font-bold leading-none border-2 border-[var(--primary-bg)] rounded-full flex items-center justify-center z-10 ${
          isNavExpanded 
            ? "right-3 min-w-[18px] h-[18px] px-1" 
            : "-top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1"
        }`}>
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
  const [isNavExpanded, setIsNavExpanded] = useState(() => {
    return localStorage.getItem("staple-navigator-expanded") === "true";
  });
  const { servers, serverUnread } = useNavData();
  const location = useLocation();

  useEffect(() => {
    document.documentElement.style.setProperty("--navigator-width", isNavExpanded ? "240px" : "64px");
    document.documentElement.setAttribute("data-navigator-expanded", isNavExpanded ? "true" : "false");
    localStorage.setItem("staple-navigator-expanded", isNavExpanded ? "true" : "false");
  }, [isNavExpanded]);

  // Ana sayfada sunucular zaten listelendiğinden çubukta gösterilmez.
  const isHome = location.pathname === "/" || location.pathname === "/Home";
  const showServers = !isHome && servers.length > 0;

  return (
    <div
      className="fixed flex flex-col top-0 left-0 h-screen gap-0 z-50 shadow-xl bg-[var(--primary-bg)]/85 backdrop-blur-md border-r border-[var(--primary-border)]/20 select-none"
      style={{
        width: isNavExpanded ? "240px" : "64px",
        transition: "width 0.2s ease-in-out",
      }}
    >
      <div className="flex flex-col shrink-0">
        {/* Toggle Button */}
        <div
          onClick={() => setIsNavExpanded(!isNavExpanded)}
          className={`icon group relative transition-all duration-300 ease-in-out cursor-pointer ${
            isNavExpanded 
              ? "w-[216px] justify-between px-3.5 rounded-[12px] h-12 mt-2 mb-2 mx-auto" 
              : "w-12 h-12 justify-center rounded-xl mt-2 mb-2 mx-auto"
          }`}
        >
          {isNavExpanded ? (
            <>
              <div className="flex items-center gap-2">
                <FaStapler size="16" className="text-[var(--tertiary-bg)]" />
                <span className="text-xs font-bold text-[var(--secondary-text)]">Staple</span>
              </div>
              <PanelLeftClose size="18" className="text-[var(--primary-text)]" />
            </>
          ) : (
            <>
              <PanelLeftOpen size="20" />
              <span className="sidebar-tooltip group-hover:scale-100">Genişlet</span>
            </>
          )}
        </div>

        {/* Gezinme öğeleri */}
        {NAV_ITEMS.map((item, i) => (
          <div
            key={item.path || item.custom}
            className={`${i >= 3 ? "flex flex-col h-16 " : ""}transition-all duration-250 ease-in-out ${ITEM_DELAYS[i]}`}
          >
            {item.custom === "notifications" ? (
              <NotificationsBell isNavExpanded={isNavExpanded} />
            ) : (
              <NavItem {...item} isNavExpanded={isNavExpanded} />
            )}
            {/* Bildirimler'den sonra ayraç */}
            {item.custom === "notifications" && (
              <hr className="border-[var(--primary-border)] border" />
            )}
          </div>
        ))}
      </div>

      {/* Sunucu Listesi */}
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
                  isNavExpanded={isNavExpanded}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Ayarlar (altta sabit, ayraçla ayrılır) */}
      <div className="flex flex-col shrink-0 transition-all duration-250 ease-in-out delay-300">
        <hr className="border-[var(--primary-border)] border" />
        <NavItem
          path="/Settings"
          label="Ayarlar"
          icon={<BsGearFill size="22" />}
          isNavExpanded={isNavExpanded}
        />
      </div>
    </div>
  );
};

export default Navigator;
