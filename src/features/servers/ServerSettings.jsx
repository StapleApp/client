import { useState, useEffect, useCallback } from "react";
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
  LogOut,
  Link2,
  Copy,
  Plus,
} from "lucide-react";
import {
  updateServer,
  deleteServer,
  leaveServer,
  createServerInvite,
  getServerInvites,
  revokeInvite,
} from "../../services/serverService";
import RolesManager from "./RolesManager";
import ImagePicker from "../../Components/ImagePicker";
import { useAuth } from "../../context/AuthContext";
import { hasPermission, isServerOwner } from "../../config/permissions";
import { DEFAULT_SERVER_ICONS, DEFAULT_SERVER_BANNERS } from "../../config/defaults";
import icon from "../../assets/branding/staple-icon.svg";

const inputClass =
  "w-full px-3 py-2 rounded-lg bg-[var(--secondary-bg)] text-[var(--secondary-text)] border border-[var(--primary-border)] focus:outline-none focus:border-[var(--tertiary-border)] placeholder:text-[var(--primary-text)] text-sm transition-colors";

const Label = ({ children, hint }) => (
  <label className="block mb-1.5 text-xs font-bold uppercase tracking-wide text-[var(--primary-text)]">
    {children}
    {hint && <span className="ml-1 normal-case font-normal opacity-70">{hint}</span>}
  </label>
);

const ServerSettings = ({ serverData, onClose, onSaved, onDeleted }) => {
  const { currentUser } = useAuth();
  const myId = currentUser?.uid;
  const isOwner = isServerOwner(serverData, myId);
  const canManageServer = hasPermission(serverData, myId, "MANAGE_SERVER");
  const canManageRoles = hasPermission(serverData, myId, "MANAGE_ROLES");
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
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [invites, setInvites] = useState([]);
  const [creatingInvite, setCreatingInvite] = useState(false);

  const inviteLink = (code) => `${window.location.origin}/invite/${code}`;

  const loadInvites = useCallback(async () => {
    if (!serverData?.ServerId) return;
    const list = await getServerInvites(serverData.ServerId);
    setInvites(list);
  }, [serverData?.ServerId]);

  // Davet listesini yalnızca yönetim yetkisi olanlar için yükle
  useEffect(() => {
    if (canManageServer) loadInvites();
  }, [canManageServer, loadInvites]);

  const handleCreateInvite = async () => {
    if (creatingInvite) return;
    setCreatingInvite(true);
    const code = await createServerInvite(serverData.ServerId);
    setCreatingInvite(false);
    if (code) {
      await navigator.clipboard?.writeText(inviteLink(code)).catch(() => {});
      toast.success("Davet bağlantısı oluşturuldu ve kopyalandı");
      loadInvites();
    }
  };

  const handleCopyInvite = (code) => {
    navigator.clipboard?.writeText(inviteLink(code));
    toast.success("Davet bağlantısı kopyalandı");
  };

  const handleRevokeInvite = async (code) => {
    const ok = await revokeInvite(code);
    if (ok) {
      setInvites((prev) => prev.filter((i) => i.code !== code));
      toast.success("Davet iptal edildi");
    }
  };
  // İlk erişilebilir sekme (yönetim yetkisi olmayan üye için "none")
  const [tab, setTab] = useState(
    canManageServer ? "general" : canManageRoles ? "roles" : "none"
  );

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

    console.log("[ServerSettings] Kaydedilen değerler:", {
      iconUrl: iconUrl.trim(),
      bannerUrl: bannerUrl.trim(),
      name: name.trim(),
    });

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
      // Sunucu verisini yeniden yükle, ardından modalı kapat
      if (onSaved) await onSaved();
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

  const handleLeave = async () => {
    if (leaving) return;
    setLeaving(true);
    const ok = await leaveServer(serverData.ServerId, myId);
    setLeaving(false);
    // Ayrıldıysa sunucu artık erişilemez → onDeleted ile ana sayfaya dön.
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
          className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[var(--primary-bg)] border-2 border-[var(--primary-border)] rounded-2xl shadow-2xl text-left"
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
            {/* Sekmeler — yalnızca yetkili olduğun bölümler görünür */}
            {(canManageServer || canManageRoles) && (
              <div className="flex gap-1 mb-4 p-1 rounded-xl bg-[var(--secondary-bg)] border border-[var(--primary-border)]">
                {[
                  canManageServer && { id: "general", label: "Genel", icon: <SlidersHorizontal size={15} /> },
                  canManageRoles && { id: "roles", label: "Roller", icon: <Shield size={15} /> },
                ].filter(Boolean).map((t) => (
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
            )}

            {tab === "roles" && canManageRoles ? (
              <RolesManager serverData={serverData} onChanged={onSaved} />
            ) : tab === "general" && canManageServer ? (
          <form onSubmit={handleSave} className="space-y-4">
            <h1 className="text-xl font-bold text-[var(--secondary-text)] flex items-center gap-2">
              <Server size={20} className="text-[var(--tertiary-border)]" />
              Sunucu Ayarları
            </h1>

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
                    maxLength={50}
                    className={inputClass}
                  />
                </div>

                {/* Gizlilik */}
                <div>
                  <Label>Gizlilik</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: "public", label: "Herkese Açık", icon: <Globe size={14} /> },
                      { id: "private", label: "Özel", icon: <Lock size={14} /> },
                    ].map((opt) => (
                      <button
                        type="button"
                        key={opt.id}
                        onClick={() => setType(opt.id)}
                        className={`flex items-center justify-center gap-1.5 p-2 rounded-lg border-2 text-xs font-semibold transition-all ${
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
              </div>

              {/* Açıklama */}
              <div className="flex flex-col">
                <Label hint="(isteğe bağlı)">Açıklama</Label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
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

            {/* Davet Bağlantıları */}
            <div className="border-t border-[var(--primary-border)] pt-4">
              <div className="flex items-center justify-between mb-2">
                <Label>
                  Davet Bağlantıları
                  {type === "private" && (
                    <span className="ml-1 normal-case font-normal opacity-70">
                      (özel sunucuya tek katılım yolu)
                    </span>
                  )}
                </Label>
                <button
                  type="button"
                  onClick={handleCreateInvite}
                  disabled={creatingInvite}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--tertiary-bg)] text-[var(--tertiary-text)] text-xs font-bold hover:bg-[var(--quaternary-bg)] disabled:opacity-50 transition-colors"
                >
                  {creatingInvite ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Plus size={13} />
                  )}
                  Davet Oluştur
                </button>
              </div>

              {invites.length === 0 ? (
                <p className="text-xs text-[var(--primary-text)] py-1">
                  Henüz davet yok. "Davet Oluştur" ile paylaşılabilir bir bağlantı üret.
                </p>
              ) : (
                <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                  {invites.map((inv) => (
                    <div
                      key={inv.code}
                      className="flex items-center gap-2 p-2 rounded-lg bg-[var(--secondary-bg)] border border-[var(--primary-border)]"
                    >
                      <Link2 size={14} className="shrink-0 text-[var(--tertiary-border)]" />
                      <code className="flex-1 min-w-0 truncate text-xs text-[var(--secondary-text)]">
                        /invite/{inv.code}
                      </code>
                      <span className="text-[10px] text-[var(--primary-text)] shrink-0">
                        {inv.uses} kullanım
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyInvite(inv.code)}
                        title="Bağlantıyı kopyala"
                        className="p-1 rounded text-[var(--primary-text)] hover:text-[var(--quaternary-text)] transition-colors shrink-0"
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRevokeInvite(inv.code)}
                        title="Daveti iptal et"
                        className="p-1 rounded text-[var(--primary-text)] hover:text-red-400 transition-colors shrink-0"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Kaydet / İptal */}
            <div className="flex items-center justify-end gap-2 pt-4 border-t border-[var(--primary-border)]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-[var(--secondary-bg)] text-[var(--secondary-text)] font-semibold text-xs hover:text-[var(--quaternary-text)] transition-colors"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={saving || !name.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--tertiary-bg)] text-[var(--tertiary-text)] font-bold text-xs hover:bg-[var(--quaternary-bg)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Server size={13} />}
                {saving ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </form>
            ) : (
              /* Yönetim yetkisi olmayan üye görünümü */
              <div className="py-8 text-center">
                <Server size={28} className="mx-auto mb-2 text-[var(--tertiary-border)]" />
                <p className="text-sm text-[var(--secondary-text)] font-semibold">
                  {serverData?.ServerName}
                </p>
                <p className="text-xs text-[var(--primary-text)] mt-1">
                  Bu sunucuda yönetim yetkin yok. Aşağıdan sunucudan ayrılabilirsin.
                </p>
              </div>
            )}

            {/* Kalıcı Tehlikeli Bölge: sahip → sil, diğer üyeler → ayrıl */}
            <div className="mt-4 pt-4 border-t border-[var(--primary-border)]">
              {isOwner ? (
                confirmDelete ? (
                  <div className="flex items-center gap-2 p-1.5 rounded-lg border border-red-500/40 bg-red-500/5">
                    <span className="text-[11px] text-[var(--secondary-text)] leading-tight flex-1">
                      Sunucu kalıcı silinecek. Emin misin?
                    </span>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={deleting}
                      className="px-2.5 py-1.5 rounded bg-red-500 text-white text-xs font-semibold hover:bg-red-600 disabled:opacity-50 transition-colors"
                    >
                      {deleting ? <Loader2 size={12} className="animate-spin" /> : "Sil"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="px-2.5 py-1.5 rounded bg-[var(--secondary-bg)] text-[var(--secondary-text)] text-xs font-semibold hover:text-[var(--quaternary-text)] transition-colors"
                    >
                      İptal
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-500/40 text-red-400 text-xs font-semibold hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors"
                  >
                    <Trash2 size={13} /> Sunucuyu Sil
                  </button>
                )
              ) : confirmLeave ? (
                <div className="flex items-center gap-2 p-1.5 rounded-lg border border-red-500/40 bg-red-500/5">
                  <span className="text-[11px] text-[var(--secondary-text)] leading-tight flex-1">
                    Sunucudan ayrılmak istediğine emin misin?
                  </span>
                  <button
                    type="button"
                    onClick={handleLeave}
                    disabled={leaving}
                    className="px-2.5 py-1.5 rounded bg-red-500 text-white text-xs font-semibold hover:bg-red-600 disabled:opacity-50 transition-colors"
                  >
                    {leaving ? <Loader2 size={12} className="animate-spin" /> : "Ayrıl"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmLeave(false)}
                    className="px-2.5 py-1.5 rounded bg-[var(--secondary-bg)] text-[var(--secondary-text)] text-xs font-semibold hover:text-[var(--quaternary-text)] transition-colors"
                  >
                    İptal
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmLeave(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-500/40 text-red-400 text-xs font-semibold hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors"
                >
                  <LogOut size={13} /> Sunucudan Ayrıl
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

export default ServerSettings;
