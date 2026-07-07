import { motion } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import { IoIosSearch, IoMdPersonAdd } from "react-icons/io";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getPublicServers, joinServer } from "../../firebase";

const SearchServer = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [searchInput, setSearchInput] = useState("");
  const [servers, setServers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [joiningId, setJoiningId] = useState(null);

  const loadServers = async () => {
    setIsLoading(true);
    const list = await getPublicServers();
    setServers(list);
    setIsLoading(false);
  };

  useEffect(() => {
    loadServers();
  }, []);

  // Ada veya ID'ye göre filtrele
  const filteredServers = useMemo(() => {
    const term = searchInput.trim().toLowerCase();
    if (!term) return servers;
    return servers.filter(
      (s) =>
        s.name?.toLowerCase().includes(term) ||
        s.serverID?.toLowerCase().includes(term)
    );
  }, [searchInput, servers]);

  const handleJoinServer = async (serverID) => {
    if (!currentUser) return;
    setJoiningId(serverID);
    const ok = await joinServer(serverID, currentUser.uid);
    setJoiningId(null);
    if (ok) {
      navigate(`/server/${serverID}`);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 100 }}
      transition={{ duration: 0.1 }}
      className="background fixed top-0 left-0 w-full h-screen bg-[var(--secondary-bg)] text-[var(--secondary-text)] overflow-y-auto"
      style={{ paddingLeft: "80px" }}
    >
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6 text-center">Sunucu Keşfet</h1>

        {/* Arama Çubuğu */}
        <div className="flex items-center justify-center relative w-full max-w-xl mx-auto mb-8">
          <input
            type="text"
            placeholder="Sunucu adı veya ID ile ara..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full p-3 rounded-lg border-2 border-[var(--secondary-border)] focus:outline-none focus:border-[var(--tertiary-border)] bg-[var(--primary-bg)] text-[var(--secondary-text)]"
          />
          <button
            onClick={loadServers}
            className="ml-2 p-3 text-[var(--tertiary-text)] rounded-lg border-2 border-[var(--tertiary-border)] hover:bg-[var(--quaternary-bg)] bg-[var(--tertiary-bg)]"
            title="Yenile"
          >
            <IoIosSearch size={20} />
          </button>
        </div>

        {/* Sonuçlar */}
        <div className="mt-4">
          <h2 className="text-xl mb-4 font-semibold">
            {isLoading
              ? "Yükleniyor..."
              : filteredServers.length > 0
              ? "Herkese açık sunucular"
              : searchInput
              ? "Sunucu bulunamadı"
              : "Henüz herkese açık sunucu yok"}
          </h2>

          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <svg className="animate-spin h-8 w-8 text-[var(--tertiary-text)]" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredServers.map((server) => (
                <motion.div
                  key={server.serverID}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="bg-[var(--primary-bg)] p-4 rounded-lg border-2 border-[var(--secondary-border)] hover:border-[var(--tertiary-border)] flex flex-col"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg break-all">{server.name}</h3>
                    <span className="text-sm bg-[var(--tertiary-bg)] text-[var(--tertiary-text)] px-2 py-1 rounded-full whitespace-nowrap">
                      {server.memberCount} üye
                    </span>
                  </div>
                  <p className="text-sm mb-3 text-[var(--primary-text)] min-h-[1.25rem]">
                    {server.description || "Açıklama yok."}
                  </p>
                  {server.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {server.tags.map((tag) => (
                        <span key={tag} className="text-xs px-2 py-1 bg-[var(--secondary-bg)] rounded-full">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex justify-between items-center mt-auto pt-2">
                    <span className="text-xs text-[var(--primary-text)] break-all">ID: {server.serverID}</span>
                    <button
                      onClick={() => handleJoinServer(server.serverID)}
                      disabled={joiningId === server.serverID}
                      className="flex items-center bg-[var(--tertiary-bg)] text-[var(--tertiary-text)] px-3 py-1 rounded-lg hover:bg-[var(--quaternary-bg)] disabled:opacity-50 whitespace-nowrap"
                    >
                      <IoMdPersonAdd size={16} className="mr-1" />
                      {joiningId === server.serverID ? "Katılınıyor..." : "Katıl"}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default SearchServer;
