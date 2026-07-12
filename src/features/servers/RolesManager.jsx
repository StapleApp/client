import { useState, useEffect } from "react";
import { Plus, Trash2, Loader2, Shield, GripVertical, ShieldAlert } from "lucide-react";
import toast from "react-hot-toast";
import { PERMISSIONS, PERMISSION_ORDER, isServerOwner } from "../../config/permissions";
import { createRole, updateRole, deleteRole } from "../../services/roleService";
import { useAuth } from "../../context/AuthContext";

const COLOR_PRESETS = [
  "#FF5733", "#F1C40F", "#2ECC71", "#3498DB", "#9B59B6",
  "#E91E63", "#1ABC9C", "#E67E22", "#B9BBBE", "#95A5A6",
];

// serverData.Roles -> düzenlenebilir yerel biçim
const toLocal = (roles) => {
  const list = [...(roles || [])].map((r) => ({
    id: r.RoleID,
    name: r.RoleName,
    color: r.RoleColor || "#B9BBBE",
    permissions: r.Permissions || [],
    position: r.Position ?? 0,
    kind: r.RoleKind || null, // 'admin' | 'member' | null
  }));

  return list.sort((a, b) => {
    if (a.kind === "admin") return -1;
    if (b.kind === "admin") return 1;
    if (a.kind === "member") return 1;
    if (b.kind === "member") return -1;
    return b.position - a.position;
  });
};

const RolesManager = ({ serverData, onChanged }) => {
  const [roles, setRoles] = useState(() => toLocal(serverData?.Roles));
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);

  const { currentUser } = useAuth();
  const serverId = serverData?.ServerId;

  // Üst bileşenden gelen roller güncellendiğinde yerel durumu senkronize et
  useEffect(() => {
    setRoles(toLocal(serverData?.Roles));
  }, [serverData?.Roles]);

  // Varsayılan olarak ilk rolü seç
  useEffect(() => {
    if (roles.length > 0 && !selectedRoleId) {
      setSelectedRoleId(roles[0].id);
    }
  }, [roles, selectedRoleId]);

  const selectedRole = roles.find((r) => r.id === selectedRoleId);

  // Taban rol = en düşük position (varsayılan "Üye") — silinemez.
  const baseRoleId = roles.length
    ? roles.reduce((min, r) => (r.position < min.position ? r : min), roles[0]).id
    : null;

  // Kullanıcının rütbesi: sahip = sonsuz; aksi halde kendi rolünün position'ı.
  const myRank = (() => {
    if (isServerOwner(serverData, currentUser?.uid)) return Infinity;
    const me = (serverData?.Users || []).find((u) => u.UserID === currentUser?.uid);
    const myRole = (serverData?.Roles || []).find((r) => r.RoleID === me?.RoleID);
    return myRole?.Position ?? -1;
  })();

  const patchLocal = (id, patch) =>
    setRoles((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const handleCreate = async () => {
    if (creating) return;
    setCreating(true);
    const maxPos = roles.reduce((m, r) => Math.max(m, r.position), 0);
    // Sahip en üste ekler; diğerleri kendi rütbesinin hemen altına (RLS gereği).
    const newPos = Math.min(maxPos + 1, myRank - 1);
    const row = await createRole(serverId, {
      name: "Yeni Rol",
      color: "#B9BBBE",
      permissions: [],
      position: newPos,
    });
    setCreating(true); // reset
    setCreating(false);
    if (!row) return;

    const newLocalRole = {
      id: row.id,
      name: row.name,
      color: row.color,
      permissions: row.permissions || [],
      position: row.position ?? maxPos + 1,
      kind: row.role_kind || null,
    };

    setRoles((prev) => [newLocalRole, ...prev].sort((a, b) => b.position - a.position));
    setSelectedRoleId(row.id);
    onChanged && onChanged();
    toast.success("Rol oluşturuldu");
  };

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
    if (role.kind === "admin") return; // admin izinleri kilitli
    const has = role.permissions.includes(perm);
    const next = has
      ? role.permissions.filter((p) => p !== perm)
      : [...role.permissions, perm];
    patchLocal(role.id, { permissions: next });
    await updateRole(role.id, { permissions: next });
    onChanged && onChanged();
  };

  const handleDelete = async (id) => {
    setConfirmDelete(false);
    const ok = await deleteRole(id);
    if (!ok) return;
    
    const filtered = roles.filter((r) => r.id !== id);
    setRoles(filtered);
    if (selectedRoleId === id) {
      setSelectedRoleId(filtered.length > 0 ? filtered[0].id : null);
    }
    onChanged && onChanged();
    toast.success("Rol silindi");
  };

  // Sürükle Bırak Handlers
  const handleDragStart = (e, index) => {
    const role = roles[index];
    if (role.kind === "admin" || role.kind === "member" || myRank <= role.position) {
      e.preventDefault();
      return;
    }
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const targetRole = roles[index];
    if (targetRole.kind === "admin" || targetRole.kind === "member" || myRank <= targetRole.position) {
      return;
    }

    const nextRoles = [...roles];
    const draggedItem = nextRoles[draggedIndex];
    nextRoles.splice(draggedIndex, 1);
    nextRoles.splice(index, 0, draggedItem);
    
    setDraggedIndex(index);
    setRoles(nextRoles);
  };

  const handleDragEnd = async () => {
    setDraggedIndex(null);

    // Yeni pozisyonları hiyerarşik sıraya (yukarıdan aşağıya azalan) göre hesapla
    const nextRoles = roles.map((role, idx) => {
      const newPos = roles.length - idx;
      return { ...role, position: newPos };
    });

    setRoles(nextRoles);

    // Değişiklikleri veritabanına paralel olarak kaydet
    const promises = nextRoles
      .filter((r) => r.kind !== "admin" && r.kind !== "member")
      .map((r) => updateRole(r.id, { position: r.position }));

    await Promise.all(promises);
    onChanged && onChanged();
    toast.success("Rol sıralaması güncellendi");
  };

  return (
    <div className="space-y-4">
      {/* Başlık ve Rol Ekle Butonu */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--primary-border)]">
        <div>
          <h1 className="text-xl font-bold text-[var(--secondary-text)] flex items-center gap-2">
            <Shield size={22} className="text-[var(--tertiary-border)] shrink-0" />
            Roller
          </h1>
          <p className="text-xs text-[var(--primary-text)] mt-1">
            Üyeleri yetkilendirmek ve chati yönetmek için hiyerarşik roller oluşturun.
          </p>
        </div>
        <button
          type="button"
          onClick={handleCreate}
          disabled={creating}
          className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--tertiary-bg)] text-[var(--tertiary-text)] text-sm font-bold hover:bg-[var(--quaternary-bg)] disabled:opacity-50 transition-colors shadow-md shrink-0"
        >
          {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          Yeni Rol
        </button>
      </div>

      {/* İki Sütunlu Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Sol Sütun - Rol Listesi */}
        <div className="md:col-span-1 space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-[var(--primary-text)] px-1 mb-1">
            Rol Listesi
          </div>
          <div className="flex flex-col gap-1.5 max-h-[380px] overflow-y-auto pr-1">
            {roles.map((role, index) => {
              const active = selectedRoleId === role.id;
              const isAdmin = role.kind === "admin";
              const isBase = role.kind === "member" || role.id === baseRoleId;
              const isDraggable = !isAdmin && !isBase && myRank > role.position;

              return (
                <div
                  key={role.id}
                  draggable={isDraggable}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  onClick={() => {
                    setSelectedRoleId(role.id);
                    setConfirmDelete(false);
                  }}
                  className={`group flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                    active
                      ? "bg-[var(--primary-bg)] border-[var(--tertiary-border)] shadow-md"
                      : "bg-[var(--secondary-bg)] border-[var(--primary-border)] hover:bg-[var(--primary-bg)]/40 hover:border-[var(--primary-border)]"
                  } ${draggedIndex === index ? "opacity-40 border-dashed" : ""}`}
                >
                  {/* Sürükleme Kulupları */}
                  {isDraggable ? (
                    <div className="text-[var(--primary-text)] opacity-40 group-hover:opacity-100 cursor-grab shrink-0 transition-opacity">
                      <GripVertical size={16} />
                    </div>
                  ) : (
                    <div className="w-4 h-4 shrink-0 flex items-center justify-center">
                      <Shield size={12} className="text-[var(--primary-text)] opacity-40" />
                    </div>
                  )}

                  {/* Renk Yuvarlağı */}
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/20"
                    style={{ backgroundColor: role.color }}
                  />

                  {/* Rol Adı */}
                  <span
                    className="text-sm font-semibold truncate flex-1"
                    style={{ color: role.color }}
                  >
                    {role.name}
                  </span>

                  {/* Sistem Etiketleri */}
                  {(isAdmin || isBase) && (
                    <span className="text-[9px] font-bold text-[var(--primary-text)] bg-[var(--primary-bg)] border border-[var(--primary-border)] px-1.5 py-0.5 rounded-md uppercase tracking-wider shrink-0 scale-90">
                      {isAdmin ? "YÖNETİCİ" : "TABAN"}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Sağ Sütun - Detaylar & İzinler */}
        <div className="md:col-span-2 bg-[var(--secondary-bg)] border border-[var(--primary-border)] rounded-2xl p-5 space-y-5">
          {!selectedRole ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-[var(--primary-text)]">
              <ShieldAlert size={48} className="text-[var(--primary-text)] opacity-30 mb-3" />
              <p className="text-sm font-semibold">Lütfen bir rol seçin</p>
              <p className="text-xs max-w-xs mt-1">Ayarlarını düzenlemek için sol sütundan bir rol seçebilirsiniz.</p>
            </div>
          ) : (
            <>
              {/* Adı & Rengi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* İsim */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[var(--primary-text)]">
                    Rol Adı
                  </label>
                  <input
                    value={selectedRole.name}
                    onChange={(e) => patchLocal(selectedRole.id, { name: e.target.value })}
                    onBlur={() => commitName(selectedRole)}
                    maxLength={30}
                    disabled={selectedRole.kind === "admin"}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--primary-bg)] text-[var(--secondary-text)] border border-[var(--primary-border)] focus:outline-none focus:border-[var(--tertiary-border)] text-sm disabled:opacity-50"
                  />
                </div>

                {/* Renk */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[var(--primary-text)]">
                    Rol Rengi
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex flex-wrap items-center gap-1">
                      {COLOR_PRESETS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => commitColor(selectedRole.id, c)}
                          disabled={selectedRole.kind === "admin"}
                          className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-110 ${
                            selectedRole.color.toLowerCase() === c.toLowerCase()
                              ? "border-[var(--tertiary-border)] scale-105"
                              : "border-transparent"
                          }`}
                          style={{ backgroundColor: c }}
                          aria-label={c}
                        />
                      ))}
                    </div>
                    <input
                      type="color"
                      value={selectedRole.color}
                      onChange={(e) => commitColor(selectedRole.id, e.target.value)}
                      disabled={selectedRole.kind === "admin"}
                      className="w-7 h-7 rounded cursor-pointer bg-transparent border border-[var(--primary-border)] overflow-hidden shrink-0 disabled:opacity-50"
                      title="Özel renk"
                    />
                  </div>
                </div>
              </div>

              {/* Yetki Matrisi */}
              <div className="space-y-2.5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[var(--primary-text)]">
                    Rol Yetkileri (İzinler)
                  </label>
                  {selectedRole.kind === "admin" && (
                    <p className="text-[11px] text-[var(--tertiary-text)] mt-0.5 leading-tight">
                      Yönetici rolü tüm izinlere tam erişim hakkına sahiptir ve bu kısıtlanamaz.
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
                  {PERMISSION_ORDER.map((key) => {
                    const perm = PERMISSIONS[key];
                    const isAdminRole = selectedRole.kind === "admin";
                    const checked = isAdminRole || selectedRole.permissions.includes(key);

                    return (
                      <div
                        key={key}
                        className={`flex items-center justify-between p-3 rounded-xl border border-[var(--primary-border)] bg-[var(--primary-bg)]/40 transition-colors ${
                          isAdminRole ? "opacity-60" : "hover:bg-[var(--primary-bg)]"
                        }`}
                      >
                        <div className="min-w-0 pr-3">
                          <span className="block text-sm font-semibold text-[var(--secondary-text)]">
                            {perm.label}
                          </span>
                          <span className="block text-[11px] text-[var(--primary-text)] mt-0.5 leading-tight">
                            {perm.desc}
                          </span>
                        </div>

                        {/* Modern Toggle Switch */}
                        <button
                          type="button"
                          disabled={isAdminRole}
                          onClick={() => togglePerm(selectedRole, key)}
                          className={`w-9 h-5 flex items-center rounded-full p-0.5 cursor-pointer transition-all outline-none shrink-0 ${
                            checked
                              ? "bg-[var(--tertiary-bg)]"
                              : "bg-[var(--primary-bg)] border border-[var(--primary-border)]"
                          } ${isAdminRole ? "cursor-not-allowed" : ""}`}
                          aria-label={perm.label}
                        >
                          <div
                            className={`bg-white w-3.5 h-3.5 rounded-full shadow-md transform transition-transform ${
                              checked ? "translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Tehlikeli Bölge */}
              {!(selectedRole.kind === "admin" || selectedRole.kind === "member" || selectedRole.id === baseRoleId) && (
                <div className="pt-4 border-t border-[var(--primary-border)]">
                  {confirmDelete ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-red-500/30 bg-red-500/5">
                      <span className="text-xs text-[var(--secondary-text)] leading-normal">
                        <strong>"{selectedRole.name}"</strong> rolünü silmek istediğinize emin misiniz? Bu roldeki üyeler rolsüz kalacaktır.
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleDelete(selectedRole.id)}
                          className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition-colors"
                        >
                          Evet, Sil
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(false)}
                          className="px-3 py-1.5 rounded-lg bg-[var(--primary-bg)] text-[var(--secondary-text)] text-xs font-semibold hover:text-[var(--quaternary-text)] border border-[var(--primary-border)] transition-colors"
                        >
                          Vazgeç
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-500/20 text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/5 transition-colors"
                    >
                      <Trash2 size={14} />
                      Rolü Sil
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RolesManager;
