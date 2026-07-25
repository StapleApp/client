import { describe, it, expect, vi } from "vitest";

// supabase istemcisini mock'la → userService import edilince gerçek client kurulmaz.
vi.mock("../config/supabase", () => ({
  supabase: { from: vi.fn() },
}));

import { mapProfileToLegacy } from "./userService";

describe("mapProfileToLegacy", () => {
  it("null profilde null döner", () => {
    expect(mapProfileToLegacy(null)).toBeNull();
  });

  it("supabase alanlarını legacy alanlara eşler", () => {
    const row = {
      id: "u1",
      avatar_url: "http://x/a.png",
      nickname: "gezgin",
      name: "Ada",
      surname: "Lovelace",
      birthdate: "2000-01-01",
      created_at: "2025-01-01T00:00:00Z",
      email: "a@b.com",
      friendship_code: "ABC123",
      status: "online",
      profile_banner_url: "http://x/b.png",
      about: "selam",
      favorite_gifs: ["g1"],
    };
    const out = mapProfileToLegacy(row);
    expect(out.userID).toBe("u1");
    expect(out.photoURL).toBe("http://x/a.png");
    expect(out.nickName).toBe("gezgin");
    expect(out.friendshipID).toBe("ABC123");
    expect(out.status).toBe("online");
    expect(out.favoriteGifs).toEqual(["g1"]);
  });

  it("eksik alanlar için güvenli varsayılanlar verir", () => {
    const out = mapProfileToLegacy({ id: "u2" });
    expect(out.photoURL).toBe("");
    expect(out.status).toBe("offline");
    expect(out.favoriteGifs).toEqual([]);
    expect(out.friends).toEqual({});
    expect(out.servers).toEqual([]);
  });
});
