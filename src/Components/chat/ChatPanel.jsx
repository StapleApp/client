import { useState, useEffect, useRef } from "react";
import { Send, Hash, Smile, Loader2, Star } from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import { useAuth } from "../../context/AuthContext";
import { sendMessage, listenMessages } from "../../services/messageService";
import { updateUserProfile } from "../../services/userService";

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
  const { userData, refreshUserData } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifSearchQuery, setGifSearchQuery] = useState("");
  const [gifs, setGifs] = useState([]);
  const [loadingGifs, setLoadingGifs] = useState(false);
  const [gifError, setGifError] = useState("");
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

  const klipyApiKey = import.meta.env.VITE_KLIPY_API_KEY;

  const isFavorite = (gifId) => {
    const favoriteGifs = userData?.favoriteGifs || [];
    return favoriteGifs.some((fav) => fav.id === gifId);
  };

  const handleToggleFavorite = async (gif) => {
    if (!userData) return;
    const currentFavorites = userData.favoriteGifs || [];
    const isFav = currentFavorites.some((fav) => fav.id === gif.id);

    let updatedFavorites;
    if (isFav) {
      updatedFavorites = currentFavorites.filter((fav) => fav.id !== gif.id);
    } else {
      if (currentFavorites.length >= 20) {
        alert("En fazla 20 favori GIF ekleyebilirsiniz.");
        return;
      }
      const formats = gif.media_formats || gif.media || {};
      const gifUrl = formats.gif?.url || formats.tinygif?.url || formats.mediumgif?.url || gif.url;
      const previewUrl = formats.tinygif?.url || formats.gif?.url || gif.url;

      const newFav = {
        id: gif.id,
        title: gif.title || "",
        url: gifUrl,
        previewUrl: previewUrl,
        media_formats: formats
      };
      updatedFavorites = [...currentFavorites, newFav];
    }

    try {
      await updateUserProfile(userData.userID, { favoriteGifs: updatedFavorites });
      await refreshUserData();
    } catch (err) {
      console.error("Favori güncellenirken hata oluştu:", err);
    }
  };

  useEffect(() => {
    if (!showGifPicker) return;

    // Arama yoksa ve favori GIF varsa doğrudan onları yükle, API isteği atma
    if (gifSearchQuery.trim() === "" && userData?.favoriteGifs?.length > 0) {
      setGifError("");
      setLoadingGifs(false);
      return;
    }

    const fetchGifs = async () => {
      if (!klipyApiKey) {
        setGifError("Klipy API Anahtarı bulunamadı. Lütfen .env dosyanıza VITE_KLIPY_API_KEY ekleyin.");
        return;
      }
      setGifError("");
      setLoadingGifs(true);
      try {
        let url = "";
        if (gifSearchQuery.trim() === "") {
          url = `https://api.klipy.com/v2/featured?key=${klipyApiKey}&limit=20`;
        } else {
          url = `https://api.klipy.com/v2/search?key=${klipyApiKey}&q=${encodeURIComponent(gifSearchQuery)}&limit=20`;
        }
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data = await res.json();
        if (data.results) {
          setGifs(data.results);
        } else if (data.data?.data) {
          setGifs(data.data.data);
        } else {
          setGifs([]);
        }
      } catch (err) {
        console.error("GIF çekilirken hata oluştu:", err);
        setGifError("GIF'ler yüklenirken bir hata oluştu. Lütfen API anahtarınızı kontrol edin.");
      } finally {
        setLoadingGifs(false);
      }
    };

    const delayDebounceFn = setTimeout(() => {
      fetchGifs();
    }, gifSearchQuery.trim() === "" ? 0 : 500);

    return () => clearTimeout(delayDebounceFn);
  }, [showGifPicker, gifSearchQuery, klipyApiKey, userData?.favoriteGifs]);

  const handleGifClick = async (gif) => {
    const formats = gif.media_formats || gif.media || {};
    const gifUrl = formats.gif?.url || formats.tinygif?.url || formats.mediumgif?.url || gif.url;
    if (!gifUrl || !userData) return;

    await sendMessage(context, {
      senderId: userData.userID,
      senderName: userData.nickName || "Bilinmeyen",
      senderPhoto: userData.photoURL || "/1.png",
      content: gifUrl,
    });
    setShowGifPicker(false);
    setGifSearchQuery("");
  };

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
    // Görsel linki veya Klipy/Giphy URL'si
    if (content.match(/\.(jpeg|jpg|gif|png|webp)($|\?)/i) || content.includes("klipy.com") || content.includes("giphy.com")) {
      return (
        <a href={content} target="_blank" rel="noopener noreferrer">
          <img
            src={content}
            alt="GIF"
            className="max-w-xs max-h-48 rounded-lg mt-2 object-cover"
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

  const displayedGifs = (gifSearchQuery.trim() === "" && (userData?.favoriteGifs?.length > 0))
    ? userData.favoriteGifs
    : gifs;

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
          {showGifPicker && (
            <div
              style={{
                position: "absolute",
                bottom: "50px",
                right: "0",
                zIndex: 10,
              }}
              className="w-80 h-96 flex flex-col rounded-2xl border-2 border-[var(--primary-border)] bg-[var(--primary-bg)]/90 backdrop-blur-md shadow-2xl overflow-hidden text-left"
            >
              <div className="p-3 border-b border-[var(--primary-border)] flex flex-col gap-2">
                <input
                  type="text"
                  value={gifSearchQuery}
                  onChange={(e) => setGifSearchQuery(e.target.value)}
                  placeholder="GIF Ara..."
                  className="w-full px-3 py-1.5 rounded-lg bg-[var(--secondary-bg)] text-[var(--secondary-text)] border border-[var(--primary-border)] focus:outline-none focus:border-[var(--tertiary-border)] text-sm"
                />
              </div>
              <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                {gifError ? (
                  <div className="h-full flex flex-col items-center justify-center text-xs text-red-400 text-center px-4 gap-2">
                    <span>{gifError}</span>
                  </div>
                ) : loadingGifs ? (
                  <div className="h-full flex flex-col items-center justify-center text-sm text-[var(--primary-text)] gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-[var(--tertiary-border)]" />
                    <span>Yükleniyor...</span>
                  </div>
                ) : displayedGifs.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-[var(--primary-text)]">
                    <span>GIF bulunamadı.</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {displayedGifs.map((gif) => {
                      const formats = gif.media_formats || gif.media || {};
                      const previewUrl = formats.tinygif?.url || formats.gif?.url || gif.url;
                      return (
                        <div
                          key={gif.id}
                          className="relative aspect-video rounded-lg overflow-hidden bg-black/20 group animate-fade-in"
                        >
                          <button
                            type="button"
                            onClick={() => handleGifClick(gif)}
                            className="w-full h-full hover:scale-[1.03] transition-transform duration-200"
                          >
                            <img
                              src={previewUrl}
                              alt={gif.title || "gif"}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleFavorite(gif);
                            }}
                            className="absolute top-1.5 right-1.5 p-1.5 rounded-full bg-black/60 hover:bg-black/85 transition-colors z-10"
                          >
                            <Star
                              className={`w-3.5 h-3.5 transition-colors ${
                                isFavorite(gif.id) ? "fill-yellow-400 text-yellow-400" : "text-white hover:text-yellow-200"
                              }`}
                            />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="p-2 bg-[var(--secondary-bg)] border-t border-[var(--primary-border)] flex justify-between items-center text-[10px] text-[var(--primary-text)] select-none">
                <span>Reklamsız GIF Arama</span>
                <span className="font-semibold tracking-wider text-[var(--secondary-text)]">
                  Powered by KLIPY
                </span>
              </div>
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
