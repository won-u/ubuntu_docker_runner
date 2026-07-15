/**
 * Rule file access — pure, side-effect-free helpers.
 *
 * Kept separate from the server bootstrap (index.ts) so these can be unit-tested
 * without opening a port. Every function takes the rules root explicitly, which
 * also makes tests trivial (point them at a temp directory).
 */

import { promises as fs } from "node:fs";
import path from "node:path";

/** Allowed languages for the coding-standards tool. */
export const CODING_LANGUAGES = [
  "cpp",
  "typescript",
  "javascript",
  "python",
  "bash",
  "general",
] as const;

export type CodingLanguage = (typeof CODING_LANGUAGES)[number];

/** A parameter-less rule tool: one MCP tool that serves one markdown rule file. */
export interface RuleTool {
  /** MCP tool name, e.g. "get_workflow_rules". */
  tool: string;
  /** Rule file under the rules root, e.g. "workflow-rules.md". */
  file: string;
  /** Tool title surfaced to clients. */
  title: string;
  /** What the rule covers. The "when to call it" half comes from `whenToCall`. */
  description: string;
  /**
   * The trigger, as a lowercase clause that reads naturally after "Call this"
   * (e.g. "before committing or writing a PR"). Single source for BOTH the
   * tool description suffix and the server's instructions line, so the two can
   * never drift apart. See toolDescription() / instructionLine().
   */
  whenToCall: string;
  /** Human-readable name used in "not available" messages. */
  friendlyName: string;
}

/**
 * Single source of truth for the parameter-less rule tools. index.ts registers
 * every entry and derives its instructions from them, and rules-integrity.test.ts
 * guards each against the filesystem, the `<file>.md -> get_<name>` mapping, and
 * the user-facing docs. Add a rule here (plus its markdown file) and it is wired
 * up, documented-checked, and guarded automatically.
 *
 * get_coding_standards is intentionally NOT here — it takes a `language`
 * parameter and maps to coding-standards/{language}.md (see CODING_LANGUAGES).
 */
export const RULE_TOOLS: readonly RuleTool[] = [
  {
    tool: "get_workflow_rules",
    file: "workflow-rules.md",
    title: "Get Workflow Rules",
    description:
      "Fetch the required step-by-step workflow for all engineering tasks (planning, testing, reporting).",
    whenToCall: "when starting or planning any task",
    friendlyName: "workflow rules",
  },
  {
    tool: "get_commit_guidelines",
    file: "commit-guidelines.md",
    title: "Get Commit Guidelines",
    description:
      "Fetch the rules for Git commits, history management, and PR/CL writing.",
    whenToCall: "before committing or writing a PR",
    friendlyName: "commit guidelines",
  },
  {
    tool: "get_definition_of_done",
    file: "definition-of-done.md",
    title: "Get Definition of Done",
    description:
      "Fetch my Definition of Done: the required quality gates (format, lint, type-check, tests, build) a change must pass before it is complete. This is the policy; the exact commands live in each project's own repo docs (CLAUDE.md / AGENTS.md).",
    whenToCall: "before marking work as done",
    friendlyName: "definition of done",
  },
  {
    tool: "get_security_guidelines",
    file: "security-guidelines.md",
    title: "Get Security Guidelines",
    description:
      "Fetch my secure-coding guidelines: how to protect secrets (never commit or log them, encryption), input validation, dependency/vulnerability policy, and prohibited APIs. (For where config/secrets are sourced and injected, see get_configuration_management.)",
    whenToCall: "before handling credentials, user input, or dependencies",
    friendlyName: "security guidelines",
  },
  {
    tool: "get_code_review_guidelines",
    file: "code-review-guidelines.md",
    title: "Get Code Review Guidelines",
    description:
      "Fetch my code review standards and PR checklist (what reviewers look for and what blocks a merge).",
    whenToCall: "when reviewing code or preparing a change for review",
    friendlyName: "code review guidelines",
  },
  {
    tool: "get_documentation_standards",
    file: "documentation-standards.md",
    title: "Get Documentation Standards",
    description:
      "Fetch my documentation standards (code comments, README, ADRs).",
    whenToCall:
      "when writing or updating docs, doc comments, or architecture decision records",
    friendlyName: "documentation standards",
  },
  {
    tool: "get_diagram_guidelines",
    file: "diagram-guidelines.md",
    title: "Get Diagram Guidelines",
    description:
      "Fetch my diagram conventions (C4, UML, diagram-as-code, abstraction levels).",
    whenToCall: "when creating or editing architecture/design diagrams",
    friendlyName: "diagram guidelines",
  },
  {
    tool: "get_branching_strategy",
    file: "branching-strategy.md",
    title: "Get Branching & Release Strategy",
    description:
      "Fetch my branching and release strategy (branch model, naming, main protection, SemVer/tagging).",
    whenToCall: "when creating branches or planning a release",
    friendlyName: "branching strategy",
  },
  {
    tool: "get_testing_standards",
    file: "testing-standards.md",
    title: "Get Testing Standards",
    description:
      "Fetch my testing standards: what to test, test design, determinism, and coverage expectations.",
    whenToCall: "when writing or changing tests, or deciding what to test",
    friendlyName: "testing standards",
  },
  {
    tool: "get_api_design_guidelines",
    file: "api-design-guidelines.md",
    title: "Get API Design Guidelines",
    description:
      "Fetch my API design guidelines for public interfaces (REST/RPC/library APIs): naming, structure, versioning, backward compatibility, errors, and pagination.",
    whenToCall: "when designing or changing a public API",
    friendlyName: "API design guidelines",
  },
  {
    tool: "get_dependency_management",
    file: "dependency-management.md",
    title: "Get Dependency Management Rules",
    description:
      "Fetch my dependency management rules: when to add a dependency, version pinning, license policy, and keeping dependencies updated and secure.",
    whenToCall: "before adding or upgrading a dependency",
    friendlyName: "dependency management rules",
  },
  {
    tool: "get_logging_observability",
    file: "logging-observability.md",
    title: "Get Logging & Observability Standards",
    description:
      "Fetch my logging and observability standards: structured logging, log levels, metrics, tracing, and what to signal.",
    whenToCall: "when adding logging/metrics or instrumenting a service",
    friendlyName: "logging and observability standards",
  },
  {
    tool: "get_configuration_management",
    file: "configuration-management.md",
    title: "Get Configuration Management Rules",
    description:
      "Fetch my configuration and environment management rules: separating config from code, injecting per-environment settings, config validation/defaults/precedence, and feature flags — i.e. where config and secrets are sourced and wired in (for how to protect secrets themselves, see get_security_guidelines).",
    whenToCall:
      "when reading configuration, adding an env var or setting, or handling multiple environments",
    friendlyName: "configuration management rules",
  },
  {
    tool: "get_data_persistence",
    file: "data-persistence.md",
    title: "Get Data & Persistence Rules",
    description:
      "Fetch my data and persistence rules: schema design, migrations (zero-downtime/reversible), transactions, indexing, and data integrity/backup.",
    whenToCall:
      "when designing a schema, writing a migration, or working with a database",
    friendlyName: "data and persistence rules",
  },
  {
    tool: "get_error_handling_resilience",
    file: "error-handling-resilience.md",
    title: "Get Error Handling & Resilience Rules",
    description:
      "Fetch my error-handling and resilience rules: failure handling, timeouts, retries/backoff, circuit breakers, idempotency, and graceful degradation.",
    whenToCall: "when handling errors or calling external/network dependencies",
    friendlyName: "error handling and resilience rules",
  },
  {
    tool: "get_performance_guidelines",
    file: "performance-guidelines.md",
    title: "Get Performance Guidelines",
    description:
      "Fetch my performance and efficiency rules: measure-first, algorithmic complexity, IO/DB, caching, and memory/resources.",
    whenToCall: "when optimizing or when a change is performance-sensitive",
    friendlyName: "performance guidelines",
  },
  {
    tool: "get_ai_assisted_coding",
    file: "ai-assisted-coding.md",
    title: "Get AI-Assisted Coding Hygiene",
    description:
      "Fetch my AI/LLM-assisted coding hygiene rules: verifying generated code, avoiding hallucinated APIs/dependencies, staying in scope, keeping secrets out of prompts, and honest testing/reporting.",
    whenToCall: "when generating or modifying code with AI assistance",
    friendlyName: "AI-assisted coding hygiene",
  },
  {
    tool: "get_i18n_l10n",
    file: "i18n-l10n.md",
    title: "Get Internationalization & Localization Rules",
    description:
      "Fetch my internationalization and localization rules: string externalization, UTF-8 encoding, locale-aware formatting, time zones, and validation.",
    whenToCall:
      "when handling user-facing text, locales, dates/numbers, or time zones",
    friendlyName: "internationalization and localization rules",
  },
  {
    tool: "get_concurrency_async",
    file: "concurrency-async.md",
    title: "Get Concurrency & Async Rules",
    description:
      "Fetch my language-agnostic concurrency and async rules: minimizing shared mutable state, lock discipline and deadlock avoidance, atomicity/visibility, async hygiene, cancellation/timeout propagation, and thread-safety contracts.",
    whenToCall: "when writing concurrent, parallel, or async code",
    friendlyName: "concurrency and async rules",
  },
  {
    tool: "get_accessibility",
    file: "accessibility.md",
    title: "Get Accessibility Rules",
    description:
      "Fetch my accessibility (a11y) rules for user interfaces: semantic structure, keyboard access, color/contrast, screen readers/ARIA, motion/media, and verification.",
    whenToCall: "when building or changing a user-facing UI (web/app)",
    friendlyName: "accessibility rules",
  },
  {
    tool: "get_ci_cd",
    file: "ci-cd.md",
    title: "Get CI/CD Pipeline Rules",
    description:
      "Fetch my CI/CD pipeline rules: pipeline stages (format/lint/type/test/build), fail-fast, reproducibility/determinism, required-check gates, secrets in CI, caching, and artifacts/deploy.",
    whenToCall: "when setting up or changing a CI/CD pipeline",
    friendlyName: "CI/CD pipeline rules",
  },
];

/* -------------------------------------------------------------------------- */
/* Derived text (single source: the manifest above)                           */
/* -------------------------------------------------------------------------- */

/** Uppercase the first character so a trigger clause can start a sentence. */
function capitalize(text: string): string {
  return text.length === 0 ? text : text[0].toUpperCase() + text.slice(1);
}

/**
 * The full MCP tool description = what it covers + when to call it.
 * Built from the manifest so the trigger is written exactly once.
 */
export function toolDescription(
  rule: Pick<RuleTool, "description" | "whenToCall">,
): string {
  return `${rule.description} Call this ${rule.whenToCall}.`;
}

/**
 * One guidance line for the server `instructions`, e.g.
 * "- Before committing or writing a PR -> get_commit_guidelines."
 * Derived from the same `whenToCall` as the tool description above, so the
 * instructions can never fall out of sync with the registered tools.
 */
export function instructionLine(tool: string, whenToCall: string): string {
  return `- ${capitalize(whenToCall)} -> ${tool}.`;
}

/**
 * Result of an attempt to read a rule file. We never throw raw exceptions out to
 * the MCP client; instead we translate failures into a friendly message.
 */
export type ReadResult =
  { ok: true; content: string } | { ok: false; message: string };

/** Narrow an unknown error to a Node.js system error with an optional `code`. */
function isNodeError(err: unknown): err is NodeJS.ErrnoException {
  return err instanceof Error;
}

/**
 * Safely resolve a path *within* `root`, guarding against path traversal
 * (e.g. a "language" of "../../etc/passwd"). Returns null if the resolved path
 * would escape the root directory.
 *
 * NOTE: This guard is purely lexical (path.resolve normalizes `..`, rejects
 * absolute-path segments and sibling-prefix escapes like `<root>-evil`). It does
 * NOT resolve symlinks, so a symlink *inside* the root pointing outside would
 * pass. That is acceptable here as defense-in-depth: every caller passes fixed
 * segments or a value constrained by an enum, so no attacker-controlled segment
 * ever reaches this function.
 */
export function resolveWithinRules(
  root: string,
  ...segments: string[]
): string | null {
  const base = path.resolve(root);
  const target = path.resolve(base, ...segments);
  // Ensure the resolved path stays inside the rules root.
  if (target !== base && !target.startsWith(base + path.sep)) {
    return null;
  }
  return target;
}

/**
 * Read a markdown rule file relative to `root`. Returns a structured result so
 * callers can turn "file missing" into a polite message rather than a crash.
 *
 * @param root         The rules root directory (e.g. /app/rules).
 * @param relativePath Path segments relative to root, e.g. ["coding-standards", "python.md"].
 * @param friendlyName Human-readable name of the guideline for error messages.
 */
export async function readRuleFile(
  root: string,
  relativePath: string[],
  friendlyName: string,
): Promise<ReadResult> {
  const filePath = resolveWithinRules(root, ...relativePath);

  if (!filePath) {
    return {
      ok: false,
      message: `The requested guideline could not be resolved to a valid path. Please check the parameters for "${friendlyName}".`,
    };
  }

  try {
    const content = await fs.readFile(filePath, "utf-8");
    if (content.trim().length === 0) {
      return {
        ok: false,
        message: `The guideline "${friendlyName}" exists but is currently empty. Please add content if you expected it here.`,
      };
    }
    return { ok: true, content };
  } catch (err: unknown) {
    // ENOENT (file not found) is the expected, non-exceptional case.
    if (isNodeError(err) && err.code === "ENOENT") {
      return {
        ok: false,
        message: `The guideline "${friendlyName}" is not available yet. The corresponding rules file has not been provided. Please add the file if you expect it to exist.`,
      };
    }
    // Any other error (permissions, IO) — still return gracefully.
    return {
      ok: false,
      message: `The guideline "${friendlyName}" could not be read due to a server-side issue: ${
        isNodeError(err) ? (err.code ?? err.message) : String(err)
      }.`,
    };
  }
}

/**
 * Appended to every rule served through a tool.
 *
 * A rule's references — inline `(→ foo.md)` mentions and its bottom `참조` list
 * — are provenance and an index, never a fetch signal. A client that dutifully
 * follows each one turns that index into a dependency graph and pulls most of
 * the ruleset for a single lookup (measured: get_i18n_l10n reached 19 files /
 * ~30k chars to serve a 988-char rule — 31x amplification).
 *
 * The criterion here is deliberately "that rule's OWN trigger fired", not "the
 * task touches that topic". The latter reads as permission rather than a brake:
 * an inline reference sits *inside* the very bullet the reader is acting on, so
 * "is my task about this topic?" is always yes. i18n-l10n.md's "don't hardcode
 * timezone assumptions (→ configuration-management.md)" is complete on its own —
 * fetching the config rule adds nothing to it. Whether to fetch a rule is
 * already settled authoritatively by its `whenToCall` in RULE_TOOLS (surfaced in
 * the tool description and the server instructions); a mention in a sibling file
 * carries no trigger information at all.
 *
 * This lives in the payload rather than only in the server `instructions` on
 * purpose. Instructions are advisory and many clients never surface them, but
 * the rule text is what the client asked for, so it always reaches the model —
 * and it lands exactly where the `참조` list invites a follow-up fetch.
 */
export const REFERENCE_NOTE =
  "> **참조 안내**: 본문의 `(→ foo.md)` 와 하단 `참조` 목록은 **출처·색인이지 " +
  "가져오라는 신호가 아니다.** 규칙을 가져올지는 **그 규칙 자신의 트리거**(각 도구 " +
  "설명에 명시)만 정한다 — 다른 문서가 언급했다는 이유로는 가져오지 않는다. " +
  "이 문서에 적힌 규칙을 지키는 데 필요한 내용은 이 문서 안에 있다.";

/**
 * Convert a ReadResult into the MCP tool response shape. Successful reads return
 * the markdown as text, with REFERENCE_NOTE appended so the anti-cascade guidance
 * travels with the content; failures return the friendly message (also as text,
 * with isError) so the client can display it cleanly.
 */
export function toToolResult(result: ReadResult) {
  if (result.ok) {
    return {
      content: [
        {
          type: "text" as const,
          text: `${result.content.trimEnd()}\n\n---\n${REFERENCE_NOTE}\n`,
        },
      ],
    };
  }
  return {
    content: [{ type: "text" as const, text: result.message }],
    isError: true,
  };
}
