# C++ Coding Standards

당신이 작성하는 모든 C++ 코드는 [Google C++ Style Guide](https://google.github.io/styleguide/cppguide.html) 와 최신 C++(C++17/20) 모범 사례를 준수해야 합니다.

> 프로젝트나 프레임워크(예: Chromium/Blink, Qt, Boost)에 자체 코딩 컨벤션이 있으면 **그 규칙이 우선**합니다. 아래는 프레임워크 컨벤션이 없을 때의 기본 원칙입니다.

## 1. 스마트 포인터 및 메모리
- 소유권이 독점적인 객체는 `std::unique_ptr` 과 `std::make_unique` 를 사용합니다.
- 공유 소유권이 꼭 필요할 때만 `std::shared_ptr`(`std::make_shared`)을 사용하고, 순환 참조는 `std::weak_ptr` 로 끊습니다. 설계 단계에서 소유권을 명확히 해 공유 소유를 최소화합니다.
- raw 포인터(`T*`)는 **소유하지 않는 참조**로만 쓰고, `new`/`delete` 직접 호출을 피합니다.
- **RAII** 를 기본으로 삼아 리소스(메모리·파일·락 등)의 수명을 객체 수명에 묶습니다.

## 2. const 정확성 · 불변성
- 변경하지 않는 것은 `const` 로 표시합니다(멤버 함수·매개변수·지역 변수).
- 복사 비용이 큰 인자는 `const T&` 로 받습니다. 이동이 유효하면 `T&&`/`std::move` 를 활용합니다.

## 3. 최신 C++ 관용구
- 타입이 명확하면 `auto` 를, 순회는 range-based `for` 를 사용합니다.
- `NULL`/`0` 대신 **`nullptr`**, 일반 `enum` 대신 **`enum class`** 를 씁니다.
- 여러 반환값은 구조적 바인딩(structured bindings)이나 `struct` 로 표현합니다.
- 직접 루프보다 표준 알고리즘(`std::find`, `std::ranges::*` 등)을 우선합니다.

## 4. 콜백 및 비동기 패턴
- 콜백/함수 객체는 `std::function` 또는 템플릿 콜러블로 전달합니다.
- 비동기 콜백에 객체 수명을 넘겨야 할 때는 `this` 원시 캡처 대신 `std::weak_ptr`(`std::enable_shared_from_this`)로 댕글링 포인터를 방지합니다.
- 프레임워크의 콜백/바인딩 유틸리티가 있으면 그 규약(수명 안전 바인딩 포함)을 따릅니다.

## 5. 문자열 처리
- 문자열은 `std::string`(UTF-8)을 기본으로 하고, 유니코드 폭이 필요하면 `std::u16string`/`std::u32string` 을 씁니다.
- 소유하지 않는 읽기 전용 문자열 인자는 `std::string_view` 로 받아 불필요한 복사를 피합니다.
- 웹/프레임워크 인터페이스 연동 시에는 해당 프레임워크의 문자열 타입 규약을 따릅니다.

## 6. 오류 처리
- 예외 또는 오류 반환(`std::expected`/에러 코드) 중 **프로젝트 정책을 일관되게** 따릅니다.
- 소멸자에서 예외를 던지지 않습니다. 자원 해제는 RAII에 맡깁니다.

## 7. 네이밍 · 헤더
- 프로젝트/Google 스타일의 네이밍을 일관되게 적용합니다. 이름은 의도를 드러내게.
- 헤더에는 include guard(또는 `#pragma once`)를 두고, 필요한 것만 include 합니다(불필요한 의존 최소화).

## 8. 안전 · 금지
- 정의되지 않은 동작(UB)·데이터 경쟁을 피합니다. 원시 배열·C 스타일 캐스트보다 `std::array`/`std::vector`·`static_cast` 등을 씁니다.
- 매크로 남용을 피하고 `constexpr`/인라인 함수를 우선합니다.
