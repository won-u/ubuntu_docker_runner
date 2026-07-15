# Git & Commit Guidelines (개인 커밋 규약)

> Git 커밋 생성·정리에 적용되는 기준이다. 개인 특화 규칙(이슈 트래커·트레일러 관례 등)은 이 문서에 추가한다.
> **원칙: 커밋은 사용자 허락 후에만, 1 커밋 = 1 논리 변경으로, 독립적으로 빌드·테스트를 통과한다.**

당신은 코드를 작성한 후 커밋을 생성하거나 제안할 때 다음 규칙을 절대적으로 지킨다. 무의미하거나 자잘한 커밋(예: "typo fix", "WIP")을 무단으로 생성하지 않는다.

## 1. 커밋 생성 프로세스 (No Implicit Commits)
- 사용자의 명시적인 허락(`"지금 작업한 내용 커밋해 줘"`) 없이는 절대 `git commit` / `git reset --hard` 등을 임의로 실행하지 않는다.
- 커밋 전에 항상 `git status` 와 `git diff` 를 확인해 **논리적으로 연관된 변경**만 하나의 커밋으로 묶는다. (1 commit = 1 logical change, 독립적으로 빌드 성공)

## 2. 커밋 메시지 포맷 (Conventional Commits 기반)
- 제목은 **영어**, 본문은 **한글**로 작성한다.
- 제목: `<type>(scope): 요약` — 50자 이내, 마침표 없이, 명령문(동사원형).
  - type: feat / fix / docs / style / refactor / perf / test / build / ci / chore / revert
  - `build`(빌드 시스템·의존성), `ci`(파이프라인 설정 → `ci-cd.md`), `revert`(되돌리기)를 `chore` 로 뭉뚱그리지 않는다. `chore` 는 나머지에만 쓴다.
- 본문은 빈 줄 뒤에 **맥락 → 구현 → 영향 순서로 서술**한다. **`[Why]`/`[What]`/`[Impact]` 같은 라벨은 절대 넣지 말고**, 그 내용을 자연스러운 문단으로 풀어 쓴다.
  1. (맥락) 왜 이 변경이 필요한가 — 문제점/배경.
  2. (구현) 코드 레벨에서 무엇을 어떻게 해결했는가 — 핵심 변경. 항목이 여럿이면 `-` 불릿.
  3. (영향) 메모리/성능/API/빌드 등에 미치는 영향.
- **Breaking change 표기**: 하위 호환을 깨는 변경은 **반드시** 표시한다 — 제목의 type/scope 뒤에 `!` 를 붙이고(`feat(api)!: ...`), 푸터에 `BREAKING CHANGE: <무엇이 어떻게 깨지고 어떻게 마이그레이션하는가>` 를 단다. 무엇이 breaking 인지는 `api-design-guidelines.md` §6 기준(필드 제거·의미 변경·필수화·타입 변경)을 따른다. 이 표기가 **SemVer major 판정의 근거**이므로(`branching-strategy.md` §5), 빠뜨리면 릴리즈 버전이 틀어진다.
- 이슈 트레일러: 이슈 트래커 키(예: Jira `PROJ-123`)는 **사용자 요청에서** 얻는다. 없고 실질적 변경이면 **한 번 묻고**, 사소한 변경/저장소 초기화면 생략한다. **임의로 만들지 않는다.** 본문 끝에 **완전한 키**로 트레일러를 단다(숫자만 쓰지 않음 — 트래커가 키를 스캔해 자동 링크):
  - 결함 해결: `Fixes: PROJ-123`
  - 기능/태스크/부분작업/관련: `Refs: PROJ-201`
  - ⚠️ 여기서 `Fixes:` 는 **이슈 트래커의 이슈를 해결**한다는 뜻이다(Linux 커널의 `Fixes: <commit-sha>` = 회귀 유발 커밋 참조가 **아님**).
  - 정확한 분류는 **트래커 티켓 타입**이 우선이고, 트레일러는 시각 힌트 + 링크용이다. 자동 상태 전이가 필요하면 트래커의 Smart Commits(예: Jira `PROJ-123 #close`)를 쓴다.


## 3. 1 Commit = 1 Logical Change (Atomic Commit)
- 하나의 커밋은 **독립적으로 빌드가 성공**해야 하며, **테스트를 통과**해야 한다.
- 여러 기능을 한 번에 섞어서 커밋하지 않는다. (예: UI 수정과 빌드 설정 변경은 분리)
- 무의미한 중간 저장용 커밋("wip", "save", "fix typo")은 로컬에만 존재해야 한다.

## 4. git 업로드(또는 PR) 전 필수 과정: Squash & Amend
원격에 올리기 전, 로컬의 지저분한 히스토리를 정리한다.
- **`git commit --amend` 생활화**: 리뷰 피드백 반영이나 단순 오타 수정은 새 커밋을 만들지 말고 기존 커밋에 덮어씌운다.
- **`git rebase -i` (Interactive Rebase)**: 원격에 올리기 전, WIP·오타 등 **자잘한 커밋을 그것이 속한 논리 단위의 커밋으로** Squash(압축)한다. 단, **브랜치 전체를 무조건 한 커밋으로 합치지 않는다** — 서로 다른 논리 단위는 각각 독립된 atomic 커밋으로 유지한다(§3 참조).

### 형식 예시
```text
feat(auth): add token refresh with retry and backoff

액세스 토큰이 만료되면 사용자가 재로그인해야 해서 세션이 자주 끊겼다.
만료 직전에 자동 갱신해 세션 연속성을 확보할 필요가 있었다.

- 만료 60초 전에 refresh 토큰으로 자동 재발급한다.
- 실패 시 지수 백오프로 최대 3회 재시도한다.

네트워크 일시 장애에 대한 복원력이 올라가고, 재로그인 빈도가 줄어든다.
```

### Breaking change 예시 (제목 `!` + 푸터)
```text
feat(api)!: replace token field with tokens array

단일 세션만 가정한 `token` 필드로는 다중 기기 로그인을 표현할 수 없었다.

- 응답의 `token` 을 제거하고 `tokens` 배열로 대체한다.

기존 클라이언트는 응답 파싱에 실패한다. major 버전으로 릴리즈한다.

BREAKING CHANGE: 응답의 `token` 필드가 제거되고 `tokens` 배열로 대체됐다.
클라이언트는 `token` 대신 `tokens[0]` 을 읽도록 수정해야 한다.

Refs: PROJ-201
```

❌ 나쁜 예시
- `fix: some bug`
- `wip: trying to fix memory leak`
- `updated comments`

✅ 좋은 예시 (제목 영어 / 본문 한글)
- `fix(cache): prevent race during concurrent eviction`

## 5. 작업 절차 준수
- 커밋은 `workflow-rules.md` 의 절차(Plan→confirm→실행, 테스트, 빌드 성공)를 만족한 결과에 대해서만 생성한다.
