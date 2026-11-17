import { buildSrcSet, pickFallbackSrc } from "./imageVariants";

describe("buildSrcSet", () => {
  it("orders widths ascending", () => {
    expect(buildSrcSet({ 960: "b", 480: "a" }, (p) => "/" + p)).toBe(
      "/a 480w, /b 960w",
    );
  });

  it("returns an empty string for no variants", () => {
    expect(buildSrcSet({}, (p) => p)).toBe("");
  });
});

describe("pickFallbackSrc", () => {
  it("picks the smallest width at or above the target", () => {
    expect(pickFallbackSrc({ 480: "a", 960: "b", 1600: "c" })).toBe("b");
    expect(pickFallbackSrc({ 480: "a", 1600: "c" })).toBe("c");
  });

  it("falls back to the largest width", () => {
    expect(pickFallbackSrc({ 480: "a" })).toBe("a");
    expect(pickFallbackSrc({ 480: "a", 640: "b" })).toBe("b");
  });

  it("honours a custom target", () => {
    expect(pickFallbackSrc({ 480: "a", 960: "b" }, 400)).toBe("a");
  });
});
