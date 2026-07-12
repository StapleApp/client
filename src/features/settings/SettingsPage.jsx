import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import { FaPowerOff } from "react-icons/fa6";
import { Loader2, Trash2, AlertTriangle, Pencil, Menu, Mic, Volume2, ChevronDown, Check, Home, Compass, UserPlus, Settings as SettingsIcon, User, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useMobileMenu } from "../../context/MobileMenuContext";
import { useVoice } from "../../context/VoiceContext";
import Navigator from "../../Components/layout/Navigator";

// ===== Uygulama stiline uygun özel dropdown =====
const DeviceSelect = ({ value, options, onChange, disabled, icon }) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const selected = options.find((o) => o.value === value) || options[0];

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center gap-2 pl-3 pr-2.5 py-2.5 rounded-xl bg-[var(--secondary-bg)] text-[var(--secondary-text)] border-2 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          open ? "border-[var(--tertiary-border)]" : "border-[var(--primary-border)] hover:border-[var(--tertiary-border)]"
        }`}
      >
        {icon && <span className="shrink-0 text-[var(--primary-text)]">{icon}</span>}
        <span className="truncate flex-1 text-left">{selected?.label}</span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-[var(--primary-text)] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="custom-scrollbar absolute z-50 mt-1.5 w-full max-h-56 overflow-y-auto list-none m-0 p-1 rounded-xl border-2 border-[var(--primary-border)] bg-[var(--secondary-bg)] shadow-2xl"
          >
            {options.map((o) => {
              const active = o.value === value;
              return (
                <li key={o.value || "__default__"}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(o.value);
                      setOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-left transition-colors ${
                      active
                        ? "bg-[var(--tertiary-bg)] text-[var(--tertiary-text)]"
                        : "text-[var(--secondary-text)] hover:bg-[var(--primary-bg)]"
                    }`}
                  >
                    <span className="truncate flex-1">{o.label}</span>
                    {active && <Check size={15} className="shrink-0" />}
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
};

// ===== Ses cihazı seçimi bölümü =====
const AudioDeviceSettings = () => {
  const { audioDevices, setAudioInputDevice, setAudioOutputDevice } = useVoice();
  const [inputs, setInputs] = useState([]);
  const [outputs, setOutputs] = useState([]);
  const [needsPermission, setNeedsPermission] = useState(false);
  const outputSupported =
    typeof window !== "undefined" &&
    (typeof AudioContext !== "undefined") &&
    "setSinkId" in (AudioContext.prototype || {});

  const refresh = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const ins = devices.filter((d) => d.kind === "audioinput");
      const outs = devices.filter((d) => d.kind === "audiooutput");
      setInputs(ins);
      setOutputs(outs);
      // Etiketler boşsa mikrofon izni verilmemiş demektir
      setNeedsPermission(ins.some((d) => !d.label));
    } catch (e) {
      console.error("enumerateDevices error:", e);
    }
  }, []);

  useEffect(() => {
    refresh();
    navigator.mediaDevices?.addEventListener?.("devicechange", refresh);
    return () =>
      navigator.mediaDevices?.removeEventListener?.("devicechange", refresh);
  }, [refresh]);

  const grantPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      await refresh();
    } catch (e) {
      console.error("Mic permission error:", e);
      toast.error("Mikrofon izni alınamadı.");
    }
  };

  const inputOptions = [
    { value: "", label: "Varsayılan (sistem)" },
    ...inputs.map((d, i) => ({
      value: d.deviceId,
      label: d.label || `Mikrofon ${i + 1}`,
    })),
  ];
  const outputOptions = [
    { value: "", label: "Varsayılan (sistem)" },
    ...outputs.map((d, i) => ({
      value: d.deviceId,
      label: d.label || `Hoparlör ${i + 1}`,
    })),
  ];

  return (
    <section className="bg-[var(--primary-bg)] rounded-2xl p-6 shadow-xl border border-[var(--primary-border)] mb-6">
      <h2 className="text-lg font-semibold mb-4 text-[var(--quaternary-text)]">
        Ses ve Görüntü
      </h2>

      {needsPermission && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-[var(--secondary-bg)] border border-[var(--primary-border)]">
          <p className="text-xs text-[var(--primary-text)]">
            Cihaz adlarını görebilmek için mikrofon izni gerekli.
          </p>
          <button
            onClick={grantPermission}
            className="px-3 py-1.5 rounded-lg bg-[var(--tertiary-bg)] text-[var(--tertiary-text)] text-xs font-semibold hover:bg-[var(--quaternary-bg)] transition-colors"
          >
            İzin Ver
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Giriş cihazı (mikrofon) */}
        <div>
          <label className="flex items-center gap-1.5 mb-1.5 text-xs font-bold uppercase tracking-wide text-[var(--primary-text)]">
            <Mic size={13} /> Giriş Cihazı
          </label>
          <DeviceSelect
            value={audioDevices.input}
            options={inputOptions}
            onChange={setAudioInputDevice}
            icon={<Mic size={15} />}
          />
        </div>

        {/* Çıkış cihazı (hoparlör/kulaklık) */}
        <div>
          <label className="flex items-center gap-1.5 mb-1.5 text-xs font-bold uppercase tracking-wide text-[var(--primary-text)]">
            <Volume2 size={13} /> Çıkış Cihazı
          </label>
          <DeviceSelect
            value={audioDevices.output}
            options={outputOptions}
            onChange={setAudioOutputDevice}
            disabled={!outputSupported}
            icon={<Volume2 size={15} />}
          />
          {!outputSupported && (
            <p className="mt-1 text-[11px] text-[var(--primary-text)]">
              Bu ortam çıkış cihazı seçimini desteklemiyor.
            </p>
          )}
        </div>
      </div>

      <p className="mt-3 text-[11px] text-[var(--primary-text)]">
        Giriş cihazı değişikliği bir sonraki ses kanalına katılımında geçerli olur.
      </p>
    </section>
  );
};

const SettingsPage = () => {
  const navigate = useNavigate();
  const { userData, currentUser, signOut, deleteAccount } = useAuth();
  const { isMobile, isOpen, setIsOpen } = useMobileMenu();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!currentUser) navigate("/login");
  }, [currentUser, navigate]);

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    const result = await deleteAccount();
    setDeleting(false);
    setShowDeleteConfirm(false);

    if (result.ok) {
      toast.success("Hesabınız silindi.");
      navigate("/signin");
    } else if (result.reason === "auth/requires-recent-login") {
      toast.error(
        "Güvenlik için lütfen çıkış yapıp tekrar giriş yapın, sonra tekrar deneyin."
      );
    } else {
      toast.error("Hesap silinemedi. Lütfen tekrar deneyin.");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 60 }}
      transition={{ duration: 0.15 }}
      className="background fixed top-0 left-0 w-full h-screen bg-[var(--secondary-bg)] text-[var(--secondary-text)] flex flex-col overflow-hidden"
      style={{ paddingLeft: isMobile ? "0px" : "64px" }}
    >
      {isMobile && (
        <div className="flex items-center h-[60px] px-5 py-4 bg-[var(--primary-bg)] border-b-2 border-[var(--primary-border)] text-[var(--secondary-text)] shrink-0 z-30">
          <button
            onClick={() => setIsOpen(true)}
            className="p-1.5 rounded-lg hover:bg-[var(--secondary-bg)] transition-colors mr-3 text-[var(--secondary-text)]"
            aria-label="Menüyü Aç"
          >
            <Menu size={20} />
          </button>
          <span className="font-bold truncate text-lg">Ayarlar</span>
        </div>
      )}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-10">
          <h1 className="text-3xl font-bold mb-8">Ayarlar</h1>

        {/* Profil özeti + düzenle */}
        <section className="bg-[var(--primary-bg)] rounded-2xl p-6 shadow-xl border border-[var(--primary-border)] mb-6">
          <h2 className="text-lg font-semibold mb-4 text-[var(--quaternary-text)]">
            Profil
          </h2>
          <div className="flex items-center gap-4">
            <img
              src={userData?.photoURL || "/defaults/avatars/1.png"}
              alt="Avatar"
              className="w-16 h-16 rounded-full border-4 border-[var(--tertiary-border)] object-cover"
            />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-lg truncate">
                {userData?.nickName || `${userData?.name || ""} ${userData?.surname || ""}`}
              </p>
              <p className="text-sm text-[var(--primary-text)] truncate">
                {userData?.email}
              </p>
              <p className="text-xs text-[var(--primary-text)]">
                #{userData?.friendshipID}
              </p>
            </div>
            <button
              onClick={() => navigate("/ProfileSettings")}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--tertiary-bg)] text-[var(--tertiary-text)] font-semibold text-sm hover:bg-[var(--quaternary-bg)] transition-colors shrink-0"
            >
              <Pencil size={15} /> Profili Düzenle
            </button>
          </div>
        </section>

        {/* Ses ve görüntü cihazları */}
        <AudioDeviceSettings />

        {/* Hesap işlemleri */}
        <section className="bg-[var(--primary-bg)] rounded-2xl p-6 shadow-xl border border-[var(--primary-border)]">
          <h2 className="text-lg font-semibold mb-4 text-[var(--quaternary-text)]">
            Hesap
          </h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-6 py-3 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors"
            >
              <FaPowerOff size={18} />
              Çıkış Yap
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-3 px-6 py-3 rounded-xl bg-transparent text-red-400 font-semibold border-2 border-red-500/60 hover:bg-red-500 hover:text-white transition-colors"
            >
              <Trash2 size={18} />
              Hesabı Sil
            </button>
          </div>
        </section>
      </div>

      {/* Hesap silme onay penceresi */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4"
            onClick={() => !deleting && setShowDeleteConfirm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl bg-[var(--primary-bg)] border-2 border-[var(--primary-border)] shadow-2xl p-6 text-[var(--secondary-text)]"
            >
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-14 h-14 rounded-full bg-red-500/15 border-2 border-red-500 flex items-center justify-center">
                  <AlertTriangle size={26} className="text-red-400" />
                </div>
                <h3 className="text-xl font-bold">Hesabı silmek istediğinizden emin misiniz?</h3>
                <p className="text-sm text-[var(--primary-text)]">
                  Bu işlem <span className="font-semibold text-red-400">geri alınamaz</span>.
                  Hesabınız ve tüm verileriniz kalıcı olarak silinecek.
                </p>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--secondary-bg)] text-[var(--secondary-text)] font-semibold border-2 border-[var(--primary-border)] hover:border-[var(--tertiary-border)] disabled:opacity-50 transition-colors"
                >
                  Vazgeç
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 disabled:opacity-50 transition-colors"
                >
                  {deleting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" /> Siliniyor...
                    </>
                  ) : (
                    <>
                      <Trash2 size={18} /> Evet, Sil
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
      {/* Mobile Drawer */}
      {isMobile && (
        <AnimatePresence>
          {isOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 bg-black/60 z-40 transition-opacity duration-200"
                onClick={() => setIsOpen(false)}
              />
              {/* Drawer Container */}
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="fixed top-0 bottom-0 left-0 z-50 flex w-[320px] shadow-2xl"
              >
                {/* Left: Navigator */}
                <div className="w-16 h-full shrink-0 relative z-20 bg-[var(--primary-bg)]/90 backdrop-blur-md border-r border-[var(--primary-border)]/20">
                  <Navigator />
                </div>
                {/* Right: Navigation Options */}
                <div className="w-64 h-full bg-[var(--primary-bg)]/90 backdrop-blur-md flex flex-col relative z-10 p-5 overflow-y-auto gap-5 text-left">
                  {/* Header */}
                  <div className="flex justify-between items-center pb-2 border-b border-[var(--primary-border)]/25 shrink-0">
                    <span className="font-bold text-sm text-[var(--secondary-text)] uppercase tracking-widest font-mono">Seçenekler</span>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="p-1 rounded-lg hover:bg-[var(--secondary-bg)] transition-colors text-[var(--secondary-text)] active:scale-95"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* Navigation Links */}
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                    <button
                      onClick={() => {
                        navigate("/");
                        setIsOpen(false);
                      }}
                      className="flex items-center gap-3 w-full p-2.5 rounded-xl bg-[var(--secondary-bg)]/40 hover:bg-[var(--secondary-bg)] border border-[var(--primary-border)]/30 hover:border-[var(--tertiary-border)]/40 text-sm font-semibold text-[var(--secondary-text)] transition-all active:scale-95"
                    >
                      <Home size={18} className="text-[var(--tertiary-bg)]" />
                      <span>Ana Sayfa</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        navigate("/servers");
                        setIsOpen(false);
                      }}
                      className="flex items-center gap-3 w-full p-2.5 rounded-xl bg-[var(--secondary-bg)] hover:bg-[var(--secondary-bg)] border border-[var(--primary-border)]/30 hover:border-[var(--tertiary-border)]/40 text-sm font-semibold text-[var(--secondary-text)] transition-all active:scale-95"
                    >
                      <Compass size={18} className="text-[var(--tertiary-bg)]" />
                      <span>Sunucu Keşfet</span>
                    </button>

                    <button
                      onClick={() => {
                        navigate("/AddFriends");
                        setIsOpen(false);
                      }}
                      className="flex items-center gap-3 w-full p-2.5 rounded-xl bg-[var(--secondary-bg)]/40 hover:bg-[var(--secondary-bg)] border border-[var(--primary-border)]/30 hover:border-[var(--tertiary-border)]/40 text-sm font-semibold text-[var(--secondary-text)] transition-all active:scale-95"
                    >
                      <UserPlus size={18} className="text-[var(--tertiary-bg)]" />
                      <span>Arkadaş Ekle</span>
                    </button>

                    <button
                      onClick={() => {
                        navigate("/settings");
                        setIsOpen(false);
                      }}
                      className="flex items-center gap-3 w-full p-2.5 rounded-xl bg-[var(--secondary-bg)] hover:bg-[var(--secondary-bg)] border border-[var(--primary-border)]/30 hover:border-[var(--tertiary-border)]/40 text-sm font-semibold text-[var(--secondary-text)] transition-all active:scale-95"
                    >
                      <SettingsIcon size={18} className="text-[var(--tertiary-bg)]" />
                      <span>Ayarlar</span>
                    </button>

                    <button
                      onClick={() => {
                        navigate("/Profile");
                        setIsOpen(false);
                      }}
                      className="flex items-center gap-3 w-full p-2.5 rounded-xl bg-[var(--secondary-bg)]/40 hover:bg-[var(--secondary-bg)] border border-[var(--primary-border)]/30 hover:border-[var(--tertiary-border)]/40 text-sm font-semibold text-[var(--secondary-text)] transition-all active:scale-95"
                    >
                      <User size={18} className="text-[var(--tertiary-bg)]" />
                      <span>Profili Düzenle</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      )}
    </motion.div>
  );
};

export default SettingsPage;
