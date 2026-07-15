/**
 * Personal Rules MCP Server
 * -------------------------
 * Serves my personal, project-agnostic engineering rules (coding standards,
 * workflow rules, commit guidelines, definition of done, security & code-review
 * guidelines, …) to MCP-capable AI clients such as Claude Code (CLI and Web),
 * Cline, and Roo Code.
 *
 * Transport: **Streamable HTTP** (the current MCP transport; the older HTTP+SSE
 * transport has been removed). A single endpoint handles everything:
 *   - POST   /mcp   -> client -> server JSON-RPC messages (and session init)
 *   - GET    /mcp   -> opens the server -> client SSE stream for a session
 *   - DELETE /mcp   -> explicitly terminates a session
 *   - GET    /health-> liveness/health (always open, no auth)
 *
 * Sessions are tracked by the `Mcp-Session-Id` header, issued by the server on
 * initialize and echoed by the client on every subsequent request.
 *
 * The markdown rule files live under RULES_DIR (default: /app/rules). They are
 * NOT baked into the image; a host directory is bind-mounted at runtime so they
 * can be updated without rebuilding the container.
 */

import express, { type Request, type Response } from "express";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import { CODING_LANGUAGES, RULE_TOOLS, readRuleFile } from "./rules.js";
import { makeRequireAuth, makeTokenValidator, parseTokens } from "./auth.js";
import { makeOriginGuard, parseList } from "./origin.js";
import { toToolResult } from "./rules.js";

/* -------------------------------------------------------------------------- */
/* Configuration                                                              */
/* -------------------------------------------------------------------------- */

/** Server version — read from package.json so there is a single source of truth. */
const VERSION = (
  JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8"),
  ) as { version: string }
).version;

/** Root directory that holds all rule markdown files (bind-mounted at runtime). */
const RULES_DIR = process.env.RULES_DIR ?? "/app/rules";

/** Parse the PORT env into a valid TCP port, falling back to 3000 on garbage. */
function parsePort(raw: string | undefined): number {
  const p = Number(raw ?? 3000);
  if (!Number.isInteger(p) || p < 0 || p > 65535) {
    console.warn(`[config] Invalid PORT "${raw}" — falling back to 3000.`);
    return 3000;
  }
  return p;
}

/** HTTP port the Express server listens on. */
const PORT = parsePort(process.env.PORT);

/**
 * Interface to bind to. Defaults to 0.0.0.0 so the published Docker port works;
 * for a purely local non-Docker run set HOST=127.0.0.1 to avoid exposing it.
 */
const HOST = process.env.HOST ?? "0.0.0.0";

/** Convenience wrapper that binds readRuleFile to the configured RULES_DIR. */
const readRule = (relativePath: string[], friendlyName: string) =>
  readRuleFile(RULES_DIR, relativePath, friendlyName);

/* -------------------------------------------------------------------------- */
/* MCP server factory                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Build a fresh McpServer with the rule tools and prompts registered.
 *
 * We create one server per session (per initialized transport). This keeps each
 * client session isolated and avoids sharing a single server object across
 * multiple simultaneous transports.
 */
function createRulesServer(): McpServer {
  const server = new McpServer(
    {
      name: "personal-rules-mcp-server",
      version: VERSION,
    },
    {
      // Surfaced to clients at initialize; helps the AI decide *when* to call
      // each tool. Client support varies, so the tool descriptions and each
      // project's CLAUDE.md / AGENTS.md carry the same guidance as a backstop.
      instructions: [
        "This server provides my personal, project-agnostic engineering rules and preferences.",
        "Consult it proactively:",
        "- Before writing code in a language -> get_coding_standards(language).",
        "- When planning any task -> get_workflow_rules.",
        "- Before committing or writing a PR -> get_commit_guidelines.",
        "- Before marking work as done -> get_definition_of_done.",
        "- When handling secrets, user input, or dependencies -> get_security_guidelines.",
        "- When reviewing code -> get_code_review_guidelines.",
        "- When writing documentation, comments, or ADRs -> get_documentation_standards.",
        "- When creating or editing diagrams -> get_diagram_guidelines.",
        "- When naming branches or planning a release -> get_branching_strategy.",
        "- When writing or changing tests -> get_testing_standards.",
        "- When designing or changing a public API -> get_api_design_guidelines.",
        "- Before adding or upgrading a dependency -> get_dependency_management.",
        "- When adding logging, metrics, or tracing -> get_logging_observability.",
        "- When reading configuration or adding an env var/setting -> get_configuration_management.",
        "- When designing a schema, writing a migration, or using a database -> get_data_persistence.",
        "- When handling errors or calling external/network dependencies -> get_error_handling_resilience.",
        "- When optimizing or touching performance-sensitive code -> get_performance_guidelines.",
        "- When generating or modifying code with AI assistance -> get_ai_assisted_coding.",
        "- When handling user-facing text, locales, dates, or time zones -> get_i18n_l10n.",
        "- When writing concurrent, parallel, or async code -> get_concurrency_async.",
        "- When building or changing a user-facing UI (web/app) -> get_accessibility.",
        "When a fetched rule references another rule file (e.g. security-guidelines.md), fetch it via the matching tool -- the file name maps to get_<name> (e.g. security-guidelines.md -> get_security_guidelines, coding-standards/{language}.md -> get_coding_standards).",
        "Project-specific build/test/validate commands and per-project architecture are NOT here -- read the project's own CLAUDE.md / AGENTS.md.",
      ].join("\n"),
    },
  );

  /* --- Tool 1: get_coding_standards ------------------------------------- */
  server.registerTool(
    "get_coding_standards",
    {
      title: "Get Coding Standards",
      description:
        "Fetch my coding standards for a specific programming language.",
      inputSchema: {
        language: z
          .enum(CODING_LANGUAGES)
          .describe(
            "The programming language whose coding standards to fetch.",
          ),
      },
    },
    async ({ language }) => {
      const result = await readRule(
        ["coding-standards", `${language}.md`],
        `${language} coding standards`,
      );
      return toToolResult(result);
    },
  );

  /* --- Rule tools (parameter-less): one tool per rule file -------------- */
  /*
   * Registered from the RULE_TOOLS manifest (src/rules.ts) so each tool's name,
   * file, and description live in one place. Under the hybrid model, project-
   * specific build/test/validate *commands* live in each repository
   * (CLAUDE.md / AGENTS.md); this server holds only my shared, cross-project
   * rules. rules-integrity.test.ts guards every entry against the filesystem
   * and the `<file>.md -> get_<name>` naming rule.
   */
  for (const rt of RULE_TOOLS) {
    server.registerTool(
      rt.tool,
      { title: rt.title, description: rt.description, inputSchema: {} },
      async () => toToolResult(await readRule([rt.file], rt.friendlyName)),
    );
  }

  /* --- Prompts: user-invoked workflows (slash commands) ----------------- */
  /*
   * NOTE: MCP client support for prompts varies (Cline / Roo Code may or may
   * not surface them). These are optional convenience entry points; the same
   * guideline content is always available via the tools above. Each prompt
   * reads the current rule file at invocation time so it stays in sync with
   * host-side updates.
   */

  /* --- Prompt 1: code-review -------------------------------------------- */
  server.registerPrompt(
    "code-review",
    {
      title: "Code Review",
      description:
        "Review the current changes against my code review guidelines.",
      argsSchema: {
        target: z
          .string()
          .optional()
          .describe(
            "What to review, e.g. 'staged changes', 'the current branch diff', or a file path. Defaults to the current uncommitted changes.",
          ),
      },
    },
    async ({ target }) => {
      const guidelines = await readRule(
        ["code-review-guidelines.md"],
        "code review guidelines",
      );
      const scope = target?.trim() || "the current uncommitted changes";
      const guidelineText = guidelines.ok
        ? guidelines.content
        : `(${guidelines.message})`;
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text:
                `Review ${scope} strictly against the following code review guidelines. ` +
                `Inspect the actual diff (e.g. via git), then report findings grouped by severity, ` +
                `each with file:line and a concrete fix.\n\n` +
                `--- Code Review Guidelines ---\n${guidelineText}`,
            },
          },
        ],
      };
    },
  );

  /* --- Prompt 2: commit-msg --------------------------------------------- */
  server.registerPrompt(
    "commit-msg",
    {
      title: "Commit Message",
      description:
        "Draft a commit message for the staged changes following my commit rules.",
      argsSchema: {
        issue_key: z
          .string()
          .optional()
          .describe(
            "Issue tracker key for the trailer, e.g. 'PROJ-123'. Omit if there is none.",
          ),
      },
    },
    async ({ issue_key }) => {
      const rules = await readRule(
        ["commit-guidelines.md"],
        "commit guidelines",
      );
      const rulesText = rules.ok ? rules.content : `(${rules.message})`;
      const issueLine = issue_key?.trim()
        ? `Use issue key "${issue_key.trim()}" in the trailer.`
        : `If no issue key is known, ask once before inventing one.`;
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text:
                `Draft a commit message for the currently staged changes (inspect them via ` +
                "`git diff --staged`), strictly following the commit rules below. " +
                `${issueLine}\n\n` +
                `--- Commit Rules ---\n${rulesText}`,
            },
          },
        ],
      };
    },
  );

  return server;
}

/* -------------------------------------------------------------------------- */
/* Authentication (optional static Bearer token)                              */
/* -------------------------------------------------------------------------- */

/*
 * If MCP_AUTH_TOKEN is set, requests to /mcp must present a matching
 * `Authorization: Bearer <token>` header. Multiple tokens may be provided
 * comma-separated (e.g. one per client / rotation). If the env var is unset,
 * auth is DISABLED and a warning is logged at startup — set it whenever the
 * server is reachable beyond localhost. /health is always left open for
 * container healthchecks.
 */
const AUTH_TOKENS = parseTokens(process.env.MCP_AUTH_TOKEN);
const AUTH_ENABLED = AUTH_TOKENS.length > 0;
const isValidToken = makeTokenValidator(AUTH_TOKENS);

/** Express middleware guarding /mcp when auth is enabled. */
const requireAuth = makeRequireAuth({
  authEnabled: AUTH_ENABLED,
  isValidToken,
});

/* -------------------------------------------------------------------------- */
/* Origin guard (DNS-rebinding protection)                                    */
/* -------------------------------------------------------------------------- */

/*
 * Browsers attach an Origin header; non-browser clients (Claude Code CLI, curl)
 * do not. To defend against DNS-rebinding while still allowing native clients,
 * requests without an Origin pass, and requests WITH an Origin must match the
 * allowlist. Configure extra origins via MCP_ALLOWED_ORIGINS (comma-separated);
 * localhost origins are always allowed. The SDK transport also offers this, but
 * that option is deprecated in favor of external middleware like this.
 */
const ALLOWED_ORIGINS = parseList(process.env.MCP_ALLOWED_ORIGINS);
const guardOrigin = makeOriginGuard(ALLOWED_ORIGINS);

/* -------------------------------------------------------------------------- */
/* Express app + Streamable HTTP transport wiring                             */
/* -------------------------------------------------------------------------- */

const app = express();
const startedAt = Date.now();

/**
 * Active transports keyed by their MCP session id. A session is created on the
 * initialize request and reused for that client's subsequent POST/GET/DELETE.
 */
const transports = new Map<string, StreamableHTTPServerTransport>();

/** Simple health/liveness endpoint (handy for docker healthchecks). Always open. */
app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    version: VERSION,
    rulesDir: RULES_DIR,
    authEnabled: AUTH_ENABLED,
    activeSessions: transports.size,
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
  });
});

/** Read the Mcp-Session-Id request header as a single string (or undefined). */
function sessionIdOf(req: Request): string | undefined {
  const raw = req.headers["mcp-session-id"];
  return typeof raw === "string" ? raw : undefined;
}

/**
 * POST /mcp — the client -> server channel. An initialize request (no session
 * id yet) spins up a new transport + server pair; every other request must
 * carry a known `Mcp-Session-Id`.
 */
app.post(
  "/mcp",
  requireAuth,
  guardOrigin,
  express.json(),
  async (req: Request, res: Response) => {
    const sessionId = sessionIdOf(req);
    let transport = sessionId ? transports.get(sessionId) : undefined;

    if (!transport) {
      // A session id was presented but we don't know it (expired / restarted).
      if (sessionId) {
        res.status(404).json({
          jsonrpc: "2.0",
          error: { code: -32001, message: "Session not found." },
          id: null,
        });
        return;
      }
      // No session id and not an initialize request -> cannot route it.
      if (!isInitializeRequest(req.body)) {
        res.status(400).json({
          jsonrpc: "2.0",
          error: {
            code: -32000,
            message:
              "Bad Request: no valid session id for a non-initialize request.",
          },
          id: null,
        });
        return;
      }

      // Fresh session: create the transport, register it once initialized, and
      // wire cleanup so a closed session drops out of the map.
      const newTransport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (id) => {
          transports.set(id, newTransport);
          console.log(`[mcp] Session initialized. sessionId=${id}`);
        },
      });
      newTransport.onclose = () => {
        const id = newTransport.sessionId;
        if (id && transports.delete(id)) {
          console.log(`[mcp] Session closed. sessionId=${id}`);
        }
      };

      const server = createRulesServer();
      await server.connect(newTransport);
      transport = newTransport;
    }

    try {
      await transport.handleRequest(req, res, req.body);
    } catch (err) {
      console.error(
        `[mcp] POST handleRequest failed. sessionId=${sessionId ?? "(init)"}:`,
        err,
      );
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error." },
          id: null,
        });
      }
    }
  },
);

/**
 * GET /mcp — opens the server -> client SSE stream for an existing session.
 * DELETE /mcp — explicitly terminates a session. Both require a known session.
 */
async function handleSessionRequest(
  req: Request,
  res: Response,
): Promise<void> {
  const sessionId = sessionIdOf(req);
  const transport = sessionId ? transports.get(sessionId) : undefined;
  if (!transport) {
    res
      .status(400)
      .json({ error: "Missing or unknown 'Mcp-Session-Id' header." });
    return;
  }
  try {
    await transport.handleRequest(req, res);
  } catch (err) {
    console.error(
      `[mcp] ${req.method} handleRequest failed. sessionId=${sessionId}:`,
      err,
    );
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to process request." });
    }
  }
}

app.get("/mcp", requireAuth, guardOrigin, handleSessionRequest);
app.delete("/mcp", requireAuth, guardOrigin, handleSessionRequest);

/* -------------------------------------------------------------------------- */
/* Startup & graceful shutdown                                                */
/* -------------------------------------------------------------------------- */

const httpServer = app.listen(PORT, HOST, () => {
  // A random boot id makes it easy to confirm a container restart in logs.
  console.log(
    `[boot ${randomUUID().slice(0, 8)}] Personal Rules MCP Server v${VERSION} listening on ${HOST}:${PORT}`,
  );
  console.log(`[config] Serving rules from: ${RULES_DIR}`);
  console.log(`[config] MCP endpoint: ALL http://localhost:${PORT}/mcp`);
  console.log(
    AUTH_ENABLED
      ? `[auth] Bearer token auth ENABLED (${AUTH_TOKENS.length} token(s))`
      : "[auth] WARNING: MCP_AUTH_TOKEN not set — /mcp is UNAUTHENTICATED",
  );
});

/**
 * Close open connections and the HTTP server cleanly on SIGTERM/SIGINT so that
 * `docker compose down` (and Ctrl-C) shut down gracefully instead of being
 * force-killed. A failsafe timer force-exits if close hangs.
 */
function shutdown(signal: string): void {
  console.log(`[shutdown] ${signal} received — closing…`);
  for (const transport of transports.values()) {
    void transport.close();
  }
  httpServer.close(() => {
    // Use exitCode (not process.exit) so buffered stdout flushes before the
    // process ends and the event loop drains naturally.
    console.log("[shutdown] HTTP server closed.");
    process.exitCode = 0;
  });
  // Force-close lingering keep-alive / SSE connections so close() can complete
  // instead of waiting for idle clients (Node 18.2+).
  httpServer.closeAllConnections?.();
  // Failsafe below Docker's default 10s grace so we exit (and flush logs)
  // ourselves rather than being SIGKILLed.
  setTimeout(() => {
    console.warn("[shutdown] Forced exit after timeout.");
    process.exit(1);
  }, 5_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// Backstop: keep a single stray rejection/exception from tearing the server down.
// Per-request paths are already guarded; this only catches the unexpected so the
// process logs and stays up instead of crashing under Node's default throw mode.
process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection]", reason);
});
process.on("uncaughtException", (err) => {
  console.error("[uncaughtException]", err);
});
