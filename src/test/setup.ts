import "@testing-library/jest-dom/vitest";
import { configure } from "@testing-library/react";

// Under the full suite's parallel load a cold dynamic import plus a large page
// render can exceed the 1000 ms default of findBy* and waitFor.
configure({ asyncUtilTimeout: 3000 });

// Local-time tests (datetime-local inputs, announcement times) must give the
// same answer on every machine and in CI: pin the zone before any Date is
// used. Manila is UTC+8 all year (no daylight saving).
process.env.TZ = "Asia/Manila";
