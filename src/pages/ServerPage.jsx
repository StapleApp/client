import SvSidebar from "../components/SvSidebar"; // Sidebar bileşeni (senin kodun)
import { useParams } from "react-router-dom";

const ServerPage = () => {
  const { serverID } = useParams();

  // Şu anlık dummy veri gönderiyoruz sadece render olup olmadığını test etmek için
  return (
    <div className="flex">
      <SvSidebar /> {/* herhangi bir prop geçmiyoruz */}
    </div>
  );
};

export default ServerPage;