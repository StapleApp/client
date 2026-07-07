import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, PhoneOff, Volume2, Loader2, Users, GripVertical } from "lucide-react";
import { useVoice } from "../../context/VoiceContext";
import { useAuth } from "../../context/AuthContext";

const VoiceBar = () => {
  const { active, connecting, muted, participants, toggleMute, leaveVoice } = useVoice();
  const { userData } = useAuth();
  const [showList, setShowList] = useState(false);
  const boundsRef = useRef(null);

  const show = active || connecting;
  const total = participants.length + 1;

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
            dragConstraints={boundsRef}
            dragMomentum={false}
            dragElastic={0.06}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-auto flex items-center gap-3 pl-2 pr-5 py-3 rounded-2xl
                       bg-[var(--primary-bg)] border-2 border-[var(--primary-border)]
                       shadow-2xl text-[var(--secondary-text)]"
          >
            {/* Sürükleme tutamacı */}
            <div className="cursor-grab active:cursor-grabbing text-[var(--primary-text)] hover:text-[var(--secondary-text)] px-0.5">
              <GripVertical size={18} />
            </div>

            {/* Durum + kanal bilgisi */}
            <div className="flex items-center gap-3 pr-3 border-r border-[var(--primary-border)]">
              <div className="w-9 h-9 rounded-full bg-[var(--secondary-bg)] border-2 border-[var(--tertiary-border)] flex items-center justify-center">
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
                <div className="text-xs text-[var(--primary-text)] max-w-[180px] truncate">
                  {active ? `${active.serverName} · ${active.channelName}` : ""}
                </div>
              </div>
            </div>

            {/* Katılımcı sayısı — tıklayınca liste */}
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
              </button>

              <AnimatePresence>
                {showList && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-56
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
                      <span className="text-sm truncate">
                        {userData?.nickName || "Sen"}{" "}
                        <span className="text-[var(--primary-text)] text-xs">(sen)</span>
                      </span>
                      {muted && <MicOff size={13} className="ml-auto text-red-400" />}
                    </div>

                    {/* Uzak katılımcılar */}
                    {participants.map((p) => (
                      <div
                        key={p.socketId}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
                      >
                        <img
                          src={p.photoURL || "/1.png"}
                          alt=""
                          className="w-8 h-8 rounded-full border-2 border-[var(--primary-border)]"
                        />
                        <span className="text-sm truncate">{p.nickName}</span>
                      </div>
                    ))}

                    {participants.length === 0 && (
                      <p className="text-xs text-[var(--primary-text)] px-2 py-1">
                        Kanalda tek başınasın.
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Kontroller */}
            <div className="flex items-center gap-2">
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
              <button
                onClick={leaveVoice}
                title="Ayrıl"
                className="p-2.5 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                <PhoneOff size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VoiceBar;
