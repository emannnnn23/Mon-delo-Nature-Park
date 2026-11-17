import { isWithinWindow } from "./dates";

describe("isWithinWindow", () => {
  const now = new Date("2026-06-01");

  it("is true when started and there is no end", () => {
    expect(isWithinWindow("2026-01-01", null, now)).toBe(true);
  });

  it("is false once the end has passed", () => {
    expect(isWithinWindow("2026-01-01", "2026-02-01", now)).toBe(false);
  });

  it("is false before the start", () => {
    expect(isWithinWindow("2026-07-01", null, now)).toBe(false);
  });

  it("includes the start instant and excludes the end instant", () => {
    expect(isWithinWindow("2026-06-01", "2026-07-01", now)).toBe(true);
    expect(isWithinWindow("2026-01-01", "2026-06-01", now)).toBe(false);
  });

  it("is false for an unparseable start", () => {
    expect(isWithinWindow("not a date", null, now)).toBe(false);
  });
});
