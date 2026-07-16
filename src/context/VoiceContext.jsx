import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import toast from "react-hot-toast";
import { socket } from "../config/socket";
import { useAuth } from "./AuthContext";
import { getUser } from "../services/userService";
import { playJoinSound, playLeaveSound } from "../utils/voiceSounds";
// RNNoise (wasm + AudioWorklet) — derin öğrenme tabanlı gürültü bastırma.
// Vite ?url importları: dosyalar bundle'a asset olarak girer.
import { loadRnnoise, RnnoiseWorkletNode } from "@sapphi-red/web-noise-suppressor";
import rnnoiseWasmPath from "@sapphi-red/web-noise-suppressor/rnnoise.wasm?url";
import rnnoiseWasmSimdPath from "@sapphi-red/web-noise-suppressor/rnnoise_simd.wasm?url";
import rnnoiseWorkletPath from "@sapphi-red/web-noise-suppressor/rnnoiseWorklet.js?url";

const ICE = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:global.stun.twilio.com:3478" },
  ],
};

// ===== Konuşma algılama (VAD) ve kişi bazlı ses seviyesi ayarları =====
const VOL_KEY = "staple-voice-volumes";
const VAD_KEY = "staple-vad-settings";
const DEVICE_KEY = "staple-audio-devices"; // { input, output } deviceId'leri
const SPEAK_HANGOVER_MS = 300; // eşiğin altına inince bu kadar süre "konuşuyor" kalsın
const LEVEL_INTERVAL_MS = 50;

// Noise gate zaman sabitleri (setTargetAtTime tau). Attack hızlı ki kelime başı
// kesilmesin; release yavaş ki kelime araları "tık"lamasın.
const GATE_ATTACK_TAU = 0.02;
const GATE_RELEASE_TAU = 0.2;
const HIGHPASS_HZ = 120; // İnsan sesini korurken klavye/masa titreşim uğultularını kesmek için 85Hz -> 120Hz'e yükseltildi

// Agresiflik (0-100) → RMS eşiği. Yüksek agresiflik = yüksek eşik = fısıltıyı,
// klavye sesini, arka plan uğultusunu "konuşma" saymaz.
//
// Alt sınır tipik bir mikrofonun gürültü tabanının hemen üstü: bunun altında
// halka sessizken de yanardı, yani 0-6 aralığı ölü bölgeydi. Artık 0 = "en
// hassas ama sessizlikte yanmaz".
const VAD_MIN_THRESHOLD = 0.0067;
const VAD_MAX_THRESHOLD = 0.08;
const DEFAULT_VAD_AGGRESSIVENESS = 12; // ≈ 0.0155, eski varsayılana denk

const thresholdFromAggressiveness = (a) =>
  VAD_MIN_THRESHOLD + (Math.min(Math.max(a, 0), 100) / 100) * (VAD_MAX_THRESHOLD - VAD_MIN_THRESHOLD);

const loadVolumes = () => {
  try {
    return JSON.parse(localStorage.getItem(VOL_KEY)) || {};
  } catch {
    return {};
  }
};

const loadDevices = () => {
  try {
    const s = JSON.parse(localStorage.getItem(DEVICE_KEY));
    return { input: s?.input || "", output: s?.output || "" };
  } catch {
    return { input: "", output: "" };
  }
};

// Gürültü bastırma modu: "off" | "rnnoise" (hafif) | "dfn3" (DeepFilterNet3,
// yüksek kalite ama daha çok CPU + ~40ms gecikme). Varsayılan KAPALI.
// Eski kayıtlar boolean'dı → true'yu "rnnoise"a eşle (geriye dönük uyum).
const NS_KEY = "staple-noise-suppression";
const loadNoiseSuppression = () => {
  try {
    const v = JSON.parse(localStorage.getItem(NS_KEY));
    if (v === true) return "rnnoise";
    if (v === "rnnoise" || v === "dfn3") return v;
    return "off";
  } catch {
    return "off";
  }
};

// DeepFilterNet3 bastırma şiddeti (atten_lim, dB — 0..100). Yüksek = daha
// agresif gürültü bastırma (klavye vb. iyi eler ama konuşmayı da kesebilir);
// düşük = daha yumuşak (konuşma korunur, biraz gürültü kalır). Varsayılan 100.
const DFN3_LEVEL_KEY = "staple-dfn3-level";
const DFN3_LEVEL_DEFAULT = 100;
const clampLevel = (n) => Math.max(0, Math.min(100, Math.round(Number(n))));
const loadDfn3Level = () => {
  try {
    const v = JSON.parse(localStorage.getItem(DFN3_LEVEL_KEY));
    return Number.isFinite(v) ? clampLevel(v) : DFN3_LEVEL_DEFAULT;
  } catch {
    return DFN3_LEVEL_DEFAULT;
  }
};

// Wasm binary'si bir kez indirilir/derlenir, sonraki açmalarda cache'ten gelir
let rnnoiseWasmPromise = null;
const getRnnoiseWasm = () => {
  if (!rnnoiseWasmPromise) {
    rnnoiseWasmPromise = loadRnnoise({
      url: rnnoiseWasmPath,
      simdUrl: rnnoiseWasmSimdPath,
    }).catch((e) => {
      rnnoiseWasmPromise = null; // sonraki denemede yeniden yükle
      throw e;
    });
  }
  return rnnoiseWasmPromise;
};

// DeepFilterNet3 modülü LAZY yüklenir (dinamik import) — ağır (wasm + model);
// ana bundle'a girmez, yalnızca kullanıcı bu modu seçince indirilir.
let dfn3ModulePromise = null;
const getDfn3Module = () => {
  if (!dfn3ModulePromise) {
    dfn3ModulePromise = import("deepfilternet3-noise-filter").catch((e) => {
      dfn3ModulePromise = null; // sonraki denemede yeniden yükle
      throw e;
    });
  }
  return dfn3ModulePromise;
};

const loadVadSettings = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(VAD_KEY));
    return {
      enabled: saved?.enabled ?? true,
      aggressiveness: saved?.aggressiveness ?? DEFAULT_VAD_AGGRESSIVENESS,
    };
  } catch {
    return { enabled: true, aggressiveness: DEFAULT_VAD_AGGRESSIVENESS };
  }
};

// getByteTimeDomainData çıktısından RMS (0..1)
const rmsOf = (analyser, buf) => {
  analyser.getByteTimeDomainData(buf);
  let sum = 0;
  for (let i = 0; i < buf.length; i++) {
    const x = (buf[i] - 128) / 128;
    sum += x * x;
  }
  return Math.sqrt(sum / buf.length);
};

const VoiceContext = createContext();

export const VoiceProvider = ({ children }) => {
  const { userData } = useAuth();

  // active: { serverId, channelId, channelName, serverName } | null
  const [active, setActive] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [muted, setMuted] = useState(false);
  const [deafened, setDeafened] = useState(false); // sağırlaştırma (kimseyi duyma)
  const [participants, setParticipants] = useState([]); // uzak katılımcılar
  const [isDetached, setIsDetached] = useState(false);
  const [isTheaterExpanded, setIsTheaterExpanded] = useState(true);
  const [isDragOverSidebar, setIsDragOverSidebar] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);

  // Sesli kanal doluluğu: sunucudaki tüm sesli kanallar için { channelId: [users] }
  // (kanala girmeden kimin içeride olduğunu göstermek için)
  const [voiceState, setVoiceState] = useState({});
  const [voiceAvatars, setVoiceAvatars] = useState({}); // userId -> photoURL
  const watchedServerRef = useRef(null);
  const avatarReqRef = useRef(new Set()); // aynı kullanıcıyı iki kez istemeyelim

  // Ekran paylaşımı durumu
  const [isScreenSharing, setIsScreenSharing] = useState(false); // ben mi paylaşıyorum
  const [localScreenStream, setLocalScreenStream] = useState(null); // kendi paylaştığım akış (önizleme)
  const [showSelfPreview, setShowSelfPreview] = useState(true); // kendi ekranımı önizle
  const [sharingSocketIds, setSharingSocketIds] = useState([]); // paylaşan uzak peer'lar
  const [watchingSocketId, setWatchingSocketId] = useState(null); // izlediğim kişi
  const [remoteScreenStream, setRemoteScreenStream] = useState(null); // izlenen ekran akışı

  // Konuşma algılama: socketId (veya "self") -> bool
  const [speaking, setSpeaking] = useState({});
  // VAD ayarları: { enabled, aggressiveness 0-100 }
  const [vad, setVad] = useState(loadVadSettings);
  // Kişi bazlı ses seviyesi: userId -> 0..2 (1 = normal, >1 = boost)
  const [volumes, setVolumes] = useState(loadVolumes);
  // Seçili ses cihazları: { input, output } deviceId ("" = sistem varsayılanı)
  const [audioDevices, setAudioDevices] = useState(loadDevices);
  // RNNoise gürültü bastırma (default kapalı; gecikme eklediği için opsiyonel)
  const [noiseSuppression, setNoiseSuppressionState] = useState(loadNoiseSuppression);
  // DeepFilterNet3 bastırma şiddeti (0..100) — canlı ayarlanabilir
  const [dfn3Level, setDfn3LevelState] = useState(loadDfn3Level);

  const localStreamRef = useRef(null); // ham mikrofon akışı (mute buradan)
  const outStreamRef = useRef(null); // peer'lara gönderilen işlenmiş akış
  const peersRef = useRef({}); // socketId -> { pc, nickName } (ses mesh'i)

  // WebAudio: uzak sesler gain node'undan geçer, seviyeleri analyser ölçer
  const audioCtxRef = useRef(null);
  const masterGainRef = useRef(null); // tüm uzak sesler buradan geçer (deafen=0)
  const deafenedRef = useRef(false);
  const wasMutedBeforeDeafenRef = useRef(false); // undeafen'de eski mute'a dön
  const remoteNodesRef = useRef({}); // socketId -> { source, gain, analyser, buf }
  // remoteDescription set edilmeden gelen ICE adaylarını peer başına tamponla;
  // set edilince flushPendingIce ile boşalt. (Kaybolan aday = bazıları duyamaz.)
  const pendingIceRef = useRef({}); // socketId -> [candidate]
  // Giden zincir: raw -> highpass -> gate -> dest; analyser highpass sonrası ölçer
  const localNodeRef = useRef(null); // { source, highpass, gate, dest, analyser, buf }
  const gateOpenRef = useRef(false); // gate'in son hedef durumu (gereksiz set'i önle)
  const levelTimerRef = useRef(null);
  const lastAboveRef = useRef({}); // id -> son eşik üstü zaman damgası
  const speakingRef = useRef({});
  const volumesRef = useRef(volumes);
  const audioDevicesRef = useRef(audioDevices);
  const noiseSuppressionRef = useRef(noiseSuppression);
  const dfn3LevelRef = useRef(dfn3Level);
  const nsProcRef = useRef(null); // aktif DFN3 core (canlı seviye değişimi için)
  const mutedRef = useRef(false);
  const vadRef = useRef(vad);
  const activeRef = useRef(null); // beforeunload handler'ı güncel active'i görsün

  // Ekran paylaşımı ref'leri (ses mesh'inden ayrı)
  const screenStreamRef = useRef(null); // benim paylaştığım ekran akışı
  const sharePeersRef = useRef({}); // izleyiciSocketId -> pc (ben paylaşırken)
  const watchPeerRef = useRef(null); // paylaşana giden tek pc (ben izlerken)
  const watchingRef = useRef(null); // watchingSocketId'nin ref kopyası (handler'lar için)

  const refreshParticipants = () => {
    setParticipants(
      Object.entries(peersRef.current).map(([socketId, p]) => ({
        socketId,
        userId: p.userId,
        nickName: p.nickName || "Bilinmeyen",
        photoURL: p.photoURL || "/defaults/avatars/1.png",
        muted: !!p.muted,
        deafened: !!p.deafened,
      }))
    );
  };

  // Presence dinleyicisi — voice mesh handler'larından bağımsız, uygulama boyunca açık.
  // (cleanup() içindeki unregisterSocketHandlers bu olayı kapatmaz.)
  useEffect(() => {
    const onState = ({ serverId, state }) => {
      if (watchedServerRef.current !== serverId) return;
      setVoiceState(state);

      // Eksik avatarları çek
      const missing = new Set();
      Object.values(state).forEach((users) =>
        users.forEach((u) => {
          if (u.userId && !avatarReqRef.current.has(u.userId)) missing.add(u.userId);
        })
      );
      missing.forEach((userId) => {
        avatarReqRef.current.add(userId);
        getUser(userId)
          .then((u) => {
            if (u?.photoURL) {
              setVoiceAvatars((prev) => ({ ...prev, [userId]: u.photoURL }));
            }
          })
          .catch(() => avatarReqRef.current.delete(userId));
      });
    };

    // Yeniden bağlanınca izlemeyi tazele
    const onConnect = () => {
      if (watchedServerRef.current) {
        socket.emit("voice:watch", { serverId: watchedServerRef.current });
      }
    };

    // Sayfa kapanır/yenilenirken ses odasından temiz çık. socket.io'nun
    // ping-timeout'u (~60s) dolana kadar zombie kalmasın — diğer kullanıcılar
    // bizi anında listeden düşürsün.
    const onBeforeUnload = () => {
      if (activeRef.current) socket.emit("voice:leave");
    };
    window.addEventListener("pagehide", onBeforeUnload);
    window.addEventListener("beforeunload", onBeforeUnload);

    socket.on("voice:state", onState);
    socket.on("connect", onConnect);
    return () => {
      window.removeEventListener("pagehide", onBeforeUnload);
      window.removeEventListener("beforeunload", onBeforeUnload);
      socket.off("voice:state", onState);
      socket.off("connect", onConnect);
    };
  }, []);

  // Bir sunucunun sesli kanal doluluğunu izle (serverId = null → izlemeyi bırak)
  const watchServerVoice = useCallback((serverId) => {
    const prev = watchedServerRef.current;
    if (prev === (serverId || null)) return;
    if (prev) socket.emit("voice:unwatch", { serverId: prev });

    watchedServerRef.current = serverId || null;
    setVoiceState({});
    if (!serverId) return;

    if (!socket.connected) socket.connect();
    socket.emit("voice:watch", { serverId });
  }, []);

  useEffect(() => {
    volumesRef.current = volumes;
  }, [volumes]);
  useEffect(() => {
    audioDevicesRef.current = audioDevices;
  }, [audioDevices]);
  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);
  useEffect(() => {
    activeRef.current = active;
  }, [active]);
  useEffect(() => {
    vadRef.current = vad;
    try {
      localStorage.setItem(VAD_KEY, JSON.stringify(vad));
    } catch {
      /* kota dolu / gizli mod */
    }
  }, [vad]);

  const setVadEnabled = (enabled) => setVad((prev) => ({ ...prev, enabled }));
  const setVadAggressiveness = (aggressiveness) =>
    setVad((prev) => ({
      ...prev,
      aggressiveness: Math.min(Math.max(aggressiveness, 0), 100),
    }));

  // Seçili çıkış (hoparlör/kulaklık) cihazını uygula. Uzak sesler WebAudio
  // ctx.destination'a gittiğinden asıl yönlendirme AudioContext.setSinkId ile
  // olur; WebAudio kurulamamış (el.muted=false) ögeler için el.setSinkId fallback.
  const applyOutputSink = async (deviceId) => {
    const ctx = audioCtxRef.current;
    try {
      if (ctx && typeof ctx.setSinkId === "function") {
        await ctx.setSinkId(deviceId || "");
      }
    } catch (e) {
      console.warn("AudioContext.setSinkId başarısız:", e);
    }
    document.querySelectorAll('audio[id^="voice-audio-"]').forEach((el) => {
      if (typeof el.setSinkId === "function") {
        el.setSinkId(deviceId || "").catch(() => { });
      }
    });
  };

  const setAudioInputDevice = (deviceId) => {
    setAudioDevices((prev) => {
      const next = { ...prev, input: deviceId || "" };
      try {
        localStorage.setItem(DEVICE_KEY, JSON.stringify(next));
      } catch {
        /* kota dolu / gizli mod */
      }
      return next;
    });
    // Giriş değişikliği bir sonraki katılımda (getUserMedia) geçerli olur.
  };

  const setAudioOutputDevice = (deviceId) => {
    setAudioDevices((prev) => {
      const next = { ...prev, output: deviceId || "" };
      try {
        localStorage.setItem(DEVICE_KEY, JSON.stringify(next));
      } catch {
        /* kota dolu / gizli mod */
      }
      return next;
    });
    applyOutputSink(deviceId || ""); // çıkışı anında uygula
  };

  const getAudioCtx = () => {
    if (!audioCtxRef.current) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      // 48kHz sabit: DeepFilterNet3 bunu şart koşar; RNNoise de 48k bekler.
      // Donanım farklıysa tarayıcı giriş/çıkışı kendisi yeniden örnekler.
      audioCtxRef.current = new Ctx({ sampleRate: 48000 });
      // Tüm uzak sesler master gain'den geçer → sağırlaştırma tek noktadan 0'lanır
      const mg = audioCtxRef.current.createGain();
      mg.gain.value = deafenedRef.current ? 0 : 1;
      mg.connect(audioCtxRef.current.destination);
      masterGainRef.current = mg;
      // Seçili çıkış cihazını yeni context'e uygula
      if (audioDevicesRef.current.output) {
        applyOutputSink(audioDevicesRef.current.output);
      }
    }
    // Otomatik oynatma politikası: kullanıcı hareketiyle (kanala tıklama) açılır
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume().catch(() => { });
    }
    return audioCtxRef.current;
  };

  const makeAnalyser = (ctx, source) => {
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    // Düşük yumuşatma → kelime başında halka daha çabuk yanar
    analyser.smoothingTimeConstant = 0.15;
    source.connect(analyser);
    return { analyser, buf: new Uint8Array(analyser.fftSize) };
  };

  const volumeFor = (userId) => {
    const v = volumesRef.current[userId];
    return typeof v === "number" ? v : 1;
  };

  const attachRemoteAudio = (socketId, stream) => {
    // Chrome, akış bir <audio> öğesine bağlı değilse MediaStreamAudioSourceNode'u
    // sessiz bırakıyor. Öğeyi tutuyoruz ama muted — ses WebAudio'dan çıkıyor,
    // yoksa çift duyulurdu.
    let el = document.getElementById(`voice-audio-${socketId}`);
    if (!el) {
      el = document.createElement("audio");
      el.id = `voice-audio-${socketId}`;
      el.autoplay = true;
      el.playsInline = true;
      el.muted = true;
      el.style.display = "none";
      document.body.appendChild(el);
    }
    el.srcObject = stream;

    // ontrack birden çok kez tetiklenebilir → grafiği bir kez kur
    if (remoteNodesRef.current[socketId]) return;

    try {
      const ctx = getAudioCtx();
      const source = ctx.createMediaStreamSource(stream);
      const { analyser, buf } = makeAnalyser(ctx, source);
      const gain = ctx.createGain();
      gain.gain.value = volumeFor(peersRef.current[socketId]?.userId);
      source.connect(gain);
      gain.connect(masterGainRef.current || ctx.destination);
      remoteNodesRef.current[socketId] = { source, gain, analyser, buf };
    } catch (err) {
      // WebAudio kurulamazsa sesi tamamen kaybetme — öğeyi çalar hâle getir.
      // Fallback olarak işaretle; sağırlaştırma bunları el.muted ile susturur.
      console.error("WebAudio graph error:", err);
      el.dataset.fallback = "1";
      el.muted = deafenedRef.current;
    }
  };

  const removeRemoteAudio = (socketId) => {
    const nodes = remoteNodesRef.current[socketId];
    if (nodes) {
      try {
        nodes.source.disconnect();
        nodes.gain.disconnect();
        nodes.analyser.disconnect();
      } catch {
        /* zaten kopmuş */
      }
      delete remoteNodesRef.current[socketId];
    }
    delete lastAboveRef.current[socketId];

    const el = document.getElementById(`voice-audio-${socketId}`);
    if (el) {
      el.srcObject = null;
      el.remove();
    }
  };

  // ===== Konuşma algılama döngüsü =====
  const tickLevels = () => {
    const now = Date.now();
    const next = {};

    // Kapalıyken alt sınır kullanılır: eleme yok, ama sessizlikte de yanmaz.
    const threshold = vadRef.current.enabled
      ? thresholdFromAggressiveness(vadRef.current.aggressiveness)
      : VAD_MIN_THRESHOLD;

    const evaluate = (id, rms, allowed) => {
      if (allowed && rms > threshold) lastAboveRef.current[id] = now;
      const last = lastAboveRef.current[id] || 0;
      if (allowed && now - last < SPEAK_HANGOVER_MS) next[id] = true;
    };

    const local = localNodeRef.current;
    if (local) {
      // Mikrofon kapalıyken konuşuyor gösterme
      evaluate("self", rmsOf(local.analyser, local.buf), !mutedRef.current);

      // Noise gate: VAD açıkken konuşmadığın anlarda giden sesi kıs. Eşiği ve
      // hangover'ı halkayla paylaşır → kaydırıcı ikisini birden sürer.
      if (local.gate) {
        const shouldOpen = vadRef.current.enabled ? !!next.self : true;
        if (shouldOpen !== gateOpenRef.current) {
          gateOpenRef.current = shouldOpen;
          const ctx = audioCtxRef.current;
          local.gate.gain.setTargetAtTime(
            shouldOpen ? 1 : 0,
            ctx ? ctx.currentTime : 0,
            shouldOpen ? GATE_ATTACK_TAU : GATE_RELEASE_TAU
          );
        }
      }
    }

    Object.entries(remoteNodesRef.current).forEach(([socketId, n]) => {
      evaluate(socketId, rmsOf(n.analyser, n.buf), true);
    });

    // 80ms'de bir setState etmeyelim — yalnızca küme değiştiyse
    const prev = speakingRef.current;
    const prevKeys = Object.keys(prev);
    const nextKeys = Object.keys(next);
    const changed =
      prevKeys.length !== nextKeys.length || nextKeys.some((k) => !prev[k]);
    if (changed) {
      speakingRef.current = next;
      setSpeaking(next);
    }
  };

  const startLevelLoop = () => {
    if (levelTimerRef.current) return;
    levelTimerRef.current = setInterval(tickLevels, LEVEL_INTERVAL_MS);
  };

  const stopLevelLoop = () => {
    if (levelTimerRef.current) {
      clearInterval(levelTimerRef.current);
      levelTimerRef.current = null;
    }
    lastAboveRef.current = {};
    speakingRef.current = {};
    setSpeaking({});
  };

  // ===== Kişi bazlı ses seviyesi =====
  const setUserVolume = (userId, value) => {
    if (!userId) return;
    const v = Math.min(Math.max(value, 0), 2);

    setVolumes((prev) => {
      const next = { ...prev, [userId]: v };
      try {
        localStorage.setItem(VOL_KEY, JSON.stringify(next));
      } catch {
        /* kota dolu / gizli mod */
      }
      return next;
    });

    // Aynı kullanıcının açık peer'larına anında uygula
    Object.entries(peersRef.current).forEach(([socketId, p]) => {
      if (p.userId !== userId) return;
      const nodes = remoteNodesRef.current[socketId];
      if (nodes) nodes.gain.gain.value = v;
    });
  };

  // Render sırasında okunur → ref değil, state'ten (ref bir render geriden gelir)
  const getUserVolume = (userId) =>
    typeof volumes[userId] === "number" ? volumes[userId] : 1;

  // Giden zinciri sök (mikrofon akışına dokunmadan) — cleanup ve
  // gürültü bastırma modu değişiminde kullanılır.
  const teardownOutputChain = () => {
    if (!localNodeRef.current) return;
    const { source, highpass, ns, nsProc, gate, dest, analyser } = localNodeRef.current;
    [source, highpass, ns, gate, dest, analyser].forEach((n) => {
      if (!n) return;
      try {
        n.disconnect();
      } catch {
        /* zaten kopmuş */
      }
    });
    try {
      ns?.destroy?.(); // RnnoiseWorkletNode kendi destroy'unu taşır
    } catch {
      /* worklet zaten kapalı */
    }
    try {
      nsProc?.destroy?.(); // DFN3 core (worker + wasm) temizliği
    } catch {
      /* zaten kapalı */
    }
    nsProcRef.current = null;
    localNodeRef.current = null;
    outStreamRef.current = null;
  };

  // Giden ses işleme zinciri: ham mikrofon → highpass → [RNNoise|DFN3] → noise gate → çıkış.
  // Analyser, bastırma varsa onun SONRASINI ölçer → VAD klavye sesine değil
  // bastırılmış (temiz) sinyale bakar.
  const buildOutputChain = async () => {
    try {
      const ctx = getAudioCtx();
      const source = ctx.createMediaStreamSource(localStreamRef.current);

      const highpass = ctx.createBiquadFilter();
      highpass.type = "highpass";
      highpass.frequency.value = HIGHPASS_HZ;

      // Gürültü bastırma (opsiyonel): seçilen model yüklenemezse zincir onsuz
      // kurulur. ns = zincire bağlanan worklet node; nsProc = DFN3 core
      // (destroy için ayrı tutulur — RNNoise'ta node'un kendisi destroy edilir).
      let ns = null;
      let nsProc = null;
      const mode = noiseSuppressionRef.current;
      if (mode === "rnnoise") {
        try {
          const wasmBinary = await getRnnoiseWasm();
          await ctx.audioWorklet.addModule(rnnoiseWorkletPath);
          ns = new RnnoiseWorkletNode(ctx, { wasmBinary, maxChannels: 1 });
        } catch (e) {
          console.error("RNNoise yüklenemedi, onsuz devam:", e);
          ns = null;
        }
      } else if (mode === "dfn3") {
        try {
          const { DeepFilterNet3Core } = await getDfn3Module();
          // wasm + model KENDİ origin'imizden servis edilir (public/dfn3/…):
          // paketin varsayılan CDN'i (cdn.mezon.ai) CORS başlığı göndermediği
          // için tarayıcıdan erişilemiyor. Aynı origin → CORS yok + normal
          // HTTP önbelleği (ilk indirmeden sonra diskten gelir).
          nsProc = new DeepFilterNet3Core({
            sampleRate: 48000,
            noiseReductionLevel: clampLevel(dfn3LevelRef.current),
            assetConfig: { cdnUrl: "/dfn3" },
          });
          await nsProc.initialize();
          ns = await nsProc.createAudioWorkletNode(ctx);
        } catch (e) {
          console.error("DeepFilterNet3 yüklenemedi, onsuz devam:", e);
          try { nsProc?.destroy?.(); } catch { /* yok say */ }
          ns = null;
          nsProc = null;
        }
      }

      const { analyser, buf } = makeAnalyser(ctx, ns || highpass);

      const gate = ctx.createGain();
      gate.gain.value = 1; // gate mantığı VAD açıkken tickLevels'ta sürülür
      gateOpenRef.current = true;

      const dest = ctx.createMediaStreamDestination();

      source.connect(highpass);
      let tail = highpass;
      if (ns) {
        highpass.connect(ns);
        tail = ns;
      }
      tail.connect(gate);
      gate.connect(dest);

      localNodeRef.current = { source, highpass, ns, nsProc, gate, dest, analyser, buf };
      nsProcRef.current = nsProc; // canlı seviye değişimi bunu kullanır
      outStreamRef.current = dest.stream;
    } catch (err) {
      // Zincir kurulamazsa sesi kaybetme — peer'lara ham akış gider, gate/VAD yok
      console.error("Output chain error:", err);
      localNodeRef.current = null;
      outStreamRef.current = null;
    }
  };

  // DeepFilterNet3 bastırma şiddetini değiştir (0..100). Kanaldaysak worklet'e
  // canlı iletilir (zincir yeniden kurulmaz → kesintisiz). Kalıcı saklanır.
  const setDfn3Level = (level) => {
    const next = clampLevel(level);
    dfn3LevelRef.current = next;
    setDfn3LevelState(next);
    try {
      localStorage.setItem(DFN3_LEVEL_KEY, JSON.stringify(next));
    } catch {
      /* kota dolu / gizli mod */
    }
    // Aktif DFN3 worklet'ine anında uygula (kanaldaysak ve dfn3 modundaysak)
    try {
      nsProcRef.current?.setSuppressionLevel?.(next);
    } catch {
      /* worklet henüz hazır değil */
    }
  };

  // Gürültü bastırma modunu değiştir ("off" | "rnnoise" | "dfn3").
  // Kanaldaysak zinciri yeniden kurup peer'lardaki ses track'ini yenisiyle
  // değiştirir (yeniden bağlanma gerekmez).
  const setNoiseSuppression = async (mode) => {
    const next = mode === "rnnoise" || mode === "dfn3" ? mode : "off";
    noiseSuppressionRef.current = next;
    setNoiseSuppressionState(next);
    try {
      localStorage.setItem(NS_KEY, JSON.stringify(next));
    } catch {
      /* kota dolu / gizli mod */
    }
    if (!localStreamRef.current) return; // kanalda değiliz → sonraki katılımda

    teardownOutputChain();
    await buildOutputChain();
    // Görünür geri bildirim: model gerçekten yüklendi mi? (DFN3'te ilk seferde
    // CDN'den wasm+model iner; hazır olunca toast, başarısızsa hata gösterilir.)
    if (next === "dfn3") {
      if (localNodeRef.current?.nsProc) {
        toast.success("DeepFilterNet3 hazır — gürültü bastırma etkin");
      } else {
        toast.error("DeepFilterNet3 yüklenemedi — internet bağlantısını kontrol et");
      }
    } else if (next === "rnnoise") {
      if (localNodeRef.current?.ns) {
        toast.success("RNNoise etkin");
      } else {
        toast.error("RNNoise yüklenemedi");
      }
    }
    const newTrack = outboundTracks()[0] || null;
    if (!newTrack) return;
    Object.values(peersRef.current).forEach(({ pc }) => {
      const sender = pc
        .getSenders?.()
        .find((s) => s.track?.kind === "audio" || !s.track);
      if (sender) sender.replaceTrack(newTrack).catch(() => {});
    });
  };

  // Peer'lara gönderilecek ses track'i (işlenmiş varsa o, yoksa ham)
  const outboundTracks = () =>
    (outStreamRef.current || localStreamRef.current)?.getAudioTracks() || [];

  const createPeer = (socketId, info, isInitiator) => {
    const pc = new RTCPeerConnection(ICE);
    const sendStream = outStreamRef.current || localStreamRef.current;
    outboundTracks().forEach((t) => pc.addTrack(t, sendStream));

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit("voice:ice-candidate", { to: socketId, candidate: e.candidate });
      }
    };
    pc.ontrack = (e) => attachRemoteAudio(socketId, e.streams[0]);

    peersRef.current[socketId] = {
      pc,
      userId: info.userId,
      nickName: info.nickName,
      photoURL: "/defaults/avatars/1.png",
      muted: !!info.muted,
      deafened: !!info.deafened,
    };
    refreshParticipants();

    // İsim + profil fotoğrafını Firestore'dan çek (en güncel hâli)
    if (info.userId) {
      getUser(info.userId)
        .then((u) => {
          const entry = peersRef.current[socketId];
          if (entry && u) {
            entry.nickName = u.nickName || info.nickName || "Bilinmeyen";
            entry.photoURL = u.photoURL || "/defaults/avatars/1.png";
            refreshParticipants();
          }
        })
        .catch(() => { });
    }

    if (isInitiator) {
      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .then(() =>
          socket.emit("voice:offer", { to: socketId, sdp: pc.localDescription })
        )
        .catch((err) => console.error("createOffer error:", err));
    }
    return pc;
  };

  // İzlemeyi kapat (paylaşan durdurunca / peer ayrılınca — sunucuya bildirim yok)
  const closeWatch = () => {
    if (watchPeerRef.current) {
      try {
        watchPeerRef.current.close();
      } catch {
        /* zaten kapalı */
      }
      watchPeerRef.current = null;
    }
    watchingRef.current = null;
    setWatchingSocketId(null);
    setRemoteScreenStream(null);
  };

  const closePeer = (socketId) => {
    const p = peersRef.current[socketId];
    if (p) {
      try {
        p.pc.close();
      } catch {
        /* zaten kapalı */
      }
      delete peersRef.current[socketId];
    }
    removeRemoteAudio(socketId);
    delete pendingIceRef.current[socketId];

    // Ekran paylaşımı temizliği: ayrılan peer paylaşıyorduysa / izleyiciydiyse
    setSharingSocketIds((prev) => prev.filter((id) => id !== socketId));
    if (watchingRef.current === socketId) closeWatch();
    const spc = sharePeersRef.current[socketId];
    if (spc) {
      try {
        spc.close();
      } catch {
        /* zaten kapalı */
      }
      delete sharePeersRef.current[socketId];
    }

    refreshParticipants();
  };

  // remoteDescription set edildikten sonra o peer için biriken adayları uygula.
  const flushPendingIce = async (socketId) => {
    const entry = peersRef.current[socketId];
    const pending = pendingIceRef.current[socketId];
    if (!entry || !pending || pending.length === 0) return;
    delete pendingIceRef.current[socketId];
    for (const candidate of pending) {
      try {
        await entry.pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error("flushPendingIce error:", err);
      }
    }
  };

  const registerSocketHandlers = () => {
    socket.on("voice:peers", (peers) => {
      peers.forEach((p) => {
        createPeer(
          p.socketId,
          { userId: p.userId, nickName: p.nickName, muted: p.muted, deafened: p.deafened },
          true
        );
        // Kanalda zaten paylaşım yapanları işaretle
        if (p.sharing) {
          setSharingSocketIds((prev) =>
            prev.includes(p.socketId) ? prev : [...prev, p.socketId]
          );
        }
      });
    });

    // Bir peer kendini susturdu/açtı → katılımcı listesindeki ikonu güncelle
    socket.on("voice:peer-mute", ({ socketId, muted }) => {
      const entry = peersRef.current[socketId];
      if (entry) {
        entry.muted = !!muted;
        refreshParticipants();
      }
    });

    // Bir peer kendini sağırlaştırdı/açtı → katılımcı listesindeki ikonu güncelle
    socket.on("voice:peer-deafen", ({ socketId, deafened: d }) => {
      const entry = peersRef.current[socketId];
      if (entry) {
        entry.deafened = !!d;
        refreshParticipants();
      }
    });

    socket.on("voice:offer", async ({ from, sdp, userId, nickName }) => {
      const existing = peersRef.current[from];
      const pc = existing
        ? existing.pc
        : createPeer(from, { userId, nickName }, false);
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        // remoteDescription hazır → tamponlanan adayları uygula
        await flushPendingIce(from);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("voice:answer", { to: from, sdp: pc.localDescription });
      } catch (err) {
        console.error("offer handling error:", err);
      }
    });

    socket.on("voice:answer", async ({ from, sdp }) => {
      const entry = peersRef.current[from];
      if (entry) {
        try {
          await entry.pc.setRemoteDescription(new RTCSessionDescription(sdp));
          // remoteDescription hazır → tamponlanan adayları uygula
          await flushPendingIce(from);
        } catch (err) {
          console.error("answer handling error:", err);
        }
      }
    });

    socket.on("voice:ice-candidate", async ({ from, candidate }) => {
      if (!candidate) return;
      const entry = peersRef.current[from];
      // Peer henüz yok ya da remoteDescription set edilmediyse → tamponla.
      // Aksi halde aday reddedilip DÜŞER ve o çift birbirini duyamayabilir.
      if (!entry || !entry.pc.remoteDescription || !entry.pc.remoteDescription.type) {
        (pendingIceRef.current[from] ||= []).push(candidate);
        return;
      }
      try {
        await entry.pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error("addIceCandidate error:", err);
      }
    });

    // Başka biri kanala katıldı → giriş bildirim sesi (Discord benzeri).
    // (Bağlantı offer üzerinden kurulur; burada yalnızca bildirim çalınır.)
    socket.on("voice:peer-joined", () => playJoinSound());

    socket.on("voice:peer-left", ({ socketId }) => {
      playLeaveSound();
      closePeer(socketId);
    });

    // ===== Ekran paylaşımı signaling =====
    socket.on("screen:started", ({ socketId }) => {
      setSharingSocketIds((prev) =>
        prev.includes(socketId) ? prev : [...prev, socketId]
      );
    });

    socket.on("screen:stopped", ({ socketId }) => {
      setSharingSocketIds((prev) => prev.filter((id) => id !== socketId));
      if (watchingRef.current === socketId) closeWatch();
    });

    // Ben paylaşıyorum: bir izleyici talep etti → ona ekran pc'si kur, offer gönder
    socket.on("screen:watch-request", async ({ from }) => {
      if (!screenStreamRef.current) return;
      const pc = new RTCPeerConnection(ICE);
      screenStreamRef.current
        .getTracks()
        .forEach((t) => pc.addTrack(t, screenStreamRef.current));
      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socket.emit("screen:ice-candidate", { to: from, candidate: e.candidate });
        }
      };
      sharePeersRef.current[from] = pc;
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("screen:offer", { to: from, sdp: pc.localDescription });
      } catch (err) {
        console.error("screen offer error:", err);
      }
    });

    // Ben paylaşıyorum: izleyici ayrıldı → onun pc'sini kapat
    socket.on("screen:unwatch-request", ({ from }) => {
      const pc = sharePeersRef.current[from];
      if (pc) {
        try {
          pc.close();
        } catch {
          /* zaten kapalı */
        }
        delete sharePeersRef.current[from];
      }
    });

    // Ben izliyorum: paylaşandan offer geldi → cevap ver, akışı al
    socket.on("screen:offer", async ({ from, sdp }) => {
      const pc = new RTCPeerConnection(ICE);
      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socket.emit("screen:ice-candidate", { to: from, candidate: e.candidate });
        }
      };
      pc.ontrack = (e) => setRemoteScreenStream(e.streams[0]);
      watchPeerRef.current = pc;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("screen:answer", { to: from, sdp: pc.localDescription });
      } catch (err) {
        console.error("screen offer handling error:", err);
      }
    });

    // Ben paylaşıyorum: izleyicinin cevabı geldi
    socket.on("screen:answer", async ({ from, sdp }) => {
      const pc = sharePeersRef.current[from];
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        } catch (err) {
          console.error("screen answer error:", err);
        }
      }
    });

    // ICE — hem paylaşan hem izleyen tarafı için doğru pc'ye yönlendir
    socket.on("screen:ice-candidate", async ({ from, candidate }) => {
      if (!candidate) return;
      if (watchPeerRef.current && from === watchingRef.current) {
        try {
          await watchPeerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error("screen ice (watch) error:", err);
        }
        return;
      }
      const pc = sharePeersRef.current[from];
      if (pc) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error("screen ice (share) error:", err);
        }
      }
    });
  };

  const unregisterSocketHandlers = () => {
    [
      "voice:peers",
      "voice:peer-joined",
      "voice:offer",
      "voice:answer",
      "voice:ice-candidate",
      "voice:peer-left",
      "voice:peer-mute",
      "voice:peer-deafen",
      "screen:started",
      "screen:stopped",
      "screen:watch-request",
      "screen:unwatch-request",
      "screen:offer",
      "screen:answer",
      "screen:ice-candidate",
    ].forEach((ev) => socket.off(ev));
  };

  const cleanup = () => {
    // Ekran paylaşımı teardown (paylaşıyorsam)
    if (screenStreamRef.current) {
      socket.emit("screen:stop");
      Object.values(sharePeersRef.current).forEach((pc) => {
        try {
          pc.close();
        } catch {
          /* zaten kapalı */
        }
      });
      sharePeersRef.current = {};
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    // İzleme teardown (izliyorsam)
    if (watchPeerRef.current) {
      try {
        watchPeerRef.current.close();
      } catch {
        /* zaten kapalı */
      }
      watchPeerRef.current = null;
    }
    watchingRef.current = null;

    // Seviye ölçümü + giden zincir teardown (RNNoise dahil)
    stopLevelLoop();
    teardownOutputChain();
    gateOpenRef.current = false;

    // Ses mesh teardown
    socket.emit("voice:leave");
    Object.keys(peersRef.current).forEach(closePeer);
    peersRef.current = {};
    pendingIceRef.current = {};
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    unregisterSocketHandlers();

    // AudioContext'i kapat — her katılımda yenisi açılır (tarayıcı başına
    // eşzamanlı AudioContext sayısı sınırlı)
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => { });
      audioCtxRef.current = null;
    }

    masterGainRef.current = null;
    setParticipants([]);
    setMuted(false);
    mutedRef.current = false;
    setDeafened(false);
    deafenedRef.current = false;
    wasMutedBeforeDeafenRef.current = false;
    setIsScreenSharing(false);
    setLocalScreenStream(null);
    setShowSelfPreview(true);
    setSharingSocketIds([]);
    setWatchingSocketId(null);
    setRemoteScreenStream(null);
  };

  const joinVoice = async ({ serverId, channelId, channelName, serverName }) => {
    // Aynı kanaldaysak bir şey yapma
    if (active && active.serverId === serverId && active.channelId === channelId) {
      return;
    }
    // Başka kanaldaysak önce oradan çık
    if (active) cleanup();

    setIsDetached(false);
    setIsTheaterExpanded(true);
    setConnecting(true);
    try {
      const inputId = audioDevicesRef.current.input;
      localStreamRef.current = await navigator.mediaDevices.getUserMedia({
        // Tarayıcının kendi işleme zinciri. Chrome bunları varsayılan açar ama
        // garanti değil; açıkça isteyerek Firefox/Safari'de de tutarlı olur.
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          // Seçili mikrofon (yoksa sistem varsayılanı)
          ...(inputId ? { deviceId: { exact: inputId } } : {}),
        },
        video: false,
      });
    } catch (e) {
      console.error("getUserMedia error:", e);
      setConnecting(false);
      toast.error("Mikrofona erişilemedi. Tarayıcı iznini kontrol et.");
      return;
    }

    // Giden ses işleme zinciri kur (highpass + opsiyonel RNNoise + noise gate).
    // Peer'lara ham mikrofon yerine bu zincirin çıkışı gönderilir.
    await buildOutputChain();
    startLevelLoop();

    registerSocketHandlers();
    if (!socket.connected) socket.connect();
    socket.emit("voice:join", {
      roomId: `${serverId}:${channelId}`,
      userId: userData?.userID,
      nickName: userData?.nickName || "Bilinmeyen",
    });

    setActive({ serverId, channelId, channelName, serverName });
    setMuted(false);
    setConnecting(false);
    playJoinSound(); // kendi giriş bildirimin
  };

  const leaveVoice = () => {
    playLeaveSound(); // kendi çıkış bildirimin
    cleanup();
    setActive(null);
  };

  const applyMute = (nowMuted) => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) track.enabled = !nowMuted;
    setMuted(nowMuted);
    mutedRef.current = nowMuted;
    // Diğer katılımcılara + presence izleyicilerine bildir
    socket.emit("voice:mute", { muted: nowMuted });
  };

  const applyDeafen = (next) => {
    setDeafened(next);
    deafenedRef.current = next;
    // Tüm uzak sesleri tek noktadan sustur/aç
    if (masterGainRef.current) {
      try { masterGainRef.current.gain.value = next ? 0 : 1; } catch { /* yok say */ }
    }
    // WebAudio kurulamamış (fallback) elemanları da sustur/aç
    document
      .querySelectorAll('audio[id^="voice-audio-"][data-fallback="1"]')
      .forEach((el) => { el.muted = next; });
    // Diğer katılımcılara + presence izleyicilerine bildir
    socket.emit("voice:deafen", { deafened: next });
  };

  const toggleMute = () => {
    const nowMuted = !mutedRef.current;
    applyMute(nowMuted);
    // Sağırken mikrofonu açarsan sağırlığı da kaldır (Discord mantığı)
    if (!nowMuted && deafenedRef.current) applyDeafen(false);
  };

  // Sağırlaştır: hiçbir uzak sesi duymazsın. Discord gibi mikrofonu da susturur;
  // kapatınca sağırlaştırmadan önceki mute durumuna döner.
  const toggleDeafen = () => {
    const next = !deafenedRef.current;
    if (next) {
      wasMutedBeforeDeafenRef.current = mutedRef.current;
      applyDeafen(true);
      if (!mutedRef.current) applyMute(true);
    } else {
      applyDeafen(false);
      if (!wasMutedBeforeDeafenRef.current && mutedRef.current) applyMute(false);
    }
  };

  // ===== Ekran paylaşımı aksiyonları =====
  const startScreenShare = async () => {
    if (!active || screenStreamRef.current) return;
    let stream;
    try {
      // audio: sistem/sekme sesini de yakala. Kullanıcı paylaşım seçicisinde
      // "sesi paylaş"ı işaretlerse ses track'i gelir; işaretlemezse yalnız video.
      // (Chrome sekme/ekran sesini destekler; Firefox/Safari sınırlı — track
      // gelmezse sorun olmaz.)
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
    } catch (e) {
      // Kullanıcı seçiciyi iptal etti
      console.error("getDisplayMedia error:", e);
      return;
    }
    screenStreamRef.current = stream;
    const track = stream.getVideoTracks()[0];
    // Tarayıcının kendi "Paylaşımı durdur" düğmesi (video track'i durunca)
    if (track) track.onended = () => stopScreenShare();
    setLocalScreenStream(stream);
    setShowSelfPreview(true); // paylaşınca kendi ekranını otomatik önizle
    setIsScreenSharing(true);
    socket.emit("screen:start");
  };

  const stopScreenShare = () => {
    socket.emit("screen:stop");
    Object.values(sharePeersRef.current).forEach((pc) => {
      try {
        pc.close();
      } catch {
        /* zaten kapalı */
      }
    });
    sharePeersRef.current = {};
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    setLocalScreenStream(null);
    setIsScreenSharing(false);
  };

  const toggleSelfPreview = () => setShowSelfPreview((v) => !v);

  const watchScreen = (sharerSocketId) => {
    if (watchingRef.current === sharerSocketId) return;
    if (watchingRef.current) stopWatching(); // başka birini izliyorsak bırak
    watchingRef.current = sharerSocketId;
    setWatchingSocketId(sharerSocketId);
    setRemoteScreenStream(null);
    socket.emit("screen:watch", { to: sharerSocketId });
  };

  const stopWatching = () => {
    const target = watchingRef.current;
    if (watchPeerRef.current) {
      try {
        watchPeerRef.current.close();
      } catch {
        /* zaten kapalı */
      }
      watchPeerRef.current = null;
    }
    if (target) socket.emit("screen:unwatch", { to: target });
    watchingRef.current = null;
    setWatchingSocketId(null);
    setRemoteScreenStream(null);
  };

  // ===== Klavye kısayolları (yalnız sesli kanaldayken) =====
  // Her render'da güncel aksiyonları ref'e yaz → keydown handler'ı [] deps ile
  // kurulsa bile eski closure'a takılmaz. Kısayollar:
  //   M = mikrofon aç/kapa, D = sağırlaştır, S = ekran paylaşımı,
  //   Shift+D = ekran izlemeyi bırak (biri izleniyorsa).
  const shortcutsRef = useRef({});
  shortcutsRef.current = {
    toggleMute,
    toggleDeafen,
    startScreenShare,
    stopScreenShare,
    stopWatching,
    isSharing: !!screenStreamRef.current,
    isWatching: !!watchingRef.current,
    active: activeRef.current,
  };

  useEffect(() => {
    const onKeyDown = (e) => {
      // Yazı yazarken tetikleme; tarayıcı kombinasyonlarına karışma.
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      const t = e.target;
      if (
        t &&
        (t.isContentEditable ||
          t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.tagName === "SELECT")
      )
        return;
      const s = shortcutsRef.current;
      if (!s.active) return; // sesli kanalda değilsek kısayol yok

      const key = e.key.toLowerCase();
      if (key === "m") {
        e.preventDefault();
        s.toggleMute();
      } else if (key === "d") {
        e.preventDefault();
        if (e.shiftKey) {
          if (s.isWatching) s.stopWatching();
        } else {
          s.toggleDeafen();
        }
      } else if (key === "s") {
        e.preventDefault();
        if (s.isSharing) s.stopScreenShare();
        else s.startScreenShare();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <VoiceContext.Provider
      value={{
        active,
        connecting,
        muted,
        deafened,
        participants,
        joinVoice,
        leaveVoice,
        toggleMute,
        toggleDeafen,
        isDetached,
        setIsDetached,
        isTheaterExpanded,
        setIsTheaterExpanded,
        isDragOverSidebar,
        setIsDragOverSidebar,
        showSidebar,
        setShowSidebar,
        // sesli kanal doluluğu
        voiceState,
        voiceAvatars,
        watchServerVoice,
        // konuşma algılama + kişi bazlı ses seviyesi
        speaking,
        vad,
        setVadEnabled,
        setVadAggressiveness,
        getUserVolume,
        setUserVolume,
        // ses cihazı seçimi
        audioDevices,
        setAudioInputDevice,
        setAudioOutputDevice,
        // RNNoise gürültü bastırma
        noiseSuppression,
        setNoiseSuppression,
        // DeepFilterNet3 bastırma şiddeti (0..100)
        dfn3Level,
        setDfn3Level,
        // ekran paylaşımı
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
      }}
    >
      {children}
    </VoiceContext.Provider>
  );
};

export const useVoice = () => useContext(VoiceContext);
