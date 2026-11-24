export const ADMIN_HOME = "/admin";

function hasControlCharacter(value: string): boolean {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code <= 0x1f || code === 0x7f) return true;
  }
  return false;
}

/**
 * The post-login destination, from the untrusted `?next=` parameter. Only a
 * plain path inside the admin is honoured; anything else (another site, a
 * protocol-relative URL, a backslash, dot segments, encoded variants of those,
 * or the login page itself, which would loop) goes to the dashboard.
 */
export function safeNext(next: string | null | undefined): string {
  if (!next || !/^\/admin(\/|$)/.test(next)) return ADMIN_HOME;
  if (/^\/admin\/login(\/|$)/.test(next)) return ADMIN_HOME;

  let decoded: string;
  try {
    decoded = decodeURIComponent(next);
  } catch {
    return ADMIN_HOME;
  }

  for (const value of [next, decoded]) {
    if (value.includes("//") || value.includes("\\")) return ADMIN_HOME;
    if (hasControlCharacter(value)) return ADMIN_HOME;
    if (value.split("/").some((part) => part === "." || part === "..")) {
      return ADMIN_HOME;
    }
  }
  return next;
}
