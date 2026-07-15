import { test } from "node:test";
import assert from "node:assert/strict";
import type { Request, Response } from "express";

import {
  parseList,
  isLoopbackOrigin,
  isOriginAllowed,
  makeOriginGuard,
} from "./origin.js";

test("parseList splits, trims, de-dupes, and drops empties", () => {
  assert.deepEqual(parseList("a, b ,,a ,c"), ["a", "b", "c"]);
  assert.deepEqual(parseList(""), []);
  assert.deepEqual(parseList(undefined), []);
  assert.deepEqual(parseList("  https://claude.ai  "), ["https://claude.ai"]);
});

test("isLoopbackOrigin recognizes localhost / loopback hosts on any port", () => {
  assert.equal(isLoopbackOrigin("http://localhost"), true);
  assert.equal(isLoopbackOrigin("http://localhost:3000"), true);
  assert.equal(isLoopbackOrigin("http://127.0.0.1:7979"), true);
  assert.equal(isLoopbackOrigin("http://[::1]:3000"), true);
  assert.equal(isLoopbackOrigin("https://claude.ai"), false);
  assert.equal(isLoopbackOrigin("not-a-url"), false);
});

test("isOriginAllowed accepts absent Origin and loopback, honors allowlist", () => {
  const allow = ["https://claude.ai"];
  assert.equal(isOriginAllowed(undefined, allow), true); // native clients
  assert.equal(isOriginAllowed("http://localhost:3000", allow), true);
  assert.equal(isOriginAllowed("https://claude.ai", allow), true);
  assert.equal(isOriginAllowed("https://evil.example", allow), false);
  assert.equal(isOriginAllowed("https://claude.ai", []), false);
});

/** Minimal Express req/res doubles for exercising the middleware. */
function fakeReq(origin?: string): Request {
  const headers = origin === undefined ? {} : { origin };
  return { headers } as unknown as Request;
}

function runGuard(
  origin: string | undefined,
  allowlist: string[],
): { nexted: boolean; statusCode?: number } {
  let statusCode: number | undefined;
  const res = {
    status(code: number) {
      statusCode = code;
      return res;
    },
    json() {
      return res;
    },
  } as unknown as Response;
  let nexted = false;
  makeOriginGuard(allowlist)(fakeReq(origin), res, () => {
    nexted = true;
  });
  return { nexted, statusCode };
}

test("makeOriginGuard allows absent, loopback, and allowlisted origins", () => {
  for (const r of [
    runGuard(undefined, []),
    runGuard("http://127.0.0.1:3000", []),
    runGuard("https://claude.ai", ["https://claude.ai"]),
  ]) {
    assert.equal(r.nexted, true);
    assert.equal(r.statusCode, undefined);
  }
});

test("makeOriginGuard rejects an unlisted browser origin with 403", () => {
  const r = runGuard("https://evil.example", ["https://claude.ai"]);
  assert.equal(r.nexted, false);
  assert.equal(r.statusCode, 403);
});
