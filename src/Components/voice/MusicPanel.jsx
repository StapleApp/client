import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Music,
  Play,
  Pause,
  SkipForward,
  Plus,
  X,
  ChevronDown,
  Volume2,
  Video,
  VideoOff,
  ListMusic,
} from "lucide-react";
import toast from "react-hot-toast";
import { useMusic } from "../../context/MusicContext";
import { parseYouTubeId, youtubeThumb, formatTime } from "../../utils/youtube";

const MusicPanel = () => {
  const music = useMusic();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");

  // Yalnızca bir sesli kanala bağlıyken göster
  if (!music.isActive) return null;

  const { current, queue, playing, progress } = music;

  const handleAdd = () => {
    const id = parseYouTubeId(input);
    if (!id) {
      toast.error("Geçerli bir YouTube linki/kodu yapıştır");
      return;
    }
    music.enqueue(id);
    setInput("");
  };

  const title = current ? music.nowTitle || current.title || "YouTube videosu" : null;
  const duration = progress.duration || 0;
  const position = Math.min(progress.position || 0, duration || 0);

  return (
    <div className="fixed right-4 bottom-4 z-[98] pointer-events-auto">
      <AnimatePresence mode="wait">
        {!open ? (
          // Kapalı: küçük rozet buton
          <motion.button
            key="pill"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => setOpen(true)}
            title="Dinleme Partisi"
            className="relative flex items-center gap-2 pl-3 pr-4 py-2.5 rounded-full bg-[var(--primary-bg)] border-2 border-[var(--primary-border)] shadow-xl text-[var(--secondary-text)] hover:border-[var(--tertiary-border)] transition-colors"
          >
            <span className={`grid place-items-center w-6 h-6 rounded-full bg-[var(--tertiary-bg)] text-[var(--tertiary-text)] ${playing ? "animate-pulse" : ""}`}>
              <Music size={14} />
            </span>
            <span className="text-sm font-semibold max-w-[160px] truncate">
              {current ? title : "Dinleme Partisi"}
            </span>
            {queue.length > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-[var(--tertiary-bg)] text-[var(--tertiary-text)] text-[10px] font-bold">
                {queue.length}
              </span>
            )}
          </motion.button>
        ) : (
          // Açık: tam panel
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            className="w-[320px] max-w-[90vw] rounded-2xl bg-[var(--primary-bg)] border-2 border-[var(--primary-border)] shadow-2xl overflow-hidden"
          >
            {/* Başlık */}
            <div className="flex items-center justify-between px-3 py-2.5 border-b-2 border-[var(--primary-border)]">
              <div className="flex items-center gap-2 text-sm font-bold text-[var(--secondary-text)]">
                <Music size={15} className="text-[var(--tertiary-border)]" />
                Dinleme Partisi
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => music.setVideoOpen(!music.videoOpen)}
                  title={music.videoOpen ? "Videoyu gizle" : "Videoyu göster"}
                  className="p-1.5 rounded-lg text-[var(--primary-text)] hover:text-[var(--secondary-text)] hover:bg-[var(--secondary-bg)] transition-colors"
                >
                  {music.videoOpen ? <VideoOff size={15} /> : <Video size={15} />}
                </button>
                <button
                  onClick={() => setOpen(false)}
                  title="Küçült"
                  className="p-1.5 rounded-lg text-[var(--primary-text)] hover:text-[var(--secondary-text)] hover:bg-[var(--secondary-bg)] transition-colors"
                >
                  <ChevronDown size={16} />
                </button>
              </div>
            </div>

            {/* Şu an çalan */}
            <div className="p-3">
              {current ? (
                <div className="flex items-center gap-3">
                  <img
                    src={youtubeThumb(current.id)}
                    alt=""
                    className="w-14 h-14 rounded-lg object-cover bg-[var(--secondary-bg)] shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[var(--secondary-text)] truncate">
                      {title}
                    </p>
                    {current.addedBy && (
                      <p className="text-[11px] text-[var(--primary-text)] truncate">
                        {current.addedBy} ekledi
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-[var(--primary-text)] text-center py-3">
                  Sıra boş. Aşağıdan bir YouTube linki ekle.
                </p>
              )}

              {/* Autoplay engeli uyarısı */}
              {music.blocked && current && (
                <button
                  onClick={music.resume}
                  className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-[var(--tertiary-bg)] text-[var(--tertiary-text)] text-xs font-bold hover:bg-[var(--quaternary-bg)] transition-colors"
                >
                  <Play size={13} /> Sesi başlat
                </button>
              )}

              {/* İlerleme çubuğu */}
              {current && (
                <div className="mt-3">
                  <input
                    type="range"
                    min={0}
                    max={Math.max(duration, 1)}
                    step={1}
                    value={position}
                    onChange={(e) => music.seek(Number(e.target.value))}
                    className="w-full h-1 cursor-pointer"
                    style={{ accentColor: "var(--tertiary-bg)" }}
                  />
                  <div className="flex justify-between text-[10px] text-[var(--primary-text)] tabular-nums">
                    <span>{formatTime(position)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>
              )}

              {/* Kontroller */}
              <div className="mt-2 flex items-center gap-2">
                <button
                  onClick={() => (playing ? music.pause() : music.play())}
                  disabled={!current}
                  className="grid place-items-center w-10 h-10 rounded-full bg-[var(--tertiary-bg)] text-[var(--tertiary-text)] hover:bg-[var(--quaternary-bg)] disabled:opacity-40 transition-colors"
                  title={playing ? "Duraklat" : "Oynat"}
                >
                  {playing ? <Pause size={18} /> : <Play size={18} />}
                </button>
                <button
                  onClick={music.next}
                  disabled={!current}
                  className="grid place-items-center w-9 h-9 rounded-full bg-[var(--secondary-bg)] text-[var(--secondary-text)] hover:text-[var(--tertiary-text)] disabled:opacity-40 transition-colors"
                  title="Sıradaki"
                >
                  <SkipForward size={16} />
                </button>

                {/* Ses */}
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <Volume2 size={15} className="text-[var(--primary-text)] shrink-0" />
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={music.volume}
                    onChange={(e) => music.changeVolume(Number(e.target.value))}
                    className="flex-1 h-1 cursor-pointer"
                    style={{ accentColor: "var(--tertiary-bg)" }}
                    title="Ses (yalnızca sende)"
                  />
                </div>
              </div>
            </div>

            {/* Ekle */}
            <div className="px-3 pb-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                  placeholder="YouTube linki veya kodu…"
                  className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-[var(--secondary-bg)] text-[var(--secondary-text)] border border-[var(--primary-border)] focus:outline-none focus:border-[var(--tertiary-border)] placeholder:text-[var(--primary-text)] text-sm transition-colors"
                />
                <button
                  onClick={handleAdd}
                  className="grid place-items-center w-9 h-9 rounded-lg bg-[var(--tertiary-bg)] text-[var(--tertiary-text)] hover:bg-[var(--quaternary-bg)] transition-colors shrink-0"
                  title="Kuyruğa ekle"
                >
                  <Plus size={17} />
                </button>
              </div>
            </div>

            {/* Kuyruk */}
            {queue.length > 0 && (
              <div className="border-t border-[var(--primary-border)]">
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-[var(--primary-text)]">
                    <ListMusic size={13} /> Sırada ({queue.length})
                  </span>
                  <button
                    onClick={music.clear}
                    className="text-[11px] font-semibold text-[var(--primary-text)] hover:text-red-400 transition-colors"
                  >
                    Temizle
                  </button>
                </div>
                <div className="max-h-44 overflow-y-auto custom-scrollbar px-2 pb-2 flex flex-col gap-1">
                  {queue.map((item, i) => (
                    <div
                      key={`${item.id}-${i}`}
                      className="group flex items-center gap-2 p-1.5 rounded-lg hover:bg-[var(--secondary-bg)] transition-colors"
                    >
                      <img
                        src={youtubeThumb(item.id)}
                        alt=""
                        className="w-9 h-9 rounded object-cover bg-[var(--secondary-bg)] shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-[var(--secondary-text)] truncate">
                          {item.title || "YouTube videosu"}
                        </p>
                        {item.addedBy && (
                          <p className="text-[10px] text-[var(--primary-text)] truncate">
                            {item.addedBy}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => music.removeAt(i)}
                        className="p-1 rounded text-[var(--primary-text)] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                        title="Kaldır"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MusicPanel;
