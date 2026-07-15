# Branching & Release Strategy (개인 브랜치·릴리즈 규약)

> 브랜치·릴리즈 관리에 일반적으로 통용되는 기준이다. 개인 특화 규칙(구체 모델·환경)은 여기에 추가한다.
> **원칙: 짧게 살아있는 브랜치, 항상 배포 가능한 main.**

## 1. 브랜치 모델
- **Trunk-based 또는 GitHub Flow** 를 권장한다: `main`(또는 `trunk`)은 항상 배포 가능한 상태를 유지하고, 작업은 **짧게 살아있는 feature 브랜치**에서 하고 자주 병합한다.
- long-lived 브랜치를 지양한다(오래 살수록 병합 충돌·drift가 커진다). 큰 작업은 작은 단위로 나눠 자주 통합한다.

## 2. 브랜치 네이밍
- `type/짧은-슬러그` 형식(있으면 이슈 키 포함):
  - `feature/PROJ-123-user-login`
  - `fix/PROJ-130-null-crash`
  - `chore/upgrade-deps`, `hotfix/prod-token-leak`
- 소문자·하이픈, 간결하게.

## 3. main 보호
- `main` 에 **직접 push 금지**. 변경은 **PR + 리뷰 승인 + CI green** 을 거친다(`code-review-guidelines.md`).
- 병합 전 브랜치를 최신 `main` 으로 **업데이트(rebase/merge)** 한다.

## 4. 병합 · 히스토리
- 병합 방식(merge commit / squash / rebase)은 프로젝트 정책을 일관되게 따른다. 자잘한 커밋 정리는 `commit-guidelines.md`(Squash & Amend) 참조.
- 커밋은 atomic 하게(독립 빌드 성공) 유지한다.

## 5. 릴리즈
- 버전은 **SemVer**(`MAJOR.MINOR.PATCH`)를 따르고, 릴리즈에 **태그**를 단다(`v1.4.0`).
- 릴리즈 노트에 주요 변경·호환성 파괴·마이그레이션을 정리한다.
- 핫픽스는 `hotfix/` 브랜치로 처리하고, 필요한 브랜치에 반영(back/forward-port)한다.
