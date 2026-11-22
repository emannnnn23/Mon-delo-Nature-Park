import { VARIANT_WIDTHS, buildMediaPath, planVariantWidths } from "./mediaPath";

describe("buildMediaPath", () => {
  it("builds a bucket key with no leading slash", () => {
    expect(
      buildMediaPath({
        year: 2026,
        base: "blue-lagoon",
        id: "ab12cd",
        width: 960,
        ext: "webp",
      }),
    ).toBe("2026/blue-lagoon-ab12cd-960.webp");
  });

  it("supports the jpg fallback extension", () => {
    expect(
      buildMediaPath({
        year: 2027,
        base: "x",
        id: "zzzzzz",
        width: 480,
        ext: "jpg",
      }),
    ).toBe("2027/x-zzzzzz-480.jpg");
  });
});

describe("planVariantWidths", () => {
  it("exposes the four standard widths", () => {
    expect([...VARIANT_WIDTHS]).toEqual([480, 960, 1600, 2400]);
  });

  it("keeps every width up to the original", () => {
    expect(planVariantWidths(3000)).toEqual([480, 960, 1600, 2400]);
    expect(planVariantWidths(1200)).toEqual([480, 960]);
    expect(planVariantWidths(480)).toEqual([480]);
    expect(planVariantWidths(2400)).toEqual([480, 960, 1600, 2400]);
  });

  it("uses the original width for a narrow photo", () => {
    expect(planVariantWidths(300)).toEqual([300]);
    expect(planVariantWidths(479)).toEqual([479]);
  });
});
