import { placeholders } from "~/content/placeholders";
import { addressWithoutPlusCode, directionsUrl } from "./directions";

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

describe("addressWithoutPlusCode", () => {
  it("drops a leading plus code and its comma", () => {
    expect(
      addressWithoutPlusCode(
        "M8GV+8GP, Balaring Road, Kawayan, Biliran, Philippines",
        "M8GV+8GP",
      ),
    ).toBe("Balaring Road, Kawayan, Biliran, Philippines");
  });

  it("keeps the address as is without a plus code or when it does not lead", () => {
    expect(addressWithoutPlusCode("Balaring Road, Kawayan", null)).toBe(
      "Balaring Road, Kawayan",
    );
    expect(
      addressWithoutPlusCode("Balaring Road, M8GV+8GP, Kawayan", "M8GV+8GP"),
    ).toBe("Balaring Road, M8GV+8GP, Kawayan");
  });

  it("returns an empty string when the address is only the plus code", () => {
    expect(addressWithoutPlusCode("M8GV+8GP", "M8GV+8GP")).toBe("");
  });
});
