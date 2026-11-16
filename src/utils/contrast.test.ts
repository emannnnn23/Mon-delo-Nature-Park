import { contrastRatio } from "./contrast";

describe("contrastRatio", () => {
  it("returns 21 for black on white", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBe(21);
  });

  it("returns 1 for identical colours", () => {
    expect(contrastRatio("#183F32", "#183F32")).toBe(1);
  });

  it("is symmetric and case-insensitive", () => {
    expect(contrastRatio("#183f32", "#F8F5EC")).toBe(
      contrastRatio("#F8F5EC", "#183F32"),
    );
  });

  it("documents why ink-500 is large-text only", () => {
    expect(contrastRatio("#77786F", "#F8F5EC")).toBeLessThan(4.5);
  });
});
