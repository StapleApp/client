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

const NavItem = ({ path, label, icon, badge = 0, isNavExpanded, navigatorWidth }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = location.pathname === path;

  return (
    <div
      onClick={() => navigate(path)}
      style={{
        width: isNavExpanded ? `${navigatorWidth - 24}px` : "48px",
      }}
      className={`${
        isActive ? "hovered-icon" : "icon"
      } group relative transition-all duration-300 ease-in-out cursor-pointer ${
        isNavExpanded 
          ? "justify-start px-3.5 gap-3 rounded-[12px] h-12 mt-2 mb-2 mx-auto" 
          : "h-12 justify-center rounded-xl mt-2 mb-2 mx-auto"
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
const ServerNavIcon = ({ server, badge, index, isNavExpanded, navigatorWidth }) => {
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
      style={{
        width: isNavExpanded ? `${navigatorWidth - 24}px` : "48px",
      }}
      className={`${
        active ? "hovered-icon" : "icon"
      } group relative shrink-0 transition-all duration-300 ease-in-out ${
        isNavExpanded 
          ? "justify-start px-3.5 gap-3 rounded-[12px] h-12 mt-2 mb-2 mx-auto" 
          : "h-12 justify-center rounded-xl mt-2 mb-2 mx-auto"
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
            className="z-[130] ml-2 p-2 rounded-md shadow-md bg-[var(--tertiary-text)] text-[var(--tertiary-bg)] text-xs font-bold whitespace-nowrap pointer-events-none"
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
  const [navigatorWidth, setNavigatorWidth] = useState(() => {
    return Number(localStorage.getItem("staple-navigator-width")) || 240;
  });
  const [isResizingNavigator, setIsResizingNavigator] = useState(false);

  const { servers, serverUnread } = useNavData();
  const location = useLocation();

  useEffect(() => {
    const widthVal = isNavExpanded ? navigatorWidth : 64;
    document.documentElement.style.setProperty("--navigator-width", `${widthVal}px`);
    document.documentElement.setAttribute("data-navigator-expanded", isNavExpanded ? "true" : "false");
    document.documentElement.setAttribute("data-navigator-resizing", isResizingNavigator ? "true" : "false");
    localStorage.setItem("staple-navigator-expanded", isNavExpanded ? "true" : "false");
    localStorage.setItem("staple-navigator-width", navigatorWidth.toString());
  }, [isNavExpanded, navigatorWidth, isResizingNavigator]);

  const startNavigatorResize = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = navigatorWidth;

    const onPointerMove = (moveEvent) => {
      const newWidth = startWidth + (moveEvent.clientX - startX);
      setNavigatorWidth(Math.max(200, Math.min(newWidth, 350)));
    };

    const onPointerUp = () => {
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
      document.body.style.cursor = "default";
      document.body.classList.remove("select-none");
      setIsResizingNavigator(false);
    };

    setIsResizingNavigator(true);
    document.body.style.cursor = "col-resize";
    document.body.classList.add("select-none");
    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
  };

  // Ana sayfada sunucular zaten listelendiğinden çubukta gösterilmez.
  const isHome = location.pathname === "/" || location.pathname === "/Home";
  const showServers = !isHome && servers.length > 0;

  return (
    <div
      className="fixed flex flex-col top-0 bottom-0 left-0 gap-0 z-[120] shadow-xl bg-[var(--primary-bg)]/85 backdrop-blur-md border-r border-[var(--primary-border)]/20 select-none"
      style={{
        width: isNavExpanded ? `${navigatorWidth}px` : "64px",
        transition: isResizingNavigator ? "none" : "width 0.2s ease-in-out",
      }}
    >
      <div className="flex flex-col shrink-0">
        {/* Toggle Button */}
        <div
          onClick={() => setIsNavExpanded(!isNavExpanded)}
          style={{
            width: isNavExpanded ? `${navigatorWidth - 24}px` : "48px",
          }}
          className={`icon group relative transition-all duration-300 ease-in-out cursor-pointer ${
            isNavExpanded 
              ? "justify-between px-3.5 rounded-[12px] h-12 mt-2 mb-2 mx-auto" 
              : "h-12 justify-center rounded-xl mt-2 mb-2 mx-auto"
          }`}
        >
          {isNavExpanded ? (
            <>
              <div className="flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 512 512"
                  className="w-6 h-6 shrink-0 text-[var(--primary-text)] group-hover:text-[var(--tertiary-bg)] transition-colors duration-150"
                >
                  <rect width="512" height="512" fill="none" />
                  <rect x="25" y="25" width="462" height="462" rx="103" fill="none" stroke="currentColor" strokeWidth="22" />
                  <path
                    d="M 348.7 98.6 C 353.3 99.5 358.8 101.2 364.4 103.5 C 369.9 105.7 374.7 107.7 382.3 112.2 C 389.9 116.7 404.2 126.6 409.9 130.5 C 415.6 134.4 415.3 134.4 416.5 135.6 C 417.6 136.8 417.3 137.1 417.1 137.7 C 416.8 138.2 416 138.7 415 139.1 C 413.9 139.4 413.3 139.7 410.8 139.8 C 408.2 139.8 402.6 139.7 399.5 139.1 C 396.4 138.6 397 138.7 392.2 136.5 C 387.3 134.3 375.6 128.2 370.4 126 C 365.3 123.8 364.9 124.1 361.3 123.2 C 357.8 122.4 352.8 121.3 349 120.8 C 345.3 120.3 342.6 120.3 338.9 120.3 C 335.2 120.3 330.9 120.2 326.9 120.8 C 322.9 121.4 319.6 122.2 315.1 123.8 C 310.5 125.3 315 124 299 130 C 274.5 143.5 196.7 186.7 164.3 204.3 C 132 221.9 117.5 229.1 105.4 235.6 C 93.4 242.2 95.4 241.7 92.2 243.8 C 89 245.9 87.7 246.9 86.3 248.5 C 84.8 250.1 83.7 251.8 83.4 253.3 C 83 255 83 255 84.1 257.4 C 85 258.9 86.4 260.4 88.4 262.2 C 90.3 263.9 91.8 265.4 95.8 267.9 C 99.8 270.3 108.8 274.9 112.4 276.7 C 116.1 278.5 114.6 278 117.7 278.7 C 120.7 279.5 126.7 280.6 130.6 281.1 C 134.5 281.5 137.6 281.7 141.3 281.6 C 145 281.6 149 281.2 152.6 280.5 C 156.2 279.9 159.3 279.1 162.9 277.9 C 166.5 276.6 169.6 275.4 174.2 273.1 C 178.9 270.7 169.3 276.3 190.9 263.9 C 212.6 251.4 273.4 216.1 304.3 198.4 C 335.2 180.7 362.8 165.5 376.5 157.9 C 388 152 383.2 154.3 388 152 C 389.9 151.3 392.6 149.8 396.6 148.9 C 400.7 148 407 147.7 410.9 147.5 C 414.8 147.4 417.6 147.7 419.9 148 C 422.2 148.3 422.5 148.3 424.7 149.1 C 426.8 150 430.2 151.6 432.8 153.2 C 435.4 154.8 438.4 157.2 440.1 158.7 C 441.8 160.1 441.5 159.6 443 162 C 444.6 164.3 447.4 168.5 449.5 172.9 C 451.5 177.3 454.1 184.5 455.3 188.4 C 456.4 192.3 456.2 193.2 456.5 196.2 C 456.7 199.2 456.8 203.3 456.8 206.3 C 456.7 209.2 456.5 211.3 456.2 213.8 C 455.8 216.3 455.2 218.7 454.5 221.3 C 453.7 223.9 453.4 225.3 451.8 229.4 C 450.1 233.4 446.2 242 444.4 245.6 C 442.5 249.3 442.2 249.4 440.8 251.2 C 439.4 253 437.9 254.8 435.9 256.6 C 434 258.5 432 260 431 261 C 425.5 264.8 431 261 414.6 271.6 C 390.8 285.5 323.6 324.3 286.2 345.6 C 248.7 367 210.7 388.5 190 399.7 C 169.4 410.8 167.9 410 162.1 412.4 C 156 415 157 414.5 154.8 414.6 C 153.1 414.6 153 414.6 149.4 414.6 C 145.7 414.6 137.3 414.4 133 414.3 C 129.1 414.1 129.6 414.6 124.9 412.8 C 120.2 411.1 113.4 407.8 105 403.7 C 96.7 399.7 82.1 392.5 74.8 388.5 C 67.5 384.4 64 381.6 61.2 379.3 C 58.4 377.1 58.8 376.6 57.9 374.9 C 57.1 373.2 56.5 373.4 56 369.3 C 55.5 365.2 55.2 354.7 55.2 350.4 C 55.2 346.1 55.2 345.9 56.1 343.6 C 57 341.4 59 339.1 60.7 337.1 C 62.4 335.1 62.7 334.3 66.4 331.5 C 70.1 328.8 79.3 322.9 83 320.6 C 86.8 318.2 87.1 318.2 89 317.5 C 90.8 316.9 92 316 94.2 316.9 C 98.1 318.3 106.4 323.5 112.8 326.1 C 119.3 328.8 126.6 331.6 133.1 332.7 C 139.6 333.9 147.1 333.4 151.9 333 C 156.8 332.6 157.9 331.9 162.1 330.3 C 166.2 328.7 164.9 329.9 176.9 323.6 C 188.8 317.3 208.8 306.8 233.8 292.4 C 258.8 278.1 308.4 248.3 326.9 237.5 C 345.3 226.8 337.6 232.2 344.5 228.1 C 351.3 224.1 360.5 217.8 367.8 213.4 C 375.1 209 382.8 204.7 388.1 201.9 C 393.4 199.1 396.5 197.7 399.7 196.6 C 402.9 195.5 405.1 195.3 407.3 195.3 C 409.4 195.2 410.8 195.4 412.6 196.4 C 414.3 197.3 416.4 199.4 417.7 201.1 C 419 202.9 420 204.9 420.4 206.9 C 420.7 208.9 420.6 210.7 419.8 213.1 C 419 215.4 417.4 218.9 415.7 221.1 C 414.1 223.3 414 223 409.9 226.2 C 382.8 242 291.2 293.4 252.6 315.6 C 214 337.8 193.4 350.7 178.2 359.4 C 163.1 368.1 165.1 366.1 161.5 367.8 C 157.9 369.4 158.6 368.9 156.5 369.3 C 154.5 369.7 153.8 370.1 149.3 370.5 C 145 371 137.2 371.6 129.7 369.7 C 122.1 367.8 114.5 363.9 104.2 358.8 C 93.9 353.7 74.5 342.3 68 338.9 C 66 338 65.7 338.3 64.9 338.5 C 64.2 338.7 63.8 339.1 63.4 340.1 C 63 341 62.6 342.9 62.7 344.2 C 62.8 345.5 63.2 346.3 64.1 347.7 C 65 349.1 66.4 350.9 68 352.5 C 69.6 354.1 71.6 355.8 73.8 357.4 C 75.9 359 75 358.7 81 362.1 C 87 365.5 103 374.2 109.9 377.7 C 116.9 381.1 118.9 381.5 122.8 382.7 C 126.6 383.9 129.4 384.6 133 385 C 136.7 385.4 140.6 385.6 144.6 385.3 C 148.6 385 152 384.7 157 383.3 C 162 381.9 166.9 380.5 174.5 376.9 C 182 373.3 186.8 370.5 202.1 361.7 C 217.5 352.9 253.2 331.9 266.8 324.2 C 280.3 316.4 276.9 319 283.5 315.2 C 290.1 311.3 284.7 313.6 306.4 301.2 C 328 288.7 394.1 251.7 413.2 240.7 C 420 237 420 236 422 234 C 422.9 233 425.3 229.9 427 226.7 C 428.7 223.5 430 219.9 430.8 216.4 C 431.6 212.8 431.9 208.8 431.6 205.2 C 431.4 201.7 430.6 198 429.5 195.1 C 428.4 192.1 427.1 189.6 425.1 187.4 C 423.2 185.1 420.1 182.7 418 181 C 416 180 415 179 412 179 C 409 179 405 179 400 179 C 396 179 396 179 393 180 C 387 183 395 179 371.7 192.5 C 336.7 212.4 216.3 281.8 182 301.3 C 163 311 170.4 307.5 166.1 309.5 C 161.8 311.5 159.7 312.5 156.2 313.3 C 152.8 314.1 149.7 314.2 145.4 314.3 C 141 314.5 133.4 314.3 130.1 314.1 C 126.7 313.9 127.3 313.9 125.3 313.3 C 123.3 312.8 122.5 312.6 118.1 310.7 C 113.6 308.7 106.5 305.7 98.6 301.6 C 90.7 297.4 76.4 289.4 70.7 285.9 C 64.9 282.5 66 282.7 64.1 280.9 C 62.2 279 60.3 277.1 59.2 275 C 58 272.9 57.7 271.6 57.2 268.4 C 56.7 265.3 56.3 259.4 56.2 256.2 C 56.1 253.1 56.2 251.5 56.6 249.6 C 56.9 247.6 57.5 246.3 58.3 244.5 C 59.1 242.7 60 240.8 61.5 238.6 C 63.1 236.4 64.7 234 67.5 231.1 C 70.3 228.2 74.9 223.9 78.1 221.2 C 81.3 218.5 79 220 86.6 214.9 C 118 197.6 232.1 136.2 266.4 117.8 C 296 103 286.4 107.7 292.7 104.7 C 299.1 101.8 301.1 101.2 304.5 99.8 C 309 98 307.8 98 313.1 97.6 C 318.5 97.2 330.7 97.5 336.7 97.6 C 342.6 97.8 344.1 97.6 348.7 98.6 Z"
                    fill="currentColor"
                    fillRule="evenodd"
                  />
                </svg>
                <span className="text-xs font-bold text-[var(--secondary-text)] group-hover:text-[var(--tertiary-bg)] transition-colors">Staple</span>
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
              <NotificationsBell isNavExpanded={isNavExpanded} navigatorWidth={navigatorWidth} />
            ) : (
              <NavItem {...item} isNavExpanded={isNavExpanded} navigatorWidth={navigatorWidth} />
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
                  navigatorWidth={navigatorWidth}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Ayarlar (altta sabit, ayraçla ayrılır) */}
      <div className="flex flex-col shrink-0 transition-all duration-250 ease-in-out delay-300 pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:pb-0">
        <hr className="border-[var(--primary-border)] border" />
        <NavItem
          path="/Settings"
          label="Ayarlar"
          icon={<BsGearFill size="22" />}
          isNavExpanded={isNavExpanded}
          navigatorWidth={navigatorWidth}
        />
      </div>

      {/* Sürükleme Tutamacı (Sadece genişken etkindir) */}
      {isNavExpanded && (
        <div
          onPointerDown={startNavigatorResize}
          className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-[var(--tertiary-border)]/50 active:bg-[var(--tertiary-border)] transition-colors z-50 group flex items-center justify-center"
        >
          <div className="w-0.5 h-8 bg-[var(--primary-border)] group-hover:bg-[var(--tertiary-text)] opacity-40 group-hover:opacity-100 transition-opacity rounded" />
        </div>
      )}
    </div>
  );
};

export default Navigator;
