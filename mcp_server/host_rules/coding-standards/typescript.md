# TypeScript Coding Standards

당신이 작성하는 모든 TypeScript 코드는 아래 기준과 최신 관용구를 준수해야 합니다.

> 프로젝트에 자체 ESLint/Prettier 설정이나 프레임워크 컨벤션이 있으면 그것을 우선합니다.

## 1. 타입
- **`strict` 모드**를 켜고, `strictNullChecks` 를 전제로 작성합니다.
- **`any` 를 피하고** 불가피하면 `unknown` 을 쓴 뒤 좁혀서(narrow) 사용합니다. `as` 강제 캐스팅을 남용하지 않습니다.
- 공개 함수·모듈 경계에는 **명시적 반환 타입**을 답니다(내부는 추론 활용).
- 도메인 데이터는 `interface`/`type` 로 명시적으로 모델링합니다. 고정 값 집합은 `enum` 보다 **문자열 리터럴 union** 을 우선 고려합니다.

## 2. 변수 · 불변성
- **`const` 우선**, 재할당이 필요할 때만 `let`. `var` 금지.
- 변경하지 않을 속성·배열은 `readonly`/`as const` 로 표현합니다.

## 3. null · undefined
- optional chaining(`?.`)·nullish coalescing(`??`)으로 안전하게 접근하고, 없음(absence)을 **명시적으로 처리**합니다.
- 비교는 **`===`/`!==`** 만 사용합니다(`==` 금지).

## 4. 비동기
- 콜백보다 **`async`/`await`** 를 사용하고, `await` 는 `try/catch` 로 에러를 처리합니다.
- 독립 작업은 **`Promise.all`** 로 병렬화합니다.
- **floating promise 금지** — 프라미스는 `await` 하거나 의도적으로 `void` 처리합니다.

## 5. 함수 · 구조
- 함수는 작고 한 가지 일만. 깊은 중첩 대신 early-return.
- 부수효과를 줄이고, 입력→출력이 예측 가능하게 작성합니다.

## 6. 에러 처리
- `Error`(또는 그 하위 클래스)를 throw 합니다. **문자열 throw 금지.**
- 실패를 조용히 삼키지 않고, 경계(외부 API·사용자 입력)에서 검증·처리합니다.

## 7. 모듈 · 임포트
- **named export** 를 선호하고, 순환 의존을 피합니다.
- 사용하지 않는 임포트·변수를 남기지 않습니다(린터로 강제).

## 8. 네이밍
- 변수·함수 `camelCase`, 타입·클래스·컴포넌트 `PascalCase`, 상수 `UPPER_SNAKE_CASE`.
- 불리언은 `is`/`has`/`should` 접두. 이름은 의도를 드러내게(축약어 남용 금지).
