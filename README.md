# docker_files

호스트 시스템을 오염시키지 않고 **GUI 애플리케이션과 빌드 도구를 Docker 컨테이너에 격리**해서 실행하기 위한 스크립트 모음입니다. 리눅스 데스크톱(X11) 위에서 컨테이너 안의 앱이 마치 네이티브 앱처럼 화면·소리·한글 입력·데이터 저장을 사용하도록 각종 소켓과 볼륨을 연결하는 것이 핵심입니다.

## 목차

- [설계 원칙](#설계-원칙)
- [사전 요구사항](#사전-요구사항)
- [프로젝트 구성](#프로젝트-구성)
  - [firefox — 격리된 Firefox 브라우저](#firefox--격리된-firefox-브라우저)
  - [kakao — Wine 기반 카카오톡](#kakao--wine-기반-카카오톡)
  - [input_leaf — Input Leap 소스 빌드](#input_leaf--input-leap-소스-빌드)
- [공통 개념](#공통-개념)
- [새 애플리케이션 추가하기 (확장 가이드)](#새-애플리케이션-추가하기-확장-가이드)
- [트러블슈팅](#트러블슈팅)

---

## 설계 원칙

이 저장소의 모든 프로젝트는 다음 원칙을 공유합니다.

1. **격리(Isolation)** — 애플리케이션과 그 의존성을 컨테이너 안에만 설치하여 호스트 OS를 깨끗하게 유지합니다.
2. **네이티브 경험(Native UX)** — X11 소켓, PulseAudio, D-Bus, GPU(`/dev/dri`), 사운드(`/dev/snd`)를 컨테이너에 전달해 창·소리·하드웨어 가속을 그대로 사용합니다.
3. **완전한 한글 환경** — 로캘(`ko_KR.UTF-8`), 한글 폰트(nanum/noto-cjk), IME(ibus/xim) 연동을 기본 내장합니다.
4. **데이터 영속성(Persistence)** — 프로필·다운로드·설정 등 사용자 데이터를 호스트 폴더에 볼륨 마운트해 컨테이너를 지워도 유지합니다.
5. **재현성(Reproducibility)** — 실행에 필요한 환경 구성이 전부 `Dockerfile`과 실행 스크립트에 코드로 기록되어 있습니다.

## 사전 요구사항

- 리눅스 데스크톱 환경 (X11 세션 — Wayland는 XWayland 필요)
- Docker Engine (`docker` 명령 사용 가능, 현재 사용자가 docker 그룹에 속해야 함)
- `xhost` 유틸리티 (`x11-xserver-utils`)
- 호스트에 `ubuntu` 계정과 동일한 **UID 1000** 사용을 가정 (컨테이너 내부 `ubuntu` 계정과 매칭)
- PulseAudio 소켓(`$XDG_RUNTIME_DIR/pulse/native`) — 오디오가 필요한 경우
- `firefox`/`kakao`의 한글 입력을 쓰려면 호스트에 **ibus**가 실행 중이어야 함

---

## 프로젝트 구성

```
docker_files/
├── firefox/          # 컨테이너화된 Firefox (한글/IME/오디오/GPU)
│   ├── Dockerfile
│   └── run-firefox.sh
├── kakao/            # Wine 위에서 실행하는 카카오톡
│   ├── Dockerfile.kakao
│   └── run-kakao.sh
└── input_leaf/       # Input Leap을 컨테이너에서 빌드 → 바이너리 추출
    ├── Dockerfile.builder
    └── build-input-leap.sh
```

각 프로젝트는 **`Dockerfile`(환경 정의)** 과 **실행/빌드 스크립트(런타임 배선)** 의 두 파일로 구성됩니다.

### firefox — 격리된 Firefox 브라우저

Mozilla 공식 APT 저장소에서 설치한 **진짜 Firefox**(snap 판이 아닌)를 컨테이너에서 실행합니다. 한글 언어팩, IME, 하드웨어 가속, 프로필·다운로드 영속화를 지원합니다.

**빌드**
```bash
cd firefox
docker build -t firefox-ubuntu:latest .
```

**실행**
```bash
./run-firefox.sh                 # 브라우저 실행
./run-firefox.sh --new-window    # 이미 떠 있으면 새 창만 추가로 열기
```

- `firefox-gui` 컨테이너가 **이미 실행 중이면** `docker exec`로 기존 인스턴스에 창/URL을 전달하고, 아니면 새로 띄웁니다.
- 프로필: `~/.mozilla_docker/my_profile`, 다운로드: `~/Downloads/firefox_docker` (호스트에 저장)
- 이미지 태그: `firefox-ubuntu:latest`

### kakao — Wine 기반 카카오톡

Ubuntu 24.04 LTS + **winehq-stable(공식 순정 Wine)** 환경에서 Windows용 카카오톡을 실행합니다. 최초 실행 시 Wine 프리픽스를 구성하고, 카카오톡 설치 파일을 내려받아 설치한 뒤 이후부터는 바로 실행합니다. 한글 깨짐(ㅁㅁㅁ) 방지를 위해 폰트 치환 레지스트리를 자동 적용합니다.

**빌드**
```bash
cd kakao
docker build -t kakaotalk-ubuntu:latest -f Dockerfile.kakao .
```

**실행**
```bash
./run-kakao.sh
```

- Wine 프리픽스(카카오톡 설치본·설정 포함): `~/.kakaotalk_docker` (호스트에 저장 → 재로그인 유지)
- 첫 실행은 Wine 초기화 + 카카오톡 설치 마법사가 뜨므로 시간이 걸립니다.
- 이미지 태그: `kakaotalk-ubuntu:latest`

### input_leaf — Input Leap 소스 빌드

GUI 실행용이 아니라 **빌드 전용** 프로젝트입니다. 호스트에 개발 도구를 설치하지 않고, 컨테이너 안에서 [Input Leap](https://github.com/input-leap/input-leap)을 소스에서 컴파일한 뒤 **완성된 바이너리만 호스트로 복사**합니다.

**빌드 & 추출 (한 번에)**
```bash
cd input_leaf
./build-input-leap.sh
```

- 스크립트가 `input-leap-builder` 이미지 빌드 → 컨테이너에서 `git clone --recursive` → `cmake`(테스트 제외) → `make -j$(nproc)` → 바이너리 복사까지 자동 수행합니다.
- 결과물 위치: `~/Desktop/InputLeap_Build/`

---

## 공통 개념

GUI 실행 프로젝트(`firefox`, `kakao`)가 컨테이너에 전달하는 주요 리소스입니다. 새 앱을 추가할 때 이 표를 참고하세요.

| 목적 | 전달 방식 | 예시 |
|------|-----------|------|
| 화면 출력 | X11 소켓 마운트 + `DISPLAY` | `-v /tmp/.X11-unix:/tmp/.X11-unix` |
| X11 인증 | Xauthority 마운트 | `-v "$XAUTH:$XAUTH:ro" -e XAUTHORITY=$XAUTH` |
| 소리 | PulseAudio 소켓 + `/dev/snd` | `-v "$XDG_RUNTIME_DIR/pulse/native:..."` |
| GPU 가속 | DRI 디바이스 | `--device /dev/dri` |
| 한글 입력(IME) | ibus 소켓/D-Bus + `*_IM_MODULE` | `-e XMODIFIERS=@im=ibus` |
| 한글 표시 | 로캘 + 폰트 | `-e LANG=ko_KR.UTF-8`, `fonts-nanum` |
| 데이터 영속화 | 호스트 폴더 볼륨 | `-v "$HOME/.앱_docker:/home/ubuntu/..."` |

**권한(UID) 매칭**: 컨테이너 내부는 UID 1000의 `ubuntu` 계정을 사용합니다. 호스트 사용자도 UID 1000이면 볼륨 파일 소유권이 자연스럽게 맞습니다. 실행 스크립트는 시작 시 `xhost +local:docker`로 컨테이너의 X 서버 접근을 허용합니다.

## 새 애플리케이션 추가하기 (확장 가이드)

기존 프로젝트가 템플릿 역할을 합니다. 새 GUI 앱을 추가하는 표준 절차는 다음과 같습니다.

1. **디렉토리 생성**: `mkdir <앱이름>/`
2. **Dockerfile 작성** — 다음을 포함:
   - 적절한 베이스(`ubuntu:24.04` LTS 권장, 또는 필요한 버전)
   - `ENV DEBIAN_FRONTEND=noninteractive`
   - 앱 + 한글 로캘/폰트/IME 패키지 설치
   - `ubuntu`(UID 1000) 계정 세팅 + sudo NOPASSWD (기존 파일의 `USERNAME` 블록 복사)
   - `USER ubuntu`, `ENV HOME=/home/ubuntu`
3. **실행 스크립트 작성** — `run-firefox.sh` / `run-kakao.sh`를 복제해 다음을 조정:
   - `xhost +local:docker` 및 `XAUTH`/`HOST_DBUS_PATH` 계산 (그대로 재사용)
   - 앱 데이터용 호스트 폴더(`~/.<앱>_docker`) 생성·마운트
   - [공통 개념](#공통-개념) 표에서 **이 앱에 필요한 리소스만** 선택해 `docker run` 플래그 구성
   - 마지막에 이미지 태그와 실행 명령 지정
4. **빌드 & 실행**:
   ```bash
   docker build -t <앱>-ubuntu:latest -f <Dockerfile> .
   ./run-<앱>.sh
   ```

> **네이밍 규칙 (권장)**: 이미지 태그는 `<앱>-ubuntu:latest`, 컨테이너 이름은 `<앱>-gui`, 호스트 데이터 폴더는 `~/.<앱>_docker` 로 통일하면 스크립트 간 일관성이 유지되고 재사용이 쉬워집니다.

## 트러블슈팅

| 증상 | 원인 / 해결 |
|------|-------------|
| `cannot open display` | 호스트에서 `xhost +local:docker` 확인, `DISPLAY` 환경변수 세팅 여부 확인 |
| 한글 입력이 안 됨 | 호스트에 ibus 데몬 실행 중인지, `~/.config/ibus/bus` 소켓 존재 여부 확인 |
| 한글이 ㅁㅁㅁ로 깨짐 | 폰트 패키지(nanum/noto-cjk) 설치 및 (Wine의 경우) 폰트 치환 레지스트리 확인 |
| 소리가 안 남 | `$XDG_RUNTIME_DIR/pulse/native` 소켓 존재 여부, `--device /dev/snd` 확인 |
| 프로필 잠금(lock) 에러 | Firefox: 스크립트가 `.parentlock`/`lock`을 자동 삭제. 남아 있으면 데이터 폴더에서 수동 삭제 |
| 볼륨 파일 권한 꼬임 | 호스트 사용자 UID가 1000인지 확인 (컨테이너 `ubuntu` 계정과 매칭) |

---

각 프로젝트의 세부 구현·규칙은 저장소 루트의 [`CLAUDE.md`](./CLAUDE.md)를 참고하세요.
