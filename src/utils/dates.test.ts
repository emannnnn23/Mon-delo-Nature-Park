import { isWithinWindow, toDateTimeLocal } from "./dates";

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

describe("toDateTimeLocal", () => {
  it("shows the time on this device clock, to the minute", () => {
    // Asia/Manila is UTC+8 (pinned in the test setup).
    expect(toDateTimeLocal("2026-12-01T01:05:42.000Z")).toBe(
      "2026-12-01T09:05",
    );
  });

  it("is empty for an unreadable timestamp", () => {
    expect(toDateTimeLocal("not a date")).toBe("");
  });
});

describe("test time zone", () => {
  it("is pinned to Asia/Manila so local-time tests do not depend on the machine", () => {
    expect(process.env.TZ).toBe("Asia/Manila");
    expect(new Date(2026, 11, 1, 9, 0).toISOString()).toBe(
      "2026-12-01T01:00:00.000Z",
    );
  });
});
