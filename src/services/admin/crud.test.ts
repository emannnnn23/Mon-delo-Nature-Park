import { AdminError } from "./errors";
import {
  deleteRow,
  emptyToNull,
  getRow,
  insertRow,
  listRows,
  markConfirmed,
  nextSortOrder,
  setPublished,
  swapOrder,
  updateRow,
} from "./crud";

type Call = { table: string; op: string; args: unknown[] };
type Result = { data: unknown; error: unknown };

/**
 * Minimal fake of the supabase-js query builder: records every chained call
 * and resolves to the next queued result when awaited.
 */
const fake = vi.hoisted(() => {
  const state = {
    calls: [] as Call[],
    results: [] as Result[],
    configured: true,
  };
  function builder(table: string) {
    const b: Record<string, unknown> = {};
    for (const op of [
      "select",
      "insert",
      "update",
      "delete",
      "eq",
      "is",
      "order",
      "limit",
      "maybeSingle",
      "single",
    ]) {
      b[op] = (...args: unknown[]) => {
        state.calls.push({ table, op, args });
        return b;
      };
    }
    b.then = (
      resolve: (r: Result) => unknown,
      reject: (e: unknown) => unknown,
    ) =>
      Promise.resolve(
        state.results.shift() ?? { data: null, error: null },
      ).then(resolve, reject);
    return b;
  }
  return { state, client: { from: (table: string) => builder(table) } };
});

vi.mock("~/lib/supabase", () => ({
  getSupabase: () => (fake.state.configured ? fake.client : null),
}));

const ok = (data: unknown): Result => ({ data, error: null });
const fail = (code: string, message = "raw db message"): Result => ({
  data: null,
  error: { code, message, details: "raw details" },
});
const ops = () => fake.state.calls.map((c) => c.op);
const call = (op: string) => fake.state.calls.find((c) => c.op === op);

beforeEach(() => {
  fake.state.calls = [];
  fake.state.results = [];
  fake.state.configured = true;
});

describe("emptyToNull", () => {
  it("trims strings and turns empty or whitespace-only ones into null", () => {
    expect(
      emptyToNull({ a: "  hi  ", b: "", c: "   ", d: 0, e: false, f: null }),
    ).toEqual({ a: "hi", b: null, c: null, d: 0, e: false, f: null });
  });

  it("leaves arrays, objects and undefined alone", () => {
    const hours = { mon: "9-5" };
    const out = emptyToNull({ list: ["", "x"], hours, u: undefined });
    expect(out.list).toEqual(["", "x"]);
    expect(out.hours).toBe(hours);
    expect("u" in out).toBe(true);
  });

  it("does not mutate its input", () => {
    const input = { a: "" };
    emptyToNull(input);
    expect(input.a).toBe("");
  });
});

describe("listRows", () => {
  it("orders by sort_order then created_at by default", async () => {
    fake.state.results = [ok([{ id: "1" }])];
    const rows = await listRows("faqs");
    expect(rows).toEqual([{ id: "1" }]);
    const orders = fake.state.calls.filter((c) => c.op === "order");
    expect(orders.map((c) => c.args[0])).toEqual(["sort_order", "created_at"]);
  });

  it("applies filters, including null, and a custom order", async () => {
    fake.state.results = [ok([])];
    await listRows("gallery_images", {
      filter: { category_id: "c1", caption: null },
      orderBy: "created_at",
    });
    expect(call("eq")?.args).toEqual(["category_id", "c1"]);
    expect(call("is")?.args).toEqual(["caption", null]);
    expect(
      fake.state.calls.filter((c) => c.op === "order").map((c) => c.args[0]),
    ).toEqual(["created_at"]);
  });

  it("orders announcements, which have no sort_order, newest first", async () => {
    fake.state.results = [ok([])];
    await listRows("announcements");
    const orders = fake.state.calls.filter((c) => c.op === "order");
    expect(orders.map((c) => c.args[0])).toEqual(["starts_at", "created_at"]);
    expect(orders[0].args[1]).toEqual({ ascending: false });
  });

  it("throws a friendly AdminError without leaking the raw error", async () => {
    fake.state.results = [fail("XX000")];
    const err = await listRows("faqs").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AdminError);
    expect((err as AdminError).friendly).toBe(
      "Something went wrong. Please try again.",
    );
    expect((err as AdminError).message).not.toContain("raw");
  });

  it("throws an AdminError when Supabase is not configured", async () => {
    fake.state.configured = false;
    await expect(listRows("faqs")).rejects.toBeInstanceOf(AdminError);
  });

  it("maps a network failure returned by the client", async () => {
    fake.state.results = [
      { data: null, error: new TypeError("Failed to fetch") },
    ];
    await expect(listRows("faqs")).rejects.toMatchObject({
      friendly: "Can't reach the server. Check your connection and try again.",
    });
  });
});

describe("getRow", () => {
  it("returns the row, or null when there is none", async () => {
    fake.state.results = [ok({ id: "1" }), ok(null)];
    expect(await getRow("faqs", "1")).toEqual({ id: "1" });
    expect(await getRow("faqs", "2")).toBeNull();
    expect(call("eq")?.args).toEqual(["id", "1"]);
  });
});

describe("insertRow", () => {
  it("normalises empty strings to null before writing", async () => {
    fake.state.results = [ok({ id: "n" })];
    const row = await insertRow("faqs", {
      question: "  Open? ",
      answer: "",
    });
    expect(row).toEqual({ id: "n" });
    expect(call("insert")?.args[0]).toEqual({
      question: "Open?",
      answer: null,
    });
  });

  it("maps a unique violation", async () => {
    fake.state.results = [fail("23505")];
    await expect(
      insertRow("faqs", { question: "q", answer: "a" }),
    ).rejects.toMatchObject({ code: "23505" });
  });
});

describe("updateRow", () => {
  it("normalises empty strings, selects, and returns the row", async () => {
    fake.state.results = [ok([{ id: "1", answer: null }])];
    const row = await updateRow("faqs", "1", { answer: " " });
    expect(row).toEqual({ id: "1", answer: null });
    expect(call("update")?.args[0]).toEqual({ answer: null });
    expect(ops()).toContain("select");
  });

  it("treats 0 affected rows as an expired session (RLS filtered it)", async () => {
    fake.state.results = [ok([])];
    const err = await updateRow("faqs", "1", { answer: "x" }).catch(
      (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(AdminError);
    expect((err as AdminError).code).toBe("NO_ROWS");
    expect((err as AdminError).friendly).toBe(
      "Your session has expired — please sign in again.",
    );
  });
});

describe("deleteRow", () => {
  it("deletes by id and selects to count affected rows", async () => {
    fake.state.results = [ok([{ id: "1" }])];
    await expect(deleteRow("faqs", "1")).resolves.toBeUndefined();
    expect(ops()).toEqual(["delete", "eq", "select"]);
  });

  it("treats 0 affected rows as an expired session", async () => {
    fake.state.results = [ok([])];
    await expect(deleteRow("faqs", "1")).rejects.toMatchObject({
      code: "NO_ROWS",
      friendly: "Your session has expired — please sign in again.",
    });
  });

  it("maps a foreign key violation", async () => {
    fake.state.results = [fail("23503")];
    await expect(deleteRow("attractions", "1")).rejects.toMatchObject({
      friendly: "This item is still in use elsewhere and can't be deleted yet.",
    });
  });
});

describe("swapOrder", () => {
  const a = { id: "a", sort_order: 1 };
  const b = { id: "b", sort_order: 2 };

  it("swaps the two sort_order values with two updates", async () => {
    fake.state.results = [ok([{ id: "a" }]), ok([{ id: "b" }])];
    await swapOrder("faqs", a, b);
    const updates = fake.state.calls.filter((c) => c.op === "update");
    expect(updates.map((c) => c.args[0])).toEqual([
      { sort_order: 2 },
      { sort_order: 1 },
    ]);
  });

  it("reverts the first update when the second fails", async () => {
    fake.state.results = [ok([{ id: "a" }]), fail("42501"), ok([{ id: "a" }])];
    const err = await swapOrder("faqs", a, b).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AdminError);
    const updates = fake.state.calls.filter((c) => c.op === "update");
    expect(updates).toHaveLength(3);
    expect(updates[2].args[0]).toEqual({ sort_order: 1 });
    const eqs = fake.state.calls.filter((c) => c.op === "eq");
    expect(eqs.map((c) => c.args[1])).toEqual(["a", "b", "a"]);
  });

  it("still throws the original error if the revert also fails", async () => {
    fake.state.results = [ok([{ id: "a" }]), fail("23514"), fail("XX000")];
    await expect(swapOrder("faqs", a, b)).rejects.toMatchObject({
      code: "23514",
    });
  });

  it("does not attempt a revert when the first update fails", async () => {
    fake.state.results = [fail("XX000")];
    await expect(swapOrder("faqs", a, b)).rejects.toBeInstanceOf(AdminError);
    expect(fake.state.calls.filter((c) => c.op === "update")).toHaveLength(1);
  });
});

describe("swapOrder with equal sort_order", () => {
  it("moves one row so the order actually changes (a was first, so it goes after b)", async () => {
    fake.state.results = [ok([{ id: "a" }])];
    await swapOrder(
      "faqs",
      { id: "a", sort_order: 3, created_at: "2026-01-01" },
      { id: "b", sort_order: 3, created_at: "2026-01-02" },
    );
    const updates = fake.state.calls.filter((c) => c.op === "update");
    expect(updates).toHaveLength(1);
    expect(updates[0].args[0]).toEqual({ sort_order: 4 });
    expect(call("eq")?.args).toEqual(["id", "a"]);
  });

  it("moves b after a when b was created first", async () => {
    fake.state.results = [ok([{ id: "b" }])];
    await swapOrder(
      "faqs",
      { id: "a", sort_order: 3, created_at: "2026-01-02" },
      { id: "b", sort_order: 3, created_at: "2026-01-01" },
    );
    expect(call("eq")?.args).toEqual(["id", "b"]);
    expect(call("update")?.args[0]).toEqual({ sort_order: 4 });
  });

  it("without created_at, treats a as first", async () => {
    fake.state.results = [ok([{ id: "a" }])];
    await swapOrder(
      "faqs",
      { id: "a", sort_order: 0 },
      { id: "b", sort_order: 0 },
    );
    expect(call("eq")?.args).toEqual(["id", "a"]);
    expect(call("update")?.args[0]).toEqual({ sort_order: 1 });
  });
});

describe("nextSortOrder", () => {
  it("is the highest sort_order plus one", async () => {
    fake.state.results = [ok([{ sort_order: 7 }])];
    expect(await nextSortOrder("faqs")).toBe(8);
    expect(fake.state.calls.find((c) => c.op === "order")?.args).toEqual([
      "sort_order",
      { ascending: false },
    ]);
    expect(call("limit")?.args).toEqual([1]);
  });

  it("is 0 for an empty table", async () => {
    fake.state.results = [ok([])];
    expect(await nextSortOrder("faqs")).toBe(0);
  });

  it("can be scoped by a filter", async () => {
    fake.state.results = [ok([{ sort_order: 2 }])];
    expect(
      await nextSortOrder("attraction_images", { attraction_id: "x" }),
    ).toBe(3);
    expect(call("eq")?.args).toEqual(["attraction_id", "x"]);
  });

  it("throws an AdminError on failure", async () => {
    fake.state.results = [fail("XX000")];
    await expect(nextSortOrder("faqs")).rejects.toBeInstanceOf(AdminError);
  });
});

describe("setPublished and markConfirmed", () => {
  it("setPublished writes is_published", async () => {
    fake.state.results = [ok([{ id: "1", is_published: true }])];
    await setPublished("faqs", "1", true);
    expect(call("update")?.args[0]).toEqual({ is_published: true });
  });

  it("markConfirmed writes is_sample = false", async () => {
    fake.state.results = [ok([{ id: "1", is_sample: false }])];
    await markConfirmed("attractions", "1");
    expect(call("update")?.args[0]).toEqual({ is_sample: false });
  });
});
