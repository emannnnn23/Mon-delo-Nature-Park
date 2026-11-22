import { safeNext } from "./safeNext";

describe("safeNext", () => {
  it.each([
    ["/admin", "/admin"],
    ["/admin/attractions", "/admin/attractions"],
    ["/admin/attractions/abc-123", "/admin/attractions/abc-123"],
  ])("keeps %s", (input, expected) => {
    expect(safeNext(input)).toBe(expected);
  });

  it.each([
    [null],
    [undefined],
    [""],
    ["https://evil.com"],
    ["//evil.com"],
    ["/\\evil.com"],
    ["\\\\evil.com"],
    ["/admin//evil.com"],
    ["/admin\\evil"],
    ["/admin/../../x"],
    ["/admin/%2e%2e/x"],
    ["/admin/%2E%2e/x"],
    ["/admin/./x"],
    ["/administrator"],
    ["/adminx/foo"],
    ["/other"],
    ["javascript:alert(1)"],
    ["/admin/\nfoo"],
    ["/admin/%0d%0a"],
    ["/admin/%5cevil"],
    ["/admin/login"],
    ["/admin/login/x"],
  ])("falls back to /admin for %j", (input) => {
    expect(safeNext(input)).toBe("/admin");
  });
});
