import { attractionSchema } from "./attraction";

const valid = {
  kind: "attraction" as const,
  name: "Hilltop View Deck",
  slug: "hilltop-view-deck",
  summary: "A short walk to a wide view.",
  description: "",
  icon: null,
  isFeatured: false,
  isPublished: false,
};

function messages(input: unknown): Record<string, string> {
  const result = attractionSchema.safeParse(input);
  if (result.success) return {};
  const out: Record<string, string> = {};
  for (const issue of result.error.issues) {
    out[String(issue.path[0])] ??= issue.message;
  }
  return out;
}

describe("attractionSchema", () => {
  it("accepts a complete attraction", () => {
    expect(attractionSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects an experience with no icon", () => {
    expect(
      messages({ ...valid, kind: "experience", slug: "", icon: null }),
    ).toEqual({ icon: "Experiences need an icon." });
  });

  it("accepts an experience with an icon and no slug or description", () => {
    expect(
      attractionSchema.safeParse({
        ...valid,
        kind: "experience",
        slug: "",
        description: "x".repeat(9000),
        icon: "leaf",
      }).success,
    ).toBe(true);
  });

  it("allows an attraction without an icon, but not an unknown icon", () => {
    expect(attractionSchema.safeParse({ ...valid, icon: "leaf" }).success).toBe(
      true,
    );
    expect(messages({ ...valid, icon: "rocket" }).icon).toBeDefined();
  });

  it("rejects a slug that is not lowercase words joined by hyphens", () => {
    for (const slug of ["Scenic Views", "scenic_views", "-a", "a-", "a--b"]) {
      expect(messages({ ...valid, slug }).slug).toBeDefined();
    }
    expect(messages({ ...valid, slug: "scenic-views-2" })).toEqual({});
  });

  it("requires a slug for an attraction and limits it to 80", () => {
    expect(messages({ ...valid, slug: "" }).slug).toBeDefined();
    expect(messages({ ...valid, slug: "a".repeat(81) }).slug).toBeDefined();
    expect(messages({ ...valid, slug: "a".repeat(80) })).toEqual({});
  });

  it("limits the summary to 160 characters after trimming, and needs one", () => {
    expect(messages({ ...valid, summary: "x".repeat(161) }).summary).toMatch(
      /160/,
    );
    expect(messages({ ...valid, summary: `  ${"x".repeat(160)}  ` })).toEqual(
      {},
    );
    expect(messages({ ...valid, summary: "   " }).summary).toBeDefined();
  });

  it("counts characters, not UTF-16 units", () => {
    expect(messages({ ...valid, summary: "🌿".repeat(160) })).toEqual({});
    expect(messages({ ...valid, summary: "🌿".repeat(161) }).summary).toBe(
      "The summary must be 160 characters or fewer.",
    );
  });

  it("needs a name (as the database does) and limits it to 120", () => {
    expect(messages({ ...valid, name: "  " }).name).toBeDefined();
    expect(messages({ ...valid, name: "A" })).toEqual({});
    expect(messages({ ...valid, name: "x".repeat(121) }).name).toBeDefined();
  });

  it("limits the description of an attraction to 8000", () => {
    expect(
      messages({ ...valid, description: "x".repeat(8001) }).description,
    ).toBeDefined();
    expect(messages({ ...valid, description: "x".repeat(8000) })).toEqual({});
  });

  it("rejects an unknown kind", () => {
    expect(messages({ ...valid, kind: "ride" }).kind).toBeDefined();
  });
});
