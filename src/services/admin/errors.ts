/**
 * An error safe to show to the site owner. `friendly` is the only text a page
 * should display; `code` is the Postgres/PostgREST code (or one of ours) for
 * logic. The raw Supabase message and details are deliberately not kept: they
 * can leak table, column and constraint names.
 */
export class AdminError extends Error {
  readonly code: string;
  readonly friendly: string;

  constructor(code: string, friendly: string) {
    super(friendly);
    this.name = "AdminError";
    this.code = code;
    this.friendly = friendly;
  }
}

const SESSION_EXPIRED = "Your session has expired — please sign in again.";
const CONNECTION =
  "Can't reach the server. Check your connection and try again.";
const GENERIC = "Something went wrong. Please try again.";

/** Codes that mean "the server no longer treats this browser as an admin". */
const SESSION_CODES = new Set([
  "42501", // insufficient_privilege (RLS rejected the write)
  "PGRST301", // JWT expired / invalid
  "PGRST303", // JWT claims invalid
  "NO_ROWS", // ours: an RLS-filtered write touched 0 rows
]);

const NETWORK_MESSAGE =
  /failed to fetch|networkerror|network request failed|load failed|fetch failed/i;

function codeOf(e: unknown): string | undefined {
  if (typeof e !== "object" || e === null || !("code" in e)) return undefined;
  const { code } = e;
  return typeof code === "string" && code !== "" ? code : undefined;
}

function isNetworkError(e: unknown): boolean {
  // A fetch failure is a TypeError, but so is any programming error: only
  // treat it as a connection problem when its message says so.
  if (typeof e !== "object" || e === null || !("message" in e)) return false;
  const { message } = e;
  return typeof message === "string" && NETWORK_MESSAGE.test(message);
}

/**
 * Turns anything thrown or returned by Supabase into an AdminError with
 * plain-language text. Never copies `error.message` or `details` through.
 */
export function toFriendlyError(
  e: unknown,
  context: { entity?: string } = {},
): AdminError {
  if (e instanceof AdminError) return e;
  const entity = context.entity ?? "item";
  const code = codeOf(e);

  if (code === "23505") {
    return new AdminError(
      code,
      `That ${entity} already exists (the web address or name must be unique).`,
    );
  }
  if (code === "23503") {
    return new AdminError(
      code,
      "This item is still in use elsewhere and can't be deleted yet.",
    );
  }
  if (code === "23514") {
    return new AdminError(
      code,
      "Some of the details don't meet the requirements — please check the highlighted fields.",
    );
  }
  if (code !== undefined && SESSION_CODES.has(code)) {
    return new AdminError(code, SESSION_EXPIRED);
  }
  if (code === undefined && isNetworkError(e)) {
    return new AdminError("NETWORK", CONNECTION);
  }
  return new AdminError(code ?? "UNKNOWN", GENERIC);
}

/** Shown when an RLS-filtered write changed nothing: the session is gone. */
export function noRowsError(): AdminError {
  return new AdminError("NO_ROWS", SESSION_EXPIRED);
}

/** Shown when the site has no Supabase env. */
export function notConfiguredError(): AdminError {
  return new AdminError(
    "NOT_CONFIGURED",
    "The admin isn't configured on this site yet.",
  );
}
