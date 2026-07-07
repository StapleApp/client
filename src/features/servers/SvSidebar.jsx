import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Hash,
  Volume2,
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  ChevronLeft,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import profileBackground2_small from "../../assets/profileBackground2_small.png";
import ChatPanel from "../../Components/chat/ChatPanel";
import { useVoice } from "../../context/VoiceContext";
import { saveServerRooms } from "../../services/serverService";

const toRoomDocs = (channels) =>
  channels.map((c, index) => ({
    RoomID: c.id,
    RoomName: c.name,
    Type: c.type === "voice" ? "VoiceRoom" : "TextRoom",
    Position: index + 1,
  }));

const SvSidebar = ({ serverData }) => {
  const navigate = useNavigate();
  const voice = useVoice();
  const serverId = serverData?.ServerId;

  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);

  // Kanala tıklama: yazı kanalı → içerik panelinde aç, sesli kanal → küresel sese katıl
  const handleChannelClick = (channel) => {
    if (channel.type === "voice") {
      voice.joinVoice({
        serverId,
        channelId: channel.id,
        channelName: channel.name,
        serverName: serverData?.ServerName,
      });
    } else {
      setActiveChannel(channel);
    }
  };

  const isChannelActive = (channel) =>
    channel.type === "voice"
      ? voice.active?.serverId === serverId && voice.active?.channelId === channel.id
      : activeChannel?.id === channel.id;
  const [showDropdown, setShowDropdown] = useState(false);
  const [channelOptions, setChannelOptions] = useState(null);
  const [editingChannel, setEditingChannel] = useState(null);
  const [newChannelName, setNewChannelName] = useState("");

  useEffect(() => {
    if (serverData?.Rooms) {
      const loaded = serverData.Rooms.map((room) => ({
        id: room.RoomID,
        name: room.RoomName,
        type: room.Type === "TextRoom" ? "text" : "voice",
        position: room.Position ?? 0,
      })).sort((a, b) => a.position - b.position);
      setChannels(loaded);
    }
  }, [serverData]);

  const persist = (next) => {
    setChannels(next);
    if (serverId) saveServerRooms(serverId, toRoomDocs(next));
  };

  const addChannel = (type) => {
    const newChannel = {
      id: `${Date.now()}`,
      name:
        type === "voice"
          ? `Sesli Kanal ${channels.filter((c) => c.type === "voice").length + 1}`
          : `Yazı Kanalı ${channels.filter((c) => c.type === "text").length + 1}`,
      type,
      position: channels.length + 1,
    };
    persist([...channels, newChannel]);
    setShowDropdown(false);
  };

  const renameChannel = (id) => {
    persist(
      channels.map((c) => (c.id === id ? { ...c, name: newChannelName || c.name } : c))
    );
    setEditingChannel(null);
    setNewChannelName("");
  };

  const deleteChannel = (id) => {
    if (activeChannel?.id === id) setActiveChannel(null);
    persist(channels.filter((c) => c.id !== id));
    setChannelOptions(null);
  };

  return (
    <>
      <motion.div
        initial={{ x: 80, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="fixed right-0 top-0 h-screen w-64 bg-[var(--primary-bg)] text-[var(--secondary-text)] shadow-2xl border-l-2 border-[var(--primary-border)] flex flex-col z-30"
      >
        <div
          className="relative h-28 w-full bg-cover bg-center"
          style={{ backgroundImage: `url(${profileBackground2_small})` }}
        >
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <h1 className="text-white font-bold text-lg px-3 text-center truncate">
              {serverData?.ServerName || "..."}
            </h1>
          </div>
          <button
            onClick={() => navigate("/")}
            title="Geri dön"
            className="absolute top-2 left-2 p-1.5 rounded-lg bg-[var(--primary-bg)]/80 text-[var(--secondary-text)] hover:text-[var(--quaternary-text)] hover:scale-105 transition-all duration-200"
          >
            <ChevronLeft size={18} />
          </button>
        </div>

        <div className="p-2 relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border-2 border-[var(--primary-border)] bg-[var(--secondary-bg)] text-[var(--secondary-text)] hover:border-[var(--tertiary-border)] hover:text-[var(--quaternary-text)] transition-all duration-200 text-sm font-semibold"
          >
            <Plus size={16} /> Kanal Ekle
          </button>
          <AnimatePresence>
            {showDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="absolute left-2 right-2 mt-1 z-40 rounded-xl overflow-hidden border-2 border-[var(--primary-border)] bg-[var(--secondary-bg)] shadow-xl"
              >
                <button
                  onClick={() => addChannel("text")}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--tertiary-bg)] hover:text-[var(--tertiary-text)] transition-colors"
                >
                  <Hash size={15} /> Yazı Kanalı
                </button>
                <button
                  onClick={() => addChannel("voice")}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--tertiary-bg)] hover:text-[var(--tertiary-text)] transition-colors"
                >
                  <Volume2 size={15} /> Sesli Kanal
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-2">
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--primary-text)] px-2 mt-1 mb-1">
            Kanallar
          </p>
          <div className="flex flex-col gap-1">
            {channels.map((channel) => {
              const active = isChannelActive(channel);
              return (
                <div key={channel.id} className="relative">
                  <div
                    onClick={() => handleChannelClick(channel)}
                    className={`group flex items-center justify-between gap-1 px-2 py-1.5 rounded-lg cursor-pointer transition-all duration-200 ${
                      active
                        ? "bg-[var(--tertiary-bg)] text-[var(--tertiary-text)]"
                        : "text-[var(--primary-text)] hover:bg-[var(--secondary-bg)] hover:text-[var(--secondary-text)]"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {channel.type === "voice" ? (
                        <Volume2 size={16} className="shrink-0" />
                      ) : (
                        <Hash size={16} className="shrink-0" />
                      )}
                      {editingChannel === channel.id ? (
                        <input
                          autoFocus
                          value={newChannelName}
                          onChange={(e) => setNewChannelName(e.target.value)}
                          onBlur={() => renameChannel(channel.id)}
                          onKeyDown={(e) => e.key === "Enter" && renameChannel(channel.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="bg-transparent border-b border-current outline-none text-sm w-full"
                        />
                      ) : (
                        <span className="text-sm truncate">{channel.name}</span>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setChannelOptions(channelOptions === channel.id ? null : channel.id);
                      }}
                      className={`transition-opacity ${
                        active ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                      }`}
                    >
                      <MoreVertical size={15} />
                    </button>
                  </div>

                  <AnimatePresence>
                    {channelOptions === channel.id && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute right-0 top-full mt-1 z-50 w-40 rounded-xl overflow-hidden border-2 border-[var(--primary-border)] bg-[var(--secondary-bg)] shadow-xl"
                      >
                        <button
                          onClick={() => {
                            setEditingChannel(channel.id);
                            setNewChannelName(channel.name);
                            setChannelOptions(null);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--secondary-text)] hover:bg-[var(--tertiary-bg)] hover:text-[var(--tertiary-text)] transition-colors"
                        >
                          <Pencil size={14} /> Yeniden Adlandır
                        </button>
                        <button
                          onClick={() => deleteChannel(channel.id)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500 hover:text-white transition-colors"
                        >
                          <Trash2 size={14} /> Sil
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>

      <div className="fixed top-0 left-16 right-64 h-screen z-20">
        <AnimatePresence mode="wait">
          {activeChannel ? (
            <motion.div
              key={activeChannel.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.15 }}
              className="w-full h-full bg-[var(--secondary-bg)]"
            >
              <ChatPanel
                context={{ serverId, channelId: activeChannel.id }}
                channelName={activeChannel.name}
              />
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="background w-full h-full flex flex-col items-center justify-center gap-4 text-[var(--primary-text)]"
            >
              <div className="w-20 h-20 rounded-full bg-[var(--primary-bg)] border-4 border-[var(--tertiary-border)] flex items-center justify-center">
                <Hash size={36} className="text-[var(--quaternary-text)]" />
              </div>
              <h2 className="text-2xl font-bold text-[var(--secondary-text)]">
                {serverData?.ServerName}
              </h2>
              <p>Başlamak için sağdaki menüden bir kanal seç.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export default SvSidebar;
