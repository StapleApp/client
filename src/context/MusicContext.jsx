import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { socket } from "../config/socket";
import { useVoice } from "./VoiceContext";

// Senkron YouTube dinleme partisi — SOCKET/STATE katmanı.
// Player'ın kendisi ve tüm UI (kontroller + video penceresi) MusicPanel'de yaşar;
// böylece panel yalnızca sesli kanaldayken (isActive) mount olur → sesten çıkınca
// player ve video birlikte yok olur (arka planda açık kalma hatası olmaz).
const MusicContext = createContext(null);

const EMPTY = { current: null, queue: [], playing: false, positionSec: 0, receivedAt: 0 };

export const MusicProvider = ({ children }) => {
  const { active } = useVoice();
  const isActive = !!active;
  const [state, setState] = useState(EMPTY);

  // Dock durumu — VoiceBar'ın isDetached mantığının birebir aynısı. Varsayılan
  // dock (detached=false) → sesli kanaldayken SvSidebar'a gömülü görünür.
  const [detached, setDetached] = useState(false);
  const [dragOverSidebar, setDragOverSidebar] = useState(false);

  // Sunucudan otoriter durum
  useEffect(() => {
    const onState = (p) =>
      setState({
        current: p?.current || null,
        queue: p?.queue || [],
        playing: !!p?.playing,
        positionSec: p?.positionSec || 0,
        receivedAt: Date.now(),
      });
    socket.on("music:state", onState);
    return () => socket.off("music:state", onState);
  }, []);

  // Kanala bağlanınca durumu iste; ayrılınca yereli sıfırla + dock'a dön
  useEffect(() => {
    if (isActive) {
      socket.emit("music:request");
    } else {
      setState(EMPTY);
      setDetached(false);
      setDragOverSidebar(false);
    }
  }, [isActive, active?.serverId, active?.channelId]);

  const actions = useMemo(
    () => ({
      enqueue: (id, title) => socket.emit("music:enqueue", { video: { id, title } }),
      play: () => socket.emit("music:control", { action: "play" }),
      pause: () => socket.emit("music:control", { action: "pause" }),
      next: () => socket.emit("music:control", { action: "next" }),
      seek: (sec) => socket.emit("music:control", { action: "seek", positionSec: sec }),
      clear: () => socket.emit("music:control", { action: "clear" }),
      removeAt: (index) => socket.emit("music:remove", { index }),
      emitEnded: (endedId) => socket.emit("music:ended", { endedId }),
      emitTitle: (id, title) => socket.emit("music:title", { id, title }),
    }),
    []
  );

  const value = useMemo(
    () => ({
      isActive,
      ...state,
      ...actions,
      detached,
      setDetached,
      dragOverSidebar,
      setDragOverSidebar,
    }),
    [isActive, state, actions, detached, dragOverSidebar]
  );

  return <MusicContext.Provider value={value}>{children}</MusicContext.Provider>;
};

export const useMusic = () => {
  const ctx = useContext(MusicContext);
  if (!ctx) throw new Error("useMusic must be used within MusicProvider");
  return ctx;
};
