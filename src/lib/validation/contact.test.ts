import { contactSchema } from "./contact";

const valid = {
  fullName: "Ana Reyes",
  email: "ana@example.com",
  phone: "+63 900 000 0000",
  subject: "A question",
  message: "I would like to ask about visiting.",
};

describe("contactSchema", () => {
  it("accepts a valid message", () => {
    expect(contactSchema.safeParse(valid).success).toBe(true);
  });

  it("fails a one-character name on fullName", () => {
    const result = contactSchema.safeParse({ ...valid, fullName: "A" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["fullName"]);
    }
  });

  it("trims fields, including tabs and newlines", () => {
    const result = contactSchema.parse({
      ...valid,
      fullName: "  Ana Reyes \n",
      subject: "\tA question ",
    });
    expect(result.fullName).toBe("Ana Reyes");
    expect(result.subject).toBe("A question");
  });

  it("rejects names that are only whitespace", () => {
    expect(
      contactSchema.safeParse({ ...valid, fullName: "     " }).success,
    ).toBe(false);
  });

  it("limits name to 100, subject to 150 and email to 254", () => {
    expect(
      contactSchema.safeParse({ ...valid, fullName: "a".repeat(101) }).success,
    ).toBe(false);
    expect(
      contactSchema.safeParse({ ...valid, fullName: "a".repeat(100) }).success,
    ).toBe(true);
    expect(
      contactSchema.safeParse({ ...valid, subject: "a".repeat(151) }).success,
    ).toBe(false);
    const longEmail = `${"a".repeat(64)}@${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(63)}.com`;
    expect(longEmail.length).toBeGreaterThan(254);
    expect(
      contactSchema.safeParse({ ...valid, email: longEmail }).success,
    ).toBe(false);
  });

  it("rejects an invalid email", () => {
    expect(
      contactSchema.safeParse({ ...valid, email: "not-an-email" }).success,
    ).toBe(false);
  });

  it("parses an empty or missing phone to undefined", () => {
    expect(contactSchema.parse({ ...valid, phone: "" }).phone).toBeUndefined();
    expect(
      contactSchema.parse({ ...valid, phone: "   " }).phone,
    ).toBeUndefined();
    const withoutPhone = {
      fullName: valid.fullName,
      email: valid.email,
      subject: valid.subject,
      message: valid.message,
    };
    expect(contactSchema.parse(withoutPhone).phone).toBeUndefined();
  });

  it("rejects a phone with letters or more than 30 characters", () => {
    expect(contactSchema.safeParse({ ...valid, phone: "abc" }).success).toBe(
      false,
    );
    expect(
      contactSchema.safeParse({ ...valid, phone: "1".repeat(31) }).success,
    ).toBe(false);
    expect(
      contactSchema.safeParse({ ...valid, phone: "1".repeat(30) }).success,
    ).toBe(true);
  });

  it("requires a message of 10 to 5000 characters", () => {
    expect(
      contactSchema.safeParse({ ...valid, message: "too short" }).success,
    ).toBe(false);
    expect(
      contactSchema.safeParse({ ...valid, message: "a".repeat(5001) }).success,
    ).toBe(false);
    expect(
      contactSchema.safeParse({ ...valid, message: "a".repeat(5000) }).success,
    ).toBe(true);
  });

  it("counts code points, not UTF-16 units, like the database", () => {
    // U+1F33F is one character for Postgres but two UTF-16 units.
    const leaf = "\u{1F33F}";
    expect(
      contactSchema.safeParse({ ...valid, message: leaf.repeat(5000) }).success,
    ).toBe(true);
    expect(
      contactSchema.safeParse({ ...valid, message: leaf.repeat(5001) }).success,
    ).toBe(false);
    expect(
      contactSchema.safeParse({ ...valid, fullName: leaf.repeat(100) }).success,
    ).toBe(true);
    expect(
      contactSchema.safeParse({ ...valid, subject: leaf.repeat(150) }).success,
    ).toBe(true);
    // Two code points satisfy the 2-character minimum.
    expect(
      contactSchema.safeParse({ ...valid, fullName: leaf.repeat(2) }).success,
    ).toBe(true);
    expect(
      contactSchema.safeParse({ ...valid, message: leaf.repeat(10) }).success,
    ).toBe(true);
    expect(
      contactSchema.safeParse({ ...valid, message: leaf.repeat(9) }).success,
    ).toBe(false);
  });
});
