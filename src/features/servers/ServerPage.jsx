import SvSidebar from "./SvSidebar";

import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Lock, Compass, ArrowLeft, Loader2, UserPlus } from "lucide-react";
import { getServerById, joinServer } from "../../services/serverService";
import { useAuth } from "../../context/AuthContext";
import fallbackIcon from "../../assets/branding/staple-icon.png";

const ServerPage = () => {
  const { serverId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [serverData, setServerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  const fetchServer = useCallback(async () => {
    setLoading(true);
    const data = await getServerById(serverId);
    setServerData(data);
    setLoading(false);
  }, [serverId]);

  useEffect(() => {
    fetchServer();
  }, [fetchServer]);

  if (loading && !serverData) return <ServerSkeleton />;

  // Üyelik kontrolü: RLS içerik (kanal/mesaj) sızdırmasa da nazik bir ekran gösterelim.
  const isMember =
    !!serverData &&
    !!currentUser?.uid &&
    (serverData.ServerOwnerID === currentUser.uid ||
      (serverData.Users || []).some((u) => u.UserID === currentUser.uid));

  // Üye değilsen: public ise doğrudan katıl, private ise davet gerekli.
  if (serverData && !isMember) {
    const isPrivate = serverData.ServerType === "private";

    const handleJoin = async () => {
      setJoining(true);
      const ok = await joinServer(serverData.ServerId, currentUser.uid);
      setJoining(false);
      if (ok) fetchServer();
    };

    return (
      <div className="fixed inset-0 bg-[var(--secondary-bg)] text-[var(--secondary-text)] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="w-full max-w-md rounded-2xl border-2 border-[var(--primary-border)] bg-[var(--primary-bg)] p-6 text-center flex flex-col items-center gap-3 shadow-2xl"
        >
          <img
            src={serverData.ServerPhotoURL || fallbackIcon}
            alt=""
            onError={(e) => (e.currentTarget.src = fallbackIcon)}
            className="w-16 h-16 rounded-2xl object-cover bg-[var(--secondary-bg)]"
          />
          <h1 className="text-xl font-bold truncate max-w-full">{serverData.ServerName}</h1>

          {isPrivate ? (
            <>
              <div className="w-11 h-11 rounded-full bg-[var(--secondary-bg)] flex items-center justify-center">
                <Lock size={20} className="text-[var(--primary-text)]" />
              </div>
              <p className="text-sm text-[var(--primary-text)]">
                Bu özel bir sunucu. Katılmak için bir davet bağlantısına ihtiyacın var.
              </p>
              <button
                onClick={() => navigate("/")}
                className="mt-1 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--tertiary-bg)] text-[var(--tertiary-text)] font-semibold text-sm hover:bg-[var(--quaternary-bg)] transition-colors"
              >
                <ArrowLeft size={15} /> Ana Sayfaya Dön
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-[var(--primary-text)]">
                Bu sunucunun üyesi değilsin. Katılarak içeriği görebilirsin.
              </p>
              <div className="flex items-center gap-2 mt-1">
                <button
                  onClick={() => navigate("/SearchServer")}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--secondary-bg)] text-[var(--secondary-text)] font-semibold text-sm hover:text-[var(--tertiary-text)] transition-colors"
                >
                  <Compass size={15} /> Keşfet
                </button>
                <button
                  onClick={handleJoin}
                  disabled={joining}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--tertiary-bg)] text-[var(--tertiary-text)] font-bold text-sm hover:bg-[var(--quaternary-bg)] disabled:opacity-50 transition-colors"
                >
                  {joining ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
                  {joining ? "Katılınıyor…" : "Katıl"}
                </button>
              </div>
            </>
          )}
        </motion.div>
      </div>
    );
  }

  if (!serverData) return <ServerSkeleton />;

  return (
    <div className="flex">
      <SvSidebar serverData={serverData} onRefresh={fetchServer} />
    </div>
  );
};

// Sunucu yüklenirken gösterilen iskelet (gerçek düzeni taklit eder)
const ServerSkeleton = () => (
  <div className="animate-pulse">
    {/* Kanal sidebar iskeleti */}
    <div className="fixed left-16 top-0 h-screen w-64 bg-[var(--primary-bg)] border-l border-r border-[var(--primary-border)] flex flex-col z-30">
      <div className="h-28 w-full bg-[var(--secondary-bg)]" />
      <div className="p-2">
        <div className="h-9 w-full rounded-xl bg-[var(--secondary-bg)]" />
      </div>
      <div className="px-2 flex flex-col gap-2 mt-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-7 w-full rounded-lg bg-[var(--secondary-bg)]" />
        ))}
      </div>
    </div>
    {/* İçerik iskeleti */}
    <div className="fixed top-0 left-80 right-0 h-screen bg-[var(--secondary-bg)] flex items-center justify-center">
      <div className="w-16 h-16 rounded-full bg-[var(--primary-bg)]" />
    </div>
  </div>
);

export default ServerPage;
