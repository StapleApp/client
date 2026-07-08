import { useState, useEffect } from "react";
import { Star, Loader2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { updateUserProfile } from "../../services/userService";

/**
 * Klipy GIF picker popover with search, favorites (max 20, stored on the
 * user document) and featured fallback. Extracted from ChatPanel —
 * markup and behavior unchanged.
 *
 * Props:
 *   onSelect(gif) — called with the raw gif object when one is clicked
 */
const GifPicker = ({ onSelect }) => {
  const { userData, refreshUserData } = useAuth();
  const [gifSearchQuery, setGifSearchQuery] = useState("");
  const [gifs, setGifs] = useState([]);
  const [loadingGifs, setLoadingGifs] = useState(false);
  const [gifError, setGifError] = useState("");

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
  }, [gifSearchQuery, klipyApiKey, userData?.favoriteGifs]);

  const displayedGifs = (gifSearchQuery.trim() === "" && (userData?.favoriteGifs?.length > 0))
    ? userData.favoriteGifs
    : gifs;

  return (
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
                    onClick={() => onSelect(gif)}
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
  );
};

export default GifPicker;
