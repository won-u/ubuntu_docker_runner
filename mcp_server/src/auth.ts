/**
 * Bearer token authentication — pure helpers.
 *
 * Kept separate from the server bootstrap so token parsing and constant-time
 * comparison can be unit-tested without an HTTP layer.
 */

import { createHash, timingSafeEqual } from "node:crypto";
import type { Request, Response, NextFunction } from "express";

/**
 * Parse the MCP_AUTH_TOKEN env value into a list of tokens. Comma-separated,
 * trimmed, empties removed. Returns [] when unset/empty (auth disabled).
 */
export function parseTokens(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

/** SHA-256 digest (fixed 32-byte length) so tokens can be compared in constant time. */
function sha256(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

/**
 * Build a validator that checks a presented token against every configured
 * token in constant time. With an empty token list the validator always returns
 * false (callers should treat "no tokens configured" as auth-disabled upstream).
 */
export function makeTokenValidator(
  tokens: string[],
): (provided: string) => boolean {
  const hashes = tokens.map(sha256);
  return (provided: string): boolean => {
    const providedHash = sha256(provided);
    let ok = false;
    // Iterate all hashes (no early return) so timing doesn't leak which/whether matched.
    for (const hash of hashes) {
      if (timingSafeEqual(providedHash, hash)) ok = true;
    }
    return ok;
  };
}

/**
 * Build the Express middleware that guards the MCP endpoints. Kept here (not
 * inline in the server bootstrap) so the authorize/reject decision can be
 * unit-tested with a fake req/res.
 *
 * - `authEnabled` false  -> always pass through (no token configured).
 * - valid `Bearer <token>` -> pass through.
 * - anything else -> 401 with a WWW-Authenticate challenge.
 */
export function makeRequireAuth(opts: {
  authEnabled: boolean;
  isValidToken: (token: string) => boolean;
}): (req: Request, res: Response, next: NextFunction) => void {
  const { authEnabled, isValidToken } = opts;
  const prefix = "Bearer ";
  return (req, res, next) => {
    if (!authEnabled) {
      next();
      return;
    }
    const header = req.headers.authorization;
    if (typeof header === "string" && header.startsWith(prefix)) {
      const token = header.slice(prefix.length).trim();
      if (token.length > 0 && isValidToken(token)) {
        next();
        return;
      }
    }
    res
      .status(401)
      .set("WWW-Authenticate", 'Bearer realm="personal-rules-mcp"')
      .json({
        error:
          "Unauthorized. Provide a valid 'Authorization: Bearer <token>' header.",
      });
  };
}
