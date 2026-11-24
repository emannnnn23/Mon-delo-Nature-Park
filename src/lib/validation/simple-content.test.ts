import { announcementSchema, LINK_PAIR_MESSAGE } from "./announcement";
import { faqSchema } from "./faq";
import { testimonialSchema } from "./testimonial";

type Parsed = {
  success: boolean;
  error?: { issues: { path: PropertyKey[]; message: string }[] };
};

function messageFor(result: Parsed, field: string) {
  return result.error?.issues.find((i) => i.path[0] === field)?.message;
}

const goodTestimonial = {
  authorName: "Maria Santos",
  quote: "A lovely, quiet place to spend the day.",
  rating: 5 as number | null,
  source: "google",
  sourceUrl: "",
  reviewDate: "",
};

const okTestimonial = (extra: object) =>
  testimonialSchema.safeParse({ ...goodTestimonial, ...extra }).success;

describe("testimonialSchema", () => {
  it("accepts a complete testimonial and trims the text", () => {
    const result = testimonialSchema.safeParse({
      ...goodTestimonial,
      authorName: "  Maria Santos  ",
      sourceUrl: " https://example.com/review ",
      reviewDate: "2026-11-02",
    });
    expect(result.success).toBe(true);
    expect(result.data?.authorName).toBe("Maria Santos");
    expect(result.data?.sourceUrl).toBe("https://example.com/review");
  });

  it("accepts no rating, no link and no date", () => {
    expect(okTestimonial({ rating: null })).toBe(true);
  });

  it("limits the name to 2-100 characters", () => {
    expect(okTestimonial({ authorName: " A " })).toBe(false);
    expect(
      messageFor(
        testimonialSchema.safeParse({ ...goodTestimonial, authorName: "" }),
        "authorName",
      ),
    ).toBe("Please enter the guest's name.");
    expect(okTestimonial({ authorName: "x".repeat(101) })).toBe(false);
    expect(okTestimonial({ authorName: "x".repeat(100) })).toBe(true);
  });

  it("limits the quote to 10-600 characters", () => {
    expect(okTestimonial({ quote: "too short" })).toBe(false);
    expect(okTestimonial({ quote: "ten chars!" })).toBe(true);
    expect(okTestimonial({ quote: "q".repeat(600) })).toBe(true);
    expect(okTestimonial({ quote: "q".repeat(601) })).toBe(false);
  });

  it("counts characters, not UTF-16 units", () => {
    expect(okTestimonial({ quote: "🌴".repeat(600) })).toBe(true);
  });

  it("accepts a rating of 1 to 5 or none", () => {
    for (const rating of [0, 6, 2.5, Number.NaN]) {
      expect(okTestimonial({ rating })).toBe(false);
    }
    for (const rating of [1, 3, 5, null]) {
      expect(okTestimonial({ rating })).toBe(true);
    }
  });

  it("accepts only google, facebook or direct as the source", () => {
    for (const source of ["google", "facebook", "direct"]) {
      expect(okTestimonial({ source })).toBe(true);
    }
    for (const source of ["", "yelp", "Google"]) {
      expect(okTestimonial({ source })).toBe(false);
    }
  });

  it("accepts an https link or none", () => {
    expect(okTestimonial({ sourceUrl: "http://example.com" })).toBe(false);
    expect(okTestimonial({ sourceUrl: "example.com" })).toBe(false);
    expect(okTestimonial({ sourceUrl: "https://example.com" })).toBe(true);
  });

  it("accepts a real ISO date or none", () => {
    for (const reviewDate of ["2026-02-30", "11/02/2026", "2026-13-01", "x"]) {
      expect(okTestimonial({ reviewDate })).toBe(false);
    }
    expect(okTestimonial({ reviewDate: "2024-02-29" })).toBe(true);
  });
});

const goodAnnouncement = {
  title: "Trail closed for repairs",
  body: "",
  linkLabel: "",
  linkHref: "",
  startsAt: "2026-12-01T09:00:00Z",
  endsAt: "",
};

const okAnnouncement = (extra: object) =>
  announcementSchema.safeParse({ ...goodAnnouncement, ...extra }).success;

describe("announcementSchema", () => {
  it("accepts an announcement with no end and no link", () => {
    const result = announcementSchema.safeParse(goodAnnouncement);
    expect(result.success).toBe(true);
    expect(result.data?.startsAt).toBe("2026-12-01T09:00:00.000Z");
    expect(result.data?.endsAt).toBe("");
  });

  it("turns a browser local date and time into an ISO timestamp", () => {
    const result = announcementSchema.safeParse({
      ...goodAnnouncement,
      startsAt: "2026-12-01T09:00",
      endsAt: "2026-12-02T09:00",
    });
    expect(result.success).toBe(true);
    expect(result.data?.startsAt).toBe(
      new Date(2026, 11, 1, 9, 0).toISOString(),
    );
    expect(result.data?.endsAt).toBe(new Date(2026, 11, 2, 9, 0).toISOString());
  });

  it("rejects an end before the start", () => {
    const result = announcementSchema.safeParse({
      ...goodAnnouncement,
      endsAt: "2026-11-30T09:00:00Z",
    });
    expect(result.success).toBe(false);
    expect(messageFor(result, "endsAt")).toBe(
      "The end date must be after the start date.",
    );
  });

  it("rejects an end equal to the start", () => {
    expect(okAnnouncement({ endsAt: goodAnnouncement.startsAt })).toBe(false);
  });

  it("requires a start", () => {
    for (const startsAt of ["", "not a date"]) {
      const result = announcementSchema.safeParse({
        ...goodAnnouncement,
        startsAt,
      });
      expect(result.success).toBe(false);
      expect(messageFor(result, "startsAt")).toBeDefined();
    }
  });

  it("rejects an end that is not a date", () => {
    expect(okAnnouncement({ endsAt: "soon" })).toBe(false);
  });

  it("limits the title to 2-120 and the message to 500 characters", () => {
    expect(okAnnouncement({ title: "A" })).toBe(false);
    expect(okAnnouncement({ title: "t".repeat(121) })).toBe(false);
    expect(okAnnouncement({ title: "t".repeat(120) })).toBe(true);
    expect(okAnnouncement({ body: "b".repeat(500) })).toBe(true);
    expect(okAnnouncement({ body: "b".repeat(501) })).toBe(false);
  });

  it("needs both a link label and a link, or neither", () => {
    for (const link of [
      { linkLabel: "Read more", linkHref: "" },
      { linkLabel: "", linkHref: "/visit" },
    ]) {
      const result = announcementSchema.safeParse({
        ...goodAnnouncement,
        ...link,
      });
      expect(result.success).toBe(false);
      expect(messageFor(result, "linkHref")).toBe(LINK_PAIR_MESSAGE);
    }
    expect(LINK_PAIR_MESSAGE).toBe(
      "Add both a link label and a link, or leave both empty.",
    );
    expect(okAnnouncement({ linkLabel: "Read more", linkHref: "/visit" })).toBe(
      true,
    );
  });

  it("accepts only a site path or an https address as the link", () => {
    for (const linkHref of ["/", "/visit", "https://example.com"]) {
      expect(okAnnouncement({ linkLabel: "Go", linkHref })).toBe(true);
    }
    for (const linkHref of [
      "//evil.example",
      "/\\evil.example",
      "/\tevil",
      "http://example.com",
      "visit",
      "javascript:alert(1)",
    ]) {
      expect(okAnnouncement({ linkLabel: "Go", linkHref })).toBe(false);
    }
  });
});

describe("faqSchema", () => {
  const good = {
    question: "Is there an entrance fee?",
    answer: "Please ask at the gate.",
  };
  const ok = (extra: object) =>
    faqSchema.safeParse({ ...good, ...extra }).success;

  it("accepts a question and an answer", () => {
    expect(faqSchema.safeParse(good).success).toBe(true);
  });

  it("rejects a 4-character question", () => {
    const result = faqSchema.safeParse({ ...good, question: "Open" });
    expect(result.success).toBe(false);
    expect(messageFor(result, "question")).toBeDefined();
  });

  it("limits the question to 5-200 characters", () => {
    expect(ok({ question: "Hours" })).toBe(true);
    expect(ok({ question: "q".repeat(200) })).toBe(true);
    expect(ok({ question: "q".repeat(201) })).toBe(false);
  });

  it("limits the answer to 5-2000 characters", () => {
    expect(ok({ answer: "Yes." })).toBe(false);
    expect(ok({ answer: "Sure." })).toBe(true);
    expect(ok({ answer: "a".repeat(2000) })).toBe(true);
    expect(ok({ answer: "a".repeat(2001) })).toBe(false);
  });

  it("does not count blank padding", () => {
    expect(ok({ question: "  Hi  " })).toBe(false);
  });
});
