import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, Users, ArrowLeft, Lock, Check } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { getInviteInfo, joinServerWithInvite } from "../../services/serverService";
import fallbackIcon from "../../assets/branding/staple-icon.svg";

// Davet bağlantısı sayfası: /invite/:code
// Giriş yapmış kullanıcıya sunucu önizlemesini gösterir ve "Katıl" ile
// join_server_with_invite RPC'sini çağırır (özel sunuculara tek katılım yolu).
const InvitePage = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [info, setInfo] = useState(undefined); // undefined=yükleniyor, null=geçersiz
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    let alive = true;
    getInviteInfo(code).then((res) => {
      if (alive) setInfo(res);
    });
    return () => {
      alive = false;
    };
  }, [code]);

  const handleJoin = async () => {
    if (!currentUser) {
      navigate("/login");
      return;
    }
    setJoining(true);
    const serverId = await joinServerWithInvite(code);
    setJoining(false);
    if (serverId) {
      toast.success("Sunucuya katıldın!");
      navigate(`/server/${serverId}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-[var(--secondary-bg)] text-[var(--secondary-text)] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-md rounded-2xl border-2 border-[var(--primary-border)] bg-[var(--primary-bg)] overflow-hidden shadow-2xl"
      >
        {info === undefined ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-[var(--primary-text)]">
            <Loader2 size={28} className="animate-spin" />
            <p className="text-sm">Davet kontrol ediliyor…</p>
          </div>
        ) : info === null || !info.valid ? (
          <div className="flex flex-col items-center justify-center py-14 px-6 text-center gap-3">
            <div className="w-14 h-14 rounded-full bg-[var(--secondary-bg)] flex items-center justify-center">
              <Lock size={24} className="text-[var(--primary-text)]" />
            </div>
            <h1 className="text-lg font-bold">Geçersiz davet</h1>
            <p className="text-sm text-[var(--primary-text)]">
              Bu davet bağlantısı geçersiz, süresi dolmuş ya da kullanım limiti dolmuş.
            </p>
            <button
              onClick={() => navigate("/")}
              className="mt-2 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--tertiary-bg)] text-[var(--tertiary-text)] font-semibold text-sm hover:bg-[var(--quaternary-bg)] transition-colors"
            >
              <ArrowLeft size={15} /> Ana Sayfaya Dön
            </button>
          </div>
        ) : (
          <>
            <div className="h-20 bg-[var(--secondary-bg)]" />
            <div className="px-6 pb-6 -mt-10 flex flex-col items-center text-center">
              <img
                src={info.photo || fallbackIcon}
                alt=""
                onError={(e) => (e.currentTarget.src = fallbackIcon)}
                className="w-20 h-20 rounded-2xl border-4 border-[var(--primary-bg)] object-cover bg-[var(--secondary-bg)]"
              />
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-[var(--primary-text)]">
                Sunucuya davet edildin
              </p>
              <h1 className="mt-1 text-2xl font-bold truncate max-w-full">{info.name}</h1>
              <span className="mt-1 inline-flex items-center gap-1.5 text-sm text-[var(--primary-text)]">
                <Users size={14} /> {info.memberCount} üye
              </span>
              {info.description && (
                <p className="mt-3 text-sm text-[var(--primary-text)] line-clamp-3">
                  {info.description}
                </p>
              )}

              {info.alreadyMember ? (
                <button
                  onClick={() => navigate(`/server/${info.serverId}`)}
                  className="mt-5 w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[var(--secondary-bg)] text-[var(--secondary-text)] font-bold text-sm hover:text-[var(--tertiary-text)] transition-colors"
                >
                  <Check size={16} /> Zaten üyesin — Aç
                </button>
              ) : (
                <button
                  onClick={handleJoin}
                  disabled={joining}
                  className="mt-5 w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[var(--tertiary-bg)] text-[var(--tertiary-text)] font-bold text-sm hover:bg-[var(--quaternary-bg)] disabled:opacity-50 transition-colors"
                >
                  {joining ? <Loader2 size={16} className="animate-spin" /> : null}
                  {joining ? "Katılınıyor…" : "Sunucuya Katıl"}
                </button>
              )}

              <button
                onClick={() => navigate("/")}
                className="mt-2 text-xs text-[var(--primary-text)] hover:text-[var(--secondary-text)] transition-colors"
              >
                Vazgeç
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default InvitePage;
