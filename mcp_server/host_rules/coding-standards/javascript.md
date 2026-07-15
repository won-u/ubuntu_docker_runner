# JavaScript Coding Standards

당신이 작성하는 모든 JavaScript 코드는 아래 기준과 최신 관용구를 준수해야 합니다.

> 프로젝트에 자체 ESLint/Prettier 설정이나 프레임워크 컨벤션이 있으면 그것을 우선합니다.
> 타입 안전이 중요하면 TypeScript 를 우선 고려합니다(→ `typescript.md`).

## 1. 언어 · 모듈
- **모던 ES(ESM)** 를 기본으로 합니다. `import`/`export`(**named export** 우선)로 구성하고 순환 의존을 피합니다.
- 최신 문법(구조분해·스프레드·optional chaining)을 활용하되, 대상 런타임의 지원 범위를 벗어나지 않습니다.

## 2. 변수 · 불변성
- **`const` 우선**, 재할당이 필요할 때만 `let`. **`var` 금지.**
- 객체·배열을 함부로 변형(mutate)하지 않고 불변 업데이트를 선호합니다.

## 3. 타입 안전 (정적 타입 부재 보완)
- 정적 타입이 없으므로 **경계에서 입력을 검증**합니다(런타임 스키마 검증 등).
- 공개 함수에는 **JSDoc** 으로 매개변수·반환·예외를 문서화합니다(에디터 타입 힌트·도구 활용).
- 규모가 커지거나 타입 안전이 중요해지면 **TypeScript 도입을 고려**합니다(→ `typescript.md`).

## 4. 동등성 · null
- 비교는 **`===`/`!==`** 만 사용합니다(`==` 금지).
- optional chaining(`?.`)·nullish coalescing(`??`)으로 없음(absence)을 명시적으로 처리합니다.

## 5. 비동기
- 콜백보다 **`async`/`await`** 를 쓰고, `await` 는 `try/catch` 로 에러를 처리합니다.
- 독립 작업은 **`Promise.all`** 로 병렬화하고, **floating promise 금지**(대기하거나 의도적으로 `void`).

## 6. 함수 · 에러
- 함수는 작고 한 가지 일만. 깊은 중첩 대신 early-return.
- `Error`(또는 하위 클래스)를 throw 합니다. **문자열 throw 금지.** 실패를 조용히 삼키지 않습니다.

## 7. 네이밍
- 변수·함수 `camelCase`, 클래스·컴포넌트 `PascalCase`, 상수 `UPPER_SNAKE_CASE`.
- 불리언은 `is`/`has`/`should` 접두. 이름은 의도를 드러내게(축약어 남용 금지).
