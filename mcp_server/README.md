# Personal Rules MCP Server

> 한국어 문서: [README.ko.md](README.ko.md)

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server that
exposes **my personal development guidelines** — coding standards, workflow
rules, commit guidelines, security, code review, and more — to MCP-capable AI
clients such as **Claude Code (CLI and Web)**, **Cline**, and **Roo Code**.

It uses the **Streamable HTTP** transport (a single `/mcp` endpoint over HTTP),
so it can be reached from a local CLI or, when exposed over HTTPS, from cloud
sessions like Claude Code on the web.

> For a detailed walkthrough of the architecture, components, request flows, and
> operations, see [docs/architecture.md](docs/architecture.md).

---

## Tools exposed

> 📖 사람이 읽기 좋은 한글 안내(각 도구·프롬프트의 용도): **[docs/tools-and-prompts.ko.md](docs/tools-and-prompts.ko.md)**. The table below is a quick summary.

| Tool                          | Parameters                                                          | Reads from                                     |
| ----------------------------- | ------------------------------------------------------------------ | ---------------------------------------------- |
| `get_coding_standards`        | `language`: `cpp` \| `typescript` \| `javascript` \| `python` \| `bash` \| `general` | `/app/rules/coding-standards/{language}.md`    |
| `get_workflow_rules`          | _(none)_                                                           | `/app/rules/workflow-rules.md`                 |
| `get_commit_guidelines`       | _(none)_                                                           | `/app/rules/commit-guidelines.md`              |
| `get_definition_of_done`      | _(none)_                                                           | `/app/rules/definition-of-done.md`             |
| `get_security_guidelines`     | _(none)_                                                           | `/app/rules/security-guidelines.md`            |
| `get_code_review_guidelines`  | _(none)_                                                           | `/app/rules/code-review-guidelines.md`         |
| `get_documentation_standards` | _(none)_                                                           | `/app/rules/documentation-standards.md`        |
| `get_diagram_guidelines`      | _(none)_                                                           | `/app/rules/diagram-guidelines.md`             |
| `get_branching_strategy`      | _(none)_                                                           | `/app/rules/branching-strategy.md`             |
| `get_testing_standards`       | _(none)_                                                           | `/app/rules/testing-standards.md`              |
| `get_api_design_guidelines`   | _(none)_                                                           | `/app/rules/api-design-guidelines.md`          |
| `get_dependency_management`   | _(none)_                                                           | `/app/rules/dependency-management.md`          |
| `get_logging_observability`   | _(none)_                                                           | `/app/rules/logging-observability.md`          |
| `get_configuration_management`| _(none)_                                                           | `/app/rules/configuration-management.md`       |
| `get_data_persistence`        | _(none)_                                                           | `/app/rules/data-persistence.md`               |
| `get_error_handling_resilience`| _(none)_                                                          | `/app/rules/error-handling-resilience.md`      |
| `get_performance_guidelines`  | _(none)_                                                           | `/app/rules/performance-guidelines.md`         |
| `get_ai_assisted_coding`      | _(none)_                                                           | `/app/rules/ai-assisted-coding.md`             |
| `get_i18n_l10n`               | _(none)_                                                           | `/app/rules/i18n-l10n.md`                      |
| `get_concurrency_async`       | _(none)_                                                           | `/app/rules/concurrency-async.md`              |
| `get_accessibility`           | _(none)_                                                           | `/app/rules/accessibility.md`                  |
| `get_ci_cd`                   | _(none)_                                                           | `/app/rules/ci-cd.md`                          |

> This server holds **cross-project, project-agnostic** rules only. Project-specific
> build/test/validate commands live in each repository's own `CLAUDE.md` / `AGENTS.md`
> (see [`repo-templates/`](repo-templates/)), not here — this is the "hybrid" model.

### How does the AI know which tool to call, and when?

Tool-usage guidance has a **single source: the server** — it is not duplicated in
repo files (duplication would drift from the server):

1. **Tool descriptions**: on connect, every tool's name, description, and schema are
   **always** injected into the AI's context. Each description states _when to call it_,
   so the AI invokes them autonomously.
2. **Server instructions**: the server supplies global usage guidance at initialize
   (client support varies). This also tells the AI how to resolve cross-references —
   when a rule file mentions another (e.g. `security-guidelines.md`), fetch it via the
   matching `get_<name>` tool.
3. **Repo `CLAUDE.md` / `AGENTS.md`**: carry **project-specific** content only
   (build/test/validate commands, architecture) — never the shared tool list.

## Prompts (optional)

MCP **prompts** are user-invoked slash commands. Client support varies (Cline / Roo
Code may not surface them); the same content is always available via the tools above.

| Prompt        | Arguments              | What it does                                                             |
| ------------- | ---------------------- | ----------------------------------------------------------------------- |
| `code-review` | `target` (optional)    | Loads `code-review-guidelines.md` and asks the AI to review the diff.   |
| `commit-msg`  | `issue_key` (optional) | Loads `commit-guidelines.md` and asks the AI to draft a commit message. |

If a requested markdown file is missing, the tool returns a **polite message**
(marked as an error result) instead of throwing a raw exception.

---

## HTTP endpoints

The server implements the MCP **Streamable HTTP** transport on one path, `/mcp`:

| Method   | Path      | Purpose                                                           |
| -------- | --------- | ----------------------------------------------------------------- |
| `POST`   | `/mcp`    | Client → server JSON-RPC messages (and the `initialize` handshake). |
| `GET`    | `/mcp`    | Opens the server → client SSE stream for an existing session.     |
| `DELETE` | `/mcp`    | Terminates a session.                                             |
| `GET`    | `/health` | Liveness/health check (always open, no auth).                    |

Sessions are tracked with the `Mcp-Session-Id` header: the server issues it on
`initialize`, and the client echoes it on every subsequent request. MCP clients
handle this for you.

---

## Rules directory layout

The server reads all content from `RULES_DIR` (default `/app/rules`, mounted from
`./host_rules` on the host). Structure it like this:

```
host_rules/
├── workflow-rules.md              # get_workflow_rules
├── commit-guidelines.md           # get_commit_guidelines
├── definition-of-done.md          # get_definition_of_done
├── security-guidelines.md         # get_security_guidelines
├── code-review-guidelines.md      # get_code_review_guidelines
├── documentation-standards.md     # get_documentation_standards
├── diagram-guidelines.md          # get_diagram_guidelines
├── branching-strategy.md          # get_branching_strategy
├── testing-standards.md           # get_testing_standards
├── api-design-guidelines.md       # get_api_design_guidelines
├── dependency-management.md       # get_dependency_management
├── logging-observability.md       # get_logging_observability
├── configuration-management.md    # get_configuration_management
├── data-persistence.md            # get_data_persistence
├── error-handling-resilience.md   # get_error_handling_resilience
├── performance-guidelines.md      # get_performance_guidelines
├── ai-assisted-coding.md          # get_ai_assisted_coding
├── i18n-l10n.md                   # get_i18n_l10n
├── concurrency-async.md           # get_concurrency_async
├── accessibility.md               # get_accessibility
├── ci-cd.md                       # get_ci_cd
└── coding-standards/
    ├── cpp.md                     # get_coding_standards { language: "cpp" }
    ├── typescript.md
    ├── javascript.md
    ├── python.md
    ├── bash.md
    └── general.md
```

> **Hybrid model:** project-specific build/test/validate commands do **not** live here.
> Each project repo carries its own [`CLAUDE.md` / `AGENTS.md`](repo-templates/) with a
> Build / Test / Validate section; this server provides only the shared, cross-project rules.

> **Updating rules:** The markdown files are **not** baked into the Docker image.
> Editing files under `./host_rules` is reflected in the container immediately (the
> mount is read-only from the container's side) — no rebuild needed.

---

## Run with Docker (recommended)

```bash
# 1. Put your markdown rules under ./host_rules (see layout above).
# 2. Build and start:
docker compose up --build -d

# 3. Verify:
curl http://localhost:3000/health
# -> {"status":"ok","version":"1.0.0","rulesDir":"/app/rules","authEnabled":false,"activeSessions":0,...}
```

The MCP endpoint is now available at `http://localhost:3000/mcp`.

To stop:

```bash
docker compose down
```

> **⚠️ Upgrading an older running instance (SSE → Streamable HTTP)**
>
> The service and container were renamed (`rules-mcp-server` → `personal-rules-mcp`), so an
> already-running old container becomes a compose **orphan**: `docker compose up -d` will not
> replace it and will instead **fail on a port conflict**. Clear it explicitly first:
>
> ```bash
> docker compose ps                      # check whether the old container shows as an orphan
> docker compose down --remove-orphans   # remove it (brief downtime here)
> docker compose up --build -d
> ```
>
> The endpoint also changed from `/sse` + `/messages` to **`/mcp`**, so any client registered
> against the old server must be **re-registered** — see [Connecting a client](#connecting-a-client).

---

## Development & testing

> **No Node install on the host is required.** Everything below runs **inside a container**
> with only the source mounted, so your host stays clean. CI runs the same gates.

### Run every gate at once (recommended)

```bash
cd mcp_server
docker run --rm -u "$(id -u):$(id -g)" -e HOME=/tmp -e npm_config_cache=/tmp/.npm \
  -v "$PWD":/app -w /app node:20-alpine \
  sh -c "npm ci && npm run check"

# Remove what the run generated, to keep the host clean
rm -rf node_modules dist
```

`npm run check` = `format:check` → `lint` → `test` → `build`, fail-fast, in the same order as CI.

### Individual scripts

| Command | What it does |
| --- | --- |
| `npm test` | Unit + integrity tests (node:test, **30 total**) |
| `npm run lint` | ESLint (`lint:fix` to autofix) |
| `npm run format` / `format:check` | Prettier write / check |
| `npm run build` | TypeScript compile (`tsc`) → `dist/` |
| `npm run dev` | Dev server with auto-reload |

Wrap any of them the same way — e.g. `sh -c "npm ci && npm test"`.

### What the tests cover

| File | Cases | Covers |
| --- | --- | --- |
| `src/rules.test.ts` | 10 | Rule file resolution, **path-traversal guard**, polite messages for missing/empty files |
| `src/auth.test.ts` | 6 | Bearer token parsing, **constant-time validation**, 401 responses |
| `src/origin.test.ts` | 5 | Origin allow/deny (loopback, allowlist), **DNS-rebinding protection** |
| `src/rules-integrity.test.ts` | 9 | **Rule ↔ tool ↔ docs wiring integrity** (below) |

`rules-integrity` is the important one — **if you add a rule and forget something, it fails here**:

- every `RULE_TOOLS` entry points at a rule file that exists
- the `<file>.md → get_<name>` naming rule holds (hyphens → underscores)
- no top-level rule file is orphaned (present but wired to no tool)
- every `CODING_LANGUAGES` language has its file
- every cross-reference (`foo.md`) between rule docs resolves to a real file
- every tool and language appears in README (en/ko) and [the tools guide](docs/tools-and-prompts.ko.md) — prevents doc drift
- `whenToCall` is well-formed (it generates both the tool description and the `instructions`)

### Smoke-test the running server

Separately from the unit tests, bring the container up and check the MCP handshake:

```bash
docker compose up --build -d
curl -s localhost:3000/health          # {"status":"ok",...}

# initialize -> 200 + an Mcp-Session-Id
curl -s -D - -o /dev/null -X POST localhost:3000/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"smoke","version":"0"}}}' \
  | grep -i 'HTTP/\|mcp-session-id'

docker compose down
```

> Add `-H "Authorization: Bearer <token>"` if auth is enabled, and use `localhost:$PORT`
> if you changed `PORT` in `.env`.

---

## Run locally (without Docker)

> Requires Node 20+ on the host. If you'd rather not touch the host, use the
> containerized flow in [Development & testing](#development--testing) above.

```bash
npm install

# Point the server at your local rules directory:
export RULES_DIR="$(pwd)/host_rules"
export PORT=3000
# Optional: bind to localhost only for a purely local run
export HOST=127.0.0.1

# Dev mode (auto-reload):
npm run dev

# Or build + run:
npm run build
npm start
```

---

## Connecting a client

### Claude Code (CLI)

Register the server as a **Streamable HTTP** (`http`) transport:

```bash
# Local (no auth):
claude mcp add --transport http personal-rules http://localhost:3000/mcp

# Remote, with a Bearer token:
claude mcp add --transport http personal-rules https://<your-host>/mcp \
  --header "Authorization: Bearer <token>"

claude mcp list   # verify it connects
```

### Claude Code on the web (claude.ai/code)

Web/cloud sessions can't add an arbitrary URL interactively. Instead, commit a
`.mcp.json` to the project repository (see [`.mcp.json.example`](.mcp.json.example)):

```json
{
  "mcpServers": {
    "personal-rules": {
      "type": "http",
      "url": "https://<your-host>/mcp",
      "headers": { "Authorization": "Bearer ${MCP_TOKEN}" }
    }
  }
}
```

The token is expanded from the `MCP_TOKEN` environment variable — **never commit a
real token**. The server must be reachable over **public HTTPS**; see
[`docs/reverse-proxy-tls.md`](docs/reverse-proxy-tls.md) for terminating TLS behind
a reverse proxy.

### Cline / Roo Code

Point the client at a Streamable HTTP MCP server:

```json
{
  "mcpServers": {
    "personal-rules": { "type": "http", "url": "http://localhost:3000/mcp" }
  }
}
```

---

## Configuration

| Env var               | Default      | Description                                                                                             |
| --------------------- | ------------ | ------------------------------------------------------------------------------------------------------- |
| `PORT`                | `3000`       | Published / listen port — see the note below.                                                          |
| `HOST`                | `0.0.0.0`    | Interface to bind. Use `127.0.0.1` for a purely local run so it isn't reachable off-host.               |
| `RULES_DIR`           | `/app/rules` | Root directory containing the markdown rules.                                                           |
| `MCP_AUTH_TOKEN`      | _(unset)_    | Bearer token(s) required on `/mcp`. Comma-separate for multiple. Unset = no auth.                       |
| `MCP_ALLOWED_ORIGINS` | _(unset)_    | Extra allowed browser `Origin`s (comma-separated). Loopback + no-Origin clients are always allowed.     |

> In Docker, `PORT` (set in `.env`) is the **host-published** port — the container always listens on
> `3000` internally and the healthcheck follows it, so reach the server at `http://localhost:$PORT`.
> For a non-Docker local run, `export PORT=...` sets the port the Node server listens on directly.

## Authentication (optional)

Set `MCP_AUTH_TOKEN` to require a Bearer token on `/mcp` (`/health` stays open for
healthchecks). Multiple tokens can be comma-separated for issuance / rotation. If
unset, the endpoint is unauthenticated and a warning is logged at startup —
**always set a token whenever the server is reachable beyond localhost.**

```bash
# docker-compose reads .env automatically
cp .env.example .env
echo "MCP_AUTH_TOKEN=$(openssl rand -hex 32)" >> .env
docker compose up --build -d
```

## DNS-rebinding / Origin protection

Browsers attach an `Origin` header; native clients (Claude Code CLI, curl) do not.
The server allows requests with **no Origin** and requests from **loopback**
origins, and rejects any other browser origin unless it is listed in
`MCP_ALLOWED_ORIGINS`. When connecting from Claude Code Web, add its origin, e.g.
`MCP_ALLOWED_ORIGINS=https://claude.ai`.

---

## Project structure

```
.
├── src/
│   ├── index.ts          # Express + Streamable HTTP server, MCP tool/prompt registration
│   ├── rules.ts          # Rule file resolution + path-traversal guard
│   ├── auth.ts           # Bearer token parsing + constant-time validation
│   ├── origin.ts         # Origin allow/deny guard (DNS-rebinding protection)
│   ├── rules.test.ts     # node:test unit tests
│   ├── auth.test.ts
│   ├── origin.test.ts
│   └── rules-integrity.test.ts
├── package.json
├── tsconfig.json
├── Dockerfile            # Multi-stage build; does NOT bake in the rules
├── docker-compose.yml    # Bind-mounts ./host_rules -> /app/rules
├── .dockerignore
├── .env.example
├── .mcp.json.example     # Client config to connect (CLI / Web)
├── .github/workflows/    # CI: build + test on push/PR
├── host_rules/           # My markdown rules (bind-mounted at runtime)
├── repo-templates/       # CLAUDE.md / AGENTS.md to copy into each project repo
└── docs/                 # Decision records (e.g. reverse-proxy-tls.md)
```
