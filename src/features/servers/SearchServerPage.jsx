import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import { IoIosSearch, IoMdPersonAdd, IoMdCheckmarkCircle } from "react-icons/io";
import { useNavigate } from "react-router-dom";
import { Menu, Compass, Tag as TagIcon, Users, X, RefreshCw, Home, UserPlus, Settings, User, Link2, ArrowRight } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useMobileMenu } from "../../context/MobileMenuContext";
import { getPublicServers, joinServer, getServersList, parseInviteCode } from "../../services/serverService";
import fallbackIcon from "../../assets/branding/staple-icon.png";
import Navigator from "../../Components/layout/Navigator";

const SearchServerPage = () => {
  const { currentUser } = useAuth();
  const { isMobile, isOpen, setIsOpen } = useMobileMenu();
  const navigate = useNavigate();

  const [searchInput, setSearchInput] = useState("");
  const [servers, setServers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [joiningId, setJoiningId] = useState(null);
  const [memberIds, setMemberIds] = useState(() => new Set()); // üye olunan sunucu id'leri
  const [selectedTags, setSelectedTags] = useState([]); // seçili filtre etiketleri
  const [inviteInput, setInviteInput] = useState(""); // davet kodu/bağlantısı

  // Davet kodu ya da bağlantısıyla davet önizleme sayfasına git.
  const goToInvite = () => {
    const code = parseInviteCode(inviteInput);
    if (!code) return;
    navigate(`/invite/${code}`);
  };

  const loadServers = async () => {
    setIsLoading(true);
    const [list, mine] = await Promise.all([
      getPublicServers(),
      currentUser ? getServersList(currentUser.uid) : Promise.resolve([]),
    ]);
    setServers(list);
    setMemberIds(new Set((mine || []).map((s) => s.ServerId)));
    setIsLoading(false);
  };

  useEffect(() => {
    loadServers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.uid]);

  // Tüm sunuculardaki benzersiz etiketler (sunucu sayısına göre azalan sırada)
  const allTags = useMemo(() => {
    const counts = new Map();
    servers.forEach((s) =>
      (s.tags || []).forEach((t) => counts.set(t, (counts.get(t) || 0) + 1))
    );
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "tr"))
      .map(([tag, count]) => ({ tag, count }));
  }, [servers]);

  const toggleTag = (tag) =>
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );

  const filteredServers = useMemo(() => {
    const term = searchInput.trim().toLowerCase();
    return servers.filter((s) => {
      const matchesName = !term || s.name?.toLowerCase().includes(term);
      const matchesTags =
        selectedTags.length === 0 ||
        selectedTags.some((t) => (s.tags || []).includes(t));
      return matchesName && matchesTags;
    });
  }, [searchInput, servers, selectedTags]);

  const handleJoinServer = async (serverID) => {
    if (!currentUser) return;
    setJoiningId(serverID);
    const ok = await joinServer(serverID, currentUser.uid);
    setJoiningId(null);
    if (ok) {
      navigate(`/server/${serverID}`);
    }
  };

  const hasFilters = !!searchInput.trim() || selectedTags.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 100 }}
      transition={{ duration: 0.1 }}
      className="background fixed top-0 left-0 w-full h-screen bg-[var(--secondary-bg)] text-[var(--secondary-text)] overflow-hidden flex flex-col"
      style={{ paddingLeft: isMobile ? "0px" : "64px" }}
    >
      {isMobile && (
        <div className="flex items-center h-[60px] px-5 py-4 bg-[var(--primary-bg)] border-b-2 border-[var(--primary-border)] text-[var(--secondary-text)] shrink-0 z-30">
          <button
            onClick={() => setIsOpen(true)}
            className="p-1.5 rounded-lg hover:bg-[var(--secondary-bg)] transition-colors mr-3 text-[var(--secondary-text)]"
            aria-label="Menüyü Aç"
          >
            <Menu size={20} />
          </button>
          <span className="font-bold truncate text-lg">Sunucu Keşfet</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {/* Başlık şeridi */}
        <div className="relative overflow-hidden border-b-2 border-[var(--primary-border)] bg-[var(--primary-bg)]">
          <div className="container mx-auto px-6 py-10 text-left">
            <div className="flex items-center gap-3 mb-2">
              <span className="grid place-items-center w-11 h-11 rounded-xl bg-[var(--tertiary-bg)] text-[var(--tertiary-text)] shrink-0">
                <Compass size={24} />
              </span>
              <div>
                <h1 className="text-2xl font-bold leading-tight">Sunucu Keşfet</h1>
                <p className="text-sm text-[var(--primary-text)]">
                  İlgi alanına göre topluluklara katıl.
                </p>
              </div>
            </div>

            {/* Arama Çubuğu */}
            <div className="flex items-center gap-2 w-full max-w-xl mt-5">
              <div className="relative flex-1">
                <IoIosSearch
                  size={20}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--primary-text)]"
                />
                <input
                  type="text"
                  placeholder="Sunucu adıyla ara..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full pl-10 pr-9 py-3 rounded-xl border-2 border-[var(--secondary-border)] focus:outline-none focus:border-[var(--tertiary-border)] bg-[var(--secondary-bg)] text-[var(--secondary-text)] placeholder:text-[var(--primary-text)] transition-colors"
                />
                {searchInput && (
                  <button
                    onClick={() => setSearchInput("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-[var(--primary-text)] hover:text-[var(--secondary-text)] transition-colors"
                    aria-label="Aramayı temizle"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              <button
                onClick={loadServers}
                className="p-3 text-[var(--tertiary-text)] rounded-xl border-2 border-[var(--tertiary-border)] hover:bg-[var(--quaternary-bg)] bg-[var(--tertiary-bg)] transition-colors"
                title="Yenile"
                aria-label="Yenile"
              >
                <RefreshCw size={18} />
              </button>
            </div>

            {/* Davet koduyla katıl — özel sunuculara giriş yolu */}
            <div className="flex items-center gap-2 w-full max-w-xl mt-3">
              <div className="relative flex-1">
                <Link2
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--primary-text)]"
                />
                <input
                  type="text"
                  placeholder="Davet kodu veya bağlantısı ile katıl…"
                  value={inviteInput}
                  onChange={(e) => setInviteInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && goToInvite()}
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border-2 border-[var(--secondary-border)] focus:outline-none focus:border-[var(--tertiary-border)] bg-[var(--secondary-bg)] text-[var(--secondary-text)] placeholder:text-[var(--primary-text)] text-sm transition-colors"
                />
              </div>
              <button
                onClick={goToInvite}
                disabled={!inviteInput.trim()}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[var(--primary-bg)] border-2 border-[var(--secondary-border)] text-[var(--secondary-text)] font-semibold text-sm hover:border-[var(--tertiary-border)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Davetle katıl"
              >
                Katıl <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-6 py-6">
          {/* Etiket filtresi */}
          {allTags.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-wide text-[var(--primary-text)]">
                <TagIcon size={13} /> Etiketlere göre filtrele
                {selectedTags.length > 0 && (
                  <button
                    onClick={() => setSelectedTags([])}
                    className="ml-1 normal-case font-normal text-[var(--tertiary-text)] hover:underline"
                  >
                    temizle
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {allTags.map(({ tag, count }) => {
                  const active = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                        active
                          ? "bg-[var(--tertiary-bg)] text-[var(--tertiary-text)] border-[var(--tertiary-border)]"
                          : "bg-[var(--primary-bg)] text-[var(--secondary-text)] border-[var(--secondary-border)] hover:border-[var(--tertiary-border)]"
                      }`}
                    >
                      #{tag}
                      <span className={active ? "opacity-80" : "text-[var(--primary-text)]"}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sonuç başlığı */}
          <h2 className="text-lg mb-4 font-semibold flex items-center gap-2">
            {isLoading
              ? "Yükleniyor..."
              : filteredServers.length > 0
              ? `${filteredServers.length} sunucu`
              : hasFilters
              ? "Eşleşen sunucu yok"
              : "Henüz herkese açık sunucu yok"}
          </h2>

          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <svg className="animate-spin h-8 w-8 text-[var(--tertiary-text)]" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          ) : filteredServers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-[var(--primary-text)]">
              <Compass size={40} className="mb-3 opacity-50" />
              <p className="text-sm">
                {hasFilters
                  ? "Arama veya filtrelerine uyan sunucu bulunamadı."
                  : "Şu an keşfedilecek herkese açık sunucu yok."}
              </p>
              {hasFilters && (
                <button
                  onClick={() => {
                    setSearchInput("");
                    setSelectedTags([]);
                  }}
                  className="mt-3 px-3 py-1.5 rounded-lg bg-[var(--primary-bg)] border border-[var(--secondary-border)] text-[var(--secondary-text)] text-sm hover:border-[var(--tertiary-border)] transition-colors"
                >
                  Filtreleri temizle
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredServers.map((server) => {
                const isMember = memberIds.has(server.serverID);
                return (
                  <motion.div
                    key={server.serverID}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className="group bg-[var(--primary-bg)] rounded-2xl border-2 border-[var(--secondary-border)] hover:border-[var(--tertiary-border)] flex flex-col overflow-hidden transition-colors"
                  >
                    <div className="p-4 flex flex-col flex-1">
                      {/* Üst: ikon + ad + üye sayısı */}
                      <div className="flex items-center gap-3 mb-3">
                        <img
                          src={server.photo || fallbackIcon}
                          alt=""
                          onError={(e) => (e.currentTarget.src = fallbackIcon)}
                          className="w-12 h-12 rounded-xl object-cover bg-[var(--secondary-bg)] border border-[var(--secondary-border)] shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-base truncate">{server.name}</h3>
                          <span className="inline-flex items-center gap-1 text-xs text-[var(--primary-text)]">
                            <Users size={12} /> {server.memberCount} üye
                          </span>
                        </div>
                      </div>

                      <p className="text-sm mb-3 text-[var(--primary-text)] line-clamp-2 min-h-[2.5rem]">
                        {server.description || "Açıklama yok."}
                      </p>

                      {server.tags && server.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {server.tags.map((tag) => {
                            const active = selectedTags.includes(tag);
                            return (
                              <button
                                key={tag}
                                onClick={() => toggleTag(tag)}
                                className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
                                  active
                                    ? "bg-[var(--tertiary-bg)] text-[var(--tertiary-text)]"
                                    : "bg-[var(--secondary-bg)] text-[var(--secondary-text)] hover:text-[var(--tertiary-text)]"
                                }`}
                                title={`#${tag} ile filtrele`}
                              >
                                #{tag}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Alt: katıl / üyesin */}
                      <div className="mt-auto">
                        {isMember ? (
                          <button
                            onClick={() => navigate(`/server/${server.serverID}`)}
                            className="w-full flex items-center justify-center gap-1.5 bg-[var(--secondary-bg)] text-[var(--secondary-text)] px-3 py-2 rounded-xl whitespace-nowrap hover:text-[var(--tertiary-text)] transition-colors font-semibold text-sm"
                            title="Zaten bu sunucudasınız — aç"
                          >
                            <IoMdCheckmarkCircle size={17} />
                            Üyesin
                          </button>
                        ) : (
                          <button
                            onClick={() => handleJoinServer(server.serverID)}
                            disabled={joiningId === server.serverID}
                            className="w-full flex items-center justify-center gap-1.5 bg-[var(--tertiary-bg)] text-[var(--tertiary-text)] px-3 py-2 rounded-xl hover:bg-[var(--quaternary-bg)] disabled:opacity-50 whitespace-nowrap font-semibold text-sm transition-colors"
                          >
                            <IoMdPersonAdd size={17} />
                            {joiningId === server.serverID ? "Katılınıyor..." : "Katıl"}
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {/* Mobile Drawer */}
      {isMobile && (
        <AnimatePresence>
          {isOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 bg-black/60 z-40 transition-opacity duration-200"
                onClick={() => setIsOpen(false)}
              />
              {/* Drawer Container */}
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="fixed top-0 bottom-0 left-0 z-50 flex w-[320px] shadow-2xl"
              >
                {/* Left: Navigator */}
                <div className="w-16 h-full shrink-0 relative z-20 bg-[var(--primary-bg)]/90 backdrop-blur-md border-r border-[var(--primary-border)]/20">
                  <Navigator />
                </div>
                {/* Right: Navigation Options */}
                <div className="w-64 h-full bg-[var(--primary-bg)]/90 backdrop-blur-md flex flex-col relative z-10 p-5 overflow-y-auto gap-5 text-left">
                  {/* Header */}
                  <div className="flex justify-between items-center pb-2 border-b border-[var(--primary-border)]/25 shrink-0">
                    <span className="font-bold text-sm text-[var(--secondary-text)] uppercase tracking-widest font-mono">Seçenekler</span>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="p-1 rounded-lg hover:bg-[var(--secondary-bg)] transition-colors text-[var(--secondary-text)] active:scale-95"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* Navigation Links */}
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                    <button
                      onClick={() => {
                        navigate("/");
                        setIsOpen(false);
                      }}
                      className="flex items-center gap-3 w-full p-2.5 rounded-xl bg-[var(--secondary-bg)]/40 hover:bg-[var(--secondary-bg)] border border-[var(--primary-border)]/30 hover:border-[var(--tertiary-border)]/40 text-sm font-semibold text-[var(--secondary-text)] transition-all active:scale-95"
                    >
                      <Home size={18} className="text-[var(--tertiary-bg)]" />
                      <span>Ana Sayfa</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        navigate("/servers");
                        setIsOpen(false);
                      }}
                      className="flex items-center gap-3 w-full p-2.5 rounded-xl bg-[var(--secondary-bg)] hover:bg-[var(--secondary-bg)] border border-[var(--primary-border)]/30 hover:border-[var(--tertiary-border)]/40 text-sm font-semibold text-[var(--secondary-text)] transition-all active:scale-95"
                    >
                      <Compass size={18} className="text-[var(--tertiary-bg)]" />
                      <span>Sunucu Keşfet</span>
                    </button>

                    <button
                      onClick={() => {
                        navigate("/AddFriends");
                        setIsOpen(false);
                      }}
                      className="flex items-center gap-3 w-full p-2.5 rounded-xl bg-[var(--secondary-bg)]/40 hover:bg-[var(--secondary-bg)] border border-[var(--primary-border)]/30 hover:border-[var(--tertiary-border)]/40 text-sm font-semibold text-[var(--secondary-text)] transition-all active:scale-95"
                    >
                      <UserPlus size={18} className="text-[var(--tertiary-bg)]" />
                      <span>Arkadaş Ekle</span>
                    </button>

                    <button
                      onClick={() => {
                        navigate("/settings");
                        setIsOpen(false);
                      }}
                      className="flex items-center gap-3 w-full p-2.5 rounded-xl bg-[var(--secondary-bg)]/40 hover:bg-[var(--secondary-bg)] border border-[var(--primary-border)]/30 hover:border-[var(--tertiary-border)]/40 text-sm font-semibold text-[var(--secondary-text)] transition-all active:scale-95"
                    >
                      <Settings size={18} className="text-[var(--tertiary-bg)]" />
                      <span>Ayarlar</span>
                    </button>

                    <button
                      onClick={() => {
                        navigate("/Profile");
                        setIsOpen(false);
                      }}
                      className="flex items-center gap-3 w-full p-2.5 rounded-xl bg-[var(--secondary-bg)]/40 hover:bg-[var(--secondary-bg)] border border-[var(--primary-border)]/30 hover:border-[var(--tertiary-border)]/40 text-sm font-semibold text-[var(--secondary-text)] transition-all active:scale-95"
                    >
                      <User size={18} className="text-[var(--tertiary-bg)]" />
                      <span>Profili Düzenle</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      )}
    </motion.div>
  );
};

export default SearchServerPage;
