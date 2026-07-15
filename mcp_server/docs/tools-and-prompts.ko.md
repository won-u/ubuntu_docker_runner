# 제공 도구 · 프롬프트 안내 (한글)

이 서버가 AI 클라이언트(Claude Code CLI/Web, Cline, Roo Code 등)에 제공하는
**도구(Tools) 22종**과 **프롬프트(Prompts) 2종**을 용도 중심으로 정리한 문서입니다.

- **도구(Tools)**: AI가 작업 중 **필요하다고 판단하면 자동으로 호출**해 해당 규칙을
  가져옵니다. 사용자가 직접 "커밋 규칙 가져와줘"처럼 요청해도 됩니다. 각 도구는
  `host_rules/`의 마크다운 규칙 파일 하나를 그대로 반환합니다.
- **프롬프트(Prompts)**: 사용자가 **슬래시 커맨드처럼 직접 실행**하는 작업 흐름입니다.
  (클라이언트 지원 편차 있음 — 미노출 시 같은 내용을 도구로 이용 가능)
- 프로젝트별 **빌드/테스트/실행 명령**은 이 서버가 아니라 각 저장소의
  `CLAUDE.md` / `AGENTS.md` 에 있습니다(하이브리드 모델).

> 표의 요약이 아닌 **원문 규칙**이 필요하면 해당 도구를 호출하거나
> `host_rules/<파일>.md` 를 직접 여세요.

---

## 도구 (Tools) — 22종

### 1. 작업 절차 · 완료 · AI 위생
| 도구 | 무엇을 제공하나 | 언제 호출되나 |
| --- | --- | --- |
| `get_workflow_rules` | 모든 작업의 5단계 절차: 계획→사용자 확인→실행, 테스트 필수·정직한 판정, 빌드 성공, 상세·정직한 보고 | 작업을 시작하거나 계획할 때 |
| `get_definition_of_done` | "완료"로 인정되는 품질 게이트(포맷·린트·타입·테스트·빌드·보안·리뷰·커밋·문서·CI) | 작업을 완료로 판단하기 전 |
| `get_ai_assisted_coding` | AI/LLM 보조 코딩 위생: 생성 코드 검증, 환각 API·의존성 방지, 요청 범위 준수, 프롬프트 비밀 금지, 정직한 판정 | AI로 코드를 생성·수정할 때 |

### 2. 코드 작성 · 테스트 · 리뷰 · 커밋
| 도구 | 무엇을 제공하나 | 언제 호출되나 |
| --- | --- | --- |
| `get_coding_standards` (`language`) | 언어별 코딩 표준. 언어: `cpp` · `typescript` · `javascript` · `python` · `bash` · `general`(언어 공통) | 특정 언어로 코드를 작성·리뷰하기 전 |
| `get_testing_standards` | 테스트 표준: 테스트 피라미드, AAA, 결정론, 테스트 더블, 커버리지, flaky 방지 | 테스트를 작성·변경하거나 무엇을 테스트할지 정할 때 |
| `get_code_review_guidelines` | 리뷰 우선순위, 머지를 막는 것(blocking) vs 사소한 것(nit), PR·리뷰 위생 | 코드를 리뷰하거나 리뷰를 준비할 때 |
| `get_commit_guidelines` | 커밋 규약: Conventional Commits, atomic 커밋, squash/amend(pre-push), 이슈 트레일러 | 커밋하거나 PR을 작성하기 전 |
| `get_branching_strategy` | 브랜치·릴리즈 전략: 브랜치 모델·네이밍, main 보호, SemVer·태깅 | 브랜치를 만들거나 릴리즈를 계획할 때 |

### 3. 설계 · 견고성 · 성능
| 도구 | 무엇을 제공하나 | 언제 호출되나 |
| --- | --- | --- |
| `get_api_design_guidelines` | 공개 API 설계: 계약·명명·구조, 버저닝·하위호환, 에러, 페이지네이션, 멱등 | 공개 API를 설계·변경할 때 |
| `get_data_persistence` | 데이터·영속성: 스키마 설계, 마이그레이션(무중단·되돌리기), 트랜잭션, 인덱싱, 백업 | 스키마 설계·마이그레이션·DB 작업 시 |
| `get_error_handling_resilience` | 에러 처리·복원력: 타임아웃, 재시도·백오프, 서킷 브레이커, 멱등, 우아한 성능저하 | 에러를 처리하거나 외부·네트워크 의존을 호출할 때 |
| `get_concurrency_async` | 언어무관 동시성·비동기: 공유 상태 최소화, 락 규율·데드락 회피, 원자성·가시성, 취소·타임아웃, 스레드 안전 | 동시성·병렬·async 코드를 작성할 때 |
| `get_performance_guidelines` | 성능·효율: 측정 우선, 복잡도, IO/DB, 캐싱, 메모리·자원 | 최적화하거나 성능에 민감한 변경을 할 때 |

### 4. 운영 · 인프라 · 보안
| 도구 | 무엇을 제공하나 | 언제 호출되나 |
| --- | --- | --- |
| `get_configuration_management` | 설정·환경 관리: 설정/코드 분리, 시크릿·설정의 배치·주입, 환경별 설정, 검증·기본값, 피처 플래그 | 설정을 읽거나 env·설정을 추가·다룰 때 |
| `get_ci_cd` | CI/CD 파이프라인: 단계(포맷·린트·타입·테스트·빌드), fail-fast, 재현성, 필수체크 게이트, CI 시크릿, 캐싱 | CI/CD 파이프라인을 구성·변경할 때 |
| `get_logging_observability` | 로깅·관측성: 구조화 로그, 로그 레벨, 메트릭·트레이스, 상관 ID | 로깅·계측을 추가할 때 |
| `get_dependency_management` | 의존성 관리: 추가 기준, 버전 고정(lockfile), 업데이트, 공급망 보안, 라이선스 | 의존성을 추가·업그레이드하기 전 |
| `get_security_guidelines` | 시큐어 코딩: 비밀 **보호**(커밋·로그 금지·암호화), 입력 검증, 취약점·의존성 정책, 금지 API | 자격증명·사용자 입력·의존성을 다룰 때 |

### 5. 문서 · UI · 국제화
| 도구 | 무엇을 제공하나 | 언제 호출되나 |
| --- | --- | --- |
| `get_documentation_standards` | 문서화 표준: 코드 주석("왜"), README, ADR, 작성 원칙, 규칙 문서 톤 관례 | 문서·주석·ADR을 쓰거나 갱신할 때 |
| `get_diagram_guidelines` | 다이어그램 규약: diagram-as-code, C4·UML, 추상화 레벨 | 아키텍처·설계 다이어그램을 만들·편집할 때 |
| `get_accessibility` | 접근성(a11y): 시맨틱 구조, 키보드 접근, 대비·색, 스크린리더·ARIA, 모션·미디어 | 사용자 대상 UI(웹·앱)를 만들·변경할 때 |
| `get_i18n_l10n` | 국제화·현지화: 문자열 외부화, UTF-8, 로캘 인식 포맷, 시간대 | 사용자 대상 텍스트·로캘·날짜·시간대를 다룰 때 |

> `get_security_guidelines`(비밀을 **어떻게 보호**하나)와
> `get_configuration_management`(설정·시크릿이 **어디서 와서 어떻게 주입**되나)는
> 역할이 다릅니다. 비밀 관리 시 둘을 함께 참고하세요.

---

## 프롬프트 (Prompts) — 2종

사용자가 슬래시 커맨드처럼 직접 실행합니다. 실행 시점의 규칙 파일을 로드하므로 항상 최신입니다.

| 프롬프트 | 인자 | 무엇을 하나 |
| --- | --- | --- |
| `code-review` | `target` (선택) | `code-review-guidelines` 를 로드해 현재 변경(diff)을 리뷰. 인자를 주면 리뷰 대상을 지정(예: "staged changes", 파일 경로), 없으면 커밋 안 된 변경 전체 |
| `commit-msg` | `issue_key` (선택) | `commit-guidelines` 를 로드해 스테이징된 변경의 커밋 메시지 초안 작성. 이슈 키를 주면 트레일러에 포함 |

---

## 규칙 파일과 도구 이름 매핑

각 도구는 `host_rules/<파일>.md` 하나에 대응하며, **파일명의 하이픈(`-`)이 도구 이름에서는
언더스코어(`_`)** 로 바뀝니다.

- 예: `error-handling-resilience.md` → `get_error_handling_resilience`
- 예: `coding-standards/python.md` → `get_coding_standards({ language: "python" })`

## 규칙 수정 · 추가 방법

**기존 규칙의 내용만 수정**하려면 `host_rules/` 의 해당 마크다운을 고치면 끝입니다
(읽기 전용 마운트라 **컨테이너 재빌드 불필요** — 다음 호출부터 바로 반영).

**새 규칙(=새 도구)을 추가**할 때는 아래 3곳만 손대면 됩니다. 나머지는 자동 생성되거나,
빠뜨리면 **테스트가 잡아줍니다.**

| 순서 | 대상 | 무엇을 | 빠뜨리면 |
| --- | --- | --- | --- |
| 1 | `host_rules/<이름>.md` | 규칙 본문 작성 | 2를 하면 **테스트 실패**(파일 없음) |
| 2 | `src/rules.ts` → `RULE_TOOLS` | 항목 추가(`tool`·`file`·`title`·`description`·`whenToCall`·`friendlyName`) | **테스트 실패**(고아 파일) |
| 3 | `README.md` · `README.ko.md` · **이 문서** | 도구 표·트리에 항목 추가 | **테스트 실패**(문서 동기화 검사) |

**자동으로 처리되는 것 — 손댈 필요 없음**
- `src/index.ts` 의 **도구 등록**과 **`instructions`(언제 호출할지 안내)** 는 `RULE_TOOLS` 에서
  생성됩니다. 각 항목의 **`whenToCall` 한 필드**가 도구 설명의 "Call this …" 와 instructions
  트리거 줄을 **모두** 만들므로 둘이 어긋날 수 없습니다.
- `docs/architecture.md`·proposal 문서는 도구 목록을 **복제하지 않으므로** 갱신 대상이 아닙니다.

> **`whenToCall` 작성법**: "Call this " 뒤에 자연스럽게 붙는 **소문자 절**로 씁니다
> (예: `"before committing or writing a PR"` → 설명은 "… Call this before committing or
> writing a PR.", instructions 는 "- Before committing or writing a PR -> get_commit_guidelines.").
>
> 규칙 파일명 → 도구 이름은 **하이픈이 언더스코어로** 바뀝니다(`ci-cd.md` → `get_ci_cd`).
> 새 **언어** 표준은 `coding-standards/<언어>.md` + `src/rules.ts` 의 `CODING_LANGUAGES`
> enum + 문서의 언어 목록에 추가합니다(어느 하나라도 빠지면 테스트 실패).
