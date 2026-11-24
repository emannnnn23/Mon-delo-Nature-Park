import { galleryCategorySchema, galleryImageSchema } from "./gallery";

const category = { name: "Waterfalls", slug: "waterfalls", isPublished: false };
const CATEGORY_ID = "6f0f2c9e-1b7a-4d55-8d3e-2a1b3c4d5e6f";
const image = {
  caption: "Morning mist",
  categoryId: CATEGORY_ID,
  isFeatured: false,
  isPublished: false,
};

function messages(
  schema: typeof galleryCategorySchema | typeof galleryImageSchema,
  input: unknown,
): Record<string, string> {
  const result = schema.safeParse(input);
  if (result.success) return {};
  const out: Record<string, string> = {};
  for (const issue of result.error.issues) {
    out[String(issue.path[0])] ??= issue.message;
  }
  return out;
}

describe("galleryCategorySchema", () => {
  it("accepts a complete category and trims the text", () => {
    const result = galleryCategorySchema.safeParse({
      ...category,
      name: "  Waterfalls ",
    });
    expect(result.success && result.data.name).toBe("Waterfalls");
  });

  it("needs a name that is not blank", () => {
    expect(
      messages(galleryCategorySchema, { ...category, name: "   " }),
    ).toEqual({ name: "Please enter a name." });
  });

  it("limits the name to 60 characters, counted as code points", () => {
    const ok = "🌿".repeat(60);
    expect(
      galleryCategorySchema.safeParse({ ...category, name: ok }).success,
    ).toBe(true);
    expect(
      messages(galleryCategorySchema, { ...category, name: `${ok}x` }),
    ).toEqual({ name: "The name must be 60 characters or fewer." });
  });

  it("needs a web address of lowercase words", () => {
    expect(messages(galleryCategorySchema, { ...category, slug: "" })).toEqual({
      slug: "Please enter a web address.",
    });
    expect(
      messages(galleryCategorySchema, { ...category, slug: "Big Falls" }).slug,
    ).toMatch(/lowercase/);
    expect(
      messages(galleryCategorySchema, { ...category, slug: "a".repeat(81) })
        .slug,
    ).toBe("The web address must be 80 characters or fewer.");
  });
});

describe("galleryImageSchema", () => {
  it("accepts a complete photo, with or without a category", () => {
    expect(galleryImageSchema.safeParse(image).success).toBe(true);
    expect(
      galleryImageSchema.safeParse({ ...image, categoryId: null }).success,
    ).toBe(true);
  });

  it("allows an empty caption", () => {
    expect(
      galleryImageSchema.safeParse({ ...image, caption: "  " }).success,
    ).toBe(true);
  });

  it("limits the caption to 200 characters after trimming", () => {
    expect(
      galleryImageSchema.safeParse({
        ...image,
        caption: ` ${"x".repeat(200)} `,
      }).success,
    ).toBe(true);
    expect(
      messages(galleryImageSchema, { ...image, caption: "x".repeat(201) }),
    ).toEqual({ caption: "The caption must be 200 characters or fewer." });
  });

  it("rejects a category that is not an id", () => {
    expect(
      Object.keys(messages(galleryImageSchema, { ...image, categoryId: "x" })),
    ).toEqual(["categoryId"]);
  });
});
