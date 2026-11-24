import { isGoogleEmbed } from "./maps";

describe("isGoogleEmbed", () => {
  it("accepts a Google Maps embed address", () => {
    expect(isGoogleEmbed("https://www.google.com/maps/embed?pb=1")).toBe(true);
    expect(isGoogleEmbed("https://www.google.com/maps/embed/v1/place")).toBe(
      true,
    );
    expect(isGoogleEmbed("https://www.google.com/maps/embed")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isGoogleEmbed(null)).toBe(false);
    expect(isGoogleEmbed(undefined)).toBe(false);
    expect(isGoogleEmbed("")).toBe(false);
    expect(isGoogleEmbed("https://evil.com/embed")).toBe(false);
    expect(isGoogleEmbed("http://www.google.com/maps/embed")).toBe(false);
    expect(isGoogleEmbed("https://www.google.com/maps/embedded")).toBe(false);
    expect(isGoogleEmbed("https://www.google.com.evil.com/maps/embed")).toBe(
      false,
    );
  });
});
