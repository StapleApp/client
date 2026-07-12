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

  const localStreamRef = useRef(null); // ham mikrofon akışı (mute buradan)
  const outStreamRef = useRef(null); // peer'lara gönderilen işlenmiş akış
  const peersRef = useRef({}); // socketId -> { pc, nickName } (ses mesh'i)

  // WebAudio: uzak sesler gain node'undan geçer, seviyeleri analyser ölçer
  const audioCtxRef = useRef(null);
  const remoteNodesRef = useRef({}); // socketId -> { source, gain, analyser, buf }
  // Giden zincir: raw -> highpass -> gate -> dest; analyser highpass sonrası ölçer
  const localNodeRef = useRef(null); // { source, highpass, gate, dest, analyser, buf }
  const gateOpenRef = useRef(false); // gate'in son hedef durumu (gereksiz set'i önle)
  const levelTimerRef = useRef(null);
  const lastAboveRef = useRef({}); // id -> son eşik üstü zaman damgası
  const speakingRef = useRef({});
  const volumesRef = useRef(volumes);
  const audioDevicesRef = useRef(audioDevices);
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
      audioCtxRef.current = new Ctx();
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
      gain.connect(ctx.destination);
      remoteNodesRef.current[socketId] = { source, gain, analyser, buf };
    } catch (err) {
      // WebAudio kurulamazsa sesi tamamen kaybetme — öğeyi çalar hâle getir
      console.error("WebAudio graph error:", err);
      el.muted = false;
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

  // Giden ses işleme zinciri: ham mikrofon → highpass → noise gate → çıkış akışı.
  // Analyser highpass sonrasını ölçer (düşük frekans uğultusu RMS'i şişirmesin).
  const buildOutputChain = () => {
    try {
      const ctx = getAudioCtx();
      const source = ctx.createMediaStreamSource(localStreamRef.current);

      const highpass = ctx.createBiquadFilter();
      highpass.type = "highpass";
      highpass.frequency.value = HIGHPASS_HZ;

      const { analyser, buf } = makeAnalyser(ctx, highpass);

      const gate = ctx.createGain();
      gate.gain.value = 1; // gate mantığı VAD açıkken tickLevels'ta sürülür
      gateOpenRef.current = true;

      const dest = ctx.createMediaStreamDestination();

      source.connect(highpass);
      highpass.connect(gate);
      gate.connect(dest);

      localNodeRef.current = { source, highpass, gate, dest, analyser, buf };
      outStreamRef.current = dest.stream;
    } catch (err) {
      // Zincir kurulamazsa sesi kaybetme — peer'lara ham akış gider, gate/VAD yok
      console.error("Output chain error:", err);
      localNodeRef.current = null;
      outStreamRef.current = null;
    }
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

  const registerSocketHandlers = () => {
    socket.on("voice:peers", (peers) => {
      peers.forEach((p) => {
        createPeer(
          p.socketId,
          { userId: p.userId, nickName: p.nickName, muted: p.muted },
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

    socket.on("voice:offer", async ({ from, sdp, userId, nickName }) => {
      const existing = peersRef.current[from];
      const pc = existing
        ? existing.pc
        : createPeer(from, { userId, nickName }, false);
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
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
        } catch (err) {
          console.error("answer handling error:", err);
        }
      }
    });

    socket.on("voice:ice-candidate", async ({ from, candidate }) => {
      const entry = peersRef.current[from];
      if (entry && candidate) {
        try {
          await entry.pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error("addIceCandidate error:", err);
        }
      }
    });

    socket.on("voice:peer-left", ({ socketId }) => closePeer(socketId));

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

    // Seviye ölçümü + giden zincir teardown
    stopLevelLoop();
    if (localNodeRef.current) {
      const { source, highpass, gate, dest, analyser } = localNodeRef.current;
      [source, highpass, gate, dest, analyser].forEach((n) => {
        try {
          n.disconnect();
        } catch {
          /* zaten kopmuş */
        }
      });
      localNodeRef.current = null;
    }
    outStreamRef.current = null;
    gateOpenRef.current = false;

    // Ses mesh teardown
    socket.emit("voice:leave");
    Object.keys(peersRef.current).forEach(closePeer);
    peersRef.current = {};
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    unregisterSocketHandlers();

    // AudioContext'i kapat — her katılımda yenisi açılır (tarayıcı başına
    // eşzamanlı AudioContext sayısı sınırlı)
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => { });
      audioCtxRef.current = null;
    }

    setParticipants([]);
    setMuted(false);
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

    // Giden ses işleme zinciri kur (highpass + noise gate). Peer'lara ham mikrofon
    // yerine bu zincirin çıkışı gönderilir. Kurulamazsa outStream ham akışa düşer.
    buildOutputChain();
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
  };

  const leaveVoice = () => {
    cleanup();
    setActive(null);
  };

  const toggleMute = () => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      const nowMuted = !track.enabled;
      setMuted(nowMuted);
      // Diğer katılımcılara + presence izleyicilerine bildir
      socket.emit("voice:mute", { muted: nowMuted });
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

  return (
    <VoiceContext.Provider
      value={{
        active,
        connecting,
        muted,
        participants,
        joinVoice,
        leaveVoice,
        toggleMute,
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
