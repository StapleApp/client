// Supabase oturum deposu.
//
// Tauri masaüstünde webview'in localStorage'ı yeniden başlatmalarda güvenilir
// şekilde kalıcı olmuyordu → uygulama her kapandığında oturum kayboluyordu.
// Bu yüzden masaüstünde oturumu diske yazan tauri-plugin-store kullanıyoruz.
// Web'de (Vercel vs.) authStorage undefined → Supabase varsayılan localStorage'ı kullanır.

// Tauri v2 her zaman bu global'i enjekte eder; web'de yoktur.
const isTauri =
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

// Store'u yalnızca Tauri'de (ve ilk kullanımda) yükle — web derlemesine
// tauri-plugin-store bundle edilmesin diye dinamik import.
let storePromise = null;
const getStore = () => {
  if (!storePromise) {
    storePromise = import("@tauri-apps/plugin-store").then(({ load }) =>
      load("staple-auth.json")
    );
  }
  return storePromise;
};

export const authStorage = isTauri
  ? {
      getItem: async (key) => {
        try {
          const store = await getStore();
          const value = await store.get(key);
          return value ?? null;
        } catch (e) {
          console.error("authStorage.getItem", e);
          return null;
        }
      },
      setItem: async (key, value) => {
        try {
          const store = await getStore();
          await store.set(key, value);
          await store.save();
        } catch (e) {
          console.error("authStorage.setItem", e);
        }
      },
      removeItem: async (key) => {
        try {
          const store = await getStore();
          await store.delete(key);
          await store.save();
        } catch (e) {
          console.error("authStorage.removeItem", e);
        }
      },
    }
  : undefined;
