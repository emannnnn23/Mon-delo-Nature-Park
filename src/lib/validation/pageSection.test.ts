import { pageSectionSchema } from "./pageSection";

const base = {
  eyebrow: "",
  heading: "Our Story",
  body: "",
  ctaLabel: "",
  ctaHref: "",
};

function errorsOf(input: Partial<typeof base>) {
  const result = pageSectionSchema.safeParse({ ...base, ...input });
  if (result.success) return null;
  const out: Record<string, string> = {};
  for (const issue of result.error.issues) {
    out[String(issue.path[0])] ??= issue.message;
  }
  return out;
}

describe("pageSectionSchema", () => {
  it("accepts an all-empty section", () => {
    expect(pageSectionSchema.safeParse({ ...base, heading: "" }).success).toBe(
      true,
    );
  });

  it("enforces the database length limits (by characters)", () => {
    expect(errorsOf({ eyebrow: "a".repeat(60) })).toBeNull();
    expect(errorsOf({ eyebrow: "a".repeat(61) })).toHaveProperty("eyebrow");
    expect(errorsOf({ heading: "a".repeat(160) })).toBeNull();
    expect(errorsOf({ heading: "a".repeat(161) })).toHaveProperty("heading");
    expect(errorsOf({ body: "a".repeat(4000) })).toBeNull();
    expect(errorsOf({ body: "a".repeat(4001) })).toHaveProperty("body");
    // An emoji is one character in the database, two in a JS string.
    expect(errorsOf({ eyebrow: "🌿".repeat(60) })).toBeNull();
  });

  it("measures length after trimming", () => {
    expect(errorsOf({ heading: `  ${"a".repeat(160)}  ` })).toBeNull();
  });

  it("trims every field", () => {
    const result = pageSectionSchema.parse({
      ...base,
      heading: "  Hello  ",
      ctaLabel: " Go ",
      ctaHref: " /visit ",
    });
    expect(result.heading).toBe("Hello");
    expect(result.ctaLabel).toBe("Go");
    expect(result.ctaHref).toBe("/visit");
  });

  it("limits the button label to 40 characters", () => {
    expect(
      errorsOf({ ctaLabel: "a".repeat(40), ctaHref: "/visit" }),
    ).toBeNull();
    expect(
      errorsOf({ ctaLabel: "a".repeat(41), ctaHref: "/visit" }),
    ).toHaveProperty("ctaLabel");
  });

  it.each(["/visit", "/", "https://facebook.com/x", "/about#story"])(
    "accepts the link %s",
    (ctaHref) => {
      expect(errorsOf({ ctaLabel: "Go", ctaHref })).toBeNull();
    },
  );

  it.each([
    "javascript:alert(1)",
    "//evil.example",
    "/\\evil.example",
    "/\tevil.example",
    "/\nevil.example",
    "http://example.com",
    "visit",
    "mailto:a@b.c",
  ])("rejects the link %j", (ctaHref) => {
    expect(errorsOf({ ctaLabel: "Go", ctaHref })).toHaveProperty("ctaHref");
  });

  it("needs both a button label and a link, or neither", () => {
    const message = "Add both a button label and a link, or leave both empty.";
    expect(errorsOf({ ctaLabel: "Go" })).toEqual({ ctaHref: message });
    expect(errorsOf({ ctaHref: "/visit" })).toEqual({ ctaHref: message });
    expect(errorsOf({ ctaLabel: "   ", ctaHref: "/visit" })).toEqual({
      ctaHref: message,
    });
  });
});
