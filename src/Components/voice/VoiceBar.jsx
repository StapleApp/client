import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import {
  Mic,
  MicOff,
  PhoneOff,
  Volume2,
  Loader2,
  Users,
  GripVertical,
  ScreenShare,
  ScreenShareOff,
  MonitorPlay,
  MonitorX,
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
    sharingSocketIds,
    watchingSocketId,
    remoteScreenStream,
    startScreenShare,
    stopScreenShare,
    watchScreen,
    stopWatching,
  } = useVoice();
  const { userData } = useAuth();
  const [showList, setShowList] = useState(false);
  const boundsRef = useRef(null);
  const videoRef = useRef(null);
  const dragControls = useDragControls();

  const show = active || connecting;
  const total = participants.length + 1;
  const anyoneSharing = isScreenSharing || sharingSocketIds.length > 0;
  const isWatching = !!remoteScreenStream;
  const watchingName =
    participants.find((p) => p.socketId === watchingSocketId)?.nickName || "";

  // İzlenen ekran akışını video öğesine bağla
  useEffect(() => {
    if (videoRef.current && remoteScreenStream) {
      videoRef.current.srcObject = remoteScreenStream;
    }
  }, [remoteScreenStream]);

  const startDrag = (e) => dragControls.start(e);

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
          className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-64
                     rounded-xl border-2 border-[var(--primary-border)]
                     bg-[var(--primary-bg)] shadow-2xl p-2"
        >
          <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--primary-text)] px-2 pb-1">
            Seste ({total})
          </p>

          {/* Kendin */}
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg">
            <img
              src={userData?.photoURL || "/1.png"}
              alt=""
              className={`w-8 h-8 rounded-full border-2 ${
                muted ? "border-red-500" : "border-[var(--tertiary-border)]"
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
            return (
              <div
                key={p.socketId}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
              >
                <img
                  src={p.photoURL || "/1.png"}
                  alt=""
                  className="w-8 h-8 rounded-full border-2 border-[var(--primary-border)]"
                />
                <span className="text-sm truncate flex-1">{p.nickName}</span>
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
        <div className="w-9 h-9 rounded-full bg-[var(--secondary-bg)] border-2 border-[var(--tertiary-border)] flex items-center justify-center shrink-0">
          {connecting ? (
            <Loader2 size={18} className="animate-spin text-[var(--quaternary-text)]" />
          ) : (
            <Volume2 size={18} className="text-[var(--quaternary-text)]" />
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
          <div className="text-xs text-[var(--primary-text)] max-w-[160px] truncate">
            {active ? `${active.serverName} · ${active.channelName}` : ""}
          </div>
        </div>
      </div>

      {/* Katılımcı sayısı — tıklayınca liste. Paylaşım göstergesi. */}
      <div className="relative">
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

  return (
    // Sürükleme sınırı = tüm ekran. pointer-events-none → sayfayı engellemez.
    <div
      ref={boundsRef}
      className="fixed inset-0 z-[100] flex items-end justify-center pb-4 pointer-events-none"
    >
      <AnimatePresence>
        {show && (
          <motion.div
            drag
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={boundsRef}
            dragMomentum={false}
            dragElastic={0.05}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-auto flex flex-col rounded-2xl
                       bg-[var(--primary-bg)] border-2 border-[var(--primary-border)]
                       shadow-2xl text-[var(--secondary-text)]"
          >
            {/* İzleme "sinema" alanı — boyutlandırılabilir */}
            {isWatching && (
              <div
                className="relative bg-black rounded-t-2xl overflow-hidden border-b-2 border-[var(--primary-border)]"
                style={{
                  resize: "both",
                  overflow: "hidden",
                  width: 560,
                  height: 315,
                  minWidth: 280,
                  minHeight: 160,
                  maxWidth: "88vw",
                  maxHeight: "78vh",
                }}
              >
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-contain bg-black"
                />
                <div className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-black/60 text-white text-xs flex items-center gap-1.5 pointer-events-none">
                  <MonitorPlay size={13} className="text-[var(--quaternary-text)]" />
                  {watchingName ? `${watchingName} · ekran paylaşımı` : "Ekran paylaşımı"}
                </div>
                <div className="absolute bottom-1 right-1 text-white/40 text-[9px] pointer-events-none select-none">
                  ↘ boyutlandır
                </div>
              </div>
            )}

            {/* Kontrol satırı */}
            <div className="p-3">{controls}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VoiceBar;
