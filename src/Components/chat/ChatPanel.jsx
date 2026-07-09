import { useState, useEffect, useRef } from "react";
import { Send, Hash, Smile, Pencil, Trash2, Check, X, ChevronDown } from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import { useAuth } from "../../context/AuthContext";
import {
  sendMessage,
  listenMessages,
  editMessage,
  deleteMessage,
} from "../../services/messageService";
import MessageContent from "./MessageContent";
import GifPicker from "./GifPicker";

const formatTime = (createdAt) => {
  if (!createdAt?.seconds) return "";
  return new Date(createdAt.seconds * 1000).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const isSameDay = (a, b) => {
  if (!a?.seconds || !b?.seconds) return false;
  const da = new Date(a.seconds * 1000);
  const db = new Date(b.seconds * 1000);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
};

// Gün ayracı etiketi: Bugün / Dün / tam tarih
const dayLabel = (createdAt) => {
  if (!createdAt?.seconds) return "";
  const d = new Date(createdAt.seconds * 1000);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const secToDay = { seconds: createdAt.seconds };
  if (isSameDay(secToDay, { seconds: Math.floor(today.getTime() / 1000) }))
    return "Bugün";
  if (isSameDay(secToDay, { seconds: Math.floor(yesterday.getTime() / 1000) }))
    return "Dün";
  return d.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
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
  const [showGifPicker, setShowGifPicker] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const messagesEndRef = useRef(null);
  const scrollRef = useRef(null);

  // Kaydırma dibe yakın mı? (auto-scroll ve buton görünürlüğü için)
  const isNearBottom = () => {
    const el = scrollRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };

  const scrollToBottom = (behavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Listen to messages in real time
  useEffect(() => {
    setMessages([]);
    setEditingId(null);
    setConfirmDeleteId(null);
    if (!context) return;
    const hasServer = context.serverId && context.channelId;
    const hasGroup = context.groupId;
    if (!hasServer && !hasGroup) return;

    const unsubscribe = listenMessages(context, setMessages);
    return () => unsubscribe && unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context?.serverId, context?.channelId, context?.groupId]);

  // Yeni mesajda: yalnızca kullanıcı zaten dipteyse otomatik kaydır
  useEffect(() => {
    if (isNearBottom()) scrollToBottom();
  }, [messages]);

  const handleScroll = () => {
    setShowScrollBtn(!isNearBottom());
  };

  const handleGifSelect = async (gif) => {
    const formats = gif.media_formats || gif.media || {};
    const gifUrl = formats.gif?.url || formats.tinygif?.url || formats.mediumgif?.url || gif.url;
    if (!gifUrl || !userData) return;

    await sendMessage(context, {
      senderId: userData.userID,
      content: gifUrl,
      type: "gif",
    });
    setShowGifPicker(false);
  };

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    const content = newMessage.trim();
    if (!content || !userData) return;
    setNewMessage("");
    await sendMessage(context, {
      senderId: userData.userID,
      content,
    });
    scrollToBottom();
  };

  const handleEmojiClick = (emojiData) => {
    setNewMessage((prev) => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const startEdit = (message) => {
    setConfirmDeleteId(null);
    setEditingId(message.id);
    setEditText(message.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
  };

  const saveEdit = async (message) => {
    const text = editText.trim();
    if (!text || text === message.content) {
      cancelEdit();
      return;
    }
    cancelEdit();
    await editMessage(message.id, userData.userID, text);
  };

  const confirmDelete = async (message) => {
    setConfirmDeleteId(null);
    await deleteMessage(message.id, userData.userID);
  };

  return (
    <div className="relative flex flex-col h-full bg-[var(--secondary-bg)] text-[var(--secondary-text)]">
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
      <div className="flex-1 overflow-y-auto py-4 relative" ref={scrollRef} onScroll={handleScroll}>
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-[var(--primary-text)] text-sm gap-2">
            <Hash className="w-8 h-8 text-[var(--quaternary-text)]" />
            <span>İlk mesajı sen gönder!</span>
          </div>
        ) : (
          messages.map((message, index) => {
            const prev = messages[index - 1];
            const showDateDivider = !prev || !isSameDay(prev.createdAt, message.createdAt);
            const grouped =
              prev && prev.senderId === message.senderId && !showDateDivider;
            const isOwn = message.senderId === userData?.userID;
            const isEditing = editingId === message.id;
            return (
              <div key={message.id || `msg-${index}`}>
                {showDateDivider && message.createdAt && (
                  <div className="flex items-center gap-3 px-4 my-4 select-none">
                    <div className="flex-1 h-px bg-[var(--primary-border)]" />
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--primary-text)]">
                      {dayLabel(message.createdAt)}
                    </span>
                    <div className="flex-1 h-px bg-[var(--primary-border)]" />
                  </div>
                )}

                <div
                  className={`group relative flex items-start gap-3 px-4 hover:bg-[var(--primary-bg)]/40 ${
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

                    {isEditing ? (
                      <div className="flex items-center gap-2 mt-0.5">
                        <input
                          autoFocus
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEdit(message);
                            if (e.key === "Escape") cancelEdit();
                          }}
                          className="flex-1 px-3 py-1.5 rounded-lg bg-[var(--primary-bg)] text-[var(--secondary-text)] border border-[var(--primary-border)] focus:outline-none focus:border-[var(--tertiary-border)] text-sm"
                        />
                        <button
                          onClick={() => saveEdit(message)}
                          className="p-1.5 rounded-lg bg-[var(--tertiary-bg)] text-[var(--tertiary-text)] hover:bg-[var(--quaternary-bg)] transition-colors"
                          title="Kaydet"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="p-1.5 rounded-lg bg-[var(--primary-bg)] text-[var(--secondary-text)] hover:text-[var(--quaternary-text)] transition-colors"
                          title="İptal"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="text-sm text-[var(--secondary-text)] break-words">
                        <MessageContent content={message.content} />
                        {message.editedAt && (
                          <span className="ml-1.5 text-[10px] text-[var(--primary-text)] align-baseline">
                            (düzenlendi)
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Kendi mesajın için hover aksiyonları */}
                  {isOwn && !isEditing && (
                    <div className="absolute right-4 -top-3">
                      {confirmDeleteId === message.id ? (
                        <div className="flex items-center gap-1 rounded-lg border border-[var(--primary-border)] bg-[var(--primary-bg)] px-2 py-1 shadow-lg">
                          <span className="text-[11px] text-[var(--secondary-text)]">
                            Silinsin mi?
                          </span>
                          <button
                            onClick={() => confirmDelete(message)}
                            className="text-[11px] font-semibold text-red-400 hover:text-red-300 px-1"
                          >
                            Evet
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-[11px] text-[var(--primary-text)] hover:text-[var(--secondary-text)] px-1"
                          >
                            Hayır
                          </button>
                        </div>
                      ) : (
                        <div className="hidden group-hover:flex items-center gap-0.5 rounded-lg border border-[var(--primary-border)] bg-[var(--primary-bg)] px-1 py-0.5 shadow-lg">
                          {message.type !== "gif" && (
                            <button
                              onClick={() => startEdit(message)}
                              className="p-1 rounded text-[var(--secondary-text)] hover:text-[var(--quaternary-text)] transition-colors"
                              title="Düzenle"
                            >
                              <Pencil size={13} />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setEditingId(null);
                              setConfirmDeleteId(message.id);
                            }}
                            className="p-1 rounded text-red-400 hover:text-red-300 transition-colors"
                            title="Sil"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Aşağı kaydır butonu */}
      {showScrollBtn && (
        <button
          onClick={() => scrollToBottom()}
          className="absolute bottom-24 right-6 z-10 p-2 rounded-full bg-[var(--tertiary-bg)] text-[var(--tertiary-text)] shadow-lg hover:bg-[var(--quaternary-bg)] transition-colors"
          title="En alta in"
        >
          <ChevronDown size={18} />
        </button>
      )}

      {/* Send area */}
      <form
        onSubmit={handleSend}
        className="p-4 border-t-2 border-[var(--primary-border)] bg-[var(--primary-bg)] flex gap-3 relative"
      >
        <div className="flex-1 relative">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={`Mesajınızı yazın...`}
            className="w-full px-4 py-2 pr-20 rounded-xl bg-[var(--secondary-bg)] text-[var(--secondary-text)] border-2 border-[var(--primary-border)] focus:outline-none focus:border-[var(--tertiary-border)] placeholder:text-[var(--primary-text)] transition-colors"
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
            <button
              type="button"
              className="text-[var(--secondary-text)] hover:text-[var(--primary-text)] font-bold text-xs px-1.5 py-0.5 rounded bg-[var(--primary-border)] hover:bg-[var(--tertiary-border)] transition-all select-none"
              onClick={() => {
                setShowGifPicker((v) => !v);
                setShowEmojiPicker(false);
              }}
            >
              GIF
            </button>
            <button
              type="button"
              className="text-[var(--secondary-text)] hover:text-[var(--primary-text)] transition-colors"
              onClick={() => {
                setShowEmojiPicker((v) => !v);
                setShowGifPicker(false);
              }}
            >
              <Smile className="w-5 h-5" />
            </button>
          </div>
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
          {showGifPicker && <GifPicker onSelect={handleGifSelect} />}
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
