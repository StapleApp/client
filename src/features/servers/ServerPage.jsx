import SvSidebar from "./SvSidebar";
import SocialBar from "../../Components/layout/SocialBar";
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { getServerById } from "../../services/serverService";

const ServerPage = () => {
  const { serverId } = useParams();
  const [serverData, setServerData] = useState(null);

  useEffect(() => {
    const fetchServer = async () => {
      const data = await getServerById(serverId);
      setServerData(data);
    };
    fetchServer();
  }, [serverId]);

  if (!serverData) return <ServerSkeleton />;

  return (
    <div className="flex">
      <SvSidebar serverData={serverData} />
      <SocialBar defaultTab="servers" />
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
    <div className="fixed top-0 left-80 right-48 h-screen bg-[var(--secondary-bg)] flex items-center justify-center">
      <div className="w-16 h-16 rounded-full bg-[var(--primary-bg)]" />
    </div>
  </div>
);

export default ServerPage;
