import { settingsColumns, settingsSchema } from "./settings";

const good = {
  parkName: "Mondelos Nature Park",
  tagline: "",
  addressLine: "M8GV+8GP, Balaring Road, Kawayan, Biliran, Philippines",
  plusCode: "",
  latitude: "",
  longitude: "",
  mapsEmbedUrl: "",
  mapsListingUrl: "",
  phone: "",
  email: "",
  openingHours: "",
  facebookUrl: "",
  instagramUrl: "",
  tiktokUrl: "",
  youtubeUrl: "",
  googleRating: "",
  googleReviewCount: "",
  defaultOgMediaId: null as string | null,
};

const parse = (extra: object) =>
  settingsSchema.safeParse({ ...good, ...extra });
const ok = (extra: object) => parse(extra).success;
const messageFor = (extra: object, field: string) =>
  parse(extra).error?.issues.find((i) => i.path[0] === field)?.message;

describe("settingsSchema", () => {
  it("accepts the seeded settings with every optional field empty", () => {
    expect(ok({})).toBe(true);
  });

  it("requires a park name, counted as the database does", () => {
    expect(ok({ parkName: "" })).toBe(false);
    expect(ok({ parkName: " \t\n " })).toBe(false);
    expect(messageFor({ parkName: "" }, "parkName")).toMatch(/park.*name/i);
    expect(ok({ parkName: "Ñ".repeat(300) })).toBe(true);
    const parsed = parse({ parkName: "  Mondelos  " });
    expect(parsed.success && parsed.data.parkName).toBe("Mondelos");
  });

  it("makes the tagline optional and stores an empty one as null", () => {
    expect(ok({ tagline: "" })).toBe(true);
    expect(ok({ tagline: "Rest easy." })).toBe(true);
    const parsed = parse({ tagline: "   " });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(settingsColumns(parsed.data).tagline).toBeNull();
      expect(settingsColumns(parsed.data).park_name).toBe(
        "Mondelos Nature Park",
      );
    }
    const set = parse({ tagline: " Rest easy. " });
    expect(set.success && settingsColumns(set.data).tagline).toBe("Rest easy.");
  });

  it("requires an address", () => {
    expect(ok({ addressLine: "" })).toBe(false);
    expect(ok({ addressLine: "   " })).toBe(false);
    expect(messageFor({ addressLine: "" }, "addressLine")).toMatch(/address/i);
  });

  it("only accepts a Google Maps embed address for the map", () => {
    expect(ok({ mapsEmbedUrl: "https://evil.com/embed" })).toBe(false);
    expect(ok({ mapsEmbedUrl: "https://www.google.com/maps/embedded" })).toBe(
      false,
    );
    expect(ok({ mapsEmbedUrl: "http://www.google.com/maps/embed" })).toBe(
      false,
    );
    expect(ok({ mapsEmbedUrl: "https://www.google.com/maps/embed?pb=1" })).toBe(
      true,
    );
    expect(ok({ mapsEmbedUrl: "  " })).toBe(true);
  });

  it("accepts Google's whole Copy HTML snippet and saves only the map address", () => {
    const parsed = settingsSchema.safeParse({
      ...good,
      mapsEmbedUrl:
        '<iframe src="https://www.google.com/maps/embed?pb=1&amp;x=2" width="600" height="450"></iframe>',
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(settingsColumns(parsed.data).maps_embed_url).toBe(
        "https://www.google.com/maps/embed?pb=1&x=2",
      );
    }
  });

  it("explains in plain words when the map is not from Google Maps", () => {
    expect(
      messageFor(
        { mapsEmbedUrl: '<iframe src="https://evil.com/x"></iframe>' },
        "mapsEmbedUrl",
      ),
    ).toMatch(/Share.*Embed a map.*Copy HTML/);
    expect(
      messageFor({ mapsEmbedUrl: "https://evil.com/embed" }, "mapsEmbedUrl"),
    ).not.toMatch(/src|https:\/\//);
  });

  it("only accepts https addresses for links and social media", () => {
    for (const field of [
      "mapsListingUrl",
      "facebookUrl",
      "instagramUrl",
      "tiktokUrl",
      "youtubeUrl",
    ]) {
      expect(ok({ [field]: "http://example.com" })).toBe(false);
      expect(ok({ [field]: "example.com" })).toBe(false);
      expect(ok({ [field]: "https://example.com/x" })).toBe(true);
      expect(ok({ [field]: "" })).toBe(true);
    }
  });

  it("checks the phone number pattern used by the contact form", () => {
    expect(ok({ phone: "+63 (912) 345-6789" })).toBe(true);
    expect(ok({ phone: "0912abc" })).toBe(false);
    expect(ok({ phone: "1".repeat(31) })).toBe(false);
  });

  it("checks the email address", () => {
    expect(ok({ email: "hello@mondelos.example" })).toBe(true);
    expect(ok({ email: "not-an-email" })).toBe(false);
    expect(ok({ email: `${"a".repeat(250)}@x.co` })).toBe(false);
  });

  it("keeps the rating between 0 and 5 with one decimal", () => {
    expect(ok({ googleRating: 5.5 })).toBe(false);
    expect(ok({ googleRating: "5.5" })).toBe(false);
    expect(ok({ googleRating: "-1" })).toBe(false);
    expect(ok({ googleRating: "4.85" })).toBe(false);
    expect(ok({ googleRating: "abc" })).toBe(false);
    expect(ok({ googleRating: "4.8" })).toBe(true);
    expect(ok({ googleRating: 4.8 })).toBe(true);
    expect(ok({ googleRating: "0" })).toBe(true);
    expect(ok({ googleRating: "5" })).toBe(true);
  });

  it("keeps the review count a whole number from 0", () => {
    expect(ok({ googleReviewCount: "-1" })).toBe(false);
    expect(ok({ googleReviewCount: "1.5" })).toBe(false);
    expect(ok({ googleReviewCount: "many" })).toBe(false);
    expect(ok({ googleReviewCount: "0" })).toBe(true);
    expect(ok({ googleReviewCount: 120 })).toBe(true);
  });

  it("keeps the map position within the globe", () => {
    expect(ok({ latitude: "91" })).toBe(false);
    expect(ok({ longitude: "-181" })).toBe(false);
    expect(ok({ latitude: "x" })).toBe(false);
    expect(ok({ latitude: "11.5678", longitude: "124.4321" })).toBe(true);
  });

  it("trims the text it returns", () => {
    const result = parse({ addressLine: "  Kawayan  ", phone: " 0912 " });
    expect(result.data?.addressLine).toBe("Kawayan");
    expect(result.data?.phone).toBe("0912");
  });
});

describe("settingsColumns", () => {
  it("turns empty optional fields into null and numbers into numbers", () => {
    const data = settingsSchema.parse({
      ...good,
      googleRating: "4.8",
      googleReviewCount: "120",
      latitude: "11.5",
      phone: " 0912 ",
      defaultOgMediaId: "media-1",
    });
    expect(settingsColumns(data)).toEqual({
      park_name: good.parkName,
      tagline: null,
      address_line: good.addressLine,
      plus_code: null,
      latitude: 11.5,
      longitude: null,
      maps_embed_url: null,
      maps_listing_url: null,
      phone: "0912",
      email: null,
      opening_hours: null,
      facebook_url: null,
      instagram_url: null,
      tiktok_url: null,
      youtube_url: null,
      google_rating: 4.8,
      google_review_count: 120,
      default_og_media_id: "media-1",
    });
  });
});
