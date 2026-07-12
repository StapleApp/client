import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, Users, MoreVertical, UserMinus, Shield, ChevronRight } from "lucide-react";
import { getUser } from "../../services/userService";
import { usePresence } from "../../context/PresenceContext";
import { assignMemberRole, kickMember } from "../../services/roleService";
import { useAuth } from "../../context/AuthContext";
import { hasPermission } from "../../config/permissions";
import ProfilePanel from "../../Components/layout/ProfilePanel";

const statusColor = (status) => {
  switch (status) {
    case "online": return "bg-green-500";
    case "sleeping": return "bg-blue-500";
    case "dnd": return "bg-red-500";
    default: return "bg-gray-500";
  }
};

const ServerMembers = ({ serverData, onRefresh, showMembers, onToggleCollapse }) => {
  const { currentUser } = useAuth();
  const { liveStatus } = usePresence();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0); // periyodik yenileme tetikleyicisi
  const [menuFor, setMenuFor] = useState(null); // açık üye menüsü (userID)

  const myId = currentUser?.uid;
  const canManageRoles = hasPermission(serverData, myId, "MANAGE_ROLES");
  const canKick = hasPermission(serverData, myId, "KICK_MEMBERS");
  const allRoles = useMemo(
    () =>
      [...(serverData?.Roles || [])].sort(
        (a, b) => (b.Position ?? 0) - (a.Position ?? 0)
      ),
    [serverData]
  );

  // Profil kartı popup state
  const [selectedUser, setSelectedUser] = useState(null);
  const [cardExpanded, setCardExpanded] = useState(false);
  const [cardPos, setCardPos] = useState({ top: 0, left: 0 });

  // last_seen zamana bağlı olduğundan ve başkalarının heartbeat'i DB'de
  // güncellendiğinden, üye listesini periyodik yenile (skeleton flaşı olmadan).
  useEffect(() => {
    const iv = setInterval(() => setTick((t) => t + 1), 30 * 1000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!serverData?.Users) return;
      const roleMap = {};
      (serverData.Roles || []).forEach((r) => (roleMap[r.RoleID] = r));

      const rows = await Promise.all(
        serverData.Users.map(async (u) => {
          const p = await getUser(u.UserID);
          if (!p) return null;
          const role = roleMap[u.RoleID];
          return {
            userID: p.userID,
            nickName: p.nickName || p.name || "Kullanıcı",
            photoURL: p.photoURL || "/defaults/avatars/1.png",
            status: p.status || "offline",
            lastSeen: p.lastSeen || null,
            friendshipID: p.friendshipID,
            about: p.about,
            profileBannerUrl: p.profileBannerUrl,
            createdDate: p.createdDate,
            roleId: role?.RoleID || null,
            roleName: role?.RoleName || null,
            roleColor: role?.RoleColor || null,
            rolePosition: role?.Position ?? -1,
            isOwner: p.userID === serverData.ServerOwnerID,
          };
        })
      );
      if (cancelled) return;
      setMembers(rows.filter(Boolean));
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [serverData, tick]);

  // Üyeleri role göre grupla: yüksek position üstte, rolsüzler en altta.
  const groups = useMemo(() => {
    const map = new Map();
    members.forEach((m) => {
      const key = m.roleId || "__none__";
      if (!map.has(key)) {
        map.set(key, {
          key,
          name: m.roleName || "Üyeler",
          color: m.roleColor || null,
          position: m.rolePosition,
          members: [],
        });
      }
      map.get(key).members.push(m);
    });
    const arr = [...map.values()];
    arr.forEach((g) =>
      g.members.sort((a, b) => {
        if (a.isOwner !== b.isOwner) return a.isOwner ? -1 : 1;
        return a.nickName.localeCompare(b.nickName, "tr");
      })
    );
    arr.sort((a, b) => b.position - a.position);
    return arr;
  }, [members]);

  const handleClick = (e, member) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setCardPos({ top: rect.top, left: rect.left });
    setSelectedUser(member);
    setCardExpanded(true);
  };

  const changeRole = async (member, roleId) => {
    setMenuFor(null);
    if (member.roleId === roleId) return;
    // İyimser güncelle
    const role = allRoles.find((r) => r.RoleID === roleId);
    setMembers((prev) =>
      prev.map((m) =>
        m.userID === member.userID
          ? {
              ...m,
              roleId,
              roleName: role?.RoleName || null,
              roleColor: role?.RoleColor || null,
              rolePosition: role?.Position ?? -1,
            }
          : m
      )
    );
    const ok = await assignMemberRole(serverData.ServerId, member.userID, roleId);
    if (ok) onRefresh && onRefresh();
    else setTick((t) => t + 1); // başarısızsa gerçek durumu geri çek
  };

  const kick = async (member) => {
    setMenuFor(null);
    const ok = await kickMember(serverData.ServerId, member.userID);
    if (!ok) return;
    setMembers((prev) => prev.filter((m) => m.userID !== member.userID));
    onRefresh && onRefresh();
  };

  return (
    <AnimatePresence>
      {showMembers && (
        <motion.div
          initial={{ x: 224, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 224, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="fixed top-0 right-0 h-screen w-56 bg-[var(--primary-bg)] border-l border-[var(--primary-border)] flex flex-col z-20"
        >
          <div className="p-4 border-b border-[var(--primary-border)] flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wide text-[var(--primary-text)] flex items-center gap-2">
              <Users size={14} /> Üyeler — {members.length}
            </h2>
            <button
              onClick={onToggleCollapse}
              title="Üye listesini gizle"
              className="p-1 rounded-md text-[var(--primary-text)] hover:text-[var(--secondary-text)] hover:bg-[var(--secondary-bg)] transition-colors"
            >
              <ChevronRight size={15} />
            </button>
          </div>

      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="flex flex-col gap-2 animate-pulse">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2 px-2 py-1.5">
                <div className="w-8 h-8 rounded-full bg-[var(--secondary-bg)]" />
                <div className="h-3 w-20 rounded bg-[var(--secondary-bg)]" />
              </div>
            ))}
          </div>
        ) : members.length === 0 ? (
          <p className="text-center text-xs text-[var(--primary-text)] py-6">
            Üye bulunamadı.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {groups.map((g) => (
              <div key={g.key}>
                <p
                  className="px-2 pb-1 text-[11px] font-bold uppercase tracking-wide"
                  style={{ color: g.color || "var(--primary-text)" }}
                >
                  {g.name} — {g.members.length}
                </p>
                <div className="flex flex-col gap-0.5">
                  {g.members.map((m) => {
                    const showMenu =
                      (canManageRoles || canKick) &&
                      !m.isOwner &&
                      m.userID !== myId;
                    const menuOpen = menuFor === m.userID;
                    return (
                      <div
                        key={m.userID}
                        className="group relative flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--secondary-bg)] transition-colors"
                      >
                        <div
                          onClick={(e) => handleClick(e, m)}
                          className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer"
                        >
                          <div className="relative shrink-0">
                            <img
                              src={m.photoURL}
                              alt=""
                              className="w-8 h-8 rounded-full object-cover"
                            />
                            <span
                              className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[var(--primary-bg)] ${statusColor(liveStatus(m.userID, m.status, m.lastSeen))}`}
                            />
                          </div>
                          <span
                            className="text-sm truncate flex items-center gap-1"
                            style={{ color: m.roleColor || "var(--secondary-text)" }}
                          >
                            {m.nickName}
                            {m.isOwner && <Crown size={12} className="text-[var(--tertiary-border)] shrink-0" />}
                          </span>
                        </div>

                        {showMenu && (
                          <button
                            onClick={() => setMenuFor(menuOpen ? null : m.userID)}
                            aria-label="Üye seçenekleri"
                            className={`shrink-0 p-1 rounded transition-opacity ${
                              menuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                            } text-[var(--primary-text)] hover:text-[var(--secondary-text)]`}
                          >
                            <MoreVertical size={15} />
                          </button>
                        )}

                        {menuOpen && (
                          <div className="absolute right-1 top-full mt-1 z-50 w-48 rounded-xl overflow-hidden border-2 border-[var(--primary-border)] bg-[var(--secondary-bg)] shadow-xl">
                            {canManageRoles && (
                              <div className="max-h-52 overflow-y-auto">
                                <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wide text-[var(--primary-text)] flex items-center gap-1.5">
                                  <Shield size={11} /> Rol Ata
                                </p>
                                {allRoles.map((r) => (
                                  <button
                                    key={r.RoleID}
                                    onClick={() => changeRole(m, r.RoleID)}
                                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-[var(--tertiary-bg)] hover:text-[var(--tertiary-text)] transition-colors text-left"
                                  >
                                    <span
                                      className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/20"
                                      style={{ backgroundColor: r.RoleColor || "#B9BBBE" }}
                                    />
                                    <span className="truncate flex-1" style={{ color: r.RoleColor || "var(--secondary-text)" }}>
                                      {r.RoleName}
                                    </span>
                                    {m.roleId === r.RoleID && (
                                      <span className="text-[var(--quaternary-text)] shrink-0">✓</span>
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}
                            {canKick && (
                              <button
                                onClick={() => kick(m)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500 hover:text-white transition-colors border-t border-[var(--primary-border)]"
                              >
                                <UserMinus size={14} /> Sunucudan At
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedUser &&
        createPortal(
          <ProfilePanel
            check={cardExpanded}
            setCheck={setCardExpanded}
            posX={cardPos.left}
            posY={cardPos.top}
            userName={selectedUser.nickName}
            photoURL={selectedUser.photoURL}
            userID={selectedUser.friendshipID}
            memberDate={selectedUser.createdDate}
            UID={selectedUser.userID}
            about={selectedUser.about}
            bannerURL={selectedUser.profileBannerUrl}
            roleName={selectedUser.roleName}
            roleColor={selectedUser.roleColor}
          />,
          document.body
        )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ServerMembers;
