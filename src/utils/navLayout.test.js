import { describe, it, expect } from "vitest";
import { reconcile } from "./navLayout";

const S = (id) => ({ id, name: id, photo: "" });

describe("reconcile", () => {
  it("boş yerleşimde tüm sunucuları üst seviyeye ekler", () => {
    const out = reconcile([], [S("a"), S("b")]);
    expect(out).toEqual([
      { type: "server", id: "a" },
      { type: "server", id: "b" },
    ]);
  });

  it("mevcut sırayı korur", () => {
    const layout = [
      { type: "server", id: "b" },
      { type: "server", id: "a" },
    ];
    const out = reconcile(layout, [S("a"), S("b")]);
    expect(out.map((i) => i.id)).toEqual(["b", "a"]);
  });

  it("ayrılınan (geçersiz) sunucuyu atar", () => {
    const layout = [
      { type: "server", id: "a" },
      { type: "server", id: "gone" },
    ];
    const out = reconcile(layout, [S("a")]);
    expect(out).toEqual([{ type: "server", id: "a" }]);
  });

  it("yeni katılınan sunucuyu en alta ekler", () => {
    const layout = [{ type: "server", id: "a" }];
    const out = reconcile(layout, [S("a"), S("yeni")]);
    expect(out.map((i) => i.id)).toEqual(["a", "yeni"]);
  });

  it("klasörleri ve içindeki geçerli çocukları korur, geçersizleri temizler", () => {
    const layout = [
      { type: "folder", id: "f1", name: "Oyun", open: true, children: ["a", "gone"] },
      { type: "server", id: "b" },
    ];
    const out = reconcile(layout, [S("a"), S("b")]);
    expect(out[0]).toEqual({ type: "folder", id: "f1", name: "Oyun", open: true, children: ["a"] });
    expect(out[1]).toEqual({ type: "server", id: "b" });
  });

  it("boş klasörü korur (kullanıcı yeni oluşturmuş olabilir)", () => {
    const layout = [{ type: "folder", id: "f1", name: "Klasör", open: true, children: [] }];
    const out = reconcile(layout, [S("a")]);
    expect(out[0].type).toBe("folder");
    expect(out[0].children).toEqual([]);
    // klasörde olmayan 'a' üst seviyeye eklenir
    expect(out.some((i) => i.type === "server" && i.id === "a")).toBe(true);
  });

  it("mükerrer sunucu id'lerini tekilleştirir", () => {
    const layout = [
      { type: "server", id: "a" },
      { type: "folder", id: "f1", name: "F", open: false, children: ["a"] },
    ];
    const out = reconcile(layout, [S("a")]);
    const aCount = JSON.stringify(out).split('"a"').length - 1;
    expect(aCount).toBe(1); // 'a' yalnız bir kez görünür
  });
});
