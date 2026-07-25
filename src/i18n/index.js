// ==================== i18n (çok dil desteği) ====================
// react-i18next + tarayıcı dil algılama. Varsayılan TR; seçim localStorage'ta
// (staple-lang) saklanır. Yeni dil eklemek için: locales/<kod>.json oluştur,
// aşağıya resources + SUPPORTED'a ekle.
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import tr from "./locales/tr.json";
import en from "./locales/en.json";

export const SUPPORTED = [
  { code: "tr", label: "Türkçe" },
  { code: "en", label: "English" },
];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      tr: { translation: tr },
      en: { translation: en },
    },
    fallbackLng: "tr",
    supportedLngs: ["tr", "en"],
    interpolation: { escapeValue: false }, // React zaten kaçış yapar
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "staple-lang",
      caches: ["localStorage"],
    },
  });

export default i18n;
