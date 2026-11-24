import "@testing-library/jest-dom/vitest";

// Local-time tests (datetime-local inputs, announcement times) must give the
// same answer on every machine and in CI: pin the zone before any Date is
// used. Manila is UTC+8 all year (no daylight saving).
process.env.TZ = "Asia/Manila";
