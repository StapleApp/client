import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { IoIosSearch, IoMdPersonAdd } from "react-icons/io";

const SearchServer = () => {
  const [searchInput, setSearchInput] = useState("");
  const [searchType, setSearchType] = useState("id"); // "id" or "tag"
  const [servers, setServers] = useState([]);
  const [filteredServers, setFilteredServers] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Sample tags for demonstration
  const popularTags = ["Eğlence", "Oyun", "Tanışma", "Müzik", "Spor", "Sanat", "Teknoloji", "Film"];

  // Sample server data for demonstration
  const sampleServers = [
    { id: "12345", name: "Oyun Dünyası", tags: ["Oyun", "Eğlence"], isPublic: true, members: 1250, description: "Oyun severler için eğlenceli bir ortam!" },
    { id: "67890", name: "Müzik Kulübü", tags: ["Müzik", "Sanat"], isPublic: true, members: 842, description: "Müzik tutkunları için özel sohbet ortamı." },
    { id: "24680", name: "Teknoloji Meraklıları", tags: ["Teknoloji", "Oyun"], isPublic: true, members: 1560, description: "En son teknoloji haberlerini tartışıyoruz." },
    { id: "13579", name: "Film & Dizi", tags: ["Film", "Eğlence"], isPublic: true, members: 765, description: "Film ve dizi önerileri, tartışmalar." },
    { id: "86420", name: "Arkadaş Bulma", tags: ["Tanışma", "Eğlence"], isPublic: true, members: 2130, description: "Yeni insanlarla tanışmak için harika bir yer!" },
  ];

  useEffect(() => {
    // Simulating server fetch
    setServers(sampleServers);
  }, []);

  useEffect(() => {
    if (searchType === "id") {
      // Filter by ID
      setFilteredServers(
        servers.filter((server) => 
          server.isPublic && server.id.includes(searchInput)
        )
      );
    } else {
      // Filter by selected tags
      if (selectedTags.length === 0) {
        setFilteredServers(servers.filter(server => server.isPublic));
      } else {
        setFilteredServers(
          servers.filter((server) => 
            server.isPublic && selectedTags.some(tag => server.tags.includes(tag))
          )
        );
      }
    }
  }, [searchInput, servers, searchType, selectedTags]);

  const handleSearch = () => {
    setIsLoading(true);
    
    // Simulate loading
    setTimeout(() => {
      setIsLoading(false);
    }, 800);
  };

  const handleTagClick = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
      setSearchType("tag");
    }
  };

  const handleJoinServer = (serverId) => {
    console.log("Joining server:", serverId);
    // Would handle server join logic here
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 100 }}
      transition={{ duration: 0.1 }}
      className="background fixed top-0 left-0 w-full h-screen bg-[var(--secondary-bg)] text-[var(--secondary-text)] overflow-y-auto"
      style={{ paddingLeft: "80px" }} // Sol kenar çubuğuna yer açmak için padding ekledik
    >
      <div className="container mx-auto px-4 py-8">
        
        {/* Search Type Toggle */}
        <div className="flex justify-center mb-6">
          <button 
            onClick={() => setSearchType("id")} 
            className={`px-4 py-2 rounded-l-lg ${searchType === "id" ? 
              "bg-[var(--tertiary-bg)] text-[var(--tertiary-text)]" : 
              "bg-[var(--primary-bg)] text-[var(--secondary-text)]"}`}
          >
            ID ile Ara
          </button>
          <button 
            onClick={() => setSearchType("tag")} 
            className={`px-4 py-2 rounded-r-lg ${searchType === "tag" ? 
              "bg-[var(--tertiary-bg)] text-[var(--tertiary-text)]" : 
              "bg-[var(--primary-bg)] text-[var(--secondary-text)]"}`}
          >
            Etiket ile Ara
          </button>
        </div>
        
        {/* Search Bar */}
        {searchType === "id" && (
          <div className="flex items-center justify-center relative w-full max-w-xl mx-auto mb-6">
            <input
              type="text"
              placeholder="Sunucu ID'si girin..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full p-3 rounded-lg border-2 border-[var(--secondary-border)] focus:outline-none focus:border-[var(--tertiary-border)] bg-[var(--primary-bg)] text-[var(--secondary-text)]"
            />
            <button
              onClick={handleSearch}
              className="ml-2 p-3 text-[var(--tertiary-text)] rounded-lg border-2 border-[var(--tertiary-border)] hover:bg-[var(--quaternary-bg)] bg-[var(--tertiary-bg)]"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Aranıyor
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  <IoIosSearch size={20} className="mr-1" /> Ara
                </span>
              )}
            </button>
          </div>
        )}
        
        {/* Tag Selection */}
        {searchType === "tag" && (
          <div className="mb-6">
            <p className="text-center mb-3">Popüler Etiketler</p>
            <div className="flex flex-wrap justify-center gap-2 max-w-xl mx-auto">
              {popularTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleTagClick(tag)}
                  className={`px-3 py-1 rounded-full border ${
                    selectedTags.includes(tag)
                      ? "bg-[var(--tertiary-bg)] text-[var(--tertiary-text)] border-[var(--tertiary-border)]"
                      : "bg-[var(--primary-bg)] text-[var(--secondary-text)] border-[var(--secondary-border)] hover:border-[var(--tertiary-border)]"
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Search Results */}
        <div className="mt-8">
          <h2 className="text-xl mb-4 font-semibold">
            {filteredServers.length > 0 ? 
              "Bulunan Sunucu" : 
              searchInput || selectedTags.length > 0 ? 
                "Sunucu bulunamadı" : 
                "Herkese açık sunucular"}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredServers.map((server) => (
              <motion.div
                key={server.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-[var(--primary-bg)] p-4 rounded-lg border-2 border-[var(--secondary-border)] hover:border-[var(--tertiary-border)]"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg">{server.name}</h3>
                  <span className="text-sm bg-[var(--tertiary-bg)] text-[var(--tertiary-text)] px-2 py-1 rounded-full">
                    {server.members} üye
                  </span>
                </div>
                <p className="text-sm mb-3 text-[var(--primary-text)]">{server.description}</p>
                <div className="flex flex-wrap gap-1 mb-3">
                  {server.tags.map((tag) => (
                    <span key={tag} className="text-xs px-2 py-1 bg-[var(--secondary-bg)] rounded-full">
                      #{tag}
                    </span>
                  ))}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[var(--primary-text)]">ID: {server.id}</span>
                  <button
                    onClick={() => handleJoinServer(server.id)}
                    className="flex items-center bg-[var(--tertiary-bg)] text-[var(--tertiary-text)] px-3 py-1 rounded-lg hover:bg-[var(--quaternary-bg)]"
                  >
                    <IoMdPersonAdd size={16} className="mr-1" /> Katıl
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
          
          {/* Pagination or Load More button would go here */}
          {filteredServers.length > 0 && (
            <div className="mt-6 text-center">
              <button className="bg-[var(--primary-bg)] text-[var(--secondary-text)] px-4 py-2 rounded-lg border border-[var(--secondary-border)] hover:border-[var(--tertiary-border)]">
                Daha Fazla Göster
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default SearchServer;