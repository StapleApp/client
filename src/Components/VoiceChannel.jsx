import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, PhoneOff, Volume2, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { socket } from "../lib/socket";

const ICE = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:global.stun.twilio.com:3478" },
  ],
};

const VoiceChannel = ({ serverId, channel }) => {
  const { userData } = useAuth();
  const roomId = `${serverId}:${channel.id}`;

  const [joined, setJoined] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState(null);
  const [participants, setParticipants] = useState([]); // uzak katılımcılar

  const localStreamRef = useRef(null);
  const peersRef = useRef({}); // socketId -> { pc, nickName }
  const audioContainerRef = useRef(null);

  const refreshParticipants = () => {
    setParticipants(
      Object.entries(peersRef.current).map(([socketId, p]) => ({
        socketId,
        nickName: p.nickName || "Bilinmeyen",
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
      audioContainerRef.current?.appendChild(el);
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

  const createPeer = (socketId, nickName, isInitiator) => {
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

    peersRef.current[socketId] = { pc, nickName };
    refreshParticipants();

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
      } catch (_) {}
      delete peersRef.current[socketId];
    }
    removeRemoteAudio(socketId);
    refreshParticipants();
  };

  const registerSocketHandlers = () => {
    // Yeni gelen biziz → mevcut her peer'a offer başlat
    socket.on("voice:peers", (peers) => {
      peers.forEach((p) => createPeer(p.socketId, p.nickName, true));
    });

    // Bize offer geldi → cevap ver
    socket.on("voice:offer", async ({ from, sdp, nickName }) => {
      const existing = peersRef.current[from];
      const pc = existing ? existing.pc : createPeer(from, nickName, false);
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

  const join = async () => {
    setError(null);
    setConnecting(true);
    try {
      localStreamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
    } catch (e) {
      console.error("getUserMedia error:", e);
      setConnecting(false);
      setError("Mikrofona erişilemedi. Tarayıcı mikrofon iznini kontrol et.");
      return;
    }

    registerSocketHandlers();
    if (!socket.connected) socket.connect();
    socket.emit("voice:join", {
      roomId,
      userId: userData?.userID,
      nickName: userData?.nickName || "Bilinmeyen",
    });

    setJoined(true);
    setConnecting(false);
  };

  const leave = () => {
    socket.emit("voice:leave");
    Object.keys(peersRef.current).forEach(closePeer);
    peersRef.current = {};
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    unregisterSocketHandlers();
    if (socket.connected) socket.disconnect();
    setJoined(false);
    setMuted(false);
    setParticipants([]);
  };

  const toggleMute = () => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setMuted(!track.enabled);
    }
  };

  // Kanal değişince / bileşen kaldırılınca temizle
  useEffect(() => {
    return () => leave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initial = (name) => (name || "?").trim().charAt(0).toUpperCase();

  return (
    <div className="background w-full h-full flex flex-col items-center justify-center gap-6 text-[var(--secondary-text)] p-6">
      <div ref={audioContainerRef} className="hidden" />

      <div className="w-20 h-20 rounded-full bg-[var(--primary-bg)] border-4 border-[var(--tertiary-border)] flex items-center justify-center">
        <Volume2 size={36} className="text-[var(--quaternary-text)]" />
      </div>
      <h2 className="text-2xl font-bold">{channel.name}</h2>

      {!joined ? (
        <>
          {error && (
            <p className="text-red-400 text-sm max-w-sm text-center">{error}</p>
          )}
          <button
            onClick={join}
            disabled={connecting}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--tertiary-bg)] text-[var(--tertiary-text)] font-semibold hover:bg-[var(--quaternary-bg)] disabled:opacity-50 transition-colors"
          >
            {connecting ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Bağlanıyor...
              </>
            ) : (
              <>
                <Mic size={18} /> Sesli Kanala Katıl
              </>
            )}
          </button>
          <p className="text-xs text-[var(--primary-text)] max-w-xs text-center">
            İlk bağlantı, sunucu uykudaysa ~50 sn sürebilir.
          </p>
        </>
      ) : (
        <>
          {/* Katılımcılar */}
          <div className="flex flex-wrap gap-4 justify-center max-w-lg">
            {/* Kendin */}
            <div className="flex flex-col items-center gap-1">
              <div className="relative">
                <img
                  src={userData?.photoURL || "/1.png"}
                  alt=""
                  className={`w-16 h-16 rounded-full border-4 ${
                    muted ? "border-red-500" : "border-[var(--tertiary-border)]"
                  }`}
                />
                <span className="absolute -bottom-1 -right-1 bg-[var(--primary-bg)] rounded-full p-1">
                  {muted ? (
                    <MicOff size={14} className="text-red-500" />
                  ) : (
                    <Mic size={14} className="text-[var(--quaternary-text)]" />
                  )}
                </span>
              </div>
              <span className="text-sm">{userData?.nickName || "Sen"} (sen)</span>
            </div>

            {/* Uzak katılımcılar */}
            {participants.map((p) => (
              <div key={p.socketId} className="flex flex-col items-center gap-1">
                <div className="w-16 h-16 rounded-full border-4 border-[var(--primary-border)] bg-[var(--secondary-bg)] flex items-center justify-center text-xl font-bold text-[var(--quaternary-text)]">
                  {initial(p.nickName)}
                </div>
                <span className="text-sm">{p.nickName}</span>
              </div>
            ))}
          </div>

          {participants.length === 0 && (
            <p className="text-sm text-[var(--primary-text)]">
              Kanalda yalnızsın. Biri katılınca sesli konuşabilirsin.
            </p>
          )}

          {/* Kontroller */}
          <div className="flex gap-3 mt-2">
            <button
              onClick={toggleMute}
              title={muted ? "Sesi aç" : "Sustur"}
              className={`p-3 rounded-xl border-2 transition-all ${
                muted
                  ? "bg-red-500/20 border-red-500 text-red-400"
                  : "bg-[var(--primary-bg)] border-[var(--primary-border)] text-[var(--secondary-text)] hover:border-[var(--tertiary-border)] hover:text-[var(--quaternary-text)]"
              }`}
            >
              {muted ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
            <button
              onClick={leave}
              title="Ayrıl"
              className="p-3 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors"
            >
              <PhoneOff size={20} />
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default VoiceChannel;
