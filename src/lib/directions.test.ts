import { placeholders } from "~/content/placeholders";
import { directionsUrl } from "./directions";

describe("directionsUrl", () => {
  it("uses the plus code with the town and province", () => {
    expect(directionsUrl(placeholders.settings)).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=M8GV%2B8GP%20Kawayan%2C%20Biliran",
    );
  });

  it("falls back to the address line without a plus code", () => {
    const url = directionsUrl({
      ...placeholders.settings,
      plusCode: null,
      addressLine: "Balaring Road, Kawayan",
    });
    expect(url).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=Balaring%20Road%2C%20Kawayan",
    );
  });
});
