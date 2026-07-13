import { createContext, useContext, useEffect, useState } from "react";

// Vurgu (accent) ön ayarları — tema DEĞİŞTİRMEZ. Her biri dolgu + açık ton +
// dolgu üstü metin rengi (kontrast) tanımlar.
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
  { id: "black", label: "Karanlık" }, // OLED / kapkaranlık
  { id: "light", label: "Açık" },
];

const DEFAULT_THEME = "ocean";
const THEME_KEY = "staple-theme";
const ACCENT_KEY = "staple-accent";

// Bilinmeyen/eski değeri (ör. eski "dark") varsayılana normalize et
const normalizeTheme = (id) =>
  THEMES.some((t) => t.id === id) ? id : DEFAULT_THEME;

const applyTheme = (theme) => {
  document.documentElement.setAttribute("data-theme", normalizeTheme(theme));
};

const applyAccent = (accentId) => {
  const a = ACCENTS.find((x) => x.id === accentId) || ACCENTS[0];
  const s = document.documentElement.style;
  s.setProperty("--accent", a.accent);
  s.setProperty("--accent-soft", a.soft);
  s.setProperty("--on-accent", a.on);
};

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => normalizeTheme(localStorage.getItem(THEME_KEY)));
  const [accent, setAccent] = useState(() => localStorage.getItem(ACCENT_KEY) || "amber");

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    applyAccent(accent);
    localStorage.setItem(ACCENT_KEY, accent);
  }, [accent]);

  return (
    <ThemeContext.Provider
      value={{ theme, setTheme, accent, setAccent, accents: ACCENTS, themes: THEMES }}
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
