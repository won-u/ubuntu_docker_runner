/**
 * Origin guard — DNS-rebinding protection for the Streamable HTTP endpoint.
 *
 * Pure helpers, kept out of the server bootstrap so the allow/deny decision can
 * be unit-tested without an HTTP layer.
 *
 * Policy:
 *   - No `Origin` header (native clients: Claude Code CLI, curl) -> allow.
 *   - `Origin` is a localhost/loopback URL -> always allow.
 *   - `Origin` is in the configured allowlist -> allow.
 *   - Anything else -> reject (403).
 *
 * A browser that has been DNS-rebindeded to a local address still sends its
 * real page Origin, so this blocks it while leaving native clients untouched.
 */

import type { Request, Response, NextFunction } from "express";

/**
 * Parse a comma-separated env value into a trimmed, de-duplicated list with
 * empties removed. Returns [] when unset/empty.
 */
export function parseList(raw: string | undefined): string[] {
  const seen = new Set<string>();
  for (const part of (raw ?? "").split(",")) {
    const v = part.trim();
    if (v.length > 0) seen.add(v);
  }
  return [...seen];
}

/** True when the origin's host is a loopback address (any scheme/port). */
export function isLoopbackOrigin(origin: string): boolean {
  try {
    const { hostname } = new URL(origin);
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "[::1]" ||
      hostname === "::1"
    );
  } catch {
    // Not a parseable absolute URL — treat as untrusted.
    return false;
  }
}

/**
 * Decide whether an Origin value is acceptable. `undefined` (header absent)
 * is accepted — non-browser MCP clients do not send Origin.
 */
export function isOriginAllowed(
  origin: string | undefined,
  allowlist: readonly string[],
): boolean {
  if (origin === undefined) return true;
  if (isLoopbackOrigin(origin)) return true;
  return allowlist.includes(origin);
}

/**
 * Build the Express middleware that enforces the Origin policy above.
 * `allowlist` holds extra exact-match origins (e.g. https://claude.ai).
 */
export function makeOriginGuard(
  allowlist: readonly string[],
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    const header = req.headers.origin;
    const origin = typeof header === "string" ? header : undefined;
    if (isOriginAllowed(origin, allowlist)) {
      next();
      return;
    }
    res.status(403).json({
      error: `Origin '${origin ?? ""}' is not allowed. Add it to MCP_ALLOWED_ORIGINS if this is expected.`,
    });
  };
}
