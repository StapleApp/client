import SvSidebar from "../components/SvSidebar"; // Sidebar bileşeni (senin kodun)
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { getServerById } from "../../firebase"; 

const ServerPage = () => {
  const { serverId } = useParams();
  const [serverData, setServerData] = useState(null);

  useEffect(() => {
    console.log("Server ID:", serverId); 
    const fetchServer = async () => {
      const data = await getServerById(serverId);
      console.log("Sunucu verisi:", data); // Tüm server bilgilerini burada yazdır
      setServerData(data);
    };
    fetchServer();
  }, [serverId]);


  // Şu anlık dummy veri gönderiyoruz sadece render olup olmadığını test etmek için
  return (
    <div className="flex">
      {serverData && <SvSidebar serverData={serverData} />} {/* serverData prop'u eklendi */}
    </div>
  );

};

export default ServerPage;