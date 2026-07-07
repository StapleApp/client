import { createContext, useContext, useRef, useState } from "react";
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

  const localStreamRef = useRef(null);
  const peersRef = useRef({}); // socketId -> { pc, nickName }

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
    refreshParticipants();
  };

  const registerSocketHandlers = () => {
    socket.on("voice:peers", (peers) => {
      peers.forEach((p) =>
        createPeer(p.socketId, { userId: p.userId, nickName: p.nickName }, true)
      );
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
  };

  const unregisterSocketHandlers = () => {
    [
      "voice:peers",
      "voice:peer-joined",
      "voice:offer",
      "voice:answer",
      "voice:ice-candidate",
      "voice:peer-left",
    ].forEach((ev) => socket.off(ev));
  };

  const cleanup = () => {
    socket.emit("voice:leave");
    Object.keys(peersRef.current).forEach(closePeer);
    peersRef.current = {};
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    unregisterSocketHandlers();
    setParticipants([]);
    setMuted(false);
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

  return (
    <VoiceContext.Provider
      value={{ active, connecting, muted, participants, joinVoice, leaveVoice, toggleMute }}
    >
      {children}
    </VoiceContext.Provider>
  );
};

export const useVoice = () => useContext(VoiceContext);
