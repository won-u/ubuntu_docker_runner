# Python Coding Standards

당신이 작성하는 모든 Python 코드는 [PEP 8](https://peps.python.org/pep-0008/) 과 최신 관용구를 준수해야 합니다.

> 프로젝트에 자체 린터/포매터 설정(ruff, black, flake8 등)이 있으면 그 설정이 우선합니다.

## 1. 스타일 · 포매팅
- 포매터는 `black`(또는 `ruff format`), 린터는 `ruff`(또는 flake8) 기준을 따릅니다.
- 4-space 들여쓰기, 한 줄 최대 88~100자(프로젝트 설정 우선).

## 2. 네이밍
- 변수·함수·모듈 `snake_case`, 클래스 `PascalCase`, 상수 `UPPER_SNAKE_CASE`.
- 이름은 의도를 드러내게. 불리언은 `is_`/`has_` 접두.

## 3. 타입 · 구조
- 공개 함수/메서드에는 **타입 힌트**를 붙이고 `mypy`/`pyright` 통과를 기본으로 합니다.
- 데이터 묶음은 `dataclass`/`pydantic` 등 명시적 타입으로 표현합니다.
- **가변 기본 인자 금지**(`def f(x=[])`) — `None` 후 내부에서 초기화합니다.

## 4. 예외 · 리소스
- 광범위한 `except:` / `except Exception:` 지양 — **구체 예외**를 잡습니다.
- 파일·락·커넥션은 `with`(컨텍스트 매니저)로 수명을 관리합니다.
- 예외를 삼키지 말고, 복구 불가면 컨텍스트를 담아 재발생/로깅합니다. (관용적으로 EAFP 선호)

## 5. 관용구
- 반복은 **컴프리헨션**으로(단, 복잡하면 일반 루프가 더 읽힘).
- 문자열은 **f-string** 을 씁니다.
- 경로는 `os.path` 보다 **`pathlib`** 를 사용합니다.
- 출력은 `print` 대신 **`logging`** 을 사용합니다(라이브러리/서버 코드).

## 6. 임포트 · 의존성
- 표준 → 서드파티 → 로컬 순으로 그룹화(`isort`/`ruff` 규칙). **와일드카드 임포트 금지.**
- 의존성은 가상환경 + lockfile(예: `requirements.txt`/`poetry.lock`)로 고정합니다.
