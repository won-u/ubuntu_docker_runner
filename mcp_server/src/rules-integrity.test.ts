/**
 * Rule integrity guard.
 *
 * These tests validate the *content wiring* of the rules against the real
 * host_rules/ tree — not runtime behavior. They exist to catch the class of bug
 * we already hit once (a file named commit-rules.md while the tool was
 * get_commit_guidelines, breaking the documented filename -> tool mapping) and to
 * stop rule cross-references from dangling as the docs grow.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  CODING_LANGUAGES,
  RULE_TOOLS,
  instructionLine,
  toolDescription,
} from "./rules.js";

/** Real rules directory served by the server (sibling of src/). */
const RULES_DIR = fileURLToPath(new URL("../host_rules", import.meta.url));

/**
 * User-facing docs that list every tool. These are hand-maintained, so without
 * a guard they drift silently whenever a rule is added. Keyed by a label used
 * in the assertion message.
 */
const TOOL_DOCS: ReadonlyArray<{ label: string; path: string }> = [
  {
    label: "docs/tools-and-prompts.ko.md",
    path: fileURLToPath(
      new URL("../docs/tools-and-prompts.ko.md", import.meta.url),
    ),
  },
  {
    label: "README.md",
    path: fileURLToPath(new URL("../README.md", import.meta.url)),
  },
  {
    label: "README.ko.md",
    path: fileURLToPath(new URL("../README.ko.md", import.meta.url)),
  },
];

/** Markdown files a rule doc may reference that are NOT served rule files. */
const EXTERNAL_MD = new Set([
  "CLAUDE.md",
  "AGENTS.md",
  "README.md",
  "README.ko.md",
]);

/** "commit-guidelines.md" -> "get_commit_guidelines" */
function toolNameForFile(file: string): string {
  return "get_" + path.basename(file, ".md").replace(/-/g, "_");
}

/** All markdown files under host_rules, as paths relative to RULES_DIR. */
function listMarkdown(): string[] {
  return readdirSync(RULES_DIR, { recursive: true, encoding: "utf8" })
    .map((p) => p.toString())
    .filter((p) => p.endsWith(".md"));
}

const allMarkdown = listMarkdown();
const presentBasenames = new Set(allMarkdown.map((p) => path.basename(p)));

test("every RULE_TOOLS entry maps to an existing rule file", () => {
  for (const rt of RULE_TOOLS) {
    assert.ok(
      existsSync(path.join(RULES_DIR, rt.file)),
      `Tool ${rt.tool} points at "${rt.file}", which does not exist under host_rules/.`,
    );
  }
});

test("every RULE_TOOLS name follows the <file>.md -> get_<name> rule", () => {
  // This is the invariant the server instructions promise so agents can resolve
  // cross-references. The original commit-rules.md / get_commit_guidelines bug
  // would fail here.
  for (const rt of RULE_TOOLS) {
    assert.equal(
      rt.tool,
      toolNameForFile(rt.file),
      `Tool "${rt.tool}" breaks the naming rule for file "${rt.file}" (expected "${toolNameForFile(rt.file)}").`,
    );
  }
});

test("RULE_TOOLS has no duplicate tool names or files", () => {
  const tools = RULE_TOOLS.map((r) => r.tool);
  const files = RULE_TOOLS.map((r) => r.file);
  assert.equal(new Set(tools).size, tools.length, "Duplicate tool name.");
  assert.equal(new Set(files).size, files.length, "Duplicate rule file.");
});

test("every tool is listed in the user-facing docs", () => {
  // Guards the doc-drift failure mode: rules.ts is enforced by the tests above,
  // but the docs were previously only kept in sync by hand.
  for (const doc of TOOL_DOCS) {
    const content = readFileSync(doc.path, "utf8");
    for (const rt of RULE_TOOLS) {
      assert.ok(
        content.includes(rt.tool),
        `${doc.label} does not mention "${rt.tool}". Add it there (and to the host_rules tree) when adding a rule.`,
      );
    }
    assert.ok(
      content.includes("get_coding_standards"),
      `${doc.label} does not mention "get_coding_standards".`,
    );
  }
});

test("every coding-standards language is listed in the user-facing docs", () => {
  for (const doc of TOOL_DOCS) {
    const content = readFileSync(doc.path, "utf8");
    for (const lang of CODING_LANGUAGES) {
      assert.ok(
        content.includes(`\`${lang}\``),
        `${doc.label} does not list the "${lang}" coding-standards language.`,
      );
    }
  }
});

test("tool description and instructions are derived from one whenToCall", () => {
  // A rule with a missing/misshaped trigger would silently produce a broken
  // description ("Call this .") or guidance line, so assert the shape here.
  for (const rt of RULE_TOOLS) {
    assert.ok(
      rt.whenToCall.length > 0 && /^[a-z]/.test(rt.whenToCall),
      `${rt.tool}: whenToCall must be a non-empty lowercase clause (got "${rt.whenToCall}").`,
    );
    assert.ok(
      !rt.description.includes("Call this"),
      `${rt.tool}: description must not repeat the trigger — that comes from whenToCall.`,
    );
    assert.ok(
      toolDescription(rt).endsWith(`Call this ${rt.whenToCall}.`),
      `${rt.tool}: toolDescription() should append the trigger.`,
    );
    assert.ok(
      instructionLine(rt.tool, rt.whenToCall).endsWith(`-> ${rt.tool}.`),
      `${rt.tool}: instructionLine() should point at the tool.`,
    );
  }
});

test("every coding-standards language file exists", () => {
  for (const lang of CODING_LANGUAGES) {
    assert.ok(
      existsSync(path.join(RULES_DIR, "coding-standards", `${lang}.md`)),
      `Missing coding-standards/${lang}.md for a language in CODING_LANGUAGES.`,
    );
  }
});

test("no top-level rule file is orphaned (present but wired to no tool)", () => {
  const wired = new Set(RULE_TOOLS.map((r) => r.file));
  const topLevel = allMarkdown.filter((p) => !p.includes(path.sep));
  for (const file of topLevel) {
    assert.ok(
      wired.has(file),
      `host_rules/${file} exists but no RULE_TOOLS entry serves it.`,
    );
  }
});

test("every cross-referenced rule file resolves to an existing file", () => {
  // Reference tokens look like `commit-guidelines.md` or `coding-standards/{language}.md`.
  const refPattern = /([A-Za-z0-9_./{}-]+\.md)/g;
  const codingDir = path.join(RULES_DIR, "coding-standards");
  const codingHasFiles =
    existsSync(codingDir) &&
    statSync(codingDir).isDirectory() &&
    readdirSync(codingDir).some((f) => f.endsWith(".md"));

  for (const rel of allMarkdown) {
    const content = readFileSync(path.join(RULES_DIR, rel), "utf8");
    for (const [, token] of content.matchAll(refPattern)) {
      const base = path.basename(token);

      if (token.includes("{")) {
        // Templated reference, e.g. coding-standards/{language}.md.
        assert.ok(
          codingHasFiles,
          `${rel} references "${token}" but coding-standards/ has no files.`,
        );
        continue;
      }
      if (EXTERNAL_MD.has(base)) continue;

      assert.ok(
        presentBasenames.has(base),
        `${rel} references "${token}" but no such rule file exists under host_rules/. ` +
          `Fix the reference or add the file (external files must be whitelisted in EXTERNAL_MD).`,
      );
    }
  }
});
