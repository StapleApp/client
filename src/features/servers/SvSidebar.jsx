import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  motion,
  AnimatePresence,
  Reorder,
  useDragControls,
} from "framer-motion";
import {
  Hash,
  Volume2,
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  GripVertical,
  FolderPlus,
  FolderInput,
  Settings,
  MonitorUp,
  MicOff,
  ScreenShare,
  MonitorPlay,
  MonitorX,
  Eye,
  EyeOff,
  Users,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import profileBanner from "../../assets/backgrounds/profile-banner.png";
import ChatPanel from "../../Components/chat/ChatPanel";
import ServerMembers from "./ServerMembers";
import ServerSettings from "./ServerSettings";
import { useVoice } from "../../context/VoiceContext";
import { useAuth } from "../../context/AuthContext";
import { useMobileMenu } from "../../context/MobileMenuContext";
import Navigator from "../../Components/layout/Navigator";
import { supabase } from "../../config/supabase";
import { hasPermission } from "../../config/permissions";
import {
  createChannel,
  renameChannel as apiRenameChannel,
  deleteChannelById,
  saveChannelPlacements,
  createCategory,
  renameCategory as apiRenameCategory,
  deleteCategory as apiDeleteCategory,
  reorderCategories,
} from "../../services/serverService";

// ---- Realtime satır eşlemeleri ----
const mapChannelRow = (r) => ({
  id: r.id,
  name: r.name,
  type: r.type,
  position: r.position ?? 0,
  categoryId: r.category_id ?? null,
});

const mapCategoryRow = (r) => ({
  id: r.id,
  name: r.name,
  position: r.position ?? 0,
});

const sameRow = (a, b) =>
  !!a && Object.keys(b).every((k) => a[k] === b[k]);

// Gelen postgres_changes olayını yerel listeye uygula.
// Kendi yazdığımız satır geri geldiğinde (echo) state'e dokunmayız — aksi hâlde
// sürükleme sırasında liste yeniden kurulup zıplardı.
const applyRowChange = (prev, payload, mapRow) => {
  if (payload.eventType === "DELETE") {
    const id = payload.old?.id;
    if (!id || !prev.some((r) => r.id === id)) return prev;
    return prev.filter((r) => r.id !== id);
  }

  const row = mapRow(payload.new);
  const existing = prev.find((r) => r.id === row.id);

  if (!existing) return [...prev, row];
  if (sameRow(existing, row)) return prev;
  return prev.map((r) => (r.id === row.id ? { ...r, ...row } : r));
};

// ---- Tek kanal satırı (Reorder.Item içeriği) ----
const ChannelRow = ({ channel, h }) => {
  const {
    isChannelActive,
    handleChannelClick,
    channelOptions,
    setChannelOptions,
    editingChannel,
    setEditingChannel,
    newChannelName,
    setNewChannelName,
    confirmDeleteId,
    setConfirmDeleteId,
    commitRename,
    deleteChannel,
    categories,
    moveChannelToCategory,
    voiceState,
    voiceAvatars,
    speaking,
    myUserId,
    canManageChannels,
    memberColors,
  } = h;
  const [showMove, setShowMove] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const active = isChannelActive(channel);
  const menuOpen = channelOptions === channel.id;
  const occupants = channel.type === "voice" ? voiceState[channel.id] || [] : [];

  // Konuşma algılama yalnızca BAĞLI OLDUĞUN kanal için var (WebRTC peer'ları).
  // Başka kanallardaki kişiler için halka çıkmaz — bilgimiz yok.
  const isSpeaking = (u) =>
    u.userId === myUserId ? !!speaking.self : !!speaking[u.socketId];

  return (
    <>
      <div
        onClick={() => handleChannelClick(channel)}
        className={`group flex items-center justify-between gap-1 px-2 py-1.5 rounded-lg cursor-pointer transition-colors duration-200 ${
          active
            ? "bg-[var(--tertiary-bg)] text-[var(--tertiary-text)]"
            : "text-[var(--primary-text)] hover:bg-[var(--secondary-bg)] hover:text-[var(--secondary-text)]"
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {canManageChannels && (
            <GripVertical
              size={14}
              className="shrink-0 opacity-0 group-hover:opacity-60 cursor-grab active:cursor-grabbing transition-opacity"
            />
          )}
          {channel.type === "voice" ? (
            <Volume2 size={16} className="shrink-0" />
          ) : (
            <Hash size={16} className="shrink-0" />
          )}
          {editingChannel === channel.id ? (
            <input
              autoFocus
              value={newChannelName}
              onChange={(e) => setNewChannelName(e.target.value)}
              onBlur={() => commitRename(channel.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename(channel.id);
                if (e.key === "Escape") {
                  setEditingChannel(null);
                  setNewChannelName("");
                }
              }}
              onClick={(e) => e.stopPropagation()}
              className="bg-transparent border-b border-current outline-none text-sm w-full"
            />
          ) : (
            <span className="text-sm truncate">{channel.name}</span>
          )}
        </div>
        {canManageChannels && (
          <button
            aria-label="Kanal seçenekleri"
            onClick={(e) => {
              e.stopPropagation();
              setConfirmDeleteId(null);
              setShowMove(false);
              
              const rect = e.currentTarget.getBoundingClientRect();
              const left = rect.right - 176; // w-44 is 176px
              const overflowBottom = rect.bottom + 150 > window.innerHeight;
              const top = overflowBottom ? rect.top - 130 : rect.bottom + 4;
              
              setMenuPos({ top, left });
              setChannelOptions(menuOpen ? null : channel.id);
            }}
            className={`w-6 h-6 rounded-full transition-all flex items-center justify-center shrink-0 ${
              active
                ? "opacity-100 hover:bg-black/10 text-[var(--tertiary-text)]"
                : "opacity-0 group-hover:opacity-100 hover:bg-[var(--primary-bg)] text-[var(--primary-text)] hover:text-[var(--secondary-text)]"
            }`}
          >
            <MoreVertical size={15} />
          </button>
        )}
      </div>

      {/* Sesli kanalda kimler var */}
      {occupants.length > 0 && (
        <ul className="list-none m-0 mt-0.5 mb-1 p-0 pl-7 flex flex-col gap-0.5 text-left">
          {occupants.map((u) => (
            <li key={u.socketId} className="flex items-center gap-1.5 min-w-0">
              <img
                src={voiceAvatars[u.userId] || "/defaults/avatars/1.png"}
                alt=""
                className={`w-4 h-4 rounded-full object-cover shrink-0 ring-2 transition-colors ${
                  isSpeaking(u) ? "ring-green-500" : "ring-transparent"
                }`}
              />
              <span
                className="text-xs text-[var(--primary-text)] truncate flex-1"
                style={{ color: memberColors?.[u.userId] || undefined }}
              >
                {u.nickName || "Bilinmeyen"}
              </span>
              {u.muted && (
                <MicOff size={11} className="shrink-0 text-red-400" />
              )}
              {u.sharing && (
                <MonitorUp
                  size={11}
                  className="shrink-0 text-[var(--quaternary-text)]"
                />
              )}
            </li>
          ))}
        </ul>
      )}

      {createPortal(
        <AnimatePresence>
          {menuOpen && (
            <>
              {/* Fullscreen backdrop to close menu on click outside */}
              <div
                className="fixed inset-0 z-40 bg-transparent cursor-default"
                onClick={(e) => {
                  e.stopPropagation();
                  setChannelOptions(null);
                }}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                style={{
                  position: "fixed",
                  top: menuPos.top,
                  left: menuPos.left,
                }}
                className="z-50 w-44 rounded-xl overflow-hidden border-2 border-[var(--primary-border)] bg-[var(--secondary-bg)] shadow-xl"
              >
                <button
                  onClick={() => {
                    setEditingChannel(channel.id);
                    setNewChannelName(channel.name);
                    setChannelOptions(null);
                    setConfirmDeleteId(null);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--secondary-text)] hover:bg-[var(--tertiary-bg)] hover:text-[var(--tertiary-text)] transition-colors"
                >
                  <Pencil size={14} /> Yeniden Adlandır
                </button>

                {/* Kategoriye taşı */}
                <button
                  onClick={() => setShowMove((v) => !v)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--secondary-text)] hover:bg-[var(--tertiary-bg)] hover:text-[var(--tertiary-text)] transition-colors"
                >
                  <FolderInput size={14} /> Kategoriye taşı
                </button>
                {showMove && (
                  <div className="max-h-40 overflow-y-auto border-t border-[var(--primary-border)] bg-[var(--primary-bg)]">
                    {channel.categoryId && (
                      <button
                        onClick={() => {
                          moveChannelToCategory(channel.id, null);
                          setChannelOptions(null);
                          setShowMove(false);
                        }}
                        className="w-full text-left px-4 py-1.5 text-xs text-[var(--primary-text)] hover:bg-[var(--tertiary-bg)] hover:text-[var(--tertiary-text)] transition-colors"
                      >
                        Kategorisiz
                      </button>
                    )}
                    {categories
                      .filter((c) => c.id !== channel.categoryId)
                      .map((c) => (
                        <button
                          key={c.id}
                          onClick={() => {
                            moveChannelToCategory(channel.id, c.id);
                            setChannelOptions(null);
                            setShowMove(false);
                          }}
                          className="w-full text-left px-4 py-1.5 text-xs text-[var(--secondary-text)] hover:bg-[var(--tertiary-bg)] hover:text-[var(--tertiary-text)] transition-colors truncate"
                        >
                          {c.name}
                        </button>
                      ))}
                    {categories.filter((c) => c.id !== channel.categoryId).length === 0 &&
                      !channel.categoryId && (
                        <p className="px-4 py-1.5 text-xs text-[var(--primary-text)]">
                          Kategori yok
                        </p>
                      )}
                  </div>
                )}

                {confirmDeleteId === channel.id ? (
                  <div className="flex flex-col gap-1 px-3 py-2 border-t border-[var(--primary-border)]">
                    <span className="text-xs text-[var(--secondary-text)]">
                      "{channel.name}" silinsin mi?
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => deleteChannel(channel.id)}
                        className="flex-1 py-1 rounded-md bg-red-500 text-white text-xs font-semibold hover:bg-red-600 transition-colors"
                      >
                        Sil
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="flex-1 py-1 rounded-md bg-[var(--tertiary-bg)] text-[var(--tertiary-text)] text-xs font-semibold hover:bg-[var(--quaternary-bg)] transition-colors"
                      >
                        İptal
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(channel.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500 hover:text-white transition-colors border-t border-[var(--primary-border)]"
                  >
                    <Trash2 size={14} /> Sil
                  </button>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};

// ---- Bir kategori bölümü (sürüklenebilir başlık + içindeki kanallar) ----
const CategorySection = ({
  category,
  channels,
  h,
  onGroupReorder,
  persistChannelPlacements,
  persistCategories,
  addChannel,
  renameCategoryCommit,
  deleteCategoryCommit,
}) => {
  const controls = useDragControls();
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [nameVal, setNameVal] = useState(category.name);
  const [confirmDel, setConfirmDel] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });

  const commitName = () => {
    setRenaming(false);
    if (nameVal.trim() && nameVal.trim() !== category.name) {
      renameCategoryCommit(category.id, nameVal.trim());
    } else {
      setNameVal(category.name);
    }
  };

  return (
    <Reorder.Item
      value={category}
      dragListener={false}
      dragControls={controls}
      onDragEnd={persistCategories}
      className="relative mt-2"
    >
      {/* Kategori başlığı */}
      <div className="group/cat flex items-center gap-1 px-1 mb-0.5">
        {h.canManageChannels && (
          <GripVertical
            size={13}
            onPointerDown={(e) => controls.start(e)}
            className="shrink-0 opacity-0 group-hover/cat:opacity-60 cursor-grab active:cursor-grabbing transition-opacity"
          />
        )}
        <button
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? "Genişlet" : "Daralt"}
          className="shrink-0 text-[var(--primary-text)] hover:text-[var(--secondary-text)]"
        >
          <motion.div
            animate={{ rotate: collapsed ? 0 : 90 }}
            transition={{ duration: 0.15, ease: "easeInOut" }}
          >
            <ChevronRight size={14} />
          </motion.div>
        </button>
        {renaming ? (
          <input
            autoFocus
            value={nameVal}
            onChange={(e) => setNameVal(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitName();
              if (e.key === "Escape") {
                setRenaming(false);
                setNameVal(category.name);
              }
            }}
            className="flex-1 bg-transparent border-b border-current outline-none text-xs font-bold uppercase tracking-wide text-[var(--secondary-text)]"
          />
        ) : (
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="flex-1 text-left text-xs font-bold uppercase tracking-wide text-[var(--primary-text)] truncate"
          >
            {category.name}
          </button>
        )}
        <div className="relative shrink-0">
          {h.canManageChannels && (
          <button
            aria-label="Kategori seçenekleri"
            onClick={(e) => {
              e.stopPropagation();
              setConfirmDel(false);
              setAddOpen(false);
              
              const rect = e.currentTarget.getBoundingClientRect();
              const left = rect.right - 176; // w-44 is 176px
              const overflowBottom = rect.bottom + 150 > window.innerHeight;
              const top = overflowBottom ? rect.top - 130 : rect.bottom + 4;
              
              setMenuPos({ top, left });
              setMenuOpen((v) => !v);
            }}
            className="w-6 h-6 rounded-full transition-all flex items-center justify-center shrink-0 opacity-0 group-hover/cat:opacity-100 hover:bg-[var(--primary-bg)] text-[var(--primary-text)] hover:text-[var(--secondary-text)]"
          >
            <MoreVertical size={14} />
          </button>
          )}
          {createPortal(
            <AnimatePresence>
              {menuOpen && (
                <>
                  {/* Fullscreen backdrop to close menu on click outside */}
                  <div
                    className="fixed inset-0 z-40 bg-transparent cursor-default"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                    }}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    style={{
                      position: "fixed",
                      top: menuPos.top,
                      left: menuPos.left,
                    }}
                    className="z-50 w-44 rounded-xl overflow-hidden border-2 border-[var(--primary-border)] bg-[var(--secondary-bg)] shadow-xl"
                  >
                    <button
                      onClick={() => {
                        setRenaming(true);
                        setNameVal(category.name);
                        setMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--secondary-text)] hover:bg-[var(--tertiary-bg)] hover:text-[var(--tertiary-text)] transition-colors"
                    >
                      <Pencil size={14} /> Kategoriyi Adlandır
                    </button>
                    <button
                      onClick={() => setAddOpen((v) => !v)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--secondary-text)] hover:bg-[var(--tertiary-bg)] hover:text-[var(--tertiary-text)] transition-colors"
                    >
                      <Plus size={14} /> Kanal Ekle
                    </button>
                    {addOpen && (
                      <div className="border-t border-[var(--primary-border)] bg-[var(--primary-bg)]">
                        <button
                          onClick={() => {
                            addChannel("text", category.id);
                            setMenuOpen(false);
                            setAddOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-4 py-1.5 text-xs text-[var(--secondary-text)] hover:bg-[var(--tertiary-bg)] hover:text-[var(--tertiary-text)] transition-colors"
                        >
                          <Hash size={13} /> Yazı Kanalı
                        </button>
                        <button
                          onClick={() => {
                            addChannel("voice", category.id);
                            setMenuOpen(false);
                            setAddOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-4 py-1.5 text-xs text-[var(--secondary-text)] hover:bg-[var(--tertiary-bg)] hover:text-[var(--tertiary-text)] transition-colors"
                        >
                          <Volume2 size={13} /> Sesli Kanal
                        </button>
                      </div>
                    )}
                    {confirmDel ? (
                      <div className="flex flex-col gap-1 px-3 py-2 border-t border-[var(--primary-border)]">
                        <span className="text-xs text-[var(--secondary-text)]">
                          Kategori silinsin mi? (kanallar kategorisiz kalır)
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              deleteCategoryCommit(category.id);
                              setMenuOpen(false);
                            }}
                            className="flex-1 py-1 rounded-md bg-red-500 text-white text-xs font-semibold hover:bg-red-600 transition-colors"
                          >
                            Sil
                          </button>
                          <button
                            onClick={() => setConfirmDel(false)}
                            className="flex-1 py-1 rounded-md bg-[var(--tertiary-bg)] text-[var(--tertiary-text)] text-xs font-semibold hover:bg-[var(--quaternary-bg)] transition-colors"
                          >
                            İptal
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDel(true)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500 hover:text-white transition-colors border-t border-[var(--primary-border)]"
                      >
                        <Trash2 size={14} /> Kategoriyi Sil
                      </button>
                    )}
                  </motion.div>
                </>
              )}
            </AnimatePresence>,
            document.body
          )}
        </div>
      </div>

      {/* Kategori içindeki kanallar */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <Reorder.Group
              axis="y"
              values={channels}
              onReorder={(arr) => onGroupReorder(category.id, arr)}
              className="flex flex-col gap-1 list-none m-0 p-0 pl-1"
            >
              {channels.map((channel) => (
                <Reorder.Item
                  key={channel.id}
                  value={channel}
                  onDragEnd={persistChannelPlacements}
                  className="relative"
                >
                  <ChannelRow channel={channel} h={h} />
                </Reorder.Item>
              ))}
              {channels.length === 0 && (
                <p className="text-[11px] text-[var(--primary-text)] px-2 py-1 italic">
                  Boş kategori
                </p>
              )}
            </Reorder.Group>
          </motion.div>
        )}
      </AnimatePresence>
    </Reorder.Item>
  );
};

const SidebarTheater = ({ stream, showingSelf, stopWatching, label, height, setHeight, toggleExpand, setIsResizing, showMembers }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.muted = showingSelf;
      videoRef.current.play().catch((err) => console.debug("Video play error:", err));
    }
  }, [stream, showingSelf]);

  const startResize = (e) => {
    e.preventDefault();
    setIsResizing(true);
    const startY = e.clientY;
    const startH = height;

    const onPointerMove = (moveEvent) => {
      const deltaY = moveEvent.clientY - startY;
      const newH = Math.max(160, Math.min(window.innerHeight * 0.8, startH + deltaY));
      setHeight(newH);
    };

    const onPointerUp = () => {
      setIsResizing(false);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  return (
    <div className="w-full h-full relative group/theater">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-contain bg-[#2b2f36]"
      />
      {/* Kaynak etiketi (üst orta) */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg bg-black/60 text-white text-xs flex items-center gap-1.5 pointer-events-none">
        {showingSelf ? (
          <ScreenShare size={13} className="text-[var(--quaternary-text)]" />
        ) : (
          <MonitorPlay size={13} className="text-[var(--quaternary-text)]" />
        )}
        {label}
      </div>

      {/* Kontroller (sağ üst) */}
      <div className={`absolute top-3 flex items-center gap-2 transition-all duration-200 ${
        showMembers ? "right-3" : "right-14"
      }`}>
        {/* Küçült/Kapat butonu */}
        <button
          onClick={toggleExpand}
          title="Ekranı Gizle"
          className="p-2 rounded-xl bg-black/60 border border-[var(--primary-border)] text-[var(--secondary-text)] hover:text-white hover:bg-black transition-all"
        >
          <EyeOff size={15} />
        </button>

        {/* İzlemeyi bırak butonu (yalnızca izlerken) */}
        {!showingSelf && (
          <button
            onClick={stopWatching}
            title="İzlemeyi durdur"
            className="p-2 rounded-xl bg-black/60 border border-red-500/50 text-red-400 hover:bg-red-500 hover:text-white transition-all"
          >
            <MonitorX size={15} />
          </button>
        )}
      </div>

      {/* Sarı resize gösterge barı (ortada sabit duracak pill) */}
      <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-12 h-1 rounded-full bg-yellow-500/70 shadow-md pointer-events-none group-hover/theater:bg-yellow-500 transition-colors" />

      {/* Alt kenarda resize çubuğu */}
      <div
        onPointerDown={startResize}
        title="Boyutlandır (yukarı-aşağı çek)"
        className="absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize hover:bg-yellow-500/10 transition-colors z-20"
      />
    </div>
  );
};

const SvSidebar = ({ serverData, onRefresh }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const voice = useVoice();
  const { currentUser } = useAuth();
  const serverId = serverData?.ServerId;
  const canManageChannels = hasPermission(serverData, currentUser?.uid, "MANAGE_CHANNELS");
  const canManageMessages = hasPermission(serverData, currentUser?.uid, "MANAGE_MESSAGES");

  const {
    isScreenSharing,
    localScreenStream,
    showSelfPreview,
    toggleSelfPreview,
    sharingSocketIds,
    watchingSocketId,
    remoteScreenStream,
    isDetached,
    setIsDetached,
    participants,
    stopWatching,
    isTheaterExpanded,
    setIsTheaterExpanded,
    isDragOverSidebar,
    showSidebar,
    setShowSidebar,
  } = voice;

  const [theaterHeight, setTheaterHeight] = useState(300); // 300px default
  const [isResizing, setIsResizing] = useState(false);
  const [showMembers, setShowMembers] = useState(true);

  const { isMobile, isOpen, setIsOpen } = useMobileMenu();

  const isDocked = voice.active && !isDetached;

  // Sidebar kapandığında voicebar docked ise otomatik dışarı (detached) al
  useEffect(() => {
    if (!showSidebar && isDocked) {
      setIsDetached(true);
    }
  }, [showSidebar, isDocked, setIsDetached]);
  const isWatching = !!remoteScreenStream;
  const anyoneSharing = isScreenSharing || sharingSocketIds.length > 0;
  const showingSelfPreview = !isWatching && isScreenSharing && showSelfPreview && !!localScreenStream;
  const theaterStream = isWatching ? remoteScreenStream : (showingSelfPreview ? localScreenStream : null);
  const isTheater = !!theaterStream && isDocked && isTheaterExpanded;

  // Üye → rol rengi eşlemesi (chat'te isim rengi için ChatPanel'e geçilir)
  const memberColors = useMemo(() => {
    const roleColor = {};
    (serverData?.Roles || []).forEach((r) => {
      if (r.RoleColor) roleColor[r.RoleID] = r.RoleColor;
    });
    const map = {};
    (serverData?.Users || []).forEach((u) => {
      const c = roleColor[u.RoleID];
      if (c) map[u.UserID] = c;
    });
    return map;
  }, [serverData]);

  const [channels, setChannels] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  const channelsRef = useRef(channels);
  const categoriesRef = useRef(categories);
  useEffect(() => {
    channelsRef.current = channels;
  }, [channels]);
  useEffect(() => {
    categoriesRef.current = categories;
  }, [categories]);

  // Yanıt bildiriminden gelindiyse: hedef kanalı aç + mesaja atla
  const [jumpTarget, setJumpTarget] = useState(null); // { channelId, messageId }
  useEffect(() => {
    const st = location.state;
    if (st?.channelId) {
      setJumpTarget({ channelId: st.channelId, messageId: st.messageId || null });
      // State'i temizle ki yenilemede tekrar tetiklenmesin
      navigate(location.pathname, { replace: true, state: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  useEffect(() => {
    if (!jumpTarget || channels.length === 0) return;
    const target = channels.find(
      (c) => c.id === jumpTarget.channelId && c.type === "text"
    );
    if (target) setActiveChannel(target);
  }, [jumpTarget, channels]);

  const [showAddDropdown, setShowAddDropdown] = useState(false);
  const [channelOptions, setChannelOptions] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [editingChannel, setEditingChannel] = useState(null);
  const [newChannelName, setNewChannelName] = useState("");

  useEffect(() => {
    if (!serverData) return;
    const loadedCats = (serverData.Categories || [])
      .map((c) => ({ id: c.CategoryID, name: c.CategoryName, position: c.Position ?? 0 }))
      .sort((a, b) => a.position - b.position);
    setCategories(loadedCats);

    const loaded = (serverData.Rooms || []).map((room) => ({
      id: room.RoomID,
      name: room.RoomName,
      type: room.Type === "TextRoom" ? "text" : "voice",
      position: room.Position ?? 0,
      categoryId: room.CategoryID ?? null,
    }));
    setChannels(loaded);
  }, [serverData]);

  // Kanal/kategori değişikliklerini canlı dinle (başka kullanıcılar ekleyip
  // silip taşıdığında sayfa yenilemeden görünsün).
  useEffect(() => {
    if (!serverId) return;

    // Aynı topic'e iki kez abone olmak senkron hata fırlatıp React ağacını
    // düşürüyor → topic'i benzersizleştir.
    const nonce = Math.random().toString(36).slice(2);
    const rt = supabase
      .channel(`server-structure:${serverId}:${nonce}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "channels",
          filter: `server_id=eq.${serverId}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE" && payload.old?.id) {
            setActiveChannel((cur) => (cur?.id === payload.old.id ? null : cur));
          }
          setChannels((prev) => applyRowChange(prev, payload, mapChannelRow));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "channel_categories",
          filter: `server_id=eq.${serverId}`,
        },
        (payload) => {
          setCategories((prev) => applyRowChange(prev, payload, mapCategoryRow));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "roles",
          filter: `server_id=eq.${serverId}`,
        },
        () => {
          onRefresh && onRefresh();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "server_members",
          filter: `server_id=eq.${serverId}`,
        },
        () => {
          onRefresh && onRefresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(rt);
    };
  }, [serverId, onRefresh]);

  // Sunucudaki sesli kanalların doluluğunu izle
  const { watchServerVoice } = voice;
  useEffect(() => {
    if (!serverId) return;
    watchServerVoice(serverId);
    return () => watchServerVoice(null);
  }, [serverId, watchServerVoice]);

  const handleChannelClick = (channel) => {
    if (channel.type === "voice") {
      voice.joinVoice({
        serverId,
        channelId: channel.id,
        channelName: channel.name,
        serverName: serverData?.ServerName,
      });
    } else {
      setActiveChannel(channel);
    }
    setIsOpen(false);
  };

  const isChannelActive = (channel) =>
    channel.type === "voice"
      ? voice.active?.serverId === serverId && voice.active?.channelId === channel.id
      : activeChannel?.id === channel.id;

  // Bir grubun (kategori veya kategorisiz) kanallarını yeniden sırala
  const onGroupReorder = (catId, newArr) => {
    setChannels((prev) => {
      const others = prev.filter((c) => (c.categoryId ?? null) !== (catId ?? null));
      const reindexed = newArr.map((c, i) => ({
        ...c,
        categoryId: catId ?? null,
        position: i + 1,
      }));
      return [...others, ...reindexed];
    });
  };

  const persistChannelPlacements = () => {
    const all = channelsRef.current;
    saveChannelPlacements(
      all.map((c) => ({ id: c.id, categoryId: c.categoryId ?? null, position: c.position }))
    );
  };

  const moveChannelToCategory = (channelId, catId) => {
    const targetCount = channelsRef.current.filter(
      (c) => (c.categoryId ?? null) === (catId ?? null) && c.id !== channelId
    ).length;
    const next = channelsRef.current.map((c) =>
      c.id === channelId ? { ...c, categoryId: catId ?? null, position: targetCount + 1 } : c
    );
    setChannels(next);
    saveChannelPlacements(
      next.map((c) => ({ id: c.id, categoryId: c.categoryId ?? null, position: c.position }))
    );
    setChannelOptions(null);
  };

  const addChannel = async (type, categoryId = null) => {
    setShowAddDropdown(false);
    const sameType = channels.filter((c) => c.type === type).length;
    const name =
      type === "voice" ? `Sesli Kanal ${sameType + 1}` : `Yazı Kanalı ${sameType + 1}`;
    const groupCount = channels.filter(
      (c) => (c.categoryId ?? null) === (categoryId ?? null)
    ).length;
    const row = await createChannel(serverId, {
      name,
      type,
      position: groupCount + 1,
      categoryId,
    });
    if (!row) return;
    setChannels((prev) => [
      ...prev,
      {
        id: row.id,
        name: row.name,
        type: row.type,
        position: row.position,
        categoryId: row.category_id ?? categoryId ?? null,
      },
    ]);
  };

  const commitRename = async (id) => {
    const name = newChannelName.trim();
    setEditingChannel(null);
    setNewChannelName("");
    if (!name) return;
    setChannels((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)));
    await apiRenameChannel(id, name);
  };

  const deleteChannel = async (id) => {
    setConfirmDeleteId(null);
    setChannelOptions(null);
    const ok = await deleteChannelById(id);
    if (!ok) return;
    if (activeChannel?.id === id) setActiveChannel(null);
    setChannels((prev) => prev.filter((c) => c.id !== id));
  };

  // Kategori işlemleri
  const addCategory = async () => {
    const row = await createCategory(serverId, {
      name: "Yeni Kategori",
      position: categories.length + 1,
    });
    if (!row) return;
    setCategories((prev) => [...prev, { id: row.id, name: row.name, position: row.position }]);
  };

  const renameCategoryCommit = async (id, name) => {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)));
    await apiRenameCategory(id, name);
  };

  const deleteCategoryCommit = async (id) => {
    const ok = await apiDeleteCategory(id);
    if (!ok) return;
    setCategories((prev) => prev.filter((c) => c.id !== id));
    setChannels((prev) =>
      prev.map((c) => (c.categoryId === id ? { ...c, categoryId: null } : c))
    );
  };

  const onCategoriesReorder = (newArr) => {
    setCategories(newArr.map((c, i) => ({ ...c, position: i + 1 })));
  };
  const persistCategories = () => {
    reorderCategories(
      categoriesRef.current.map((c, i) => ({ id: c.id, position: i + 1 }))
    );
  };

  // Grup türetimi
  const byCat = (catId) =>
    channels
      .filter((c) => (c.categoryId ?? null) === (catId ?? null))
      .sort((a, b) => a.position - b.position);
  const uncategorized = byCat(null);
  const sortedCategories = [...categories].sort((a, b) => a.position - b.position);

  const channelHandlers = {
    isChannelActive,
    handleChannelClick,
    channelOptions,
    setChannelOptions,
    editingChannel,
    setEditingChannel,
    newChannelName,
    setNewChannelName,
    confirmDeleteId,
    setConfirmDeleteId,
    commitRename,
    deleteChannel,
    categories: sortedCategories,
    moveChannelToCategory,
    voiceState: voice.voiceState,
    voiceAvatars: voice.voiceAvatars,
    speaking: voice.speaking,
    myUserId: currentUser?.uid,
    canManageChannels,
    memberColors,
  };

  const renderChannelListSidebar = () => {
    return (
      <>
        <div
          className="relative h-36 w-full bg-cover bg-center"
          style={{
            backgroundImage: `url(${serverData?.ServerBannerURL || profileBanner})`,
          }}
        >
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <h1 className="text-white font-bold text-lg px-3 text-center truncate">
              {serverData?.ServerName || "..."}
            </h1>
          </div>
          <button
            onClick={() => navigate("/")}
            title="Geri dön"
            className="absolute top-2 left-2 p-1.5 rounded-lg bg-[var(--primary-bg)]/80 text-[var(--secondary-text)] hover:text-[var(--quaternary-text)] hover:scale-105 transition-all duration-200"
          >
            <ChevronLeft size={18} />
          </button>

          <button
            onClick={() => {
              if (isMobile) {
                setIsOpen(false);
              } else {
                setShowSidebar(false);
              }
            }}
            title="Kanal listesini gizle"
            className="absolute top-2 left-10 p-1.5 rounded-lg bg-[var(--primary-bg)]/80 text-[var(--secondary-text)] hover:text-[var(--quaternary-text)] hover:scale-105 transition-all duration-200"
          >
            <PanelLeftClose size={18} />
          </button>
          {/* Ayarlar herkese açık: normal üyeler de sunucudan ayrılabilsin
              (içerik role göre gate'lenir). */}
          <button
            onClick={() => setShowSettings(true)}
            title="Sunucu ayarları"
            aria-label="Sunucu ayarları"
            className="absolute top-2 right-2 p-1.5 rounded-lg bg-[var(--primary-bg)]/80 text-[var(--secondary-text)] hover:text-[var(--quaternary-text)] hover:scale-105 transition-all duration-200"
          >
            <Settings size={18} />
          </button>
        </div>

        {/* Banner altı içerik grubu */}
        <div
          className="flex-1 flex flex-col min-h-0 relative transition-all duration-200"
          style={
            isDragOverSidebar
              ? { outline: "3px dashed var(--tertiary-border)", outlineOffset: "-3px", backgroundColor: "rgba(255, 188, 31, 0.05)" }
              : {}
          }
        >
          {/* Ekleme butonları */}
          {canManageChannels && (
          <div className="p-2 relative flex gap-2">
          <div className="relative flex-1">
            <button
              onClick={() => setShowAddDropdown(!showAddDropdown)}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border-2 border-[var(--primary-border)] bg-[var(--secondary-bg)] text-[var(--secondary-text)] hover:border-[var(--tertiary-border)] hover:text-[var(--quaternary-text)] transition-all duration-200 text-sm font-semibold"
            >
              <Plus size={16} /> Kanal
            </button>
            <AnimatePresence>
              {showAddDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute left-0 right-0 mt-2 z-50 rounded-xl border border-[var(--primary-border)] bg-[var(--primary-bg)] shadow-xl overflow-hidden"
                >
                  <button
                    onClick={() => {
                      setEditingChannel({ type: "text" });
                      setShowAddDropdown(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-[var(--secondary-text)] hover:bg-[var(--secondary-bg)] hover:text-[var(--quaternary-text)] transition-colors text-left font-medium"
                  >
                    <Hash size={15} /> Metin Kanalı Ekle
                  </button>
                  <button
                    onClick={() => {
                      setEditingChannel({ type: "voice" });
                      setShowAddDropdown(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-[var(--secondary-text)] hover:bg-[var(--secondary-bg)] hover:text-[var(--quaternary-text)] transition-colors text-left font-medium border-t border-[var(--primary-border)]/30"
                  >
                    <Volume2 size={15} /> Ses Kanalı Ekle
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={() => {
              const name = prompt("Yeni Kategori Adı:");
              if (name) addCategory(name);
            }}
            className="flex items-center justify-center p-2 rounded-xl border-2 border-[var(--primary-border)] bg-[var(--secondary-bg)] text-[var(--secondary-text)] hover:border-[var(--tertiary-border)] hover:text-[var(--quaternary-text)] transition-all duration-200"
            title="Kategori Ekle"
          >
            <FolderPlus size={16} />
          </button>
          </div>
          )}

          {/* Kanal/Kategori Listesi */}
          <div className="flex-1 overflow-y-auto px-2 pb-4 custom-scrollbar">
            {/* Kategorisiz kanallar */}
            <Reorder.Group
              axis="y"
              values={uncategorized}
              onReorder={(arr) => onGroupReorder(null, arr)}
              className="flex flex-col gap-1 list-none m-0 p-0"
            >
              {uncategorized.map((channel) => (
                <Reorder.Item
                  key={channel.id}
                  value={channel}
                  onDragEnd={persistChannelPlacements}
                  className="relative select-none"
                >
                  <ChannelRow channel={channel} h={channelHandlers} />
                </Reorder.Item>
              ))}
            </Reorder.Group>

            {/* Kategoriler */}
            <Reorder.Group
              axis="y"
              values={sortedCategories}
              onReorder={onCategoriesReorder}
              className="flex flex-col list-none m-0 p-0"
            >
              {sortedCategories.map((category) => (
                <CategorySection
                  key={category.id}
                  category={category}
                  channels={byCat(category.id)}
                  h={channelHandlers}
                  onGroupReorder={onGroupReorder}
                  persistChannelPlacements={persistChannelPlacements}
                  persistCategories={persistCategories}
                  addChannel={addChannel}
                  renameCategoryCommit={renameCategoryCommit}
                  deleteCategoryCommit={deleteCategoryCommit}
                />
              ))}
            </Reorder.Group>

            {channels.length === 0 && categories.length === 0 && (
              <p className="text-center text-xs text-[var(--primary-text)] py-6">
                Henüz kanal yok. Yukarıdan ekle.
              </p>
            )}
          </div>
        </div>

        {/* Reserving space for docked VoiceBar at the bottom of the sidebar */}
        {isDocked && (
          <div className="h-[96px] shrink-0 border-t border-[var(--primary-border)]/10" />
        )}
      </>
    );
  };

  return (
    <>
      {!isMobile && (
        <motion.div
          initial={{ x: -256, opacity: 0 }}
          animate={{
            x: showSidebar ? 0 : -256,
            opacity: showSidebar ? 1 : 0,
            pointerEvents: showSidebar ? "auto" : "none"
          }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="fixed left-16 top-0 h-screen w-64 bg-[var(--primary-bg)]/90 backdrop-blur-md text-[var(--secondary-text)] shadow-2xl border-r border-[var(--primary-border)]/20 flex flex-col z-30"
        >
          {renderChannelListSidebar()}
        </motion.div>
      )}

      {isMobile && (
        <>
          {isOpen && (
            <div
              className="fixed inset-0 bg-black/60 z-40 transition-opacity duration-200"
              onClick={() => setIsOpen(false)}
            />
          )}
          <div
            className={`fixed top-0 bottom-0 left-0 z-50 flex transition-transform duration-200 w-[320px] ${
              isOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <div className="w-16 h-full shrink-0 relative z-20 bg-[var(--primary-bg)]/90 backdrop-blur-md border-r border-[var(--primary-border)]/20">
              <Navigator />
            </div>
            <div className="w-64 h-full bg-[var(--primary-bg)]/90 backdrop-blur-md flex flex-col relative z-10">
              {renderChannelListSidebar()}
            </div>
          </div>
        </>
      )}

      {!isMobile && (
        <ServerMembers
          serverData={serverData}
          onRefresh={onRefresh}
          showMembers={showMembers}
          onToggleCollapse={() => setShowMembers(false)}
        />
      )}

      {!showMembers && !isMobile && (
        <button
          onClick={() => setShowMembers(true)}
          title="Üye listesini göster"
          className="fixed top-3 right-4 z-30 p-2 rounded-xl border border-[var(--primary-border)] bg-[var(--primary-bg)] text-[var(--primary-text)] hover:text-[var(--secondary-text)] hover:border-[var(--tertiary-border)] hover:scale-105 transition-all duration-200"
        >
          <Users size={16} />
        </button>
      )}

      {!showSidebar && !isMobile && (
        <button
          onClick={() => setShowSidebar(true)}
          title="Kanal listesini göster"
          className="fixed top-3 left-[76px] z-30 p-2 rounded-xl border border-[var(--primary-border)] bg-[var(--primary-bg)] text-[var(--primary-text)] hover:text-[var(--secondary-text)] hover:border-[var(--tertiary-border)] hover:scale-105 transition-all duration-200"
        >
          <PanelLeftOpen size={16} />
        </button>
      )}

      {showSettings && (
        <ServerSettings
          serverData={serverData}
          onClose={() => setShowSettings(false)}
          onSaved={async () => onRefresh && await onRefresh()}
          onDeleted={() => {
            setShowSettings(false);
            navigate("/");
          }}
        />
      )}

      <div className={`fixed top-0 h-[100dvh] z-20 flex flex-col transition-all duration-200 ${
        isMobile
          ? "left-0 right-0"
          : `${showSidebar ? "left-80" : "left-16"} ${showMembers ? "right-56" : "right-0"}`
      } ${
        !showSidebar && !isMobile ? "sidebar-collapsed-padding" : ""
      }`}>
        <style>{`
          .sidebar-collapsed-padding .px-5.py-4 {
            padding-left: 3.5rem !important;
            transition: padding-left 0.2s ease-in-out;
          }
        `}</style>
        {/* Screen Share Video Area (when voice bar is docked) */}
        <AnimatePresence>
          {isTheater && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: theaterHeight, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={isResizing ? { duration: 0 } : { duration: 0.25, ease: "easeInOut" }}
              className="w-full bg-[#2b2f36] relative border-b-2 border-[var(--primary-border)] overflow-hidden"
            >
              <SidebarTheater
                stream={theaterStream}
                showingSelf={showingSelfPreview}
                stopWatching={stopWatching}
                height={theaterHeight}
                setHeight={setTheaterHeight}
                setIsResizing={setIsResizing}
                toggleExpand={() => setIsTheaterExpanded(false)}
                showMembers={showMembers}
                label={
                  isWatching
                    ? `${participants.find((p) => p.socketId === watchingSocketId)?.nickName || "Bilinmeyen"} · ekran paylaşımı`
                    : "Senin ekranın · önizleme"
                }
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Minimized Screen Share indicator bar at the top of content area */}
        {(!isTheaterExpanded || !theaterStream) && anyoneSharing && isDocked && (
          <div className={`w-full bg-[var(--primary-bg)] border-b border-[var(--primary-border)] py-2 flex items-center justify-between z-10 shrink-0 transition-all duration-200 ${
            showMembers ? "px-4" : "pl-4 pr-16"
          }`}>
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--secondary-text)]">
              <MonitorPlay size={14} className="text-[var(--quaternary-text)] animate-pulse" />
              <span>
                {!theaterStream && isScreenSharing
                  ? "Ekran önizlemesi kapalı"
                  : "Yayını izlemek için genişletin"}
              </span>
            </div>
            <button
              onClick={() => {
                setIsTheaterExpanded(true);
                if (isScreenSharing && !showSelfPreview) {
                  toggleSelfPreview();
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[var(--tertiary-bg)] text-[var(--tertiary-text)] hover:bg-[var(--quaternary-bg)] text-xs font-semibold transition-colors"
            >
              <Eye size={12} /> Göster
            </button>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 min-h-0 bg-[var(--secondary-bg)]">
          <AnimatePresence mode="wait">
            {activeChannel ? (
              <motion.div
                key={activeChannel.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.15 }}
                className="w-full h-full"
              >
                <ChatPanel
                  context={{ serverId, channelId: activeChannel.id }}
                  channelName={activeChannel.name}
                  memberColors={memberColors}
                  canModerate={canManageMessages}
                  serverData={serverData}
                  jumpToMessageId={
                    jumpTarget?.channelId === activeChannel.id
                      ? jumpTarget.messageId
                      : null
                  }
                />
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full h-full flex flex-col bg-[var(--secondary-bg)]"
              >
                {isMobile && (
                  <div className="flex items-center h-[60px] px-5 py-4 bg-[var(--primary-bg)] border-b-2 border-[var(--primary-border)] text-[var(--secondary-text)] shrink-0">
                    <button
                      onClick={() => setIsOpen(true)}
                      className="p-1.5 rounded-lg hover:bg-[var(--secondary-bg)] transition-colors mr-3"
                    >
                      <Menu size={20} />
                    </button>
                    <span className="font-bold truncate text-lg">{serverData?.ServerName}</span>
                  </div>
                )}
                <div className="parallax-bg flex-1 flex flex-col items-center justify-center gap-4 text-[var(--primary-text)]">
                  <div className="w-20 h-20 rounded-full bg-[var(--primary-bg)] border-4 border-[var(--tertiary-border)] flex items-center justify-center">
                    <Hash size={36} className="text-[var(--quaternary-text)]" />
                  </div>
                  <h2 className="text-2xl font-bold text-[var(--secondary-text)] px-4 text-center">
                    {serverData?.ServerName}
                  </h2>
                  <p className="px-4 text-center">Başlamak için soldaki menüden bir kanal seç.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
};

export default SvSidebar;
