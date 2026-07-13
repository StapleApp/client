// YouTube IFrame Player API yardımcıları — API anahtarı GEREKMEZ.
// Yalnızca resmi iframe script'i yüklenir; oynatma kontrolü JS ile yapılır.

let ytPromise = null;

// IFrame API'yi bir kez yükle; window.YT hazır olunca resolve eder.
export function loadYouTubeApi() {
  if (ytPromise) return ytPromise;
  ytPromise = new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      resolve(window.YT);
      return;
    }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prev === "function") prev();
      resolve(window.YT);
    };
    if (!document.getElementById("youtube-iframe-api")) {
      const tag = document.createElement("script");
      tag.id = "youtube-iframe-api";
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }
  });
  return ytPromise;
}

// Yapıştırılan URL/kod içinden 11 karakterli YouTube video id'sini çıkar.
// Destekler: youtu.be/ID, youtube.com/watch?v=ID, /embed/ID, /shorts/ID,
// music.youtube.com ve düz ID.
export function parseYouTubeId(input) {
  if (!input) return null;
  const s = String(input).trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  try {
    const u = new URL(s.includes("://") ? s : `https://${s}`);
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.slice(1, 12);
      return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
    }
    const v = u.searchParams.get("v");
    if (v && /^[A-Za-z0-9_-]{11}$/.test(v)) return v;
    const m = u.pathname.match(/\/(embed|shorts|v)\/([A-Za-z0-9_-]{11})/);
    if (m) return m[2];
  } catch {
    /* URL değil → aşağıda ham eşleşmeyi dene */
  }
  const m2 = s.match(/[A-Za-z0-9_-]{11}/);
  return m2 ? m2[0] : null;
}

// Video küçük resmi (API anahtarı gerektirmez).
export const youtubeThumb = (id) =>
  id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : "";

// saniye → m:ss
export function formatTime(sec) {
  if (!sec || sec < 0 || !isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
