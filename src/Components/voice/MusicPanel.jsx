import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { motion, useDragControls, useMotionValue } from "framer-motion";
import {
  Music,
  Play,
  Pause,
  SkipForward,
  Plus,
  X,
  Volume2,
  VolumeX,
  Video,
  VideoOff,
  ListMusic,
  Minimize2,
  Maximize2,
  GripVertical,
} from "lucide-react";
import toast from "react-hot-toast";
import { useMusic } from "../../context/MusicContext";
import { useVoice } from "../../context/VoiceContext";
import { useMobileMenu } from "../../context/MobileMenuContext";
import { loadYouTubeApi, parseYouTubeId, youtubeThumb, formatTime } from "../../utils/youtube";

const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

const MusicPanel = () => {
  const music = useMusic();
  const voice = useVoice();
  const location = useLocation();
  const { isMobile } = useMobileMenu();
  const { showSidebar } = voice;

  const [input, setInput] = useState("");
  const [ready, setReady] = useState(false);
  const [nowTitle, setNowTitle] = useState("");
  const [blocked, setBlocked] = useState(false);
  const [progress, setProgress] = useState({ position: 0, duration: 0 });
  const [volume, setVolume] = useState(() => {
    const v = Number(localStorage.getItem("staple-music-volume"));
    return Number.isFinite(v) && v >= 0 && v <= 100 ? v : 70;
  });

  // Docked bar ses açılır kutusu
  const [volOpen, setVolOpen] = useState(false);
  const volWrapRef = useRef(null);

  // Video penceresi (kontrollere bağlı ayrı, sürüklenebilir + boyutlanabilir)
  const [videoOpen, setVideoOpen] = useState(false);
  const [vrect, setVrect] = useState({ x: 0, y: 0, w: 320, h: 180 });

  // Yüzen (detached) kart sürükleme
  const boundsRef = useRef(null);
  const dragControls = useDragControls();
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const playerRef = useRef(null);
  const hostRef = useRef(null);
  const stateRef = useRef(music);
  stateRef.current = music;

  const onServerPage = /^\/server\/[^/]+/.test(location.pathname);
  const voiceDocked = onServerPage && !isMobile && !!voice.active && !voice.isDetached;
  const musicDocked = onServerPage && !isMobile && music.isActive && !music.detached;
  const musicBottom = voiceDocked ? 96 : 0; // docked VoiceBar'ın üstünde dur

  // --------- Player senkronu ---------
  const expectedPosition = () => {
    const s = stateRef.current;
    let t = s.positionSec || 0;
    if (s.playing) t += (Date.now() - (s.receivedAt || Date.now())) / 1000;
    return Math.max(0, t);
  };

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
      try {
        if (s.playing) p.loadVideoById({ videoId: s.current.id, startSeconds: target });
        else p.cueVideoById({ videoId: s.current.id, startSeconds: target });
      } catch { /* yok say */ }
      return;
    }
    try {
      const now = p.getCurrentTime();
      if (Math.abs(now - target) > 1.3) p.seekTo(target, true);
    } catch { /* yok say */ }
    const ps = p.getPlayerState();
    try {
      if (s.playing && ps !== 1 && ps !== 3) p.playVideo();
      else if (!s.playing && ps === 1) p.pauseVideo();
    } catch { /* yok say */ }
  };

  // Player'ı sesli kanaldayken oluştur, çıkınca yok et (host DOM'da olmalı)
  useEffect(() => {
    if (!music.isActive) return undefined;
    let cancelled = false;
    loadYouTubeApi().then((YT) => {
      if (cancelled || !hostRef.current || playerRef.current) return;
      const el = document.createElement("div");
      hostRef.current.appendChild(el);
      playerRef.current = new YT.Player(el, {
        width: "100%",
        height: "100%",
        playerVars: {
          autoplay: 0, controls: 0, disablekb: 1, rel: 0, modestbranding: 1, playsinline: 1,
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
              if (id) stateRef.current.emitEnded(id);
            }
            if (e.data === YTPS.PLAYING) {
              setBlocked(false);
              try {
                const d = playerRef.current.getVideoData();
                if (d?.title) {
                  setNowTitle(d.title);
                  stateRef.current.emitTitle(d.video_id, d.title);
                }
              } catch { /* yok say */ }
            }
            if ((e.data === YTPS.UNSTARTED || e.data === YTPS.CUED) && stateRef.current.playing) {
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
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [music.isActive]);

  useEffect(() => {
    if (ready) applyState();
    if (!music.current) setNowTitle("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [music.current?.id, music.playing, music.positionSec, music.receivedAt, ready]);

  useEffect(() => {
    const id = setInterval(() => {
      const p = playerRef.current;
      if (p && p.getCurrentTime && stateRef.current.current) {
        try {
          setProgress({ position: p.getCurrentTime() || 0, duration: p.getDuration() || 0 });
        } catch { /* yok say */ }
        if (stateRef.current.playing) applyState();
      } else {
        setProgress({ position: 0, duration: 0 });
      }
    }, 1500);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Kanaldan çıkınca video/dock yerel durumunu sıfırla
  useEffect(() => {
    if (!music.isActive) setVideoOpen(false);
  }, [music.isActive]);

  // Ses açılır kutusu: dışarı tıkla / Esc ile kapan
  useEffect(() => {
    if (!volOpen) return undefined;
    const onDown = (e) => { if (!volWrapRef.current?.contains(e.target)) setVolOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setVolOpen(false); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [volOpen]);

  const changeVolume = (v) => {
    const val = clamp(Math.round(v), 0, 100);
    setVolume(val);
    localStorage.setItem("staple-music-volume", String(val));
    try { playerRef.current?.setVolume(val); } catch { /* yok say */ }
  };
  const resume = () => {
    try { playerRef.current?.playVideo(); } catch { /* yok say */ }
    setBlocked(false);
  };
  const handleAdd = () => {
    const id = parseYouTubeId(input);
    if (!id) return toast.error("Geçerli bir YouTube linki/kodu yapıştır");
    music.enqueue(id);
    setInput("");
  };

  const openVideo = () => {
    const w = 320, h = 180;
    setVrect({
      x: clamp(window.innerWidth - w - 24, 8, window.innerWidth - w - 8),
      y: clamp(window.innerHeight - h - 220, 8, window.innerHeight - h - 8),
      w, h,
    });
    setVideoOpen(true);
  };

  const startVideoDrag = (e) => {
    if (e.target.closest("button") || e.target.closest("[data-resize]")) return;
    e.preventDefault();
    const sx = e.clientX, sy = e.clientY;
    const start = { ...vrect };
    const move = (ev) => {
      setVrect((r) => ({
        ...r,
        x: clamp(start.x + (ev.clientX - sx), 0, window.innerWidth - start.w),
        y: clamp(start.y + (ev.clientY - sy), 0, window.innerHeight - start.h),
      }));
    };
    const end = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
  };

  const startVideoResize = (e) => {
    e.stopPropagation();
    e.preventDefault();
    const sx = e.clientX, sy = e.clientY;
    const start = { ...vrect };
    const maxW = Math.round(window.innerWidth * 0.9);
    const maxH = Math.round(window.innerHeight * 0.8);
    const move = (ev) => {
      setVrect((r) => ({
        ...r,
        w: clamp(start.w + (ev.clientX - sx), 240, maxW),
        h: clamp(start.h + (ev.clientY - sy), 135, maxH),
      }));
    };
    const end = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
  };

  // Yüzen kartı sürükle (etkileşimli öğede başlatma)
  const handlePointerDown = (e) => {
    if (
      e.target.closest("button") ||
      e.target.closest("input") ||
      e.target.closest("[role='slider']")
    ) return;
    dragControls.start(e);
  };

  const detach = () => { music.setDetached(true); x.set(0); y.set(0); };
  const dock = () => { music.setDetached(false); music.setDragOverSidebar(false); x.set(0); y.set(0); };

  if (!music.isActive) return null;

  const { current, queue, playing } = music;
  const title = current ? nowTitle || current.title || "YouTube videosu" : null;
  const duration = progress.duration || 0;
  const position = Math.min(progress.position || 0, duration || 0);

  const videoToggleBtn = (
    <button
      onClick={() => (videoOpen ? setVideoOpen(false) : openVideo())}
      title={videoOpen ? "Videoyu gizle" : "Videoyu göster"}
      className="p-1.5 rounded-lg text-[var(--primary-text)] hover:text-[var(--secondary-text)] hover:bg-[var(--secondary-bg)] transition-colors"
    >
      {videoOpen ? <VideoOff size={15} /> : <Video size={15} />}
    </button>
  );

  const addRow = (
    <div className="flex items-center gap-2">
      <input
        type="text" value={input} onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        placeholder="YouTube linki veya kodu…"
        className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-[var(--secondary-bg)] text-[var(--secondary-text)] border border-[var(--primary-border)] focus:outline-none focus:border-[var(--tertiary-border)] placeholder:text-[var(--primary-text)] text-sm transition-colors"
      />
      <button onClick={handleAdd} title="Kuyruğa ekle"
        className="grid place-items-center w-9 h-9 rounded-lg bg-[var(--tertiary-bg)] text-[var(--tertiary-text)] hover:bg-[var(--quaternary-bg)] transition-colors shrink-0">
        <Plus size={17} />
      </button>
    </div>
  );

  const transport = (
    <>
      <button onClick={() => (playing ? music.pause() : music.play())} disabled={!current}
        className="grid place-items-center w-9 h-9 rounded-full bg-[var(--tertiary-bg)] text-[var(--tertiary-text)] hover:bg-[var(--quaternary-bg)] disabled:opacity-40 transition-colors shrink-0"
        title={playing ? "Duraklat" : "Oynat"}>
        {playing ? <Pause size={16} /> : <Play size={16} />}
      </button>
      <button onClick={music.next} disabled={!current}
        className="grid place-items-center w-8 h-8 rounded-full bg-[var(--secondary-bg)] text-[var(--secondary-text)] hover:text-[var(--tertiary-text)] disabled:opacity-40 transition-colors shrink-0"
        title="Sıradaki">
        <SkipForward size={15} />
      </button>
    </>
  );

  // ---------- DOCKED (SvSidebar'a gömülü kompakt bar) ----------
  const dockedBar = (
    <div
      className="fixed z-[98] pointer-events-auto"
      style={{ bottom: musicBottom, width: "var(--sidebar-width, 256px)", left: "var(--navigator-width, 64px)", transition: "left 0.2s ease-in-out" }}
    >
      <div className="flex flex-col gap-2 px-2 py-2 bg-[var(--primary-bg)] border-t border-[var(--primary-border)]">
        {/* Üst satır: başlık + video + detach */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0 text-xs font-bold text-[var(--secondary-text)]">
            <Music size={14} className="text-[var(--tertiary-border)] shrink-0" />
            <span className="truncate">Watch Party</span>
            {queue.length > 0 && (
              <span className="min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-[var(--tertiary-bg)] text-[var(--tertiary-text)] text-[9px] font-bold shrink-0">
                {queue.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            {/* Ses — tıklayınca üstünde açılır kutu */}
            <div className="relative" ref={volWrapRef}>
              <button
                onClick={() => setVolOpen((v) => !v)}
                title="Ses"
                className={`p-1.5 rounded-lg transition-colors ${
                  volOpen
                    ? "bg-[var(--tertiary-bg)] text-[var(--tertiary-text)]"
                    : "text-[var(--primary-text)] hover:text-[var(--secondary-text)] hover:bg-[var(--secondary-bg)]"
                }`}
              >
                {volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
              </button>
              {volOpen && (
                <div className="absolute bottom-full right-0 mb-2 z-[60] w-44 p-2 rounded-xl bg-[var(--primary-bg)] border-2 border-[var(--primary-border)] shadow-2xl">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => changeVolume(volume === 0 ? 70 : 0)}
                      title={volume === 0 ? "Sesi aç" : "Sustur"}
                      className={`shrink-0 transition-colors ${
                        volume === 0 ? "text-red-400" : "text-[var(--primary-text)] hover:text-[var(--secondary-text)]"
                      }`}
                    >
                      {volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
                    </button>
                    <input
                      type="range" role="slider" min={0} max={100} value={volume}
                      onChange={(e) => changeVolume(Number(e.target.value))}
                      className="flex-1 h-1 cursor-pointer" style={{ accentColor: "var(--tertiary-bg)" }}
                      title="Ses (yalnızca sende)"
                    />
                    <span className="w-8 shrink-0 text-right text-[10px] tabular-nums text-[var(--primary-text)]">
                      %{volume}
                    </span>
                  </div>
                </div>
              )}
            </div>
            {videoToggleBtn}
            <button onClick={detach} title="Kenardan çıkar"
              className="p-1.5 rounded-lg text-[var(--primary-text)] hover:text-[var(--secondary-text)] hover:bg-[var(--secondary-bg)] transition-colors">
              <Maximize2 size={14} />
            </button>
          </div>
        </div>

        {/* Şu an çalan */}
        {current ? (
          <div className="flex items-center gap-2">
            <img src={youtubeThumb(current.id)} alt="" className="w-9 h-9 rounded object-cover bg-[var(--secondary-bg)] shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-[var(--secondary-text)] truncate">{title}</p>
              {current.addedBy && <p className="text-[10px] text-[var(--primary-text)] truncate">{current.addedBy}</p>}
            </div>
          </div>
        ) : (
          <p className="text-[11px] text-[var(--primary-text)] py-0.5">Sıra boş — link ekle.</p>
        )}

        {blocked && current && (
          <button onClick={resume}
            className="w-full flex items-center justify-center gap-1.5 py-1 rounded-lg bg-[var(--tertiary-bg)] text-[var(--tertiary-text)] text-[11px] font-bold hover:bg-[var(--quaternary-bg)] transition-colors">
            <Play size={12} /> Sesi başlat
          </button>
        )}

        {/* Video süre kontrolü (seek) */}
        {current && (
          <div>
            <input type="range" role="slider" min={0} max={Math.max(duration, 1)} step={1} value={position}
              onChange={(e) => music.seek(Number(e.target.value))}
              className="w-full h-1 cursor-pointer" style={{ accentColor: "var(--tertiary-bg)" }} />
            <div className="flex justify-between text-[10px] text-[var(--primary-text)] tabular-nums">
              <span>{formatTime(position)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        )}

        {/* Kontroller + ekle */}
        <div className="flex items-center gap-1.5">
          {transport}
          <input
            type="text" value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="YouTube linki…"
            className="flex-1 min-w-0 px-2 py-1.5 rounded-lg bg-[var(--secondary-bg)] text-[var(--secondary-text)] border border-[var(--primary-border)] focus:outline-none focus:border-[var(--tertiary-border)] placeholder:text-[var(--primary-text)] text-xs transition-colors"
          />
          <button onClick={handleAdd} title="Ekle"
            className="grid place-items-center w-8 h-8 rounded-lg bg-[var(--tertiary-bg)] text-[var(--tertiary-text)] hover:bg-[var(--quaternary-bg)] transition-colors shrink-0">
            <Plus size={15} />
          </button>
        </div>
      </div>
    </div>
  );

  // ---------- DETACHED (yüzen tam panel) ----------
  const fullPanel = (
    <div className="w-[320px] max-w-[90vw] rounded-2xl bg-[var(--primary-bg)] border-2 border-[var(--primary-border)] shadow-2xl overflow-hidden select-none">
      {/* Başlık / sürükleme tutamağı */}
      <div className="flex items-center justify-between px-2.5 py-2 border-b-2 border-[var(--primary-border)]">
        <div className="flex items-center gap-1.5 text-sm font-bold text-[var(--secondary-text)] min-w-0">
          <span className="cursor-grab active:cursor-grabbing text-[var(--primary-text)]" title="Sürükle">
            <GripVertical size={15} />
          </span>
          <Music size={15} className="text-[var(--tertiary-border)] shrink-0" />
          <span className="truncate">Watch Party</span>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {videoToggleBtn}
          {onServerPage && showSidebar && !isMobile && (
            <button onClick={dock} title="Kenar çubuğuna sabitle"
              className="p-1.5 rounded-lg text-[var(--primary-text)] hover:text-[var(--secondary-text)] hover:bg-[var(--secondary-bg)] transition-colors">
              <Minimize2 size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Şu an çalan */}
      <div className="p-3">
        {current ? (
          <div className="flex items-center gap-3">
            <img src={youtubeThumb(current.id)} alt="" className="w-14 h-14 rounded-lg object-cover bg-[var(--secondary-bg)] shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[var(--secondary-text)] truncate">{title}</p>
              {current.addedBy && <p className="text-[11px] text-[var(--primary-text)] truncate">{current.addedBy} ekledi</p>}
            </div>
          </div>
        ) : (
          <p className="text-sm text-[var(--primary-text)] text-center py-3">Sıra boş. Aşağıdan bir YouTube linki ekle.</p>
        )}

        {blocked && current && (
          <button onClick={resume}
            className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-[var(--tertiary-bg)] text-[var(--tertiary-text)] text-xs font-bold hover:bg-[var(--quaternary-bg)] transition-colors">
            <Play size={13} /> Sesi başlat
          </button>
        )}

        {current && (
          <div className="mt-3">
            <input type="range" role="slider" min={0} max={Math.max(duration, 1)} step={1} value={position}
              onChange={(e) => music.seek(Number(e.target.value))}
              className="w-full h-1 cursor-pointer" style={{ accentColor: "var(--tertiary-bg)" }} />
            <div className="flex justify-between text-[10px] text-[var(--primary-text)] tabular-nums">
              <span>{formatTime(position)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        )}

        <div className="mt-2 flex items-center gap-2">
          {transport}
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <Volume2 size={15} className="text-[var(--primary-text)] shrink-0" />
            <input type="range" role="slider" min={0} max={100} value={volume}
              onChange={(e) => changeVolume(Number(e.target.value))}
              className="flex-1 h-1 cursor-pointer" style={{ accentColor: "var(--tertiary-bg)" }}
              title="Ses (yalnızca sende)" />
          </div>
        </div>
      </div>

      <div className="px-3 pb-3">{addRow}</div>

      {queue.length > 0 && (
        <div className="border-t border-[var(--primary-border)]">
          <div className="flex items-center justify-between px-3 py-2">
            <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-[var(--primary-text)]">
              <ListMusic size={13} /> Sırada ({queue.length})
            </span>
            <button onClick={music.clear} className="text-[11px] font-semibold text-[var(--primary-text)] hover:text-red-400 transition-colors">
              Temizle
            </button>
          </div>
          <div className="max-h-40 overflow-y-auto custom-scrollbar px-2 pb-2 flex flex-col gap-1">
            {queue.map((item, i) => (
              <div key={`${item.id}-${i}`} className="group flex items-center gap-2 p-1.5 rounded-lg hover:bg-[var(--secondary-bg)] transition-colors">
                <img src={youtubeThumb(item.id)} alt="" className="w-9 h-9 rounded object-cover bg-[var(--secondary-bg)] shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-[var(--secondary-text)] truncate">{item.title || "YouTube videosu"}</p>
                  {item.addedBy && <p className="text-[10px] text-[var(--primary-text)] truncate">{item.addedBy}</p>}
                </div>
                <button onClick={() => music.removeAt(i)} title="Kaldır"
                  className="p-1 rounded text-[var(--primary-text)] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Her zaman mount olan player barınağı */}
      <div
        aria-hidden
        style={
          videoOpen
            ? { position: "fixed", left: vrect.x, top: vrect.y, width: vrect.w, height: vrect.h, zIndex: 104, borderRadius: 12, overflow: "hidden", background: "#000", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }
            : { position: "fixed", left: "-9999px", top: 0, width: 240, height: 135, pointerEvents: "none" }
        }
      >
        <div ref={hostRef} style={{ width: "100%", height: "100%" }} />
      </div>

      {/* Video penceresi — sürüklenebilir + köşeden boyutlanır */}
      {videoOpen && (
        <div
          onPointerDown={startVideoDrag}
          style={{ position: "fixed", left: vrect.x, top: vrect.y, width: vrect.w, height: vrect.h, zIndex: 105 }}
          className="rounded-xl border-2 border-[var(--primary-border)] cursor-grab active:cursor-grabbing"
        >
          <div className="absolute top-0 left-0 right-0 h-7 flex items-center justify-between px-2 rounded-t-xl bg-black/60 text-white pointer-events-none">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold"><Music size={12} /> Video</span>
            <button onPointerDown={(e) => e.stopPropagation()} onClick={() => setVideoOpen(false)} title="Videoyu kapat"
              className="pointer-events-auto p-0.5 rounded hover:bg-white/20 transition-colors">
              <X size={14} />
            </button>
          </div>
          <div data-resize onPointerDown={startVideoResize} title="Boyutlandır"
            className="absolute bottom-0 right-0 z-10 w-6 h-6 cursor-nwse-resize flex items-end justify-end p-1 group/resize">
            <div className="w-3 h-3 border-b-[3px] border-r-[3px] border-white/70 group-hover/resize:border-[var(--quaternary-text)] rounded-br-sm transition-colors" />
          </div>
        </div>
      )}

      {/* Watch Party arayüzü: docked (sidebar) veya detached (yüzen) */}
      {musicDocked ? (
        dockedBar
      ) : (
        <div ref={boundsRef} className="fixed inset-0 z-[98] flex items-end justify-end p-4 pointer-events-none">
          <motion.div
            drag
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={boundsRef}
            dragMomentum={false}
            dragElastic={0.05}
            onPointerDown={handlePointerDown}
            onDrag={(event, info) => {
              const isNavExpanded = localStorage.getItem("staple-navigator-expanded") === "true";
              const navW = isNavExpanded ? (Number(localStorage.getItem("staple-navigator-width")) || 240) : 64;
              const sidebarW = Number(localStorage.getItem("staple-sidebar-width")) || 256;
              const limitX = navW + sidebarW;
              const over = onServerPage && showSidebar && !isMobile && info.point.x < limitX && info.point.x > navW;
              music.setDragOverSidebar(over);
            }}
            onDragEnd={(event, info) => {
              music.setDragOverSidebar(false);
              const isNavExpanded = localStorage.getItem("staple-navigator-expanded") === "true";
              const navW = isNavExpanded ? (Number(localStorage.getItem("staple-navigator-width")) || 240) : 64;
              const sidebarW = Number(localStorage.getItem("staple-sidebar-width")) || 256;
              const limitX = navW + sidebarW;
              if (onServerPage && showSidebar && !isMobile && info.point.x < limitX && info.point.x > navW) dock();
            }}
            style={{ x, y, touchAction: "none" }}
            className="pointer-events-auto"
          >
            {fullPanel}
          </motion.div>
        </div>
      )}
    </>
  );
};

export default MusicPanel;
