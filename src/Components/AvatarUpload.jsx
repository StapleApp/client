import { useRef, useState } from "react";
import { Upload, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { uploadAvatar } from "../services/userService";

// Kendi bilgisayarından avatar yükleme butonu.
// props: uid, onUploaded(url), className?
const AvatarUpload = ({ uid, onUploaded, className = "" }) => {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // aynı dosyayı tekrar seçebilmek için sıfırla
    if (!file) return;
    if (!uid) {
      toast.error("Oturum bulunamadı.");
      return;
    }

    setBusy(true);
    try {
      const url = await uploadAvatar(uid, file);
      onUploaded(url);
      toast.success("Fotoğraf yüklendi");
    } catch (err) {
      console.error("Avatar upload error:", err);
      toast.error(err?.message || "Fotoğraf yüklenemedi");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl border-2 border-dashed border-[var(--primary-border)] text-sm font-semibold text-[var(--secondary-text)] hover:border-[var(--tertiary-border)] hover:text-[var(--quaternary-text)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className}`}
      >
        {busy ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
        {busy ? "Yükleniyor…" : "Fotoğraf Yükle"}
      </button>
    </>
  );
};

export default AvatarUpload;
