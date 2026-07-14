import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import { FaPowerOff } from "react-icons/fa6";
import { Loader2, Trash2, AlertTriangle, Pencil, Menu, Mic, Volume2, ChevronDown, Check, Home, Compass, UserPlus, Settings as SettingsIcon, User, X, Sun, Moon, MoonStar, Monitor, Palette, Pipette, Sparkles, Grid2x2, Zap, Type, MessageSquare } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useMobileMenu } from "../../context/MobileMenuContext";
import { useVoice } from "../../context/VoiceContext";
import { useTheme } from "../../context/ThemeContext";
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

// Küçük aç/kapa anahtarı
const Toggle = ({ checked, onChange, label, hint, icon }) => (
  <div className="flex items-center justify-between gap-3 py-2">
    <div className="min-w-0">
      <span className="flex items-center gap-1.5 text-sm text-[var(--secondary-text)] font-medium">
        {icon} {label}
      </span>
      {hint && <p className="text-[11px] text-[var(--primary-text)] mt-0.5">{hint}</p>}
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative shrink-0 w-11 h-6 rounded-full transition-colors ${
        checked
          ? "bg-[var(--tertiary-bg)]"
          : "bg-[var(--secondary-bg)] border border-[var(--primary-border)]"
      }`}
    >
      <span
        className="absolute top-1/2 -translate-y-1/2 rounded-full bg-white shadow transition-all"
        style={{ width: 18, height: 18, left: checked ? 22 : 3 }}
      />
    </button>
  </div>
);

// ===== Görünüm: tema + vurgu + arka plan/hareket =====
const AppearanceSettings = () => {
  const {
    theme, setTheme,
    accent, setAccent, customAccent, setCustomAccent,
    reduceMotion, setReduceMotion, parallax, setParallax,
    tileSize, setTileSize,
    chatDensity, setChatDensity,
    messageStyle, setMessageStyle,
    fontScale, setFontScale,
    fontFamily, setFontFamily,
    accents, themes, tileSizes,
  } = useTheme();

  const themeIcon = (id) =>
    id === "light" ? <Sun size={15} /> :
    id === "black" ? <MoonStar size={15} /> :
    id === "auto" ? <Monitor size={15} /> :
    <Moon size={15} />;

  return (
    <section className="bg-[var(--primary-bg)] rounded-2xl p-6 shadow-xl border border-[var(--primary-border)]">
      <h2 className="text-lg font-semibold mb-4 text-[var(--quaternary-text)]">
        Görünüm
      </h2>

      {/* 1. Satır Izgarası: Tema ve Vurgu Rengi */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-5">
        {/* Uygulama teması */}
        <div>
          <label className="flex items-center gap-1.5 mb-2 text-xs font-bold uppercase tracking-wide text-[var(--primary-text)]">
            <Palette size={13} /> Uygulama Teması
          </label>
          <div className="flex flex-wrap gap-1 p-1 rounded-xl bg-[var(--secondary-bg)] border-2 border-[var(--primary-border)] w-fit max-w-full">
            {themes.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTheme(t.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  theme === t.id
                    ? "bg-[var(--tertiary-bg)] text-[var(--tertiary-text)]"
                    : "text-[var(--primary-text)] hover:text-[var(--secondary-text)]"
                }`}
              >
                {themeIcon(t.id)}
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Vurgu rengi (accent) — temadan bağımsız */}
        <div>
          <label className="flex items-center gap-1.5 mb-2 text-xs font-bold uppercase tracking-wide text-[var(--primary-text)]">
            <Palette size={13} /> Vurgu Rengi
          </label>
          <div className="flex flex-wrap gap-2 items-center">
            {accents.map((a) => {
              const active = accent === a.id;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setAccent(a.id)}
                  title={a.label}
                  aria-label={a.label}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                  style={{
                    backgroundColor: a.accent,
                    boxShadow: active
                      ? `0 0 0 2px var(--primary-bg), 0 0 0 4px ${a.accent}`
                      : "none",
                  }}
                >
                  {active && <Check size={14} style={{ color: a.on }} />}
                </button>
              );
            })}

            {/* Özel renk (hex picker) */}
            <label
              className="relative w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-transform hover:scale-110 overflow-hidden"
              title="Kendi rengin"
              style={{
                background:
                  accent === "custom"
                    ? customAccent
                    : "conic-gradient(from 0deg, #ef4444, #f59e0b, #eab308, #22c55e, #06b6d4, #3b82f6, #a855f7, #ef4444)",
                boxShadow:
                  accent === "custom"
                    ? `0 0 0 2px var(--primary-bg), 0 0 0 4px ${customAccent}`
                    : "none",
              }}
            >
              <input
                type="color"
                value={customAccent}
                onChange={(e) => { setCustomAccent(e.target.value); setAccent("custom"); }}
                onClick={() => setAccent("custom")}
                aria-label="Özel vurgu rengi"
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              {accent === "custom" ? (
                <Check size={14} className="text-white" style={{ filter: "drop-shadow(0 0 1px rgba(0,0,0,.7))" }} />
              ) : (
                <Pipette size={14} className="text-white" style={{ filter: "drop-shadow(0 0 1px rgba(0,0,0,.7))" }} />
              )}
            </label>
          </div>
        </div>
      </div>

      {/* 2. Satır Izgarası: Sohbet Düzeni ve Yazı Tipi */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-5 border-t border-[var(--primary-border)] mb-5">
        {/* Sohbet özelleştirme */}
        <div>
          <label className="flex items-center gap-1.5 mb-3 text-xs font-bold uppercase tracking-wide text-[var(--primary-text)]">
            <MessageSquare size={13} /> Sohbet Düzeni & Yoğunluğu
          </label>

          {/* Sohbet yoğunluğu */}
          <div className="mb-4">
            <span className="block mb-1.5 text-sm text-[var(--secondary-text)] font-medium text-left">
              Sohbet Yoğunluğu
            </span>
            <div className="flex flex-wrap gap-1 p-1 rounded-xl bg-[var(--secondary-bg)] border-2 border-[var(--primary-border)] w-fit max-w-full">
              {[
                { id: "cozy", label: "Rahat (Cozy)" },
                { id: "compact", label: "Kompakt (Compact)" },
              ].map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setChatDensity(d.id)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                    chatDensity === d.id
                      ? "bg-[var(--tertiary-bg)] text-[var(--tertiary-text)]"
                      : "text-[var(--primary-text)] hover:text-[var(--secondary-text)]"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Mesaj balonu stili */}
          <div>
            <span className="block mb-1.5 text-sm text-[var(--secondary-text)] font-medium text-left">
              Mesaj Balonu Stili
            </span>
            <div className="flex flex-wrap gap-1 p-1 rounded-xl bg-[var(--secondary-bg)] border-2 border-[var(--primary-border)] w-fit max-w-full">
              {[
                { id: "classic", label: "Klasik Akış" },
                { id: "bubbles", label: "Modern Balonlar" },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setMessageStyle(s.id)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                    messageStyle === s.id
                      ? "bg-[var(--tertiary-bg)] text-[var(--tertiary-text)]"
                      : "text-[var(--primary-text)] hover:text-[var(--secondary-text)]"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Yazı tipi özelleştirme */}
        <div>
          <label className="flex items-center gap-1.5 mb-3 text-xs font-bold uppercase tracking-wide text-[var(--primary-text)]">
            <Type size={13} /> Yazı Tipi & Boyut
          </label>

          {/* Yazı boyutu */}
          <div className="mb-4">
            <span className="block mb-1.5 text-sm text-[var(--secondary-text)] font-medium text-left">
              Yazı Boyutu
            </span>
            <div className="flex flex-wrap gap-1 p-1 rounded-xl bg-[var(--secondary-bg)] border-2 border-[var(--primary-border)] w-fit max-w-full">
              {[
                { id: "small", label: "Küçük" },
                { id: "standard", label: "Standart" },
                { id: "large", label: "Büyük" },
                { id: "giant", label: "Dev" },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setFontScale(s.id)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                    fontScale === s.id
                      ? "bg-[var(--tertiary-bg)] text-[var(--tertiary-text)]"
                      : "text-[var(--primary-text)] hover:text-[var(--secondary-text)]"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Yazı tipi ailesi */}
          <div>
            <span className="block mb-1.5 text-sm text-[var(--secondary-text)] font-medium text-left">
              Yazı Tipi
            </span>
            <div className="flex flex-wrap gap-1 p-1 rounded-xl bg-[var(--secondary-bg)] border-2 border-[var(--primary-border)] w-fit max-w-full">
              {[
                { id: "inter", label: "Inter (Varsayılan)" },
                { id: "outfit", label: "Outfit" },
                { id: "roboto-mono", label: "Roboto Mono" },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFontFamily(f.id)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                    fontFamily === f.id
                      ? "bg-[var(--tertiary-bg)] text-[var(--tertiary-text)]"
                      : "text-[var(--primary-text)] hover:text-[var(--secondary-text)]"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Satır Izgarası: Canlı Sohbet Önizlemesi ve Arka Plan/Hareket */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-5 border-t border-[var(--primary-border)]">
        {/* Canlı Sohbet Önizlemesi */}
        <div className="flex flex-col h-full justify-between">
          <label className="flex items-center gap-1.5 mb-2 text-xs font-bold uppercase tracking-wide text-[var(--primary-text)]">
            <MessageSquare size={13} /> Canlı Sohbet Önizlemesi
          </label>
          <div 
            className="flex-1 flex flex-col justify-center space-y-3 p-4 rounded-xl bg-[var(--primary-bg)] border border-[var(--primary-border)]/70 shadow-inner min-h-[160px]"
            style={{
              fontSize: fontScale === 'small' ? '13px' : fontScale === 'standard' ? '15px' : fontScale === 'large' ? '17px' : '20px',
              fontFamily: fontFamily === 'inter' ? "'Inter', sans-serif" : fontFamily === 'outfit' ? "'Outfit', sans-serif" : "'Roboto Mono', monospace"
            }}
          >
            {/* Gelen Mesaj */}
            <div className={`flex items-start gap-2.5 ${chatDensity === 'compact' ? 'space-y-0.5' : ''} ${messageStyle === 'bubbles' ? 'flex-row' : ''}`}>
              {chatDensity !== 'compact' && (
                <img src="/defaults/avatars/2.png" alt="" className="w-8 h-8 rounded-full object-cover shrink-0 mt-0.5" />
              )}
              <div className="min-w-0 flex-1">
                {chatDensity !== 'compact' && (
                  <div className="flex items-baseline gap-1.5 mb-0.5 text-left">
                    <span className="text-xs font-bold text-[var(--secondary-text)]">Arkadaşın</span>
                    <span className="text-[10px] text-[var(--primary-text)]">12:34</span>
                  </div>
                )}
                <div 
                  className={`text-[var(--secondary-text)] break-words text-left ${
                    messageStyle === 'bubbles' 
                      ? 'bg-neutral-800/60 border border-neutral-700/80 px-3 py-1.5 rounded-r-xl rounded-bl-xl inline-block max-w-[85%] shadow-sm border-l-4 border-l-[var(--accent)] text-xs' 
                      : 'text-sm'
                  }`}
                  style={{
                    backgroundColor: theme === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.06)',
                    borderColor: theme === 'light' ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)'
                  }}
                >
                  Staple sohbet arayüzünü buradan özelleştirebilirsin.
                </div>
              </div>
            </div>

            {/* Giden Mesaj */}
            <div className={`flex items-start gap-2.5 ${chatDensity === 'compact' ? 'space-y-0.5' : ''} ${messageStyle === 'bubbles' ? 'flex-row-reverse text-right' : ''}`}>
              {chatDensity !== 'compact' && (
                <img src="/defaults/avatars/1.png" alt="" className="w-8 h-8 rounded-full object-cover shrink-0 mt-0.5" />
              )}
              <div className="min-w-0 flex-1">
                {chatDensity !== 'compact' && (
                  <div className="flex items-baseline gap-1.5 mb-0.5 justify-end">
                    <span className="text-xs font-bold text-[var(--secondary-text)]">Sen</span>
                    <span className="text-[10px] text-[var(--primary-text)]">12:35</span>
                  </div>
                )}
                <div 
                  className={`text-[var(--secondary-text)] break-words text-left ${
                    messageStyle === 'bubbles' 
                      ? 'bg-[var(--tertiary-bg)] text-[var(--tertiary-text)] border border-[var(--tertiary-border)] px-3 py-1.5 rounded-l-xl rounded-br-xl inline-block max-w-[85%] shadow-sm text-xs' 
                      : 'text-sm'
                  }`}
                >
                  <span style={{ color: messageStyle === 'bubbles' ? 'var(--tertiary-text)' : 'inherit' }}>
                    Değişiklikler anında yansıyor!
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Arka Plan & Hareket */}
        <div className="flex flex-col justify-between">
          <div>
            <label className="flex items-center gap-1.5 mb-3 text-xs font-bold uppercase tracking-wide text-[var(--primary-text)]">
              <Grid2x2 size={13} /> Arka Plan & Hareket
            </label>

            {/* Desen boyutu */}
            <div className="mb-4">
              <span className="block mb-1.5 text-sm text-[var(--secondary-text)] font-medium text-left">
                Desen boyutu
              </span>
              <div className="flex flex-wrap gap-1 p-1 rounded-xl bg-[var(--secondary-bg)] border-2 border-[var(--primary-border)] w-fit max-w-full">
                {tileSizes.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTileSize(t.id)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                      tileSize === t.id
                        ? "bg-[var(--tertiary-bg)] text-[var(--tertiary-text)]"
                        : "text-[var(--primary-text)] hover:text-[var(--secondary-text)]"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Toggle
              checked={parallax}
              onChange={setParallax}
              icon={<Sparkles size={14} />}
              label="Parallax arka plan"
              hint="Fare hareketiyle arka plan hafifçe kayar."
            />
            <Toggle
              checked={reduceMotion}
              onChange={setReduceMotion}
              icon={<Zap size={14} />}
              label="Hareketi azalt"
              hint="Animasyonları ve parallax'ı kapatır."
            />
          </div>
        </div>
      </div>
    </section>
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
    <section className="bg-[var(--primary-bg)] rounded-2xl p-6 shadow-xl border border-[var(--primary-border)]">
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
      style={{ paddingLeft: isMobile ? "0px" : "var(--navigator-width, 64px)", transition: "padding-left 0.2s ease-in-out" }}
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
        <div className="max-w-7xl mx-auto px-4 py-10">
          <h1 className="text-3xl font-black mb-8 text-[var(--secondary-text)]">Ayarlar</h1>

          <div className="space-y-6">
            {/* Görünüm: tema + vurgu rengi (Tam Genişlik) */}
            <AppearanceSettings />

            {/* Diğer Ayarlar: Profil, Ses, Hesap (İki Sütun) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {/* Sol Sütun: Profil ve Hesap */}
              <div className="space-y-6">
                {/* Profil özeti + düzenle */}
                <section className="bg-[var(--primary-bg)] rounded-2xl p-6 shadow-xl border border-[var(--primary-border)]">
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
                      <Pencil size={15} /> Düzenle
                    </button>
                  </div>
                </section>

                {/* Hesap işlemleri */}
                <section className="bg-[var(--primary-bg)] rounded-2xl p-6 shadow-xl border border-[var(--primary-border)]">
                  <h2 className="text-lg font-semibold mb-4 text-[var(--quaternary-text)]">
                    Hesap
                  </h2>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 px-6 py-3 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors w-full sm:w-auto justify-center"
                    >
                      <FaPowerOff size={18} />
                      Çıkış Yap
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="flex items-center gap-3 px-6 py-3 rounded-xl bg-transparent text-red-400 font-semibold border-2 border-red-500/60 hover:bg-red-500 hover:text-white transition-colors w-full sm:w-auto justify-center"
                    >
                      <Trash2 size={18} />
                      Hesabı Sil
                    </button>
                  </div>
                </section>
              </div>

              {/* Sağ Sütun: Ses Cihazları */}
              <div className="space-y-6">
                <AudioDeviceSettings />
              </div>
            </div>
          </div>
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
                        navigate("/ProfileSettings");
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
