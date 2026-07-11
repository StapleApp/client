import { Check, X } from "lucide-react";
import AvatarUpload from "./AvatarUpload";

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
  const isCustom = value && !defaults.includes(value);
  const thumbClass =
    aspect === "wide" ? "aspect-[16/9] rounded-lg" : "aspect-square rounded-xl";
  const gridClass = aspect === "wide" ? "grid-cols-3" : "grid-cols-6";

  return (
    <div className="space-y-2">
      <div className={`grid ${gridClass} gap-2`}>
        {defaults.map((url) => (
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
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <AvatarUpload
          uid={uid}
          bucket={bucket}
          label="Görsel Yükle"
          onUploaded={(url) => onChange(url)}
        />
        {isCustom && (
          <span className="flex items-center gap-1.5 text-xs text-[var(--quaternary-text)]">
            <img
              src={value}
              alt=""
              className="w-6 h-6 rounded object-cover border border-[var(--primary-border)]"
            />
            Yüklenen görsel seçili
          </span>
        )}
        {allowClear && value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="flex items-center gap-1 text-xs text-[var(--primary-text)] hover:text-red-400 transition-colors"
          >
            <X size={13} /> Temizle
          </button>
        )}
      </div>
    </div>
  );
};

export default ImagePicker;
