import { test } from "node:test";
import assert from "node:assert/strict";
import type { Request, Response } from "express";

import { makeRequireAuth, makeTokenValidator, parseTokens } from "./auth.js";

/** Minimal Express req/res doubles for exercising the auth middleware. */
function fakeReq(authorization?: string | string[]): Request {
  const headers = authorization === undefined ? {} : { authorization };
  return { headers } as unknown as Request;
}

function fakeRes(): {
  res: Response;
  statusCode?: number;
  headers: Record<string, string>;
} {
  const captured: {
    res: Response;
    statusCode?: number;
    headers: Record<string, string>;
  } = { headers: {} } as never;
  const res = {
    status(code: number) {
      captured.statusCode = code;
      return res;
    },
    set(field: string, value: string) {
      captured.headers[field] = value;
      return res;
    },
    json() {
      return res;
    },
  } as unknown as Response;
  captured.res = res;
  return captured;
}

/** Run the middleware and report whether next() was called. */
function run(
  authorization: string | string[] | undefined,
  opts: { authEnabled: boolean; isValidToken: (t: string) => boolean },
): { nexted: boolean; statusCode?: number; headers: Record<string, string> } {
  const mw = makeRequireAuth(opts);
  const cap = fakeRes();
  let nexted = false;
  mw(fakeReq(authorization), cap.res, () => {
    nexted = true;
  });
  return { nexted, statusCode: cap.statusCode, headers: cap.headers };
}

test("parseTokens splits, trims, and drops empties", () => {
  assert.deepEqual(parseTokens("a, b ,,c "), ["a", "b", "c"]);
  assert.deepEqual(parseTokens(""), []);
  assert.deepEqual(parseTokens(undefined), []);
  assert.deepEqual(parseTokens("  single  "), ["single"]);
});

test("makeTokenValidator accepts configured tokens and rejects others", () => {
  const isValid = makeTokenValidator(["alpha", "beta"]);
  assert.equal(isValid("alpha"), true);
  assert.equal(isValid("beta"), true);
  assert.equal(isValid("gamma"), false);
  assert.equal(isValid(""), false);
  assert.equal(isValid("alph"), false);
});

test("makeTokenValidator with no tokens rejects everything", () => {
  const isValid = makeTokenValidator([]);
  assert.equal(isValid("anything"), false);
  assert.equal(isValid(""), false);
});

test("makeRequireAuth passes through when auth is disabled", () => {
  const r = run(undefined, { authEnabled: false, isValidToken: () => false });
  assert.equal(r.nexted, true);
  assert.equal(r.statusCode, undefined);
});

test("makeRequireAuth passes a valid Bearer token", () => {
  const r = run("Bearer good", {
    authEnabled: true,
    isValidToken: (t) => t === "good",
  });
  assert.equal(r.nexted, true);
  assert.equal(r.statusCode, undefined);
});

test("makeRequireAuth rejects a missing/invalid/malformed header with 401", () => {
  const opts = { authEnabled: true, isValidToken: (t: string) => t === "good" };

  // No Authorization header.
  let r = run(undefined, opts);
  assert.equal(r.nexted, false);
  assert.equal(r.statusCode, 401);
  assert.equal(
    r.headers["WWW-Authenticate"],
    'Bearer realm="personal-rules-mcp"',
  );

  // Wrong scheme.
  r = run("Basic Zm9vOmJhcg==", opts);
  assert.equal(r.nexted, false);
  assert.equal(r.statusCode, 401);

  // Bearer prefix but empty token.
  r = run("Bearer    ", opts);
  assert.equal(r.nexted, false);
  assert.equal(r.statusCode, 401);

  // Valid shape, wrong token.
  r = run("Bearer bad", opts);
  assert.equal(r.nexted, false);
  assert.equal(r.statusCode, 401);

  // Array header (repeated param) is not a valid single credential.
  r = run(["Bearer good", "Bearer good"], opts);
  assert.equal(r.nexted, false);
  assert.equal(r.statusCode, 401);
});
