import { extractMapEmbedUrl, isGoogleEmbed } from "./maps";

describe("extractMapEmbedUrl", () => {
  const html =
    '<iframe src="https://www.google.com/maps/embed?pb=!1m18!2m3&amp;x=1" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy"></iframe>';

  it("takes the map address out of Google's Copy HTML snippet", () => {
    expect(extractMapEmbedUrl(html)).toBe(
      "https://www.google.com/maps/embed?pb=!1m18!2m3&x=1",
    );
    expect(extractMapEmbedUrl(`  ${html}\n`)).toBe(
      "https://www.google.com/maps/embed?pb=!1m18!2m3&x=1",
    );
  });

  it("accepts single quotes and extra spaces around src", () => {
    expect(
      extractMapEmbedUrl(
        "<iframe width=1 src = 'https://www.google.com/maps/embed?pb=2'></iframe>",
      ),
    ).toBe("https://www.google.com/maps/embed?pb=2");
  });

  it("leaves a plain address as it is, trimmed", () => {
    expect(
      extractMapEmbedUrl("  https://www.google.com/maps/embed?pb=3 "),
    ).toBe("https://www.google.com/maps/embed?pb=3");
    expect(extractMapEmbedUrl("")).toBe("");
  });

  it("returns a snippet without a src unchanged so validation can explain", () => {
    expect(extractMapEmbedUrl("<iframe></iframe>")).toBe("<iframe></iframe>");
  });
});

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
