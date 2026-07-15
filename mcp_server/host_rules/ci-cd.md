# CI/CD Pipeline (개인 CI/CD 파이프라인 기준)

> 지속적 통합·전달 파이프라인에 일반적으로 통용되는 기준이다. 개인 특화 규칙(도구·러너 등)은 이 문서에 추가한다.
> **원칙: 파이프라인이 진실의 원천이다. 사람 손을 거치는 단계를 없애고, 초록불이 곧 배포 가능을 뜻하게 한다.**

## 1. 파이프라인 단계
- push·PR 마다 **자동으로** 돈다: 포맷 → 린트 → 타입체크 → 테스트 → 빌드(→ 필요 시 패키지·배포).
- **fail-fast**: 앞 단계가 실패하면 뒤를 돌리지 않고 원인을 즉시 드러낸다.
- 완료 기준(`definition-of-done.md`)의 게이트를 파이프라인이 강제한다.

## 2. 재현성 · 결정론
- 로컬·CI·운영이 **같은 명령·같은 lockfile**로 동작한다(→ `dependency-management.md`).
- 파이프라인은 결정론적이어야 한다 — 외부 상태·시간·순서에 의존해 간헐 실패(flaky)하지 않게 한다(→ `testing-standards.md`).
- 러너 이미지·도구 버전을 고정한다.

## 3. 게이트 · 보호
- main 브랜치는 **필수 체크 통과**를 머지 조건으로 건다(→ `branching-strategy.md`).
- 실패한 파이프라인 위에서 배포하지 않는다. 초록불이 아니면 진행하지 않는다.

## 4. 비밀 · 보안
- 자격증명은 **CI 시크릿**에 두고 로그에 노출하지 않는다(→ `security-guidelines.md`, `configuration-management.md`).
- 의존성 취약점·lockfile 검사를 파이프라인에 포함한다(→ `dependency-management.md`).
- 신뢰할 수 없는 입력(포크 PR 등)에 시크릿을 노출하지 않는다.

## 5. 속도 · 피드백
- 캐시(의존성·빌드)로 피드백을 빠르게 하되, 캐시가 정확성을 해치지 않게 무효화 기준을 둔다.
- 느린 작업은 병렬화하고, 무거운 단계는 필요한 경우에만 돌린다.

## 6. 산출물 · 배포
- 빌드 산출물(아티팩트)을 재현 가능하게 만들고 버전·커밋과 연결한다.
- 수동 배포 단계를 최소화한다. 배포가 실패하면 **되돌릴 수 있게** 한다.

## 참조
- 완료 게이트: `definition-of-done.md`
- 결정론적 설치·lockfile: `dependency-management.md`
- flaky·테스트: `testing-standards.md`
- main 보호·릴리즈: `branching-strategy.md`
- 시크릿: `security-guidelines.md`, `configuration-management.md`
