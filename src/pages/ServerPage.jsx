import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { getServerById } from "../../firebase"; // sunucu bilgilerini çekecek fonksiyon

const ServerPage = () => {
  const { serverID } = useParams();
  const [serverData, setServerData] = useState(null);

  useEffect(() => {
    const fetchServer = async () => {
      const data = await getServerById(serverID);
      setServerData(data);
    };
    fetchServer();
  }, [serverID]);

  return (
    <div className="flex">
      {serverData && <SvSidebar server={serverData} />}
      {/* Diğer içerikler */}
    </div>
  );
};

export default ServerPage;