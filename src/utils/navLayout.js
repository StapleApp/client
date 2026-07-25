// Navigator sunucu yerleşimi (server + folder) için saf yardımcılar.
// Bileşenden ayrıldı → birim testlerle doğrulanabilir.
//   layout: Array<
//     | { type:"server", id }
//     | { type:"folder", id, name, open, children: string[] /* serverId */ }
//   >

export const genId = () =>
  globalThis.crypto?.randomUUID?.() ||
  `f_${Date.now()}_${Math.random().toString(36).slice(2)}`;

// Kayıtlı yerleşimi gerçek sunucu listesiyle uzlaştır: geçersiz/ayrılınan
// sunucuları at, yeni katılınanları en alta ekle, mükerrerleri tekille.
export const reconcile = (layout, servers) => {
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
