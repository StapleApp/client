import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  Server,
  Globe,
  Lock,
  X,
  ArrowLeft,
  Tag as TagIcon,
  Loader2,
} from "lucide-react";
import { saveServerToFirestore } from "../../services/serverService";
import { useAuth } from "../../context/AuthContext";
import ImagePicker from "../../Components/ImagePicker";
import { DEFAULT_SERVER_ICONS, DEFAULT_SERVER_BANNERS } from "../../config/defaults";
import icon from "../../assets/branding/staple-icon.png";

const inputClass =
  "w-full px-3 py-2 rounded-lg bg-[var(--secondary-bg)] text-[var(--secondary-text)] border border-[var(--primary-border)] focus:outline-none focus:border-[var(--tertiary-border)] placeholder:text-[var(--primary-text)] text-sm transition-colors";

const Label = ({ children, hint }) => (
  <label className="block mb-1.5 text-xs font-bold uppercase tracking-wide text-[var(--primary-text)]">
    {children}
    {hint && <span className="ml-1 normal-case font-normal opacity-70">{hint}</span>}
  </label>
);

const CreateServerPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("public");
  const [iconUrl, setIconUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (!t) return;
    if (t.length > 24) {
      toast.error("Etiket en fazla 24 karakter olabilir");
      return;
    }
    if (tags.includes(t)) {
      setTagInput("");
      return;
    }
    if (tags.length >= 8) {
      toast.error("En fazla 8 etiket ekleyebilirsin");
      return;
    }
    setTags([...tags, t]);
    setTagInput("");
  };

  const removeTag = (t) => setTags(tags.filter((x) => x !== t));

  const handleTagKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    } else if (e.key === "Backspace" && !tagInput && tags.length) {
      removeTag(tags[tags.length - 1]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Sunucu adı boş olamaz");
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    await saveServerToFirestore(
      {
        name: name.trim(),
        description: description.trim(),
        type,
        iconUrl: iconUrl.trim(),
        bannerUrl: bannerUrl.trim(),
        tags,
      },
      currentUser?.uid,
      navigate
    );
    setSubmitting(false);
  };

  return (
    <div className="background min-h-screen w-full flex items-center justify-center py-10 pl-16">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-2xl mx-4 bg-[var(--primary-bg)] border-2 border-[var(--primary-border)] rounded-2xl shadow-2xl overflow-hidden text-left"
      >
        {/* Banner önizleme */}
        <div
          className="relative h-24 bg-[var(--secondary-bg)] bg-cover bg-center"
          style={bannerUrl ? { backgroundImage: `url(${bannerUrl})` } : undefined}
        >
          <div className="absolute inset-0 bg-black/30" />
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Geri"
            className="absolute top-2 left-2 p-1.5 rounded-lg bg-[var(--primary-bg)]/80 text-[var(--secondary-text)] hover:text-[var(--quaternary-text)] transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          {/* İkon önizleme */}
          <img
            src={iconUrl || icon}
            alt=""
            onError={(e) => (e.currentTarget.src = icon)}
            className="absolute -bottom-6 left-6 w-16 h-16 rounded-2xl border-4 border-[var(--primary-bg)] object-cover bg-[var(--secondary-bg)]"
          />
        </div>

        <form onSubmit={handleSubmit} className="px-6 pt-10 pb-6 space-y-4">
          <div>
            <h1 className="text-xl font-bold text-[var(--secondary-text)] flex items-center gap-2">
              <Server size={20} className="text-[var(--tertiary-border)]" />
              Sunucu Oluştur
            </h1>
            <p className="text-xs text-[var(--primary-text)] mt-1">
              Topluluğun için bir alan oluştur. Bu bilgileri sonra düzenleyebilirsin.
            </p>
          </div>

          {/* Row 1: Adı, Gizlilik ve Açıklama */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              {/* Ad */}
              <div>
                <Label>Sunucu Adı</Label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Örn. Oyun Kulübü"
                  maxLength={50}
                  autoFocus
                  className={inputClass}
                />
              </div>

              {/* Tip */}
              <div>
                <Label>Gizlilik</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "public", label: "Herkese Açık", icon: <Globe size={14} />, desc: "Keşfette görünür" },
                    { id: "private", label: "Özel", icon: <Lock size={14} />, desc: "Sadece davetle" },
                  ].map((opt) => (
                    <button
                      type="button"
                      key={opt.id}
                      onClick={() => setType(opt.id)}
                      className={`flex flex-col items-start gap-0.5 p-2 rounded-lg border-2 transition-all text-left ${
                        type === opt.id
                          ? "border-[var(--tertiary-border)] bg-[var(--secondary-bg)]"
                          : "border-[var(--primary-border)] hover:border-[var(--tertiary-border)]/50"
                      }`}
                    >
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-[var(--secondary-text)]">
                        {opt.icon} {opt.label}
                      </span>
                      <span className="text-[10px] text-[var(--primary-text)]">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Açıklama */}
            <div className="flex flex-col">
              <Label hint="(isteğe bağlı)">Açıklama</Label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Sunucun ne hakkında?"
                maxLength={300}
                className={`${inputClass} resize-none flex-1 min-h-[110px]`}
              />
            </div>
          </div>

          {/* Row 2: İkon & Banner */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label hint="(isteğe bağlı)">Sunucu İkonu</Label>
              <ImagePicker
                value={iconUrl}
                onChange={setIconUrl}
                defaults={DEFAULT_SERVER_ICONS}
                uid={currentUser?.uid}
                bucket="server-icons"
                aspect="square"
              />
            </div>
            <div>
              <Label hint="(isteğe bağlı)">Sunucu Bannerı</Label>
              <ImagePicker
                value={bannerUrl}
                onChange={setBannerUrl}
                defaults={DEFAULT_SERVER_BANNERS}
                uid={currentUser?.uid}
                bucket="server-banners"
                aspect="wide"
              />
            </div>
          </div>

          {/* Row 3: Etiketler */}
          <div className="border-t border-[var(--primary-border)] pt-4">
            <Label hint="(en fazla 8)">Etiketler</Label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.map((t) => (
                <span
                  key={t}
                  className="flex items-center gap-1 px-2 py-1 rounded-full bg-[var(--secondary-bg)] text-[var(--secondary-text)] text-xs border border-[var(--primary-border)]"
                >
                  {t}
                  <button type="button" onClick={() => removeTag(t)} aria-label={`${t} etiketini kaldır`}>
                    <X size={12} className="hover:text-red-400" />
                  </button>
                </span>
              ))}
            </div>
            <div className="relative">
              <TagIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--primary-text)]" />
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                onBlur={addTag}
                placeholder="Etiket yaz, Enter'a bas"
                className={`${inputClass} pl-9`}
              />
            </div>
          </div>

          {/* Gönder */}
          <div className="flex gap-2 pt-2 border-t border-[var(--primary-border)]">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-4 py-2 rounded-lg bg-[var(--secondary-bg)] text-[var(--secondary-text)] font-semibold text-sm hover:text-[var(--quaternary-text)] transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[var(--tertiary-bg)] text-[var(--tertiary-text)] font-bold text-sm hover:bg-[var(--quaternary-bg)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Server size={16} />}
              {submitting ? "Oluşturuluyor..." : "Sunucuyu Oluştur"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default CreateServerPage;
