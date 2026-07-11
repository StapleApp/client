import { useRef, useState } from "react";
import { Check, X, Plus, Loader2 } from "lucide-react";
import { uploadMedia } from "../services/userService";
import toast from "react-hot-toast";

// Hazır görsellerden seçme + kendi görselini yükleme.
// props:
//   value      seçili URL (boş = seçim yok)
//   onChange(url)
//   defaults   hazır görsel URL dizisi
//   uid        yükleyen kullanıcı
//   bucket     storage bucket'ı
//   aspect     "square" | "wide"  (küçük önizleme oranı)
//   allowClear seçimi temizleme butonu göster
const ImagePicker = ({
  value,
  onChange,
  defaults = [],
  uid,
  bucket,
  aspect = "square",
  allowClear = true,
}) => {
  const fileInputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const displayedDefaults = defaults.slice(0, 5);
  const isCustom = value && !defaults.includes(value);

  const thumbClass =
    aspect === "wide" ? "aspect-[16/9] rounded-lg" : "aspect-square rounded-xl";
  const gridClass = aspect === "wide" ? "grid-cols-3" : "grid-cols-6";

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // Reset
    if (!file) return;
    if (!uid) {
      toast.error("Oturum bulunamadı.");
      return;
    }

    setBusy(true);
    try {
      const url = await uploadMedia(bucket, uid, file);
      onChange(url);
      toast.success("Görsel yüklendi");
    } catch (err) {
      console.error("Media upload error:", err);
      toast.error(err?.message || "Görsel yüklenemedi");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <div className={`grid ${gridClass} gap-2`}>
        {displayedDefaults.map((url) => (
          <button
            key={url}
            type="button"
            onClick={() => onChange(url)}
            className={`relative overflow-hidden border-2 transition-all hover:scale-[1.03] ${thumbClass} ${
              value === url
                ? "border-[var(--tertiary-border)]"
                : "border-transparent"
            }`}
          >
            <img src={url} alt="" className="w-full h-full object-cover" />
            {value === url && (
              <span className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <Check size={16} className="text-white" />
              </span>
            )}
          </button>
        ))}

        {/* Kendi Görselini Yükleme Kutusu (6. Seçenek) */}
        <div className="relative">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (isCustom) {
                // Yüklü olan görseli tekrar seç
                onChange(value);
              } else {
                // Yeni dosya seçiciyi aç
                fileInputRef.current?.click();
              }
            }}
            className={`relative overflow-hidden w-full border-2 transition-all hover:scale-[1.03] ${thumbClass} ${
              isCustom
                ? "border-[var(--tertiary-border)]"
                : "border-dashed border-[var(--primary-border)] hover:border-[var(--tertiary-border)]/50"
            } bg-[var(--secondary-bg)] flex items-center justify-center`}
          >
            {busy ? (
              <Loader2 size={16} className="animate-spin text-[var(--primary-text)]" />
            ) : isCustom ? (
              <>
                <img src={value} alt="" className="w-full h-full object-cover" />
                <span className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <Check size={16} className="text-white" />
                </span>
              </>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <Plus size={16} className="text-[var(--primary-text)]" />
                <span className="text-[9px] text-[var(--primary-text)] font-semibold select-none text-center leading-none">Görsel Yükle</span>
              </div>
            )}
          </button>

          {/* Özel görselin yanındaki değiştirme butonu */}
          {isCustom && !busy && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="absolute -top-1 -right-1 p-0.5 rounded-full bg-[var(--secondary-bg)] border border-[var(--primary-border)] text-[var(--primary-text)] hover:text-red-400 shadow-md transition-colors"
              title="Görseli Değiştir"
            >
              <X size={10} />
            </button>
          )}
        </div>
      </div>

      {allowClear && value && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => onChange("")}
            className="flex items-center gap-1 text-[11px] text-[var(--primary-text)] hover:text-red-400 transition-colors"
          >
            <X size={12} /> Seçimi Kaldır
          </button>
        </div>
      )}
    </div>
  );
};

export default ImagePicker;
