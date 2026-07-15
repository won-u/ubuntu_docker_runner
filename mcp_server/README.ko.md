# 개인 규칙 MCP 서버 (한글)

**나의 개인 개발 가이드라인**(코딩 표준, 워크플로우, 커밋 규약, 보안, 코드 리뷰 등)을
**Claude Code(CLI·Web) / Cline / Roo Code** 같은 MCP 클라이언트에 제공하는
[MCP(Model Context Protocol)](https://modelcontextprotocol.io) 서버입니다.

전송은 **Streamable HTTP**(단일 `/mcp` 엔드포인트)라, 로컬 CLI에서는 물론 HTTPS로
노출하면 Claude Code Web 같은 클라우드 세션에서도 연결할 수 있습니다.

> 아키텍처·컴포넌트·요청 흐름·운영 상세는 [docs/architecture.md](docs/architecture.md) 참고.

> 영문 문서는 [README.md](README.md) 참고.

---

## 설계 원칙: 하이브리드 모델

| 계층                | 내용                                                    | 위치                                                              |
| ------------------- | ------------------------------------------------------- | ----------------------------------------------------------------- |
| **공통 · 거버넌스** | workflow, commit, 보안, 코드리뷰, 완료 기준, 언어 표준  | **이 MCP 서버**                                                   |
| **프로젝트별**      | 빌드/테스트/검증 **명령**, 타깃, 프로젝트 아키텍처      | 각 저장소의 `CLAUDE.md` / `AGENTS.md` ([repo-templates/](repo-templates/)) |

프로젝트마다 다른 빌드 명령은 서버에 넣지 않고 각 레포가 들고 있습니다. 서버는 "모든
프로젝트에서 공통으로 지키고 한 곳에서 갱신하는" 규칙만 단일 소스로 제공합니다.

---

## 제공 도구 (Tools)

> 📖 **각 도구/프롬프트가 무엇을·무엇을 위해 제공하는지 사람이 읽기 좋게 정리한 안내:
> [docs/tools-and-prompts.ko.md](docs/tools-and-prompts.ko.md)** — 아래 표는 요약입니다.

AI가 작업 중 **필요할 때 자동으로 호출**합니다.

| 도구                          | 파라미터                                                           | 읽는 파일                                     |
| ----------------------------- | ------------------------------------------------------------------ | --------------------------------------------- |
| `get_coding_standards`        | `language`: `cpp` \| `typescript` \| `javascript` \| `python` \| `bash` \| `general` | `/app/rules/coding-standards/{language}.md`   |
| `get_workflow_rules`          | _(없음)_                                                           | `/app/rules/workflow-rules.md`                |
| `get_commit_guidelines`       | _(없음)_                                                           | `/app/rules/commit-guidelines.md`             |
| `get_definition_of_done`      | _(없음)_                                                           | `/app/rules/definition-of-done.md`            |
| `get_security_guidelines`     | _(없음)_                                                           | `/app/rules/security-guidelines.md`           |
| `get_code_review_guidelines`  | _(없음)_                                                           | `/app/rules/code-review-guidelines.md`        |
| `get_documentation_standards` | _(없음)_                                                           | `/app/rules/documentation-standards.md`       |
| `get_diagram_guidelines`      | _(없음)_                                                           | `/app/rules/diagram-guidelines.md`            |
| `get_branching_strategy`      | _(없음)_                                                           | `/app/rules/branching-strategy.md`            |
| `get_testing_standards`       | _(없음)_                                                           | `/app/rules/testing-standards.md`             |
| `get_api_design_guidelines`   | _(없음)_                                                           | `/app/rules/api-design-guidelines.md`         |
| `get_dependency_management`   | _(없음)_                                                           | `/app/rules/dependency-management.md`         |
| `get_logging_observability`   | _(없음)_                                                           | `/app/rules/logging-observability.md`         |
| `get_configuration_management`| _(없음)_                                                           | `/app/rules/configuration-management.md`      |
| `get_data_persistence`        | _(없음)_                                                           | `/app/rules/data-persistence.md`              |
| `get_error_handling_resilience`| _(없음)_                                                          | `/app/rules/error-handling-resilience.md`     |
| `get_performance_guidelines`  | _(없음)_                                                           | `/app/rules/performance-guidelines.md`        |
| `get_ai_assisted_coding`      | _(없음)_                                                           | `/app/rules/ai-assisted-coding.md`            |
| `get_i18n_l10n`               | _(없음)_                                                           | `/app/rules/i18n-l10n.md`                     |
| `get_concurrency_async`       | _(없음)_                                                           | `/app/rules/concurrency-async.md`             |
| `get_accessibility`           | _(없음)_                                                           | `/app/rules/accessibility.md`                 |
| `get_ci_cd`                   | _(없음)_                                                           | `/app/rules/ci-cd.md`                         |

요청한 마크다운 파일이 없으면 raw 예외 대신 **정중한 안내 메시지**(에러 결과로 표시)를 반환합니다.

### AI는 어떤 도구를 언제 부를지 어떻게 아나?

도구 사용 안내의 **단일 소스는 서버**입니다 — 레포 파일에 중복하지 않습니다(중복 시 서버 변경과 어긋날 위험):

1. **도구 설명**: 연결 시 모든 도구의 이름·설명·스키마가 AI 컨텍스트에 **항상** 주입됩니다. 각 설명에 "언제 호출하라"가 담겨 있어 AI가 자율 호출합니다.
2. **서버 instructions**: 서버가 초기화 때 전역 사용 지침을 제공합니다(클라이언트 지원 편차 있음).
3. **레포 CLAUDE.md / AGENTS.md**: **프로젝트 고유** 내용(빌드/테스트/검증 명령, 아키텍처)만 담고, 공통 도구 목록은 넣지 않습니다.

---

## 프롬프트 (선택)

MCP **프롬프트**는 사용자가 슬래시 커맨드처럼 직접 실행합니다. 클라이언트 지원 편차가 있으며
(Cline/Roo 미노출 가능), 동일 내용은 위 도구로 항상 접근할 수 있습니다.

| 프롬프트      | 인자              | 동작                                                    |
| ------------- | ----------------- | ------------------------------------------------------- |
| `code-review` | `target` (선택)   | `code-review-guidelines.md` 를 로드해 현재 diff 를 리뷰 |
| `commit-msg`  | `issue_key` (선택) | `commit-guidelines.md` 를 로드해 커밋 메시지 초안 작성  |

---

## HTTP 엔드포인트

서버는 **Streamable HTTP** 전송을 단일 경로 `/mcp` 로 구현합니다:

| 메서드   | 경로      | 용도                                                       |
| -------- | --------- | ---------------------------------------------------------- |
| `POST`   | `/mcp`    | 클라이언트 → 서버 JSON-RPC 메시지 (및 `initialize` 핸드셰이크) |
| `GET`    | `/mcp`    | 세션의 서버 → 클라이언트 SSE 스트림 열기                   |
| `DELETE` | `/mcp`    | 세션 종료                                                  |
| `GET`    | `/health` | 헬스 체크 (항상 열림, 인증 없음)                           |

세션은 `Mcp-Session-Id` 헤더로 추적합니다 — 서버가 `initialize` 시 발급하고 클라이언트가
이후 모든 요청에 되돌려 보냅니다(MCP 클라이언트가 자동 처리).

---

## 규칙 디렉터리 구조

서버는 `RULES_DIR`(기본 `/app/rules`, 호스트 `./host_rules` 마운트)에서 모든 내용을 읽습니다.

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

> **하이브리드 모델**: 프로젝트별 빌드/테스트/검증 명령은 여기에 두지 않습니다.
> 각 프로젝트 저장소가 [`CLAUDE.md` / `AGENTS.md`](repo-templates/) 의 Build / Test / Validate
> 섹션을 들고, 서버는 공통 규칙만 제공합니다.

> **규칙 갱신**: 마크다운은 이미지에 굽지 않습니다. `./host_rules` 를 수정하면 컨테이너에
> 즉시 반영됩니다(컨테이너 쪽은 읽기 전용 마운트). 재빌드 불필요.

---

## Docker 로 실행 (권장)

```bash
# 1. ./host_rules 아래에 규칙 마크다운 배치 (위 구조 참고)
# 2. 빌드 & 기동:
docker compose up --build -d

# 3. 확인:
curl http://localhost:3000/health
# -> {"status":"ok","version":"1.0.0","rulesDir":"/app/rules","authEnabled":false,"activeSessions":0,...}
```

MCP 엔드포인트: `http://localhost:3000/mcp`

중지:

```bash
docker compose down
```

> **⚠️ 다른 MCP 서버가 이미 포트를 잡고 있다면**
>
> 이 저장소 이전에 개인용 규칙 서버를 돌리고 있었다면 그 컨테이너가 3000 포트를 계속
> 점유해 `docker compose up -d` 가 **포트 충돌로 실패**합니다. 정리 방법은 그 컨테이너가
> 어디서 떴는지에 따라 다릅니다.
>
> ```bash
> docker ps --filter publish=3000        # 포트를 점유한 컨테이너 확인
> docker rm -f <컨테이너>                 # 어느 프로젝트 소속이든 확실히 제거
> docker compose up --build -d
> ```
>
> `docker compose down --remove-orphans` 로도 되지만, **이 디렉터리에서 띄운 컨테이너에
> 한해서**입니다(compose 는 이 프로젝트 레이블이 붙은 컨테이너만 orphan 으로 봅니다).
>
> 구 서버가 과거 HTTP+SSE 전송(`GET /sse` + `POST /messages`)을 쓰고 있었다면, 이 서버는
> 이를 구현하지 않고 **`/mcp`** 만 제공합니다. 해당 클라이언트는 `--transport http` 로
> **재등록**하세요(아래 [클라이언트 연결](#클라이언트-연결) 참조).

> 규칙 파일만 바꾼 경우 재빌드 불필요(마운트 즉시 반영). **도구/프롬프트 등 코드 변경 시에는
> `docker compose up --build -d` 로 이미지를 재빌드**해야 합니다.

---

## 개발 · 테스트

> **호스트에 Node 를 설치할 필요가 없습니다.** 아래 명령은 모두 **컨테이너 안에서** 돌고
> 소스만 마운트하므로 호스트가 오염되지 않습니다. CI 도 동일한 게이트를 돕니다.

### 전체 검증 한 번에 (권장)

```bash
cd mcp_server
docker run --rm -u "$(id -u):$(id -g)" -e HOME=/tmp -e npm_config_cache=/tmp/.npm \
  -v "$PWD":/app -w /app node:20-alpine \
  sh -c "npm ci && npm run check"

# 검증이 끝나면 생성된 산출물 제거 (호스트 청결 유지)
rm -rf node_modules dist
```

`npm run check` = `format:check` → `lint` → `build` → `test` 를 fail-fast 로 실행합니다. CI 도 바로 이
스크립트를 돌리므로, 로컬 게이트와 PR 게이트가 어긋날 수 없습니다.

### 개별 스크립트

| 명령 | 하는 일 |
| --- | --- |
| `npm test` | 단위·무결성 테스트 (node:test, **총 30개**) |
| `npm run lint` | ESLint (`lint:fix` 로 자동 수정) |
| `npm run format` / `format:check` | Prettier 적용 / 검사 |
| `npm run build` | TypeScript 컴파일(`tsc`) → `dist/` |
| `npm run dev` | 개발 서버(자동 리로드) |

개별 실행도 같은 방식으로 감쌉니다 — 예: `sh -c "npm ci && npm test"`.

### 테스트가 검증하는 것

| 파일 | 개수 | 내용 |
| --- | --- | --- |
| `src/rules.test.ts` | 10 | 규칙 파일 해석, **경로 traversal 방어**, 파일 없음·빈 파일의 정중한 메시지 |
| `src/auth.test.ts` | 6 | Bearer 토큰 파싱·**상수시간 검증**, 401 응답 |
| `src/origin.test.ts` | 5 | Origin 허용/거부(loopback·allowlist), **DNS 리바인딩 방어** |
| `src/rules-integrity.test.ts` | 9 | **규칙 ↔ 도구 ↔ 문서 배선 무결성** (아래) |

`rules-integrity` 가 특히 중요합니다 — **규칙을 추가하면서 뭔가 빠뜨리면 여기서 실패**합니다.

- 모든 `RULE_TOOLS` 항목이 실재하는 규칙 파일을 가리키는가
- `<파일>.md → get_<name>` 명명 규칙(하이픈→언더스코어)을 지키는가
- 최상위 규칙 파일 중 **도구에 연결되지 않은 고아**가 없는가
- `CODING_LANGUAGES` 의 모든 언어에 해당 파일이 있는가
- 규칙 문서 간 **상호참조(`foo.md`)가 실재 파일로 해석**되는가
- 모든 도구·언어가 **README(en/ko)·[도구 안내 문서](docs/tools-and-prompts.ko.md)에 등장**하는가 (문서 drift 방지)
- `whenToCall` 형식이 올바른가 (도구 설명·`instructions` 자동 생성의 전제)

### 서버가 실제로 뜨는지 확인 (스모크)

단위 테스트와 별개로, 컨테이너를 띄워 MCP 핸드셰이크를 확인할 수 있습니다.

```bash
docker compose up --build -d
curl -s localhost:3000/health          # {"status":"ok",...}

# initialize -> 200 + Mcp-Session-Id 발급 확인
curl -s -D - -o /dev/null -X POST localhost:3000/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"smoke","version":"0"}}}' \
  | grep -i 'HTTP/\|mcp-session-id'

docker compose down
```

> 인증을 켰다면 `-H "Authorization: Bearer <token>"` 를 함께 보냅니다.
> `.env` 에서 `PORT` 를 바꿨다면 `localhost:$PORT` 로 접속합니다.

---

## 로컬 실행 (Docker 없이)

> 호스트에 Node 20+ 가 설치돼 있어야 합니다. 호스트를 건드리고 싶지 않다면 위
> [개발 · 테스트](#개발--테스트) 의 컨테이너 방식을 쓰세요.

```bash
npm install

export RULES_DIR="$(pwd)/host_rules"
export PORT=3000
# 선택: 순수 로컬 실행이면 localhost 로만 바인딩
export HOST=127.0.0.1

# 개발 모드(자동 리로드):
npm run dev

# 또는 빌드 후 실행:
npm run build
npm start
```

---

## 클라이언트 연결

### Claude Code (CLI)

**Streamable HTTP**(`http`) 전송으로 등록합니다:

```bash
# 로컬 (인증 없음):
claude mcp add --transport http personal-rules http://localhost:3000/mcp

# 원격 + Bearer 토큰:
claude mcp add --transport http personal-rules https://<your-host>/mcp \
  --header "Authorization: Bearer <token>"

claude mcp list   # 연결 확인
```

### Claude Code Web (claude.ai/code)

Web/클라우드 세션은 임의 URL을 즉석 추가할 수 없습니다. 대신 프로젝트 저장소에
`.mcp.json` 을 커밋합니다([`.mcp.json.example`](.mcp.json.example) 참고):

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

토큰은 런타임에 `MCP_TOKEN` 환경변수에서 확장됩니다 — **실제 토큰을 커밋하지 마세요**.
서버는 **공개 HTTPS** 로 도달 가능해야 합니다. 리버스 프록시 뒤 TLS 종단은
[`docs/reverse-proxy-tls.md`](docs/reverse-proxy-tls.md) 참고.

### Cline / Roo Code

Streamable HTTP MCP 서버로 지정합니다:

```json
{
  "mcpServers": {
    "personal-rules": { "type": "http", "url": "http://localhost:3000/mcp" }
  }
}
```

---

## 설정 (환경변수)

| 변수                  | 기본값       | 설명                                                                         |
| --------------------- | ------------ | ---------------------------------------------------------------------------- |
| `PORT`                | `3000`       | 발행/리슨 포트 — 아래 참고                                                    |
| `HOST`                | `0.0.0.0`    | 바인딩 인터페이스. 순수 로컬이면 `127.0.0.1` 로 두어 외부 노출 방지          |
| `RULES_DIR`           | `/app/rules` | 규칙 마크다운 루트                                                           |
| `MCP_AUTH_TOKEN`      | _(미설정)_   | `/mcp` 에 요구되는 Bearer 토큰(콤마로 다중). 미설정 시 인증 없음             |
| `MCP_ALLOWED_ORIGINS` | _(미설정)_   | 추가 허용 브라우저 `Origin`(콤마 구분). loopback·no-Origin 클라이언트는 항상 허용 |

> Docker 에서 `PORT`(.env)는 **호스트 발행 포트**입니다 — 컨테이너는 내부적으로 항상 `3000` 을
> 리슨하고 헬스체크도 이를 따릅니다. 접속은 `http://localhost:$PORT`. 로컬(비-Docker) 실행 시엔
> `export PORT=...` 가 Node 서버의 실제 리슨 포트를 지정합니다.

---

## 인증 (선택)

`MCP_AUTH_TOKEN` 을 설정하면 `/mcp` 에 Bearer 토큰이 필요합니다(`/health` 는 헬스체크용으로 열림).
콤마로 여러 토큰을 두어 발급·회전이 가능합니다. 미설정 시 엔드포인트는 인증 없이 열리며 시작 시
경고 로그가 남습니다 — **localhost 밖으로 노출한다면 반드시 토큰을 설정하세요.**

```bash
# docker-compose 는 .env 를 자동으로 읽습니다
cp .env.example .env
echo "MCP_AUTH_TOKEN=$(openssl rand -hex 32)" >> .env
docker compose up --build -d
```

## DNS 리바인딩 / Origin 보호

브라우저는 `Origin` 헤더를 붙이지만 네이티브 클라이언트(Claude Code CLI, curl)는 붙이지 않습니다.
서버는 **Origin 없는** 요청과 **loopback** origin 요청은 허용하고, 그 외 브라우저 origin 은
`MCP_ALLOWED_ORIGINS` 에 명시되지 않으면 거부합니다. Claude Code Web 에서 연결한다면 해당 origin
(예: `MCP_ALLOWED_ORIGINS=https://claude.ai`)을 추가하세요.

---

## 프로젝트 구조

```
.
├── src/
│   ├── index.ts          # Express + Streamable HTTP 서버, 도구/프롬프트 등록
│   ├── rules.ts          # 규칙 파일 해석 + 경로 traversal 방어
│   ├── auth.ts           # Bearer 토큰 파싱 + 상수시간 검증
│   ├── origin.ts         # Origin 허용/거부 가드 (DNS 리바인딩 방어)
│   ├── rules.test.ts     # node:test 단위 테스트
│   ├── auth.test.ts
│   ├── origin.test.ts
│   └── rules-integrity.test.ts
├── package.json
├── tsconfig.json
├── Dockerfile            # 멀티스테이지 빌드 (규칙은 굽지 않음)
├── docker-compose.yml    # ./host_rules -> /app/rules 마운트
├── .dockerignore
├── .env.example
├── .mcp.json.example     # 클라이언트 연결 설정 (CLI / Web)
├── .github/workflows/    # CI: push/PR 시 빌드 + 테스트
├── host_rules/           # 내 마크다운 규칙 (런타임 마운트)
├── repo-templates/       # 각 프로젝트 저장소에 복사할 CLAUDE.md / AGENTS.md
└── docs/                 # 결정 기록 (예: reverse-proxy-tls.md)
```
