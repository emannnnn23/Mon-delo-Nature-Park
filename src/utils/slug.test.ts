import { shortId, slugify, wordsFromFilename } from "./slug";

describe("slugify", () => {
  it("lowercases, strips punctuation and collapses dashes", () => {
    expect(slugify("  Blue Lagoon — Biliran! ")).toBe("blue-lagoon-biliran");
  });

  it("strips diacritics", () => {
    expect(slugify("Ñipa Hut")).toBe("nipa-hut");
    expect(slugify("Café Crème")).toBe("cafe-creme");
  });

  it("falls back to 'image' when nothing usable is left", () => {
    expect(slugify("!!!")).toBe("image");
    expect(slugify("")).toBe("image");
    expect(slugify("日本語")).toBe("image");
  });

  it("caps the length without leaving a trailing dash", () => {
    const out = slugify("a".repeat(40) + " " + "b".repeat(40), 60);
    expect(out.length).toBeLessThanOrEqual(60);
    expect(out.endsWith("-")).toBe(false);
    expect(slugify("abc def ghi", 4)).toBe("abc");
  });
});

describe("shortId", () => {
  it("is 6 characters of [a-z0-9]", () => {
    for (let i = 0; i < 50; i++) expect(shortId()).toMatch(/^[a-z0-9]{6}$/);
  });

  it("differs between calls", () => {
    const ids = new Set(Array.from({ length: 50 }, () => shortId()));
    expect(ids.size).toBeGreaterThan(40);
  });
});

describe("wordsFromFilename", () => {
  it("turns a file name into plain words without the extension", () => {
    expect(wordsFromFilename("blue_lagoon-view.JPG")).toBe("blue lagoon view");
    expect(wordsFromFilename("  Scenic.Views  .png")).toBe("Scenic Views");
  });

  it("returns an empty string when only an extension or symbols are left", () => {
    expect(wordsFromFilename(".jpg")).toBe("");
    expect(wordsFromFilename("___.png")).toBe("");
  });
});
