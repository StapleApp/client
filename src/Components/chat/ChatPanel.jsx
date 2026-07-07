import { useState, useEffect, useRef } from "react";
import { Send, Hash, Smile } from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import { useAuth } from "../../context/AuthContext";
import { sendMessage, listenMessages } from "../../services/messageService";

const formatTime = (createdAt) => {
  if (!createdAt?.seconds) return "";
  return new Date(createdAt.seconds * 1000).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * Unified chat panel used by both DMs and server channels.
 *
 * Props:
 *   context      - { serverId, channelId } OR { groupId }
 *   channelName  - display name for the header
 *   headerIcon   - optional React node for the header (e.g. avatar img)
 *   showHeader   - whether to show the header bar (default true)
 */
const ChatPanel = ({ context, channelName, headerIcon, showHeader = true }) => {
  const { userData } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef(null);

  // Listen to messages in real time
  useEffect(() => {
    setMessages([]);
    if (!context) return;
    // Validate context has required fields
    const hasServer = context.serverId && context.channelId;
    const hasGroup = context.groupId;
    if (!hasServer && !hasGroup) return;

    const unsubscribe = listenMessages(context, setMessages);
    return () => unsubscribe && unsubscribe();
    // Depend on the primitive id fields, not the context object identity,
    // to avoid re-subscribing on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context?.serverId, context?.channelId, context?.groupId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    const content = newMessage.trim();
    if (!content || !userData) return;
    setNewMessage("");
    await sendMessage(context, {
      senderId: userData.userID,
      senderName: userData.nickName || "Bilinmeyen",
      senderPhoto: userData.photoURL || "/1.png",
      content,
    });
  };

  const handleEmojiClick = (emojiData) => {
    setNewMessage((prev) => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  // Rich content rendering — YouTube, images, emojis, links
  const renderMessageContent = (content) => {
    // Sadece emoji ise büyük göster
    const onlyEmoji =
      /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?|\s)+$/u;
    if (onlyEmoji.test(content.trim())) {
      return (
        <span style={{ fontSize: "2.2rem", lineHeight: "2.5rem" }}>
          {content}
        </span>
      );
    }
    // Youtube linki
    const youtubeMatch = content.match(
      /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/
    );
    if (youtubeMatch) {
      return (
        <div>
          <a
            href={content}
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-blue-200"
          >
            {content}
          </a>
          <div className="mt-2">
            <iframe
              width="300"
              height="170"
              src={`https://www.youtube.com/embed/${youtubeMatch[1]}`}
              title="YouTube video"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      );
    }
    // Görsel linki
    if (content.match(/\.(jpeg|jpg|gif|png|webp)$/i)) {
      return (
        <a href={content} target="_blank" rel="noopener noreferrer">
          <img
            src={content}
            alt="img"
            className="max-w-xs max-h-48 rounded-lg mt-2"
          />
        </a>
      );
    }
    // Genel link
    if (content.match(/^https?:\/\/[^\s]+$/)) {
      return (
        <a
          href={content}
          target="_blank"
          rel="noopener noreferrer"
          className="underline text-blue-200"
        >
          {content}
        </a>
      );
    }
    // Normal metin
    return <span>{content}</span>;
  };

  return (
    <div className="flex flex-col h-full bg-[var(--secondary-bg)] text-[var(--secondary-text)]">
      {/* Header */}
      {showHeader && (
        <div className="flex items-center gap-2 px-5 py-4 border-b-2 border-[var(--primary-border)] bg-[var(--primary-bg)]">
          {headerIcon || (
            <Hash className="w-5 h-5 text-[var(--quaternary-text)]" />
          )}
          <h2 className="text-lg font-bold text-[var(--secondary-text)]">
            {channelName}
          </h2>
        </div>
      )}

      {/* Messages — Discord tarzı: sola hizalı, baloncuksuz, gruplanmış */}
      <div className="flex-1 overflow-y-auto py-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-[var(--primary-text)] text-sm gap-2">
            <Hash className="w-8 h-8 text-[var(--quaternary-text)]" />
            <span>İlk mesajı sen gönder!</span>
          </div>
        ) : (
          messages.map((message, index) => {
            const prev = messages[index - 1];
            const grouped = prev && prev.senderId === message.senderId;
            return (
              <div
                key={message.id || `msg-${index}`}
                className={`group flex items-start gap-3 px-4 hover:bg-[var(--primary-bg)]/40 ${
                  grouped ? "mt-0.5 py-0.5" : "mt-4 py-0.5"
                }`}
              >
                {/* Avatar sütunu (sabit genişlik) */}
                <div className="w-10 shrink-0 relative">
                  {!grouped ? (
                    <img
                      src={message.senderPhoto || "/1.png"}
                      alt=""
                      className="w-10 h-10 rounded-full mt-0.5"
                    />
                  ) : (
                    <span className="absolute right-1 top-0.5 hidden group-hover:block text-[10px] text-[var(--primary-text)] whitespace-nowrap">
                      {formatTime(message.createdAt)}
                    </span>
                  )}
                </div>

                {/* İçerik */}
                <div className="min-w-0 flex-1 text-left">
                  {!grouped && (
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-semibold text-[var(--secondary-text)]">
                        {message.senderName}
                      </span>
                      <span className="text-xs text-[var(--primary-text)]">
                        {formatTime(message.createdAt)}
                      </span>
                    </div>
                  )}
                  <div className="text-sm text-[var(--secondary-text)] break-words">
                    {renderMessageContent(message.content)}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Send area */}
      <form
        onSubmit={handleSend}
        className="p-4 border-t-2 border-[var(--primary-border)] bg-[var(--primary-bg)] flex gap-3"
      >
        <div className="flex-1 relative">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={`Mesajınızı yazın...`}
            className="w-full px-4 py-2 pr-12 rounded-xl bg-[var(--secondary-bg)] text-[var(--secondary-text)] border-2 border-[var(--primary-border)] focus:outline-none focus:border-[var(--tertiary-border)] placeholder:text-[var(--primary-text)] transition-colors"
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[var(--secondary-text)] hover:text-[var(--primary-text)]"
            onClick={() => setShowEmojiPicker((v) => !v)}
          >
            <Smile className="w-5 h-5" />
          </button>
          {showEmojiPicker && (
            <div
              style={{
                position: "absolute",
                bottom: "50px",
                right: "0",
                zIndex: 10,
              }}
            >
              <EmojiPicker onEmojiClick={handleEmojiClick} theme="dark" />
            </div>
          )}
        </div>
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

export default ChatPanel;
