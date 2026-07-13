import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { socket } from "../config/socket";
import { useVoice } from "./VoiceContext";
import { loadYouTubeApi } from "../utils/youtube";

// Senkron YouTube dinleme partisi. Durum sunucuda otoriter tutulur (bkz.
// server.cjs music:*). Bu context: gizli bir IFrame player'ı sunucu durumuna
// göre sürer, sürüklenmeyi (drift) düzeltir ve UI için kontroller sunar.
// Yalnızca bir sesli kanala bağlıyken (useVoice().active) aktiftir.
const MusicContext = createContext(null);

const EMPTY = { current: null, queue: [], playing: false, positionSec: 0 };

export const MusicProvider = ({ children }) => {
  const { active } = useVoice();

  const [state, setState] = useState(EMPTY); // sunucudan gelen durum
  const [ready, setReady] = useState(false); // player hazır mı
  const [videoOpen, setVideoOpen] = useState(false); // videoyu göster/gizle
  const [progress, setProgress] = useState({ position: 0, duration: 0 }); // UI seek çubuğu
  const [nowTitle, setNowTitle] = useState(""); // player'dan çözülen başlık
  const [blocked, setBlocked] = useState(false); // tarayıcı autoplay engeli
  const [volume, setVolume] = useState(() => {
    const v = Number(localStorage.getItem("staple-music-volume"));
    return Number.isFinite(v) && v >= 0 && v <= 100 ? v : 70;
  });

  const playerRef = useRef(null);
  const hostRef = useRef(null);
  const stateRef = useRef(EMPTY);
  const recvRef = useRef({ positionSec: 0, at: 0, playing: false });

  const isActive = !!active;

  // Sunucu durumundan beklenen anlık pozisyonu hesapla (yerel geçen süreyle).
  const expectedPosition = () => {
    const r = recvRef.current;
    let t = r.positionSec;
    if (r.playing) t += (Date.now() - r.at) / 1000;
    return Math.max(0, t);
  };

  // Player'ı sunucu durumuna hizala (video yükle / oynat-durdur / drift seek).
  const applyState = () => {
    const p = playerRef.current;
    if (!p || !p.getPlayerState) return;
    const s = stateRef.current;

    if (!s.current) {
      try { p.stopVideo(); } catch { /* yok say */ }
      return;
    }

    const target = expectedPosition();
    let curId = null;
    try { curId = p.getVideoData && p.getVideoData().video_id; } catch { /* yok say */ }

    if (curId !== s.current.id) {
      // Yeni video: çalıyorsa yükle+oynat, değilse cue (autoplay yok)
      try {
        if (s.playing) p.loadVideoById({ videoId: s.current.id, startSeconds: target });
        else p.cueVideoById({ videoId: s.current.id, startSeconds: target });
      } catch { /* yok say */ }
      return;
    }

    // Aynı video: drift düzelt
    try {
      const now = p.getCurrentTime();
      if (Math.abs(now - target) > 1.3) p.seekTo(target, true);
    } catch { /* yok say */ }

    const ps = p.getPlayerState(); // 1=playing 2=paused 3=buffering
    try {
      if (s.playing && ps !== 1 && ps !== 3) {
        const r = p.playVideo();
        void r;
      } else if (!s.playing && ps === 1) {
        p.pauseVideo();
      }
    } catch { /* yok say */ }
  };

  // ---- Player'ı bir kez oluştur ----
  useEffect(() => {
    let cancelled = false;
    loadYouTubeApi().then((YT) => {
      if (cancelled || !hostRef.current || playerRef.current) return;
      const el = document.createElement("div");
      hostRef.current.appendChild(el);
      playerRef.current = new YT.Player(el, {
        width: "100%",
        height: "100%",
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
        },
        events: {
          onReady: () => {
            if (cancelled) return;
            try { playerRef.current.setVolume(volume); } catch { /* yok say */ }
            setReady(true);
            applyState();
          },
          onStateChange: (e) => {
            const YTPS = window.YT?.PlayerState;
            if (!YTPS) return;
            if (e.data === YTPS.ENDED) {
              const id = stateRef.current.current?.id;
              if (id) socket.emit("music:ended", { endedId: id });
            }
            if (e.data === YTPS.PLAYING) {
              setBlocked(false);
              // Çözülen başlığı yay (kuyrukta başlık boşsa diğerleri de görsün)
              try {
                const d = playerRef.current.getVideoData();
                if (d?.title) {
                  setNowTitle(d.title);
                  socket.emit("music:title", { id: d.video_id, title: d.title });
                }
              } catch { /* yok say */ }
            }
            // Sunucu "çalıyor" derken player çalmıyorsa → autoplay engeli
            if (
              (e.data === YTPS.UNSTARTED || e.data === YTPS.CUED) &&
              stateRef.current.playing
            ) {
              setBlocked(true);
            }
          },
        },
      });
    });
    return () => {
      cancelled = true;
      try { playerRef.current?.destroy(); } catch { /* yok say */ }
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Sunucu durumunu dinle ----
  useEffect(() => {
    const onState = (payload) => {
      const next = {
        current: payload?.current || null,
        queue: payload?.queue || [],
        playing: !!payload?.playing,
        positionSec: payload?.positionSec || 0,
      };
      recvRef.current = {
        positionSec: next.positionSec,
        at: Date.now(),
        playing: next.playing,
      };
      stateRef.current = next;
      setState(next);
      if (!next.current) setNowTitle("");
      applyState();
    };
    socket.on("music:state", onState);
    return () => socket.off("music:state", onState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Kanala bağlanınca durumu iste; ayrılınca yereli sıfırla ----
  useEffect(() => {
    if (isActive) {
      socket.emit("music:request");
    } else {
      stateRef.current = EMPTY;
      recvRef.current = { positionSec: 0, at: 0, playing: false };
      setState(EMPTY);
      setNowTitle("");
      setBlocked(false);
      try { playerRef.current?.stopVideo(); } catch { /* yok say */ }
    }
  }, [isActive, active?.serverId, active?.channelId]);

  // ---- Periyodik drift düzeltme + UI ilerleme çubuğu ----
  useEffect(() => {
    const id = setInterval(() => {
      const p = playerRef.current;
      if (p && p.getCurrentTime && stateRef.current.current) {
        try {
          setProgress({
            position: p.getCurrentTime() || 0,
            duration: p.getDuration() || 0,
          });
        } catch { /* yok say */ }
        if (stateRef.current.playing) applyState(); // sapmayı topla
      } else {
        setProgress({ position: 0, duration: 0 });
      }
    }, 1500);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeVolume = (v) => {
    const val = Math.max(0, Math.min(100, Math.round(v)));
    setVolume(val);
    localStorage.setItem("staple-music-volume", String(val));
    try { playerRef.current?.setVolume(val); } catch { /* yok say */ }
  };

  // Autoplay engellendiyse kullanıcı jestiyle başlat
  const resume = () => {
    try { playerRef.current?.playVideo(); } catch { /* yok say */ }
    setBlocked(false);
  };

  // ---- Aksiyonlar (sunucuya yay) ----
  const actions = useMemo(
    () => ({
      enqueue: (id, title) => socket.emit("music:enqueue", { video: { id, title } }),
      play: () => socket.emit("music:control", { action: "play" }),
      pause: () => socket.emit("music:control", { action: "pause" }),
      next: () => socket.emit("music:control", { action: "next" }),
      seek: (sec) => socket.emit("music:control", { action: "seek", positionSec: sec }),
      clear: () => socket.emit("music:control", { action: "clear" }),
      removeAt: (index) => socket.emit("music:remove", { index }),
    }),
    []
  );

  const value = useMemo(
    () => ({
      isActive,
      ...state,
      ready,
      progress,
      nowTitle,
      blocked,
      volume,
      videoOpen,
      setVideoOpen,
      changeVolume,
      resume,
      ...actions,
    }),
    [isActive, state, ready, progress, nowTitle, blocked, volume, videoOpen, actions]
  );

  return (
    <MusicContext.Provider value={value}>
      {children}
      {/* Gizli/görünür YouTube player barınağı — video açıkken MusicPanel içinde
          gösterilir, kapalıyken 1px offscreen (ses yine gelir). */}
      <div
        aria-hidden
        style={
          videoOpen
            ? {
                position: "fixed",
                right: "16px",
                bottom: "112px",
                width: "320px",
                height: "180px",
                zIndex: 97,
                borderRadius: "12px",
                overflow: "hidden",
                boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
                background: "#000",
              }
            : {
                // Ekran dışında ama gerçek boyutta — 1x1/gizli iframe'lerde bazı
                // tarayıcılar sesi kısıtlar; offscreen tutarak sesi garanti ederiz.
                position: "fixed",
                width: "240px",
                height: "135px",
                left: "-9999px",
                top: "0",
                pointerEvents: "none",
              }
        }
      >
        <div ref={hostRef} style={{ width: "100%", height: "100%" }} />
      </div>
    </MusicContext.Provider>
  );
};

export const useMusic = () => {
  const ctx = useContext(MusicContext);
  if (!ctx) throw new Error("useMusic must be used within MusicProvider");
  return ctx;
};
