import { test } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  REFERENCE_NOTE,
  readRuleFile,
  resolveWithinRules,
  toToolResult,
} from "./rules.js";

async function tempRoot(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "rules-test-"));
}

test("resolveWithinRules keeps paths inside the root", () => {
  const root = "/app/rules";
  assert.equal(
    resolveWithinRules(root, "commit-guidelines.md"),
    path.resolve(root, "commit-guidelines.md"),
  );
  assert.equal(
    resolveWithinRules(root, "coding-standards", "cpp.md"),
    path.resolve(root, "coding-standards/cpp.md"),
  );
  // The root itself is allowed.
  assert.equal(resolveWithinRules(root), path.resolve(root));
});

test("resolveWithinRules blocks path traversal", () => {
  const root = "/app/rules";
  assert.equal(resolveWithinRules(root, "..", "etc", "passwd"), null);
  assert.equal(resolveWithinRules(root, "../../etc/passwd"), null);
  assert.equal(
    resolveWithinRules(root, "coding-standards", "..", "..", "secret"),
    null,
  );
});

test("resolveWithinRules rejects an absolute-path segment", () => {
  const root = "/app/rules";
  // An absolute segment would reset path.resolve and escape the root.
  assert.equal(resolveWithinRules(root, "/etc/passwd"), null);
});

test("resolveWithinRules rejects a sibling-prefix escape", () => {
  const root = "/app/rules";
  // "<root>-evil" shares the root as a string prefix but is NOT inside it;
  // the `base + path.sep` check must reject it.
  assert.equal(resolveWithinRules(root, "..", "rules-evil"), null);
});

test("readRuleFile returns a friendly message on a non-ENOENT read error", async () => {
  const dir = await tempRoot();
  await fs.mkdir(path.join(dir, "a-directory"));
  // Reading a directory as a file raises EISDIR (not ENOENT) — the other-error
  // branch must still return gracefully rather than throw.
  const r = await readRuleFile(dir, ["a-directory"], "dir guide");
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.message, /server-side issue/);
});

test("readRuleFile returns content for an existing non-empty file", async () => {
  const dir = await tempRoot();
  await fs.writeFile(path.join(dir, "workflow-rules.md"), "# Workflow\nhello");
  const r = await readRuleFile(dir, ["workflow-rules.md"], "workflow rules");
  assert.equal(r.ok, true);
  if (r.ok) assert.match(r.content, /Workflow/);
});

test("readRuleFile returns a friendly message when the file is missing", async () => {
  const dir = await tempRoot();
  const r = await readRuleFile(dir, ["nope.md"], "missing guide");
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.message, /not available/);
});

test("readRuleFile treats an empty file as unavailable", async () => {
  const dir = await tempRoot();
  await fs.writeFile(path.join(dir, "empty.md"), "   \n  ");
  const r = await readRuleFile(dir, ["empty.md"], "empty guide");
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.message, /empty/);
});

test("readRuleFile refuses traversal via a friendly message", async () => {
  const dir = await tempRoot();
  const r = await readRuleFile(dir, ["..", "escape.md"], "escape");
  assert.equal(r.ok, false);
});

test("toToolResult wraps ok and error results", () => {
  const okRes = toToolResult({ ok: true, content: "hi" });
  assert.match(okRes.content[0].text, /^hi\b/);
  assert.equal((okRes as { isError?: boolean }).isError, undefined);

  const errRes = toToolResult({ ok: false, message: "nope" });
  assert.equal(errRes.content[0].text, "nope");
  assert.equal((errRes as { isError?: boolean }).isError, true);
});

test("toToolResult appends the reference note to a served rule", () => {
  // The note is what stops a client from treating a rule's `참조` index as a
  // fetch list and pulling most of the ruleset for one lookup. It must ride
  // along with the content, since server `instructions` may never be surfaced.
  const res = toToolResult({
    ok: true,
    content: "# Rule\n참조: `security-guidelines.md`",
  });
  assert.ok(res.content[0].text.includes(REFERENCE_NOTE));
  assert.ok(res.content[0].text.startsWith("# Rule"));
});

test("toToolResult does not append the reference note to a failure", () => {
  // A "not available" message is not a rule — appending index guidance to it
  // would be noise, and there is no `참조` list to guard against.
  const res = toToolResult({ ok: false, message: "not available" });
  assert.ok(!res.content[0].text.includes(REFERENCE_NOTE));
});
