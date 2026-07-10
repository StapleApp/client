/**
 * Renders a chat message's content with rich formatting:
 * emoji-only enlargement, YouTube embeds, image/GIF links, plain links.
 * Extracted from ChatPanel — markup unchanged.
 */
const MessageContent = ({ content }) => {
  // Sadece emoji ise büyük göster
  const onlyEmoji =
    /^(\p{Emoji_Presentation}|\p{Emoji}️|\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?|\s)+$/u;
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
  if (
    content.match(/\.(jpeg|jpg|gif|png|webp)($|\?)/i) ||
    content.includes("klipy.com") ||
    content.includes("giphy.com")
  ) {
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
  // Normal metin — satır sonlarını koru (çok satırlı mesajlar için)
  return <span className="whitespace-pre-wrap">{content}</span>;
};

export default MessageContent;
