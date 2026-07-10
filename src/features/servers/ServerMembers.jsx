import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Crown, Users } from "lucide-react";
import { getUser, resolveStatus } from "../../services/userService";
import ProfilePanel from "../../Components/layout/ProfilePanel";

const statusColor = (status) => {
  switch (status) {
    case "online": return "bg-green-500";
    case "sleeping": return "bg-blue-500";
    case "dnd": return "bg-red-500";
    default: return "bg-gray-500";
  }
};

const ServerMembers = ({ serverData }) => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0); // periyodik yenileme tetikleyicisi

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
            photoURL: p.photoURL || "/1.png",
            status: p.status || "offline",
            lastSeen: p.lastSeen || null,
            friendshipID: p.friendshipID,
            about: p.about,
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

  return (
    <div className="fixed top-0 right-0 h-screen w-56 bg-[var(--primary-bg)] border-l border-[var(--primary-border)] flex flex-col z-20">
      <div className="p-4 border-b border-[var(--primary-border)]">
        <h2 className="text-xs font-bold uppercase tracking-wide text-[var(--primary-text)] flex items-center gap-2">
          <Users size={14} /> Üyeler — {members.length}
        </h2>
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
                  {g.members.map((m) => (
                    <div
                      key={m.userID}
                      onClick={(e) => handleClick(e, m)}
                      className="group flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-[var(--secondary-bg)] transition-colors"
                    >
                      <div className="relative shrink-0">
                        <img
                          src={m.photoURL}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover"
                        />
                        <span
                          className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[var(--primary-bg)] ${statusColor(resolveStatus(m.status, m.lastSeen))}`}
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
                  ))}
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
          />,
          document.body
        )}
    </div>
  );
};

export default ServerMembers;
