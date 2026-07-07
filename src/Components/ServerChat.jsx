import { useState, useEffect, useRef } from "react";
import { Send, Hash } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { sendServerMessage, listenServerMessages } from "../../firebase";

const formatTime = (createdAt) => {
  if (!createdAt?.seconds) return "";
  return new Date(createdAt.seconds * 1000).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const ServerChat = ({ serverId, channel }) => {
  const { userData } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef(null);

  // Aktif kanalın mesajlarını anlık dinle
  useEffect(() => {
    setMessages([]);
    if (!serverId || !channel?.id) return;
    const unsubscribe = listenServerMessages(serverId, channel.id, setMessages);
    return () => unsubscribe && unsubscribe();
  }, [serverId, channel?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    const content = newMessage.trim();
    if (!content || !userData) return;
    setNewMessage("");
    await sendServerMessage(serverId, channel.id, {
      senderId: userData.userID,
      senderName: userData.nickName || "Bilinmeyen",
      senderPhoto: userData.photoURL || "/1.png",
      content,
    });
  };

  return (
    <div className="flex flex-col h-full bg-[var(--secondary-bg)] text-[var(--secondary-text)]">
      {/* Kanal başlığı */}
      <div className="flex items-center gap-2 px-5 py-4 border-b-2 border-[var(--primary-border)] bg-[var(--primary-bg)]">
        <Hash className="w-5 h-5 text-[var(--quaternary-text)]" />
        <h2 className="text-lg font-bold text-[var(--secondary-text)]">{channel.name}</h2>
      </div>

      {/* Mesajlar */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-[var(--primary-text)] text-sm gap-2">
            <Hash className="w-8 h-8 text-[var(--quaternary-text)]" />
            <span>
              #{channel.name} kanalının başlangıcı. İlk mesajı sen gönder!
            </span>
          </div>
        ) : (
          messages.map((message) => {
            const isMine = message.senderId === userData?.userID;
            return (
              <div key={message.id} className="flex items-start gap-3">
                <img
                  src={message.senderPhoto || "/1.png"}
                  alt=""
                  className="w-9 h-9 rounded-full mt-0.5 border border-[var(--primary-border)]"
                />
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span
                      className={`text-sm font-semibold ${
                        isMine ? "text-[var(--quaternary-text)]" : "text-[var(--secondary-text)]"
                      }`}
                    >
                      {message.senderName}
                    </span>
                    <span className="text-xs text-[var(--primary-text)]">
                      {formatTime(message.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--secondary-text)] break-words">
                    {message.content}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Gönderme alanı */}
      <form
        onSubmit={handleSend}
        className="p-4 border-t-2 border-[var(--primary-border)] bg-[var(--primary-bg)] flex gap-3"
      >
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={`#${channel.name} kanalına mesaj gönder`}
          className="flex-1 px-4 py-2 rounded-xl bg-[var(--secondary-bg)] text-[var(--secondary-text)] border-2 border-[var(--primary-border)] focus:outline-none focus:border-[var(--tertiary-border)] placeholder:text-[var(--primary-text)] transition-colors"
        />
        <button
          type="submit"
          disabled={!newMessage.trim()}
          className="px-4 py-2 bg-[var(--tertiary-bg)] text-[var(--tertiary-text)] font-semibold rounded-xl hover:bg-[var(--quaternary-bg)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};

export default ServerChat;
