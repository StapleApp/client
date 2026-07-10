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

const VoiceContext = createContext();

export const VoiceProvider = ({ children }) => {
  const { userData } = useAuth();

  // active: { serverId, channelId, channelName, serverName } | null
  const [active, setActive] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [muted, setMuted] = useState(false);
  const [participants, setParticipants] = useState([]); // uzak katılımcılar

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

  const localStreamRef = useRef(null);
  const peersRef = useRef({}); // socketId -> { pc, nickName } (ses mesh'i)

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
        photoURL: p.photoURL || "/1.png",
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

    socket.on("voice:state", onState);
    socket.on("connect", onConnect);
    return () => {
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

  const attachRemoteAudio = (socketId, stream) => {
    let el = document.getElementById(`voice-audio-${socketId}`);
    if (!el) {
      el = document.createElement("audio");
      el.id = `voice-audio-${socketId}`;
      el.autoplay = true;
      el.playsInline = true;
      el.style.display = "none";
      document.body.appendChild(el);
    }
    el.srcObject = stream;
  };

  const removeRemoteAudio = (socketId) => {
    const el = document.getElementById(`voice-audio-${socketId}`);
    if (el) {
      el.srcObject = null;
      el.remove();
    }
  };

  const createPeer = (socketId, info, isInitiator) => {
    const pc = new RTCPeerConnection(ICE);
    localStreamRef.current
      ?.getTracks()
      .forEach((t) => pc.addTrack(t, localStreamRef.current));

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
      photoURL: "/1.png",
    };
    refreshParticipants();

    // İsim + profil fotoğrafını Firestore'dan çek (en güncel hâli)
    if (info.userId) {
      getUser(info.userId)
        .then((u) => {
          const entry = peersRef.current[socketId];
          if (entry && u) {
            entry.nickName = u.nickName || info.nickName || "Bilinmeyen";
            entry.photoURL = u.photoURL || "/1.png";
            refreshParticipants();
          }
        })
        .catch(() => {});
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
        createPeer(p.socketId, { userId: p.userId, nickName: p.nickName }, true);
        // Kanalda zaten paylaşım yapanları işaretle
        if (p.sharing) {
          setSharingSocketIds((prev) =>
            prev.includes(p.socketId) ? prev : [...prev, p.socketId]
          );
        }
      });
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

    // Ses mesh teardown
    socket.emit("voice:leave");
    Object.keys(peersRef.current).forEach(closePeer);
    peersRef.current = {};
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    unregisterSocketHandlers();

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

    setConnecting(true);
    try {
      localStreamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
    } catch (e) {
      console.error("getUserMedia error:", e);
      setConnecting(false);
      toast.error("Mikrofona erişilemedi. Tarayıcı iznini kontrol et.");
      return;
    }

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
      setMuted(!track.enabled);
    }
  };

  // ===== Ekran paylaşımı aksiyonları =====
  const startScreenShare = async () => {
    if (!active || screenStreamRef.current) return;
    let stream;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
    } catch (e) {
      // Kullanıcı seçiciyi iptal etti
      console.error("getDisplayMedia error:", e);
      return;
    }
    screenStreamRef.current = stream;
    const track = stream.getVideoTracks()[0];
    // Tarayıcının kendi "Paylaşımı durdur" düğmesi
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
        // sesli kanal doluluğu
        voiceState,
        voiceAvatars,
        watchServerVoice,
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
