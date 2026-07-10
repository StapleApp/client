import { useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronRight, Loader2, Shield } from "lucide-react";
import toast from "react-hot-toast";
import { PERMISSIONS, PERMISSION_ORDER } from "../../config/permissions";
import { createRole, updateRole, deleteRole } from "../../services/roleService";

const COLOR_PRESETS = [
  "#FF5733", "#F1C40F", "#2ECC71", "#3498DB", "#9B59B6",
  "#E91E63", "#1ABC9C", "#E67E22", "#B9BBBE", "#95A5A6",
];

// serverData.Roles → düzenlenebilir yerel biçim
const toLocal = (roles) =>
  [...(roles || [])]
    .map((r) => ({
      id: r.RoleID,
      name: r.RoleName,
      color: r.RoleColor || "#B9BBBE",
      permissions: r.Permissions || [],
      position: r.Position ?? 0,
    }))
    .sort((a, b) => b.position - a.position);

const RolesManager = ({ serverData, onChanged }) => {
  const [roles, setRoles] = useState(() => toLocal(serverData?.Roles));
  const [openId, setOpenId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const serverId = serverData?.ServerId;
  // Taban rol = en düşük position (varsayılan "Üye") — silinemez.
  const baseRoleId = roles.length
    ? roles.reduce((min, r) => (r.position < min.position ? r : min), roles[0]).id
    : null;

  const patchLocal = (id, patch) =>
    setRoles((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const handleCreate = async () => {
    if (creating) return;
    setCreating(true);
    const maxPos = roles.reduce((m, r) => Math.max(m, r.position), 0);
    const row = await createRole(serverId, {
      name: "Yeni Rol",
      color: "#B9BBBE",
      permissions: [],
      position: maxPos + 1,
    });
    setCreating(false);
    if (!row) return;
    setRoles((prev) =>
      [
        {
          id: row.id,
          name: row.name,
          color: row.color,
          permissions: row.permissions || [],
          position: row.position ?? maxPos + 1,
        },
        ...prev,
      ].sort((a, b) => b.position - a.position)
    );
    setOpenId(row.id);
    onChanged && onChanged();
  };

  // İsim: yerelde anında, DB'ye onBlur'da
  const commitName = async (role) => {
    const name = role.name.trim();
    if (!name) {
      toast.error("Rol adı boş olamaz");
      return;
    }
    await updateRole(role.id, { name });
    onChanged && onChanged();
  };

  const commitColor = async (id, color) => {
    patchLocal(id, { color });
    await updateRole(id, { color });
    onChanged && onChanged();
  };

  const togglePerm = async (role, perm) => {
    const has = role.permissions.includes(perm);
    const next = has
      ? role.permissions.filter((p) => p !== perm)
      : [...role.permissions, perm];
    patchLocal(role.id, { permissions: next });
    await updateRole(role.id, { permissions: next });
    onChanged && onChanged();
  };

  const handleDelete = async (id) => {
    setConfirmDeleteId(null);
    const ok = await deleteRole(id);
    if (!ok) return;
    setRoles((prev) => prev.filter((r) => r.id !== id));
    if (openId === id) setOpenId(null);
    onChanged && onChanged();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[var(--secondary-text)] flex items-center gap-2">
          <Shield size={20} className="text-[var(--tertiary-border)] shrink-0" />
          Roller
        </h1>
        <button
          type="button"
          onClick={handleCreate}
          disabled={creating}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--tertiary-bg)] text-[var(--tertiary-text)] text-sm font-semibold hover:bg-[var(--quaternary-bg)] disabled:opacity-50 transition-colors"
        >
          {creating ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
          Yeni Rol
        </button>
      </div>

      <p className="text-xs text-[var(--primary-text)]">
        Üyeler ve sohbette rol rengiyle gösterilir. Yönetici izni tüm izinleri kapsar.
      </p>

      <div className="flex flex-col gap-1.5">
        {roles.map((role) => {
          const open = openId === role.id;
          const isBase = role.id === baseRoleId;
          return (
            <div
              key={role.id}
              className="rounded-xl border border-[var(--primary-border)] bg-[var(--secondary-bg)] overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setOpenId(open ? null : role.id)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-[var(--primary-bg)]/40 transition-colors"
              >
                {open ? (
                  <ChevronDown size={15} className="shrink-0 text-[var(--primary-text)]" />
                ) : (
                  <ChevronRight size={15} className="shrink-0 text-[var(--primary-text)]" />
                )}
                <span
                  className="w-3 h-3 rounded-full shrink-0 border border-black/20"
                  style={{ backgroundColor: role.color }}
                />
                <span
                  className="text-sm font-semibold truncate"
                  style={{ color: role.color }}
                >
                  {role.name}
                </span>
                {isBase && (
                  <span className="ml-auto text-[10px] text-[var(--primary-text)] uppercase tracking-wide">
                    taban
                  </span>
                )}
              </button>

              {open && (
                <div className="px-3 pb-3 pt-1 space-y-3 border-t border-[var(--primary-border)]">
                  {/* İsim */}
                  <div>
                    <label className="block mb-1 text-[11px] font-bold uppercase tracking-wide text-[var(--primary-text)]">
                      Rol Adı
                    </label>
                    <input
                      value={role.name}
                      onChange={(e) => patchLocal(role.id, { name: e.target.value })}
                      onBlur={() => commitName(role)}
                      maxLength={30}
                      className="w-full px-3 py-2 rounded-lg bg-[var(--primary-bg)] text-[var(--secondary-text)] border border-[var(--primary-border)] focus:outline-none focus:border-[var(--tertiary-border)] text-sm"
                    />
                  </div>

                  {/* Renk */}
                  <div>
                    <label className="block mb-1 text-[11px] font-bold uppercase tracking-wide text-[var(--primary-text)]">
                      Renk
                    </label>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {COLOR_PRESETS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => commitColor(role.id, c)}
                          className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                            role.color.toLowerCase() === c.toLowerCase()
                              ? "border-white"
                              : "border-transparent"
                          }`}
                          style={{ backgroundColor: c }}
                          aria-label={c}
                        />
                      ))}
                      <input
                        type="color"
                        value={role.color}
                        onChange={(e) => commitColor(role.id, e.target.value)}
                        className="w-6 h-6 rounded cursor-pointer bg-transparent border border-[var(--primary-border)]"
                        title="Özel renk"
                      />
                    </div>
                  </div>

                  {/* İzinler */}
                  <div>
                    <label className="block mb-1 text-[11px] font-bold uppercase tracking-wide text-[var(--primary-text)]">
                      İzinler
                    </label>
                    <div className="flex flex-col gap-1">
                      {PERMISSION_ORDER.map((key) => {
                        const perm = PERMISSIONS[key];
                        const checked = role.permissions.includes(key);
                        return (
                          <label
                            key={key}
                            className="flex items-start gap-2 p-2 rounded-lg hover:bg-[var(--primary-bg)]/40 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => togglePerm(role, key)}
                              className="mt-0.5 w-4 h-4 shrink-0 cursor-pointer"
                              style={{ accentColor: "var(--quaternary-text)" }}
                            />
                            <span className="min-w-0">
                              <span className="block text-sm text-[var(--secondary-text)]">
                                {perm.label}
                              </span>
                              <span className="block text-[11px] text-[var(--primary-text)] leading-tight">
                                {perm.desc}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Sil (taban rol hariç) */}
                  {!isBase && (
                    <div className="pt-1">
                      {confirmDeleteId === role.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[var(--secondary-text)] flex-1">
                            "{role.name}" silinsin mi? Bu roldeki üyeler rolsüz kalır.
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDelete(role.id)}
                            className="px-2 py-1 rounded-md bg-red-500 text-white text-xs font-semibold hover:bg-red-600 transition-colors"
                          >
                            Sil
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1 rounded-md bg-[var(--primary-bg)] text-[var(--secondary-text)] text-xs font-semibold hover:text-[var(--quaternary-text)] transition-colors"
                          >
                            İptal
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(role.id)}
                          className="flex items-center gap-1.5 text-xs font-semibold text-red-400 hover:text-red-300 transition-colors"
                        >
                          <Trash2 size={13} /> Rolü Sil
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RolesManager;
