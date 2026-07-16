// Sesli kanal giriş/çıkış bildirim efektleri (Discord benzeri).
// Ses dosyası taşımamak için tonlar Web Audio API ile sentezlenir.
// İki notalı: giriş = yükselen, çıkış = alçalan.

let ctx = null;

const getCtx = () => {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  // Tarayıcı otomatik oynatmayı askıya almış olabilir; kullanıcı zaten
  // kanala tıklayarak etkileşimde bulunduğu için resume güvenli.
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
};

// İki sinüs tonunu ardışık, yumuşak zarfla çalar.
const playTones = (freqs, { gain = 0.12, dur = 0.12, gap = 0.09 } = {}) => {
  const ac = getCtx();
  if (!ac) return;
  const now = ac.currentTime;
  freqs.forEach((f, i) => {
    const t0 = now + i * gap;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(f, t0);
    // Hızlı attack + yumuşak release → tıklama sesi olmadan "pluck" hissi
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  });
};

// Yükselen iki nota — birisi (veya sen) kanala girdi.
export const playJoinSound = () => playTones([523.25, 783.99]); // C5 -> G5

// Alçalan iki nota — birisi (veya sen) kanaldan çıktı.
export const playLeaveSound = () => playTones([659.25, 415.3]); // E5 -> G#4
