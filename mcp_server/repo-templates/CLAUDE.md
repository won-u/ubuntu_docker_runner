# <Project Name> — Project Guide

> 이 파일은 **이 프로젝트에 한정된** 빌드/테스트/검증 방법을 담습니다.
> 개인 공통 규칙(workflow, commit, 보안, 코드리뷰, 언어 표준)은 **Personal Rules MCP 서버**가
> 제공하므로 여기에 중복해서 적지 마세요.
>
> 사용법: 이 파일을 각 프로젝트 저장소 루트에 복사하고 `<...>` 를 실제 값으로 채웁니다.

## 개요
- 프로젝트 종류: `<WebApp | Chromium fork | Vehicle Framework | ...>`
- 언어 / 런타임: `<...>`
- 빌드 도구: `<Vite | gn+ninja | CMake | Bazel | Gradle | ...>`

## 개인 공통 규칙
개인 공통 규칙(코딩 표준·워크플로우·커밋·보안·코드리뷰·완료 기준 등)은 연결된 **Personal Rules MCP 서버**가
제공하며, **각 도구를 언제 호출할지 서버가 스스로 안내**합니다(도구 설명 + 서버 instructions).
도구 목록·사용 안내는 **서버가 단일 소스로 관리**하므로 이 파일에 중복해서 나열하지 않습니다
(중복하면 서버 변경 시 내용이 어긋납니다).

> **연결 방법**
> - Claude Code CLI(원격): `claude mcp add --transport http personal-rules https://<your-host>/mcp --header "Authorization: Bearer <token>"`
> - Claude Code Web(claude.ai/code): 이 저장소에 `.mcp.json` 을 커밋합니다(서버가 공개 HTTPS 로 도달 가능해야 함).
>   ```json
>   { "mcpServers": { "personal-rules": { "type": "http", "url": "https://<your-host>/mcp", "headers": { "Authorization": "Bearer ${MCP_TOKEN}" } } } }
>   ```

이 파일은 아래의 **이 프로젝트 고유** 내용(Build / Test / Validate / Architecture)만 담습니다.

## Build
- 전제조건: `<toolchain / SDK / 버전>`
- 주요 타깃:

  | 타깃 | 명령 | 용도 |
  |---|---|---|
  | `<dev / Debug>` | `<command>` | `<...>` |
  | `<release / Release>` | `<command>` | `<...>` |

- 산출물 위치: `<dist/ | out/ | build/ ...>`
- 격리 빌드(있으면): `<docker/전용 이미지 명령>`

## Test
- 프레임워크: `<vitest | jest | gtest | ctest | ...>`
- 전체 실행: `<command>`
- 단일 실행: `<command> <path>`

## Validate (Definition of Done)
- 포맷: `<command>`
- 린트: `<command>`
- 타입 체크: `<command>`
- 게이트 **정책**은 Personal Rules MCP 서버의 `get_definition_of_done` 참조 (여기에는 명령만 적음).

## Architecture (선택)
- 이 프로젝트의 구조·컴포넌트·의존 관계 요약 또는 설계 문서 링크.
