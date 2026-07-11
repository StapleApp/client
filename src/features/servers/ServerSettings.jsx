import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import {
  Server,
  Globe,
  Lock,
  X,
  Tag as TagIcon,
  Loader2,
  Trash2,
  Shield,
  SlidersHorizontal,
} from "lucide-react";
import { updateServer, deleteServer } from "../../services/serverService";
import RolesManager from "./RolesManager";
import icon from "../../assets/branding/staple-icon.png";

const inputClass =
  "w-full px-3 py-2 rounded-lg bg-[var(--secondary-bg)] text-[var(--secondary-text)] border border-[var(--primary-border)] focus:outline-none focus:border-[var(--tertiary-border)] placeholder:text-[var(--primary-text)] text-sm transition-colors";

const Label = ({ children, hint }) => (
  <label className="block mb-1.5 text-xs font-bold uppercase tracking-wide text-[var(--primary-text)]">
    {children}
    {hint && <span className="ml-1 normal-case font-normal opacity-70">{hint}</span>}
  </label>
);

const ServerSettings = ({ serverData, onClose, onSaved, onDeleted }) => {
  const [name, setName] = useState(serverData?.ServerName || "");
  const [description, setDescription] = useState(serverData?.ServerDescription || "");
  const [type, setType] = useState(serverData?.ServerType || "public");
  const [iconUrl, setIconUrl] = useState(serverData?.ServerPhotoURL || "");
  const [bannerUrl, setBannerUrl] = useState(serverData?.ServerBannerURL || "");
  const [tags, setTags] = useState(serverData?.ServerTags || []);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [tab, setTab] = useState("general"); // general | roles

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (!t) return;
    if (t.length > 24) return toast.error("Etiket en fazla 24 karakter");
    if (tags.includes(t)) return setTagInput("");
    if (tags.length >= 8) return toast.error("En fazla 8 etiket");
    setTags([...tags, t]);
    setTagInput("");
  };
  const removeTag = (t) => setTags(tags.filter((x) => x !== t));

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Sunucu adı boş olamaz");
    if (saving) return;
    setSaving(true);
    const ok = await updateServer(serverData.ServerId, {
      name: name.trim(),
      description: description.trim(),
      type,
      iconUrl: iconUrl.trim(),
      bannerUrl: bannerUrl.trim(),
      tags,
    });
    setSaving(false);
    if (ok) {
      onSaved && onSaved();
      onClose && onClose();
    }
  };

  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    const ok = await deleteServer(serverData.ServerId);
    setDeleting(false);
    if (ok) onDeleted && onDeleted();
  };

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[9998] bg-black/60 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[var(--primary-bg)] border-2 border-[var(--primary-border)] rounded-2xl shadow-2xl text-left"
        >
          {/* Banner önizleme */}
          <div
            className="relative h-24 bg-[var(--secondary-bg)] bg-cover bg-center rounded-t-2xl"
            style={bannerUrl ? { backgroundImage: `url(${bannerUrl})` } : undefined}
          >
            <div className="absolute inset-0 bg-black/30 rounded-t-2xl" />
            <button
              type="button"
              onClick={onClose}
              aria-label="Kapat"
              className="absolute top-2 right-2 p-1.5 rounded-lg bg-[var(--primary-bg)]/80 text-[var(--secondary-text)] hover:text-[var(--quaternary-text)] transition-colors"
            >
              <X size={18} />
            </button>
            <img
              src={iconUrl || icon}
              alt=""
              onError={(e) => (e.currentTarget.src = icon)}
              className="absolute -bottom-6 left-6 w-16 h-16 rounded-2xl border-4 border-[var(--primary-bg)] object-cover bg-[var(--secondary-bg)]"
            />
          </div>

          <div className="px-6 pt-10 pb-6">
            {/* Sekmeler */}
            <div className="flex gap-1 mb-4 p-1 rounded-xl bg-[var(--secondary-bg)] border border-[var(--primary-border)]">
              {[
                { id: "general", label: "Genel", icon: <SlidersHorizontal size={15} /> },
                { id: "roles", label: "Roller", icon: <Shield size={15} /> },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    tab === t.id
                      ? "bg-[var(--tertiary-bg)] text-[var(--tertiary-text)]"
                      : "text-[var(--primary-text)] hover:text-[var(--secondary-text)]"
                  }`}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            {tab === "roles" ? (
              <RolesManager serverData={serverData} onChanged={onSaved} />
            ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <h1 className="text-xl font-bold text-[var(--secondary-text)] flex items-center gap-2">
              <Server size={20} className="text-[var(--tertiary-border)]" />
              Sunucu Ayarları
            </h1>

            <div>
              <Label>Sunucu Adı</Label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={50}
                className={inputClass}
              />
            </div>

            <div>
              <Label hint="(isteğe bağlı)">Açıklama</Label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                maxLength={300}
                className={`${inputClass} resize-none`}
              />
            </div>

            <div>
              <Label>Gizlilik</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "public", label: "Herkese Açık", icon: <Globe size={16} /> },
                  { id: "private", label: "Özel", icon: <Lock size={16} /> },
                ].map((opt) => (
                  <button
                    type="button"
                    key={opt.id}
                    onClick={() => setType(opt.id)}
                    className={`flex items-center gap-1.5 p-3 rounded-lg border-2 text-sm font-semibold transition-all ${
                      type === opt.id
                        ? "border-[var(--tertiary-border)] bg-[var(--secondary-bg)] text-[var(--secondary-text)]"
                        : "border-[var(--primary-border)] text-[var(--primary-text)] hover:border-[var(--tertiary-border)]/50"
                    }`}
                  >
                    {opt.icon} {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label hint="(en fazla 8)">Etiketler</Label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="flex items-center gap-1 px-2 py-1 rounded-full bg-[var(--secondary-bg)] text-[var(--secondary-text)] text-xs border border-[var(--primary-border)]"
                  >
                    {t}
                    <button type="button" onClick={() => removeTag(t)} aria-label={`${t} kaldır`}>
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
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  onBlur={addTag}
                  placeholder="Etiket yaz, Enter'a bas"
                  className={`${inputClass} pl-9`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div>
                <Label hint="(isteğe bağlı)">İkon URL</Label>
                <input type="url" value={iconUrl} onChange={(e) => setIconUrl(e.target.value)} placeholder="https://..." className={inputClass} />
              </div>
              <div>
                <Label hint="(isteğe bağlı)">Banner URL</Label>
                <input type="url" value={bannerUrl} onChange={(e) => setBannerUrl(e.target.value)} placeholder="https://..." className={inputClass} />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-lg bg-[var(--secondary-bg)] text-[var(--secondary-text)] font-semibold text-sm hover:text-[var(--quaternary-text)] transition-colors"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={saving || !name.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--tertiary-bg)] text-[var(--tertiary-text)] font-bold text-sm hover:bg-[var(--quaternary-bg)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Server size={16} />}
                {saving ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>

            {/* Tehlikeli bölge */}
            <div className="mt-4 pt-4 border-t border-[var(--primary-border)]">
              <Label>Tehlikeli Bölge</Label>
              {confirmDelete ? (
                <div className="flex flex-col gap-2 p-3 rounded-lg border-2 border-red-500/40 bg-red-500/5">
                  <span className="text-sm text-[var(--secondary-text)]">
                    "{serverData?.ServerName}" kalıcı olarak silinecek. Tüm kanallar,
                    mesajlar ve üyelikler gidecek. Emin misin?
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={deleting}
                      className="flex-1 flex items-center justify-center gap-2 py-2 rounded-md bg-red-500 text-white text-sm font-semibold hover:bg-red-600 disabled:opacity-50 transition-colors"
                    >
                      {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      Kalıcı Olarak Sil
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="flex-1 py-2 rounded-md bg-[var(--secondary-bg)] text-[var(--secondary-text)] text-sm font-semibold hover:text-[var(--quaternary-text)] transition-colors"
                    >
                      İptal
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 border-red-500/40 text-red-400 text-sm font-semibold hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors"
                >
                  <Trash2 size={15} /> Sunucuyu Sil
                </button>
              )}
            </div>
          </form>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

export default ServerSettings;
