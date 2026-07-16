import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { Folder as FolderIcon, FolderPlus, Pencil, Trash2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

// ============================================================================
// Navigator sunucu listesi — sürükle-bırak sıralama + klasör organizasyonu.
// Yerleşim kalıcılığı kullanıcı başına localStorage'ta tutulur (cihaz bazlı).
//   layout: Array<
//     | { type:"server", id }
//     | { type:"folder", id, name, open, children: string[] /* serverId */ }
//   >
// ============================================================================

const genId = () =>
  (globalThis.crypto?.randomUUID?.() || `f_${Date.now()}_${Math.random().toString(36).slice(2)}`);

const storeKeyFor = (uid) => (uid ? `staple-nav-layout:${uid}` : null);

const loadLayout = (key) => {
  if (!key) return [];
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};

// Kayıtlı yerleşimi gerçek sunucu listesiyle uzlaştır: geçersiz/ayrılınan
// sunucuları at, yeni katılınanları en alta ekle, mükerrerleri tekille.
const reconcile = (layout, servers) => {
  const valid = new Set(servers.map((s) => s.id));
  const seen = new Set();
  const out = [];
  for (const it of layout || []) {
    if (it?.type === "server") {
      if (valid.has(it.id) && !seen.has(it.id)) {
        out.push({ type: "server", id: it.id });
        seen.add(it.id);
      }
    } else if (it?.type === "folder") {
      const children = (it.children || []).filter(
        (id) => valid.has(id) && !seen.has(id)
      );
      children.forEach((id) => seen.add(id));
      out.push({
        type: "folder",
        id: it.id || genId(),
        name: it.name || "Klasör",
        open: !!it.open,
        children,
      });
    }
  }
  for (const s of servers) {
    if (!seen.has(s.id)) {
      out.push({ type: "server", id: s.id });
      seen.add(s.id);
    }
  }
  return out;
};

// ---- Tekil sunucu ikonu görseli (üst seviye veya klasör içi) ----
const ServerIcon = ({ server, active, badge, size = 40, label, isNavExpanded }) => (
  <>
    <div
      className={`rounded-[9px] overflow-hidden shrink-0`}
      style={{ width: size, height: size }}
    >
      <img src={server.photo} alt={server.name} className="w-full h-full object-cover" />
    </div>
    {isNavExpanded && label && (
      <span className="text-xs font-bold text-[var(--secondary-text)] truncate select-none">
        {server.name}
      </span>
    )}
    {badge > 0 && (
      <span
        className={`absolute bg-red-500 text-white text-[10px] font-bold leading-none border-2 border-[var(--primary-bg)] rounded-full flex items-center justify-center z-10 ${
          isNavExpanded ? "right-3 min-w-[18px] h-[18px] px-1" : "-top-1 -right-1 min-w-[18px] h-[18px] px-1"
        }`}
      >
        {badge > 9 ? "9+" : badge}
      </span>
    )}
  </>
);

// ---- Klasörün kare önizleme ikonu (kapalıyken 2x2 minyatür) ----
const FolderThumb = ({ ids = [], serverById, size = 40 }) => {
  const preview = ids.slice(0, 4).map((id) => serverById[id]).filter(Boolean);
  return (
    <div
      className="rounded-[9px] overflow-hidden shrink-0 grid grid-cols-2 grid-rows-2 gap-[2px] p-[3px] bg-[var(--secondary-bg)]"
      style={{ width: size, height: size }}
    >
      {preview.length === 0 ? (
        <div className="col-span-2 row-span-2 flex items-center justify-center text-[var(--primary-text)]">
          <FolderIcon size={size * 0.5} />
        </div>
      ) : (
        preview.map((s) => (
          <div key={s.id} className="rounded-[3px] overflow-hidden bg-[var(--primary-bg)]">
            <img src={s.photo} alt="" className="w-full h-full object-cover" />
          </div>
        ))
      )}
    </div>
  );
};

// İki eleman arasına düşürme çizgisi (drop indicator)
const InsertLine = ({ width }) => (
  <div className="w-full flex justify-center py-[1px]">
    <div className="h-[3px] rounded-full bg-[var(--tertiary-bg)]" style={{ width }} />
  </div>
);

const NavServerList = ({ servers, serverUnread, isNavExpanded, navigatorWidth }) => {
  const { userData } = useAuth();
  const uid = userData?.userID;
  const navigate = useNavigate();
  const location = useLocation();

  const [layout, setLayout] = useState([]);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;

  const serversRef = useRef(servers);
  serversRef.current = servers;

  const storeKey = storeKeyFor(uid);
  const storeKeyRef = useRef(storeKey);
  storeKeyRef.current = storeKey;

  // Kayıtlı yerleşimi yükle + sunucu listesiyle uzlaştır (uid/servers değişince).
  useEffect(() => {
    setLayout(reconcile(loadLayout(storeKey), servers));
  }, [storeKey, servers]);

  // Değişikliği uzlaştır + kaydet + state'e yaz.
  const persist = useCallback((next) => {
    const rec = reconcile(next, serversRef.current);
    layoutRef.current = rec;
    setLayout(rec);
    if (storeKeyRef.current) {
      try {
        localStorage.setItem(storeKeyRef.current, JSON.stringify(rec));
      } catch {
        /* kota dolu / gizli mod */
      }
    }
  }, []);

  const serverById = useMemo(() => {
    const m = {};
    servers.forEach((s) => (m[s.id] = s));
    return m;
  }, [servers]);

  const folderUnread = useCallback(
    (children) => children.reduce((n, id) => n + (serverUnread[id] || 0), 0),
    [serverUnread]
  );

  // ---------------- Klasör işlemleri ----------------
  const toggleFolder = (folderId) =>
    persist(
      layoutRef.current.map((it) =>
        it.type === "folder" && it.id === folderId ? { ...it, open: !it.open } : it
      )
    );

  const createFolder = () =>
    persist([
      ...layoutRef.current,
      { type: "folder", id: genId(), name: "Klasör", open: true, children: [] },
    ]);

  const renameFolder = (folderId, name) =>
    persist(
      layoutRef.current.map((it) =>
        it.type === "folder" && it.id === folderId ? { ...it, name: name || "Klasör" } : it
      )
    );

  // Klasörü dağıt: içindekiler klasörün konumunda üst seviyeye açılır.
  const dissolveFolder = (folderId) => {
    const L = layoutRef.current;
    const idx = L.findIndex((it) => it.type === "folder" && it.id === folderId);
    if (idx < 0) return;
    const kids = (L[idx].children || []).map((id) => ({ type: "server", id }));
    persist([...L.slice(0, idx), ...kids, ...L.slice(idx + 1)]);
  };

  // ---------------- Sürükle-bırak ----------------
  const dragRef = useRef(null); // { kind, id, fromFolderId }
  const dropRef = useRef(null); // hedef tanımı (aşağıda)
  const startRef = useRef(null); // { x, y, el, kind, id, fromFolderId }
  const [ghost, setGhost] = useState(null); // { x, y, kind, id, folder }
  const [drop, setDrop] = useState(null); // render için hedef

  // İmleç konumundan düşürme hedefini çöz (data-navzone öznitelikleri).
  const computeDrop = (x, y, drag) => {
    const el = document.elementFromPoint(x, y);
    const zone = el?.closest?.("[data-navzone]");
    if (!zone) return null;
    const type = zone.getAttribute("data-navzone");
    const rect = zone.getBoundingClientRect();
    const after = y - rect.top > rect.height / 2;

    if (type === "top") {
      const index = Number(zone.getAttribute("data-index"));
      const isFolder = zone.getAttribute("data-folder") === "1";
      // Sunucuyu klasörün orta bandına bırak → içine at
      if (isFolder && drag.kind === "server") {
        const band = rect.height * 0.28;
        if (y > rect.top + band && y < rect.bottom - band) {
          return { scope: "into", folderId: zone.getAttribute("data-id") };
        }
      }
      return { scope: "top", index: after ? index + 1 : index };
    }
    if (type === "child") {
      if (drag.kind === "folder") return null; // klasör klasöre girmez
      const index = Number(zone.getAttribute("data-index"));
      return { scope: "child", folderId: zone.getAttribute("data-id"), index: after ? index + 1 : index };
    }
    if (type === "folder-empty") {
      if (drag.kind === "folder") return null;
      return { scope: "into", folderId: zone.getAttribute("data-id") };
    }
    if (type === "end") {
      return { scope: "top", index: Number.MAX_SAFE_INTEGER };
    }
    return null;
  };

  const applyMove = (drag, target) => {
    if (!target) return;
    if (drag.kind === "folder" && target.scope !== "top") return; // klasör yalnız üst seviye

    // Klasör children referanslarını kopyala (immutable)
    let L = layoutRef.current.map((it) =>
      it.type === "folder" ? { ...it, children: [...(it.children || [])] } : { ...it }
    );

    // 1) Kaynaktan çıkar
    let removed = null;
    let removedTopIdx = -1;
    if (drag.fromFolderId == null) {
      removedTopIdx = L.findIndex((it) => it.type === drag.kind && it.id === drag.id);
      if (removedTopIdx >= 0) removed = L.splice(removedTopIdx, 1)[0];
    } else {
      const f = L.find((it) => it.type === "folder" && it.id === drag.fromFolderId);
      if (f) f.children = f.children.filter((id) => id !== drag.id);
      removed = { type: "server", id: drag.id };
    }
    if (!removed) return;

    // 2) Hedefe ekle
    if (target.scope === "top") {
      let index = target.index;
      if (drag.fromFolderId == null && removedTopIdx >= 0 && removedTopIdx < index) index -= 1;
      index = Math.max(0, Math.min(index, L.length));
      L.splice(index, 0, removed);
    } else if (target.scope === "into") {
      const f = L.find((it) => it.type === "folder" && it.id === target.folderId);
      if (f && !f.children.includes(drag.id)) f.children.push(drag.id);
    } else if (target.scope === "child") {
      const f = L.find((it) => it.type === "folder" && it.id === target.folderId);
      if (f) {
        const index = Math.max(0, Math.min(target.index, f.children.length));
        f.children.splice(index, 0, drag.id);
      }
    }
    persist(L);
  };

  const onWinMove = useCallback((e) => {
    const s = startRef.current;
    if (!s) return;
    if (!dragRef.current) {
      if (Math.hypot(e.clientX - s.x, e.clientY - s.y) < 6) return;
      dragRef.current = { kind: s.kind, id: s.id, fromFolderId: s.fromFolderId };
      document.body.classList.add("select-none");
      setGhost({ x: e.clientX, y: e.clientY, kind: s.kind, id: s.id, folder: s.folder });
    }
    const t = computeDrop(e.clientX, e.clientY, dragRef.current);
    dropRef.current = t;
    setDrop(t);
    setGhost((g) => (g ? { ...g, x: e.clientX, y: e.clientY } : g));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onWinUp = useCallback(() => {
    window.removeEventListener("pointermove", onWinMove);
    window.removeEventListener("pointerup", onWinUp);
    const s = startRef.current;
    const drag = dragRef.current;
    const target = dropRef.current;
    startRef.current = null;
    dragRef.current = null;
    dropRef.current = null;
    document.body.classList.remove("select-none");
    setGhost(null);
    setDrop(null);
    if (drag) {
      applyMove(drag, target);
    } else if (s) {
      // Sürükleme olmadı → tıklama
      if (s.kind === "server") navigate(`/server/${s.id}`);
      else if (s.kind === "folder") toggleFolder(s.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onWinMove, navigate]);

  const startDrag = (e, kind, id, fromFolderId, folder) => {
    if (e.button !== 0) return; // sadece sol tık
    startRef.current = { x: e.clientX, y: e.clientY, el: e.currentTarget, kind, id, fromFolderId, folder };
    window.addEventListener("pointermove", onWinMove);
    window.addEventListener("pointerup", onWinUp);
  };

  useEffect(
    () => () => {
      window.removeEventListener("pointermove", onWinMove);
      window.removeEventListener("pointerup", onWinUp);
    },
    [onWinMove, onWinUp]
  );

  // ---------------- Sağ tık menüsü ----------------
  const [menu, setMenu] = useState(null); // { x, y, type:"area"|"folder", folderId? }
  const [renaming, setRenaming] = useState(null); // folderId
  const [renameVal, setRenameVal] = useState("");

  const openAreaMenu = (e) => {
    e.preventDefault();
    setMenu({ x: e.clientX, y: e.clientY, type: "area" });
  };
  const openFolderMenu = (e, folderId) => {
    e.preventDefault();
    e.stopPropagation();
    setMenu({ x: e.clientX, y: e.clientY, type: "folder", folderId });
  };
  const closeMenu = () => {
    setMenu(null);
    setRenaming(null);
  };

  // ---------------- Render yardımcıları ----------------
  const rowWidth = isNavExpanded ? navigatorWidth - 24 : 48;
  const rowClass = (active) =>
    `${active ? "hovered-icon" : "icon"} group relative shrink-0 transition-all duration-200 ${
      isNavExpanded ? "justify-start px-3.5 gap-3 rounded-[12px] h-12" : "h-12 justify-center rounded-xl"
    } mt-1.5 mb-1.5 mx-auto cursor-pointer`;
  const lineWidth = isNavExpanded ? navigatorWidth - 40 : 40;

  const renderServerRow = (server, key, fromFolderId) => {
    const active = location.pathname.startsWith(`/server/${server.id}`);
    const badge = serverUnread[server.id] || 0;
    const dragging = ghost && ghost.kind === "server" && ghost.id === server.id;
    return (
      <div
        key={key}
        onPointerDown={(e) => startDrag(e, "server", server.id, fromFolderId)}
        onContextMenu={openAreaMenu}
        title={!isNavExpanded ? server.name : undefined}
        style={{ width: rowWidth, opacity: dragging ? 0.4 : 1 }}
        className={rowClass(active)}
      >
        <ServerIcon
          server={server}
          active={active}
          badge={badge}
          size={isNavExpanded ? 32 : 40}
          label
          isNavExpanded={isNavExpanded}
        />
      </div>
    );
  };

  return (
    <div
      className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden no-scrollbar flex flex-col"
      onContextMenu={openAreaMenu}
    >
      <AnimatePresence>
        {layout.length > 0 && (
          <motion.div
            key="nav-server-list"
            initial={{ opacity: 0, y: -24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -24 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="flex flex-col items-center py-1"
          >
            {layout.map((it, i) => {
              const topLine =
                drop && drop.scope === "top" && drop.index === i ? (
                  <InsertLine key={`ins-${i}`} width={lineWidth} />
                ) : null;

              if (it.type === "server") {
                const server = serverById[it.id];
                if (!server) return topLine;
                return (
                  <div key={it.id} className="w-full flex flex-col items-center">
                    {topLine}
                    <div
                      data-navzone="top"
                      data-index={i}
                      data-id={it.id}
                      data-folder="0"
                      className="w-full flex justify-center"
                    >
                      {renderServerRow(server, it.id, null)}
                    </div>
                  </div>
                );
              }

              // Klasör
              const isInto = drop && drop.scope === "into" && drop.folderId === it.id;
              const fBadge = folderUnread(it.children || []);
              const dragging = ghost && ghost.kind === "folder" && ghost.id === it.id;
              return (
                <div key={it.id} className="w-full flex flex-col items-center">
                  {topLine}
                  <div
                    data-navzone="top"
                    data-index={i}
                    data-id={it.id}
                    data-folder="1"
                    className="w-full flex justify-center"
                  >
                    <div
                      onPointerDown={(e) => startDrag(e, "folder", it.id, null, it)}
                      onContextMenu={(e) => openFolderMenu(e, it.id)}
                      title={!isNavExpanded ? it.name : undefined}
                      style={{ width: rowWidth, opacity: dragging ? 0.4 : 1 }}
                      className={`${rowClass(false)} ${isInto ? "ring-2 ring-[var(--tertiary-bg)] ring-offset-0" : ""}`}
                    >
                      <div className="relative shrink-0">
                        <FolderThumb
                          ids={it.children || []}
                          serverById={serverById}
                          size={isNavExpanded ? 32 : 40}
                        />
                        {fBadge > 0 && !it.open && (
                          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold leading-none border-2 border-[var(--primary-bg)] rounded-full flex items-center justify-center min-w-[18px] h-[18px] px-1 z-10">
                            {fBadge > 9 ? "9+" : fBadge}
                          </span>
                        )}
                      </div>
                      {isNavExpanded && (
                        <span className="text-xs font-bold text-[var(--secondary-text)] truncate select-none">
                          {it.name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Açık klasör içeriği */}
                  <AnimatePresence initial={false}>
                    {it.open && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18, ease: "easeInOut" }}
                        className="w-full overflow-hidden flex flex-col items-center rounded-xl bg-[var(--secondary-bg)]/40 my-0.5"
                      >
                        {(it.children || []).length === 0 ? (
                          <div
                            data-navzone="folder-empty"
                            data-id={it.id}
                            className="w-full py-2 flex items-center justify-center text-[10px] text-[var(--primary-text)] italic"
                          >
                            Sürükle
                          </div>
                        ) : (
                          (it.children || []).map((cid, ci) => {
                            const cs = serverById[cid];
                            if (!cs) return null;
                            const childLine =
                              drop &&
                              drop.scope === "child" &&
                              drop.folderId === it.id &&
                              drop.index === ci ? (
                                <InsertLine key={`cins-${ci}`} width={lineWidth - 8} />
                              ) : null;
                            return (
                              <div key={cid} className="w-full flex flex-col items-center">
                                {childLine}
                                <div
                                  data-navzone="child"
                                  data-index={ci}
                                  data-id={it.id}
                                  className="w-full flex justify-center"
                                >
                                  {renderServerRow(cs, cid, it.id)}
                                </div>
                              </div>
                            );
                          })
                        )}
                        {/* Klasör sonu child insert çizgisi */}
                        {drop &&
                          drop.scope === "child" &&
                          drop.folderId === it.id &&
                          drop.index >= (it.children || []).length && (
                            <InsertLine width={lineWidth - 8} />
                          )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}

            {/* Liste sonu drop bölgesi + çizgisi */}
            {drop && drop.scope === "top" && drop.index >= layout.length && (
              <InsertLine width={lineWidth} />
            )}
            <div data-navzone="end" className="w-full h-6 shrink-0" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sürükleme hayaleti */}
      {ghost &&
        createPortal(
          <div
            style={{
              position: "fixed",
              left: ghost.x,
              top: ghost.y,
              transform: "translate(-50%, -50%) scale(1.05)",
              pointerEvents: "none",
              zIndex: 200,
            }}
            className="rounded-[10px] shadow-2xl"
          >
            {ghost.kind === "folder" ? (
              <FolderThumb
                ids={ghost.folder?.children || []}
                serverById={serverById}
                size={44}
              />
            ) : (
              serverById[ghost.id] && (
                <div className="w-11 h-11 rounded-[10px] overflow-hidden">
                  <img
                    src={serverById[ghost.id].photo}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
              )
            )}
          </div>,
          document.body
        )}

      {/* Sağ tık menüsü */}
      {menu &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[140] bg-transparent" onClick={closeMenu} onContextMenu={(e) => { e.preventDefault(); closeMenu(); }} />
            <div
              style={{
                position: "fixed",
                top: Math.min(menu.y, window.innerHeight - 140),
                left: Math.min(menu.x, window.innerWidth - 200),
              }}
              className="z-[141] w-48 py-1 rounded-xl overflow-hidden border-2 border-[var(--primary-border)] bg-[var(--secondary-bg)] shadow-2xl"
            >
              {menu.type === "area" && (
                <button
                  onClick={() => {
                    createFolder();
                    closeMenu();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--secondary-text)] hover:bg-[var(--tertiary-bg)] hover:text-[var(--tertiary-text)] transition-colors"
                >
                  <FolderPlus size={15} /> Klasör Oluştur
                </button>
              )}
              {menu.type === "folder" && (
                <>
                  {renaming === menu.folderId ? (
                    <div className="px-2 py-1.5">
                      <input
                        autoFocus
                        value={renameVal}
                        onChange={(e) => setRenameVal(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            renameFolder(menu.folderId, renameVal.trim());
                            closeMenu();
                          }
                          if (e.key === "Escape") setRenaming(null);
                        }}
                        placeholder="Klasör adı"
                        className="w-full bg-[var(--primary-bg)] border border-[var(--primary-border)] rounded-md px-2 py-1 text-xs text-[var(--secondary-text)] outline-none focus:border-[var(--tertiary-border)]"
                      />
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        const f = layoutRef.current.find(
                          (it) => it.type === "folder" && it.id === menu.folderId
                        );
                        setRenameVal(f?.name || "");
                        setRenaming(menu.folderId);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--secondary-text)] hover:bg-[var(--tertiary-bg)] hover:text-[var(--tertiary-text)] transition-colors"
                    >
                      <Pencil size={15} /> Yeniden Adlandır
                    </button>
                  )}
                  <button
                    onClick={() => {
                      dissolveFolder(menu.folderId);
                      closeMenu();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500 hover:text-white transition-colors border-t border-[var(--primary-border)]"
                  >
                    <Trash2 size={15} /> Klasörü Sil
                  </button>
                </>
              )}
            </div>
          </>,
          document.body
        )}
    </div>
  );
};

export default NavServerList;
