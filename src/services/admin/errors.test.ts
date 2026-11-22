import { AdminError, toFriendlyError } from "./errors";

const SESSION = "Your session has expired — please sign in again.";
const CONNECTION =
  "Can't reach the server. Check your connection and try again.";
const GENERIC = "Something went wrong. Please try again.";

describe("toFriendlyError", () => {
  it("maps a unique violation, naming the entity", () => {
    const e = toFriendlyError({ code: "23505" }, { entity: "attraction" });
    expect(e).toBeInstanceOf(AdminError);
    expect(e.friendly).toBe(
      "That attraction already exists (the web address or name must be unique).",
    );
    expect(e.code).toBe("23505");
  });

  it("falls back to 'item' when no entity is given", () => {
    expect(toFriendlyError({ code: "23505" }).friendly).toContain(
      "That item already exists",
    );
  });

  it("maps a foreign key violation", () => {
    expect(toFriendlyError({ code: "23503" }).friendly).toBe(
      "This item is still in use elsewhere and can't be deleted yet.",
    );
  });

  it("maps a check violation", () => {
    expect(toFriendlyError({ code: "23514" }).friendly).toBe(
      "Some of the details don't meet the requirements — please check the highlighted fields.",
    );
  });

  it.each(["42501", "PGRST301", "PGRST303", "NO_ROWS"])(
    "maps %s to the session message",
    (code) => {
      expect(toFriendlyError({ code }).friendly).toBe(SESSION);
    },
  );

  it("maps a fetch TypeError to the connection message", () => {
    expect(toFriendlyError(new TypeError("Failed to fetch")).friendly).toBe(
      CONNECTION,
    );
  });

  it("maps a TypeError that is not a network failure to the generic message", () => {
    expect(
      toFriendlyError(new TypeError("Cannot read properties of undefined"))
        .friendly,
    ).toBe(GENERIC);
  });

  it("maps a PostgREST error that wraps a network failure", () => {
    expect(
      toFriendlyError({ message: "TypeError: Failed to fetch", code: "" })
        .friendly,
    ).toBe(CONNECTION);
  });

  it("maps anything else to the generic message", () => {
    expect(toFriendlyError({ code: "XX000" }).friendly).toBe(GENERIC);
    expect(toFriendlyError("boom").friendly).toBe(GENERIC);
    expect(toFriendlyError(null).friendly).toBe(GENERIC);
    expect(toFriendlyError(new Error("kaboom")).friendly).toBe(GENERIC);
  });

  it("never exposes the raw message or details", () => {
    const e = toFriendlyError({
      code: "23505",
      message: 'duplicate key value violates unique constraint "x_key"',
      details: "Key (slug)=(secret) already exists.",
      hint: "internal hint",
    });
    expect(e.message).toBe(e.friendly);
    expect(JSON.stringify(e)).not.toMatch(/duplicate key|secret|internal/);
    expect(e.message).not.toMatch(/duplicate key|secret|internal/);
  });

  it("returns an AdminError unchanged", () => {
    const original = new AdminError("23505", "Already there.");
    expect(toFriendlyError(original)).toBe(original);
  });
});
