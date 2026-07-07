import SvSidebar from "./SvSidebar";
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { getServerById } from "../../services/serverService";

const ServerPage = () => {
  const { serverId } = useParams();
  const [serverData, setServerData] = useState(null);

  useEffect(() => {
    const fetchServer = async () => {
      const data = await getServerById(serverId);
      console.log("Sunucu verisi:", data);
      setServerData(data);
    };
    fetchServer();
  }, [serverId]);

  if (!serverData) return <div className="text-[var(--secondary-text)] p-8">Loading server data...</div>;

  return (
    <div className="flex">
      <SvSidebar serverData={serverData} />
    </div>
  );
};

export default ServerPage;
