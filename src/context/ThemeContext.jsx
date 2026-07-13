import { createContext, useContext, useEffect, useState } from "react";

// Vurgu ön ayarları (sıcak → soğuk). on = dolgu üstü metin/ikon kontrastı.
export const ACCENTS = [
  { id: "amber", label: "Sarı", accent: "#ffbc1f", soft: "#fff3a1", on: "#222831" },
  { id: "orange", label: "Turuncu", accent: "#f97316", soft: "#fed7aa", on: "#ffffff" },
  { id: "red", label: "Kırmızı", accent: "#ef4444", soft: "#fecaca", on: "#ffffff" },
  { id: "rose", label: "Mercan", accent: "#f43f5e", soft: "#fecdd3", on: "#ffffff" },
  { id: "pink", label: "Pembe", accent: "#ec4899", soft: "#fbcfe8", on: "#ffffff" },
  { id: "fuchsia", label: "Fuşya", accent: "#d946ef", soft: "#f5d0fe", on: "#ffffff" },
  { id: "purple", label: "Mor", accent: "#a855f7", soft: "#e9d5ff", on: "#ffffff" },
  { id: "indigo", label: "Çivit", accent: "#6366f1", soft: "#c7d2fe", on: "#ffffff" },
  { id: "blue", label: "Mavi", accent: "#3b82f6", soft: "#bfdbfe", on: "#ffffff" },
  { id: "sky", label: "Gök", accent: "#0ea5e9", soft: "#bae6fd", on: "#ffffff" },
  { id: "cyan", label: "Camgöbeği", accent: "#06b6d4", soft: "#a5f3fc", on: "#063540" },
  { id: "teal", label: "Turkuaz", accent: "#14b8a6", soft: "#99f6e4", on: "#04231e" },
  { id: "emerald", label: "Zümrüt", accent: "#10b981", soft: "#a7f3d0", on: "#04231a" },
  { id: "green", label: "Yeşil", accent: "#22c55e", soft: "#bbf7d0", on: "#06270f" },
  { id: "lime", label: "Limon", accent: "#84cc16", soft: "#d9f99d", on: "#1a2e05" },
];

export const THEMES = [
  { id: "ocean", label: "Okyanus" }, // varsayılan (mavi-gri) — :root
  { id: "black", label: "Karanlık" }, // OLED
  { id: "light", label: "Açık" },
  { id: "auto", label: "Otomatik" }, // OS'a göre Açık↔Karanlık
];

export const TILE_SIZES = [
  { id: "small", label: "Küçük", px: "140px" },
  { id: "medium", label: "Orta", px: "200px" },
  { id: "large", label: "Büyük", px: "280px" },
];

const DEFAULT_THEME = "ocean";
const THEME_KEY = "staple-theme";
const ACCENT_KEY = "staple-accent";
const ACCENT_CUSTOM_KEY = "staple-accent-custom";
const RM_KEY = "staple-reduce-motion";
const PARALLAX_KEY = "staple-parallax";
const TILE_KEY = "staple-tile-size";

// ---- Renk yardımcıları (özel vurgu için soft + kontrast hesabı) ----
const normalizeHex = (hex) => {
  if (!hex) return null;
  let h = String(hex).trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(h)) h = h.split("").map((c) => c + c).join("");
  return /^[0-9a-fA-F]{6}$/.test(h) ? "#" + h.toLowerCase() : null;
};
const hexToRgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
};
const toHex = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
const mixWhite = (hex, amt) => {
  const { r, g, b } = hexToRgb(hex);
  return "#" + toHex(r + (255 - r) * amt) + toHex(g + (255 - g) * amt) + toHex(b + (255 - b) * amt);
};
const isLight = (hex) => {
  const { r, g, b } = hexToRgb(hex);
  return 0.299 * r + 0.587 * g + 0.114 * b > 150; // algılanan parlaklık
};
const accentVarsFor = (hex) => ({
  accent: hex,
  soft: mixWhite(hex, 0.72),
  on: isLight(hex) ? "#20242e" : "#ffffff",
});

// ---- Uygulayıcılar ----
const VALID_THEME = /^(ocean|black|light|auto)$/;
const normalizeTheme = (id) => (VALID_THEME.test(id) ? id : DEFAULT_THEME);
const prefersDark = () =>
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-color-scheme: dark)").matches;
const resolveTheme = (theme) =>
  theme === "auto" ? (prefersDark() ? "black" : "light") : normalizeTheme(theme);

const applyTheme = (theme) => {
  document.documentElement.setAttribute("data-theme", resolveTheme(theme));
};
const applyAccent = (accentId, customHex) => {
  let v;
  if (accentId === "custom") {
    v = accentVarsFor(normalizeHex(customHex) || "#ffbc1f");
  } else {
    const a = ACCENTS.find((x) => x.id === accentId) || ACCENTS[0];
    v = { accent: a.accent, soft: a.soft, on: a.on };
  }
  const s = document.documentElement.style;
  s.setProperty("--accent", v.accent);
  s.setProperty("--accent-soft", v.soft);
  s.setProperty("--on-accent", v.on);
};

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => normalizeTheme(localStorage.getItem(THEME_KEY)));
  const [accent, setAccent] = useState(() => localStorage.getItem(ACCENT_KEY) || "amber");
  const [customAccent, setCustomAccent] = useState(
    () => normalizeHex(localStorage.getItem(ACCENT_CUSTOM_KEY)) || "#ff5c8a"
  );
  const [reduceMotion, setReduceMotion] = useState(() => {
    const s = localStorage.getItem(RM_KEY);
    if (s === "1") return true;
    if (s === "0") return false;
    return (
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  });
  const [parallax, setParallax] = useState(() => localStorage.getItem(PARALLAX_KEY) !== "0");
  const [tileSize, setTileSize] = useState(() => localStorage.getItem(TILE_KEY) || "medium");

  // Yeni görünüm özelleştirme states
  const [chatDensity, setChatDensity] = useState(() => localStorage.getItem("staple-chat-density") || "cozy");
  const [messageStyle, setMessageStyle] = useState(() => localStorage.getItem("staple-message-style") || "classic");
  const [fontScale, setFontScale] = useState(() => localStorage.getItem("staple-font-scale") || "standard");
  const [fontFamily, setFontFamily] = useState(() => localStorage.getItem("staple-font-family") || "inter");

  // Tema (+ Otomatik ise OS değişimini canlı izle)
  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(THEME_KEY, theme);
    if (theme !== "auto" || !window.matchMedia) return undefined;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("auto");
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [theme]);

  // Vurgu (ön ayar veya özel hex)
  useEffect(() => {
    applyAccent(accent, customAccent);
    localStorage.setItem(ACCENT_KEY, accent);
    localStorage.setItem(ACCENT_CUSTOM_KEY, customAccent);
  }, [accent, customAccent]);

  // Hareketi azalt
  useEffect(() => {
    document.documentElement.setAttribute("data-reduce-motion", reduceMotion ? "1" : "0");
    localStorage.setItem(RM_KEY, reduceMotion ? "1" : "0");
  }, [reduceMotion]);

  // Parallax tercihi (App'teki mousemove tüketir)
  useEffect(() => {
    localStorage.setItem(PARALLAX_KEY, parallax ? "1" : "0");
  }, [parallax]);

  // Tile boyutu
  useEffect(() => {
    const t = TILE_SIZES.find((x) => x.id === tileSize) || TILE_SIZES[1];
    document.documentElement.style.setProperty("--tile-size", t.px);
    localStorage.setItem(TILE_KEY, tileSize);
  }, [tileSize]);

  // Sohbet Yoğunluğu
  useEffect(() => {
    document.documentElement.setAttribute("data-chat-density", chatDensity);
    localStorage.setItem("staple-chat-density", chatDensity);
  }, [chatDensity]);

  // Mesaj Kutusu Stili
  useEffect(() => {
    document.documentElement.setAttribute("data-message-style", messageStyle);
    localStorage.setItem("staple-message-style", messageStyle);
  }, [messageStyle]);

  // Yazı Boyutu
  useEffect(() => {
    const fontSizes = {
      small: "13px",
      standard: "15px",
      large: "17px",
      giant: "20px",
    };
    document.documentElement.style.setProperty("--chat-font-size", fontSizes[fontScale] || "15px");
    localStorage.setItem("staple-font-scale", fontScale);
  }, [fontScale]);

  // Yazı Tipi Ailesi
  useEffect(() => {
    const fontFamilies = {
      inter: "'Inter', sans-serif",
      outfit: "'Outfit', sans-serif",
      "roboto-mono": "'Roboto Mono', monospace",
    };
    document.documentElement.style.setProperty("--chat-font-family", fontFamilies[fontFamily] || "'Inter', sans-serif");
    localStorage.setItem("staple-font-family", fontFamily);
  }, [fontFamily]);

  return (
    <ThemeContext.Provider
      value={{
        theme, setTheme,
        accent, setAccent,
        customAccent, setCustomAccent,
        reduceMotion, setReduceMotion,
        parallax, setParallax,
        tileSize, setTileSize,
        chatDensity, setChatDensity,
        messageStyle, setMessageStyle,
        fontScale, setFontScale,
        fontFamily, setFontFamily,
        accents: ACCENTS,
        themes: THEMES,
        tileSizes: TILE_SIZES,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
};
