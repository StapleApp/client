import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence, useDragControls, useMotionValue } from "framer-motion";
import {
  Mic,
  MicOff,
  PhoneOff,
  Volume2,
  VolumeX,
  Loader2,
  Users,
  GripVertical,
  ScreenShare,
  ScreenShareOff,
  MonitorPlay,
  MonitorX,
  Eye,
  EyeOff,
  Settings2,
} from "lucide-react";
import { useVoice } from "../../context/VoiceContext";
import { useAuth } from "../../context/AuthContext";

const VoiceBar = () => {
  const {
    active,
    connecting,
    muted,
    participants,
    toggleMute,
    leaveVoice,
    isScreenSharing,
    localScreenStream,
    showSelfPreview,
    sharingSocketIds,
    watchingSocketId,
    remoteScreenStream,
    startScreenShare,
    stopScreenShare,
    toggleSelfPreview,
    watchScreen,
    stopWatching,
    speaking,
    vad,
    setVadEnabled,
    setVadAggressiveness,
    getUserVolume,
    setUserVolume,
    isDetached,
    setIsDetached,
  } = useVoice();
  const { userData } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const match = location.pathname.match(/^\/server\/([^/]+)/);
  const onServerPage = !!match;
  const isDocked = onServerPage && !isDetached;
  const [showList, setShowList] = useState(false);
  const [showVadSettings, setShowVadSettings] = useState(false);
  const boundsRef = useRef(null);
  const videoRef = useRef(null);
  const listWrapRef = useRef(null);
  const dragControls = useDragControls();

  // Liste açıkken dışarı tıklama / Escape ile kapan
  useEffect(() => {
    if (!showList) return;

    const onPointerDown = (e) => {
      if (!listWrapRef.current?.contains(e.target)) setShowList(false);
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") setShowList(false);
    };

    // pointerdown: sürükleme başlamadan önce yakalar
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [showList]);

  // Konum (sürükleme) — boyutlandırma telafisi için de kullanılıyor
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const [dims, setDims] = useState({ w: 560, h: 315 });

  const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

  // Sol üst köşeden boyutlandırma: alt ve sağ kenar SABİT kalır, sadece
  // çekilen kenar (üst/sol) hareket eder.
  const onResizeStart = (e) => {
    e.stopPropagation();
    e.preventDefault();
    const startMouseX = e.clientX;
    const startMouseY = e.clientY;
    const startW = dims.w;
    const startH = dims.h;
    const startTx = x.get();
    const maxW = Math.round(window.innerWidth * 0.9);
    const maxH = Math.round(window.innerHeight * 0.8);

    const move = (ev) => {
      const dw = startMouseX - ev.clientX; // sola çekince genişler
      const dh = startMouseY - ev.clientY; // yukarı çekince uzar
      const newW = clamp(startW + dw, 280, maxW);
      const newH = clamp(startH + dh, 160, maxH);
      setDims({ w: newW, h: newH });
      // Kutu yatayda ortalı olduğu için genişlik büyüyünce iki kenar da
      // açılır; sağ kenarı sabit tutmak için sola kaydırarak telafi et.
      x.set(startTx - (newW - startW) / 2);
      // Dikeyde kutu zaten alta yaslı (items-end) → alt kenar sabit, üst uzar.
    };
    const end = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
  };

  const show = active || connecting;
  const total = participants.length + 1;
  const anyoneSharing = isScreenSharing || sharingSocketIds.length > 0;
  const isWatching = !!remoteScreenStream;
  const watchingName =
    participants.find((p) => p.socketId === watchingSocketId)?.nickName || "";

  // Sinema alanında ne gösterilecek? Öncelik: izlenen uzak ekran > kendi önizleme
  const showingSelfPreview =
    !isWatching && isScreenSharing && showSelfPreview && !!localScreenStream;
  const theaterStream = isWatching ? remoteScreenStream : (showingSelfPreview ? localScreenStream : null);
  const isTheater = !!theaterStream && !isDocked;
  const theaterLabel = isWatching
    ? watchingName
      ? `${watchingName} · ekran paylaşımı`
      : "Ekran paylaşımı"
    : "Senin ekranın · önizleme";

  // Gösterilecek akışı video öğesine bağla + mute'u senkronla
  useEffect(() => {
    if (videoRef.current && theaterStream) {
      videoRef.current.srcObject = theaterStream;
      // React'in muted prop'u mount sonrası güvenilmez → elle uygula
      videoRef.current.muted = showingSelfPreview;
    }
  }, [theaterStream, showingSelfPreview]);

  // Sinema açılıp/kapanınca konumu ortala ve varsayılan boyuta dön
  useEffect(() => {
    if (!isDocked) {
      x.set(0);
      y.set(0);
      if (isTheater) setDims({ w: 560, h: 315 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTheater, isDocked]);

  useEffect(() => {
    if (isDocked) {
      x.set(0);
      y.set(0);
    }
  }, [isDocked, x, y]);

  const startDrag = (e) => {
    if (isDocked) {
      setIsDetached(true);
      const dockedX = 192 - window.innerWidth / 2;
      const dockedY = 16;
      x.set(dockedX);
      y.set(dockedY);
    }
    dragControls.start(e);
  };

  // Sürükleme tutamacı (her iki düzende ortak)
  const gripHandle = (
    <div
      onPointerDown={startDrag}
      className="cursor-grab active:cursor-grabbing touch-none text-[var(--primary-text)] hover:text-[var(--secondary-text)] px-0.5"
    >
      <GripVertical size={18} />
    </div>
  );

  // Katılımcı listesi (popover)
  const participantList = (
    <AnimatePresence>
      {showList && (
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.97 }}
          transition={{ duration: 0.15 }}
          className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-72
                     rounded-xl border-2 border-[var(--primary-border)]
                     bg-[var(--primary-bg)] shadow-2xl p-2 text-left"
        >
          <div className="flex items-center justify-between px-2 pb-1">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--primary-text)]">
              Seste ({total})
            </p>
            <button
              onClick={() => setShowVadSettings((v) => !v)}
              title="Konuşma algılama ayarları"
              aria-label="Konuşma algılama ayarları"
              className={`p-1 rounded-md transition-colors ${
                showVadSettings
                  ? "bg-[var(--tertiary-bg)] text-[var(--tertiary-text)]"
                  : "text-[var(--primary-text)] hover:text-[var(--secondary-text)]"
              }`}
            >
              <Settings2 size={14} />
            </button>
          </div>

          {/* Konuşma algılama (VAD) ayarları */}
          <AnimatePresence>
            {showVadSettings && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <div className="mx-2 mb-2 p-2 rounded-lg bg-[var(--secondary-bg)] border border-[var(--primary-border)]">
                  <label className="flex items-center justify-between gap-2 cursor-pointer">
                    <span className="text-xs text-[var(--secondary-text)]">
                      Konuşma algılama
                    </span>
                    <input
                      type="checkbox"
                      checked={vad.enabled}
                      onChange={(e) => setVadEnabled(e.target.checked)}
                      className="w-4 h-4 cursor-pointer"
                      style={{ accentColor: "var(--quaternary-text)" }}
                    />
                  </label>

                  {!vad.enabled && (
                    <p className="text-[10px] leading-tight text-[var(--primary-text)] mt-1">
                      Kapalı: eleme yapılmaz, sessizlik dışındaki her seste
                      halka yanar.
                    </p>
                  )}

                  <div className={vad.enabled ? "mt-2" : "mt-2 opacity-40"}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-[var(--primary-text)]">
                        Agresiflik
                      </span>
                      <span className="text-[10px] tabular-nums text-[var(--primary-text)]">
                        {vad.aggressiveness}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={vad.aggressiveness}
                      disabled={!vad.enabled}
                      onChange={(e) => setVadAggressiveness(Number(e.target.value))}
                      aria-label="Konuşma algılama agresifliği"
                      className="w-full h-1 cursor-pointer disabled:cursor-not-allowed"
                      style={{ accentColor: "var(--quaternary-text)" }}
                    />
                    <p className="text-[10px] leading-tight text-[var(--primary-text)] mt-1">
                      Yüksek değer arka plan gürültüsünü eler, alçak sesle
                      konuşmayı da kaçırabilir.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Kendin */}
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg">
            <img
              src={userData?.photoURL || "/defaults/avatars/1.png"}
              alt=""
              className={`w-8 h-8 rounded-full border-2 transition-colors ${
                muted
                  ? "border-red-500"
                  : speaking.self
                  ? "border-green-500"
                  : "border-[var(--primary-border)]"
              }`}
            />
            <span className="text-sm truncate flex-1">
              {userData?.nickName || "Sen"}{" "}
              <span className="text-[var(--primary-text)] text-xs">(sen)</span>
            </span>
            {isScreenSharing && (
              <ScreenShare size={14} className="text-[var(--quaternary-text)]" />
            )}
            {muted && <MicOff size={13} className="text-red-400" />}
          </div>

          {/* Uzak katılımcılar */}
          {participants.map((p) => {
            const sharing = sharingSocketIds.includes(p.socketId);
            const watchingThis = watchingSocketId === p.socketId;
            const vol = getUserVolume(p.userId);
            const pct = Math.round(vol * 100);
            return (
              <div key={p.socketId} className="px-2 py-1.5 rounded-lg">
                <div className="flex items-center gap-2">
                  <img
                    src={p.photoURL || "/defaults/avatars/1.png"}
                    alt=""
                    className={`w-8 h-8 rounded-full border-2 transition-colors ${
                      speaking[p.socketId]
                        ? "border-green-500"
                        : "border-[var(--primary-border)]"
                    }`}
                  />
                  <span className="text-sm truncate flex-1">{p.nickName}</span>
                  {p.muted && <MicOff size={13} className="text-red-400 shrink-0" />}
                  {sharing &&
                    (watchingThis ? (
                      <button
                        onClick={() => stopWatching()}
                        title="İzlemeyi durdur"
                        className="p-1 rounded-lg bg-[var(--tertiary-bg)] text-[var(--tertiary-text)] hover:opacity-90 transition"
                      >
                        <MonitorX size={16} />
                      </button>
                    ) : (
                      <button
                        onClick={() => watchScreen(p.socketId)}
                        title="Ekranı izle"
                        className="p-1 rounded-lg text-[var(--quaternary-text)] hover:bg-[var(--secondary-bg)] transition"
                      >
                        <MonitorPlay size={16} />
                      </button>
                    ))}
                </div>

                {/* Kişiye özel ses seviyesi — %100 üstü boost (gain > 1) */}
                <div className="flex items-center gap-2 mt-1.5 pl-10">
                  <button
                    onClick={() => setUserVolume(p.userId, vol === 0 ? 1 : 0)}
                    title={vol === 0 ? "Sesini aç" : "Sesini kapat"}
                    className={`shrink-0 transition-colors ${
                      vol === 0
                        ? "text-red-400"
                        : "text-[var(--primary-text)] hover:text-[var(--secondary-text)]"
                    }`}
                  >
                    {vol === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={200}
                    step={1}
                    value={pct}
                    onChange={(e) =>
                      setUserVolume(p.userId, Number(e.target.value) / 100)
                    }
                    title={`${p.nickName} · %${pct}`}
                    aria-label={`${p.nickName} ses seviyesi`}
                    className="flex-1 h-1 cursor-pointer"
                    style={{ accentColor: "var(--quaternary-text)" }}
                  />
                  <span className="w-9 shrink-0 text-right text-[10px] tabular-nums text-[var(--primary-text)]">
                    %{pct}
                  </span>
                </div>
              </div>
            );
          })}

          {participants.length === 0 && (
            <p className="text-xs text-[var(--primary-text)] px-2 py-1">
              Kanalda tek başınasın.
            </p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Kontrol satırı (her iki düzende ortak)
  const controls = (
    <div className="flex items-center gap-3 w-full">
      {gripHandle}

      {/* Durum + kanal bilgisi */}
      <div className="flex items-center gap-3 pr-3 border-r border-[var(--primary-border)]">
        {/* Konuşurken yeşile döner (kendi mikrofonun) */}
        <div
          className={`w-9 h-9 rounded-full bg-[var(--secondary-bg)] border-2 flex items-center justify-center shrink-0 transition-colors ${
            speaking.self ? "border-green-500" : "border-gray-500"
          }`}
        >
          {connecting ? (
            <Loader2 size={18} className="animate-spin text-[var(--quaternary-text)]" />
          ) : (
            <Volume2
              size={18}
              className={`transition-colors ${
                speaking.self ? "text-green-500" : "text-[var(--quaternary-text)]"
              }`}
            />
          )}
        </div>
        <div className="leading-tight">
          <div className="flex items-center gap-1.5 text-sm font-semibold">
            <span
              className={`w-2 h-2 rounded-full ${
                connecting ? "bg-yellow-400" : "bg-green-500 animate-pulse"
              }`}
            />
            {connecting ? "Bağlanıyor..." : "Sesli Bağlı"}
          </div>
          {active ? (
            <button
              onClick={() => navigate(`/server/${active.serverId}`)}
              title="Sunucuya git"
              className="text-xs text-[var(--primary-text)] max-w-[160px] truncate hover:text-[var(--quaternary-text)] hover:underline transition-colors text-left"
            >
              {active.serverName} · {active.channelName}
            </button>
          ) : (
            <div className="text-xs text-[var(--primary-text)]" />
          )}
        </div>
      </div>

      {/* Katılımcı sayısı — tıklayınca liste. Paylaşım göstergesi. */}
      <div className="relative" ref={listWrapRef}>
        <button
          onClick={() => setShowList((v) => !v)}
          title="Katılımcılar"
          className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors ${
            showList
              ? "bg-[var(--tertiary-bg)] text-[var(--tertiary-text)]"
              : "text-[var(--primary-text)] hover:bg-[var(--secondary-bg)] hover:text-[var(--secondary-text)]"
          }`}
        >
          <Users size={14} />
          {total}
          {anyoneSharing && (
            <ScreenShare
              size={13}
              className="text-[var(--quaternary-text)] animate-pulse ml-0.5"
            />
          )}
        </button>
        {participantList}
      </div>

      {/* Kontroller */}
      <div className="flex items-center gap-2 ml-auto">
        {/* Ekran paylaş / durdur */}
        <button
          onClick={isScreenSharing ? stopScreenShare : startScreenShare}
          title={isScreenSharing ? "Paylaşımı durdur" : "Ekran paylaş"}
          disabled={!active}
          className={`p-2.5 rounded-xl border-2 transition-all disabled:opacity-40 ${
            isScreenSharing
              ? "bg-[var(--tertiary-bg)] border-[var(--tertiary-border)] text-[var(--tertiary-text)]"
              : "bg-[var(--secondary-bg)] border-[var(--primary-border)] text-[var(--secondary-text)] hover:border-[var(--tertiary-border)] hover:text-[var(--quaternary-text)]"
          }`}
        >
          {isScreenSharing ? <ScreenShareOff size={18} /> : <ScreenShare size={18} />}
        </button>

        {/* Kendi ekranını önizle/gizle (yalnızca paylaşırken ve uzak ekran izlemezken) */}
        {isScreenSharing && !isWatching && (
          <button
            onClick={toggleSelfPreview}
            title={showSelfPreview ? "Önizlemeyi gizle" : "Önizlemeyi göster"}
            className={`p-2.5 rounded-xl border-2 transition-all ${
              showSelfPreview
                ? "bg-[var(--secondary-bg)] border-[var(--tertiary-border)] text-[var(--quaternary-text)]"
                : "bg-[var(--secondary-bg)] border-[var(--primary-border)] text-[var(--secondary-text)] hover:border-[var(--tertiary-border)]"
            }`}
          >
            {showSelfPreview ? <Eye size={18} /> : <EyeOff size={18} />}
          </button>
        )}

        {/* İzlemeyi bırak (yalnızca izlerken) */}
        {isWatching && (
          <button
            onClick={stopWatching}
            title="İzlemeyi durdur"
            className="p-2.5 rounded-xl border-2 bg-[var(--secondary-bg)] border-[var(--primary-border)] text-[var(--secondary-text)] hover:border-red-500 hover:text-red-400 transition-all"
          >
            <MonitorX size={18} />
          </button>
        )}

        {/* Sustur/aç */}
        <button
          onClick={toggleMute}
          title={muted ? "Sesi aç" : "Sustur"}
          disabled={!active}
          className={`p-2.5 rounded-xl border-2 transition-all disabled:opacity-40 ${
            muted
              ? "bg-red-500/20 border-red-500 text-red-400"
              : "bg-[var(--secondary-bg)] border-[var(--primary-border)] text-[var(--secondary-text)] hover:border-[var(--tertiary-border)] hover:text-[var(--quaternary-text)]"
          }`}
        >
          {muted ? <MicOff size={18} /> : <Mic size={18} />}
        </button>

        {/* Sesten ayrıl */}
        <button
          onClick={leaveVoice}
          title="Ayrıl"
          className="p-2.5 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors"
        >
          <PhoneOff size={18} />
        </button>
      </div>
    </div>
  );

  // Kontrol satırı (docked/sidebar sürümü)
  const dockedControls = (
    <div className="flex flex-col gap-2 w-full px-2 py-2 bg-[var(--primary-bg)] border-t border-[var(--primary-border)]">
      {/* Üst Satır: Durum ve Grip */}
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`w-7 h-7 rounded-full bg-[var(--secondary-bg)] border flex items-center justify-center shrink-0 transition-colors ${
              speaking.self ? "border-green-500" : "border-gray-500"
            }`}
          >
            {connecting ? (
              <Loader2 size={14} className="animate-spin text-[var(--quaternary-text)]" />
            ) : (
              <Volume2
                size={14}
                className={`transition-colors ${
                  speaking.self ? "text-green-500" : "text-[var(--quaternary-text)]"
                }`}
              />
            )}
          </div>
          <div className="leading-none min-w-0">
            <div className="flex items-center gap-1 text-xs font-semibold">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  connecting ? "bg-yellow-400" : "bg-green-500 animate-pulse"
                }`}
              />
              <span className="truncate">{connecting ? "Bağlanıyor..." : "Sesli Bağlı"}</span>
            </div>
            {active && (
              <div className="text-[10px] text-[var(--primary-text)] truncate max-w-[120px] mt-0.5">
                {active.channelName}
              </div>
            )}
          </div>
        </div>

        {/* Grip ve Katılımcılar */}
        <div className="flex items-center gap-1.5">
          <div ref={listWrapRef} className="relative">
            <button
              onClick={() => setShowList((v) => !v)}
              title="Katılımcılar"
              className={`flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-md transition-colors ${
                showList
                  ? "bg-[var(--tertiary-bg)] text-[var(--tertiary-text)]"
                  : "text-[var(--primary-text)] hover:bg-[var(--secondary-bg)]"
              }`}
            >
              <Users size={12} />
              {total}
            </button>
            {participantList}
          </div>
          {gripHandle}
        </div>
      </div>

      {/* Alt Satır: İşlem Butonları */}
      <div className="flex items-center justify-between gap-1 mt-1">
        {/* Ekran Paylaşımı */}
        <button
          onClick={isScreenSharing ? stopScreenShare : startScreenShare}
          title={isScreenSharing ? "Paylaşımı durdur" : "Ekran paylaş"}
          disabled={!active}
          className={`flex-1 flex items-center justify-center p-1.5 rounded-lg border transition-all disabled:opacity-40 text-xs gap-1 ${
            isScreenSharing
              ? "bg-[var(--tertiary-bg)] border-[var(--tertiary-border)] text-[var(--tertiary-text)]"
              : "bg-[var(--secondary-bg)] border-[var(--primary-border)] text-[var(--secondary-text)] hover:border-[var(--tertiary-border)]"
          }`}
        >
          {isScreenSharing ? <ScreenShareOff size={14} /> : <ScreenShare size={14} />}
          <span className="text-[10px] font-semibold">Paylaş</span>
        </button>

        {/* Sustur/Aç */}
        <button
          onClick={toggleMute}
          title={muted ? "Sesi aç" : "Sustur"}
          disabled={!active}
          className={`flex-1 flex items-center justify-center p-1.5 rounded-lg border transition-all disabled:opacity-40 text-xs gap-1 ${
            muted
              ? "bg-red-500/20 border-red-500 text-red-400"
              : "bg-[var(--secondary-bg)] border-[var(--primary-border)] text-[var(--secondary-text)] hover:border-[var(--tertiary-border)]"
          }`}
        >
          {muted ? <MicOff size={14} /> : <Mic size={14} />}
          <span className="text-[10px] font-semibold">{muted ? "Aç" : "Sustur"}</span>
        </button>

        {/* Ayrıl */}
        <button
          onClick={leaveVoice}
          title="Ayrıl"
          className="flex-1 flex items-center justify-center p-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors text-xs gap-1"
        >
          <PhoneOff size={14} />
          <span className="text-[10px] font-semibold">Ayrıl</span>
        </button>
      </div>
    </div>
  );

  return (
    // Sürükleme sınırı = tüm ekran. pointer-events-none → sayfayı engellemez.
    <div
      ref={boundsRef}
      className={isDocked ? "fixed left-16 bottom-0 w-64 z-[99] pointer-events-auto" : "fixed inset-0 z-[100] flex items-end justify-center pb-4 pointer-events-none"}
    >
      <AnimatePresence>
        {show && (
          <motion.div
            drag
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={isDocked ? undefined : boundsRef}
            dragMomentum={false}
            dragElastic={0.05}
            style={{ x, y }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={isDocked
              ? "pointer-events-auto flex flex-col bg-[var(--primary-bg)] border-t border-[var(--primary-border)] text-[var(--secondary-text)] w-full"
              : "pointer-events-auto flex flex-col rounded-2xl bg-[var(--primary-bg)] border-2 border-[var(--primary-border)] shadow-2xl text-[var(--secondary-text)]"
            }
          >
            {/* Ekran alanı (izleme veya kendi önizleme) — sol üstten boyutlandırılabilir */}
            {isTheater && (
              <div
                className="relative bg-black rounded-t-2xl overflow-hidden border-b-2 border-[var(--primary-border)]"
                style={{ width: dims.w, height: dims.h }}
              >
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  // Kendi önizlemende sessiz (sistem sesini geri duyma);
                  // başkasını izlerken paylaşılan sesi duy.
                  muted={showingSelfPreview}
                  className="w-full h-full object-contain bg-black"
                />

                {/* Kaynak etiketi (üst orta) */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 px-2 py-1 rounded-lg bg-black/60 text-white text-xs flex items-center gap-1.5 pointer-events-none">
                  {showingSelfPreview ? (
                    <ScreenShare size={13} className="text-[var(--quaternary-text)]" />
                  ) : (
                    <MonitorPlay size={13} className="text-[var(--quaternary-text)]" />
                  )}
                  {theaterLabel}
                </div>

                {/* Sol üst boyutlandırma tutamacı */}
                <div
                  onPointerDown={onResizeStart}
                  title="Boyutlandır (sol üstten çek)"
                  className="absolute top-0 left-0 z-10 w-8 h-8 cursor-nwse-resize flex items-start justify-start p-1.5 group/resize"
                >
                  <div className="w-3.5 h-3.5 border-t-[3px] border-l-[3px] border-white/70 group-hover/resize:border-[var(--quaternary-text)] rounded-tl-sm transition-colors" />
                </div>
              </div>
            )}

            {/* Kontrol satırı */}
            <div className={isDocked ? "" : "p-3"}>
              {isDocked ? dockedControls : controls}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VoiceBar;
