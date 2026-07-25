import { describe, it, expect } from "vitest";
import { parseYouTubeId, youtubeThumb, formatTime } from "./youtube";

describe("parseYouTubeId", () => {
  it("düz 11 karakterlik ID'yi kabul eder", () => {
    expect(parseYouTubeId("dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });
  it("watch?v= linkini çözer", () => {
    expect(parseYouTubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });
  it("youtu.be kısa linkini çözer", () => {
    expect(parseYouTubeId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });
  it("/shorts/ ve /embed/ yollarını çözer", () => {
    expect(parseYouTubeId("https://youtube.com/shorts/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(parseYouTubeId("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });
  it("protokolsüz linki çözer", () => {
    expect(parseYouTubeId("youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });
  it("boş/geçersiz girdide null döner", () => {
    expect(parseYouTubeId("")).toBeNull();
    expect(parseYouTubeId(null)).toBeNull();
    expect(parseYouTubeId("merhaba dünya")).toBeNull();
  });
});

describe("youtubeThumb", () => {
  it("ID için küçük resim URL'si üretir", () => {
    expect(youtubeThumb("abc")).toBe("https://img.youtube.com/vi/abc/mqdefault.jpg");
  });
  it("ID yoksa boş döner", () => {
    expect(youtubeThumb("")).toBe("");
  });
});

describe("formatTime", () => {
  it("saniyeyi m:ss biçimine çevirir", () => {
    expect(formatTime(0)).toBe("0:00");
    expect(formatTime(5)).toBe("0:05");
    expect(formatTime(65)).toBe("1:05");
    expect(formatTime(3661)).toBe("61:01");
  });
  it("geçersiz girdide 0:00 döner", () => {
    expect(formatTime(-1)).toBe("0:00");
    expect(formatTime(Infinity)).toBe("0:00");
    expect(formatTime(undefined)).toBe("0:00");
  });
});
