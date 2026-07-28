# CLAUDE.md

이 파일은 이 저장소에서 작업하는 Claude Code(및 향후 기여자)를 위한 안내서입니다. 저장소의 목적, 구조, 관례, 그리고 확장 시 반드시 지켜야 할 규칙을 담고 있습니다.

## 저장소 개요

리눅스 데스크톱(X11) 환경에서 **GUI 애플리케이션·빌드 도구·개인용 서비스를 Docker 컨테이너에 격리 실행**하기 위한 모음입니다. 각 하위 디렉토리는 독립적인 프로젝트이며, 서로 의존하지 않습니다. 모노레포 도구는 없습니다. 대부분은 순수하게 `Dockerfile` + shell 스크립트로 구성되며, **예외로 `mcp_server`만 Node/TypeScript(npm)** 를 사용합니다(빌드·테스트는 컨테이너 안에서 수행 — 호스트에 Node 설치 불필요).

핵심 아이디어: **앱은 컨테이너에 격리하되, 호스트의 X11/오디오/IME/GPU/데이터를 마운트해 네이티브 앱처럼 동작시킨다.**

## 디렉토리 구조

```
docker_files/
├── README.md               # 사용자용 문서
├── CLAUDE.md               # 이 파일
├── lib/
│   └── common.sh           # 실행 스크립트 공통 헬퍼(검증/배선/자동빌드)
├── firefox/                # GUI 실행형: 컨테이너화된 Firefox
│   ├── Dockerfile
│   └── run-firefox.sh
├── kakao/                  # GUI 실행형: Wine 위 카카오톡
│   ├── Dockerfile.kakao
│   └── run-kakao.sh
├── android_studio/         # GUI 실행형: 컨테이너화된 Android Studio
│   ├── Dockerfile
│   └── run-android-studio.sh
├── input_leaf/             # 빌드형: Input Leap 소스 컴파일 → 바이너리 추출
│   ├── Dockerfile.builder
│   └── build-input-leap.sh
└── mcp_server/             # 서비스형: 개인 규칙 MCP 서버 (Node/TypeScript)
    ├── Dockerfile
    ├── docker-compose.yml
    ├── src/                # Express + Streamable HTTP MCP 서버
    ├── host_rules/         # 제공 규칙 마크다운 (읽기 전용 마운트)
    └── docs/               # 아키텍처·도구 안내 등
```

프로젝트에는 세 가지 유형이 있습니다.
- **GUI 실행형** (`firefox`, `kakao`): 컨테이너에서 GUI 앱을 계속 실행. `Dockerfile` + `run-*.sh`.
- **빌드형** (`input_leaf`): 컨테이너에서 컴파일 후 산출물만 호스트로 복사. `Dockerfile.builder` + `build-*.sh`.
- **서비스형** (`mcp_server`): 컨테이너로 상시 실행하는 서버. `docker compose` 로 운영하며 GUI·X11 배선을 쓰지 않음. 자체 문서는 [`mcp_server/README.ko.md`](./mcp_server/README.ko.md) 참조.

## 명령어 (빌드 & 실행)

> 참고: GUI 실행 스크립트는 이제 이미지가 없으면 **`lib/common.sh`의 `ensure_image`가 자동으로 `docker build`** 를 수행합니다. 수동 빌드도 가능합니다.

```bash
# firefox (이미지 없으면 스크립트가 자동 빌드)
./firefox/run-firefox.sh [firefox 옵션]

# kakao (이미지 없으면 스크립트가 자동 빌드)
./kakao/run-kakao.sh

# android_studio (이미지 없으면 스크립트가 자동 빌드; 소스 경로는 ANDROID_STUDIO_SRC_DIR로 재정의 가능)
./android_studio/run-android-studio.sh

# input_leaf (빌드+추출을 스크립트가 모두 수행)
./input_leaf/build-input-leap.sh   # 결과: ~/Desktop/InputLeap_Build/

# mcp_server (서비스형 — compose 로 상시 실행)
cd mcp_server && docker compose up --build -d   # http://localhost:3000/mcp
curl http://localhost:3000/health

# 수동 빌드가 필요하면:
cd firefox && docker build -t firefox-ubuntu:latest .
cd kakao   && docker build -t kakaotalk-ubuntu:latest -f Dockerfile.kakao .
cd android_studio && docker build -t android-studio-ubuntu:latest .
```

| 프로젝트 | 이미지 태그 | 컨테이너 이름 | 호스트 데이터 경로 |
|----------|-------------|----------------|--------------------|
| firefox | `firefox-ubuntu:latest` | `firefox-gui` | `~/.mozilla_docker`, `~/Downloads/firefox_docker` |
| kakao | `kakaotalk-ubuntu:latest` | `kakaotalk-gui` | `~/.kakaotalk_docker` |
| android_studio | `android-studio-ubuntu:latest` | `android-studio-gui` | `/obigo/android_data` (SDK/AVD/설정), `/obigo/projects/android` (소스) — 각각 `ANDROID_STUDIO_DATA_DIR`/`ANDROID_STUDIO_SRC_DIR`로 재정의 가능 |
| input_leaf | `input-leap-builder` | (임시, `--rm`) | `~/Desktop/InputLeap_Build` |
| mcp_server | `personal-rules-mcp-server:latest` | `personal-rules-mcp` | `mcp_server/host_rules` (레포 내, 읽기 전용 마운트) |

### mcp_server 작업 시 유의
- **호스트를 오염시키지 말 것**: `npm` 을 호스트에서 직접 실행하지 않는다. 검증은 컨테이너에서 수행한다.
  ```bash
  cd mcp_server && docker run --rm -u "$(id -u):$(id -g)" -e HOME=/tmp \
    -v "$PWD":/app -w /app node:20-alpine \
    sh -c "npm ci && npm run format:check && npm run lint && npm test && npm run build"
  # 끝나면 생성된 node_modules/dist 는 제거해 호스트를 깨끗이 유지
  ```
- **규칙 추가 시**: `host_rules/<파일>.md` 를 만들고 **반드시 `src/rules.ts` 의 `RULE_TOOLS` 에 등록**한다(등록 안 하면 무결성 테스트의 "고아 파일" 케이스가 실패). 파일명의 하이픈은 도구명에서 언더스코어가 된다(`ci-cd.md` → `get_ci_cd`).
- 규칙 마크다운만 바꾼 경우 재빌드 불필요(마운트 즉시 반영). 코드 변경 시에는 `docker compose up --build -d`.

## 아키텍처와 관례

### Dockerfile 공통 패턴
모든 `Dockerfile`은 동일한 골격을 따릅니다. 새 파일 작성 시 이 순서를 유지하세요.
1. `FROM ubuntu:<버전>` — `kakao`/`android_studio`는 안정성 위해 24.04 LTS, `firefox`/`input_leaf`는 26.04 사용
2. `ENV DEBIAN_FRONTEND=noninteractive`
3. 패키지 설치 (앱 + 한글 로캘/폰트/IME)
4. `locale-gen ko_KR.UTF-8` + `LANG`/`LANGUAGE`/`LC_ALL` 환경변수
5. **`ubuntu`(UID 1000) 계정 세팅** — sudo NOPASSWD 부여, 홈 디렉토리 하위 마운트 대상 폴더를 **미리 생성**해 root 권한 꼬임 방지
6. `USER ubuntu` + `ENV HOME=/home/ubuntu`

### 실행 스크립트 공통 패턴
`run-*.sh`는 공통 로직을 [`lib/common.sh`](./lib/common.sh)에 위임하며, 다음 순서를 따릅니다.
1. `set -euo pipefail` 후 `lib/common.sh` 를 source
2. `require_docker` / `require_x11` 로 전제 조건 검증(docker 데몬, DISPLAY 등)
3. `resolve_host_paths` 로 USER_UID/HOST_DBUS_PATH/IBUS_SOCKET_PATH/XAUTH 계산, `allow_x_access`(xhost +local:docker)
4. `ensure_image`로 이미지 없으면 자동 빌드, `remove_stale_container`로 찌꺼기 정리
5. `wire_data`/`wire_display`/`wire_audio`/`wire_ime`/`wire_gpu`/`wire_kvm`/`wire_locale` 로 **소켓이 존재할 때만 조건부 마운트** 배열(`DOCKER_MOUNTS`/`DOCKER_ENVS`/`DOCKER_DEVICES`)에 누적
6. 마지막에 `exec docker run ... --rm` — 배열을 전개하고 종료 시 컨테이너 자동 삭제(데이터는 볼륨에 남음)

### 컨테이너에 전달하는 리소스 (배선 규칙)
| 리소스 | 플래그 |
|--------|--------|
| 화면 | `-v /tmp/.X11-unix:/tmp/.X11-unix:rw`, `-e DISPLAY=$DISPLAY` |
| X 인증 | `-v "$XAUTH:$XAUTH:ro"`, `-e XAUTHORITY=$XAUTH` |
| 오디오 | `-v "$XDG_RUNTIME_DIR/pulse/native:..."`, `-e PULSE_SERVER=...`, `--device /dev/snd` |
| GPU | `--device /dev/dri` (firefox) |
| KVM(에뮬레이터 가속) | `--device /dev/kvm --group-add "$(stat -c '%g' /dev/kvm)"` (android_studio) |
| IME | ibus 소켓/D-Bus 마운트, `-e GTK_IM_MODULE=xim -e QT_IM_MODULE=xim -e XMODIFIERS=@im=ibus` |
| 로캘 | `-e LANG=ko_KR.UTF-8` 등 |
| 데이터 | `-v "$HOME/.앱_docker:/home/ubuntu/..."` |

### 앱별 특이사항
- **firefox**: 실행 중이면 `docker exec`로 기존 인스턴스에 옵션 전달(싱글 인스턴스). 시작 전 `.parentlock`/`lock` 파일을 삭제해 프로필 잠금 에러 방지. `--net=host --ipc=host --shm-size=2g`, seccomp/apparmor unconfined 사용.
- **kakao**: 컨테이너 진입 후 `START_CMD`(인라인 bash)로 Wine 초기화 → 폰트 치환 레지스트리(`font.reg`) 적용 → 카카오톡 최초 실행 시 CDN에서 설치파일 다운로드 후 설치, 이후엔 직접 실행. Wine 프리픽스 전체를 `~/.kakaotalk_docker`에 영속화. `TZ=Asia/Seoul` 설정.
- **android_studio**: Dockerfile에서 Google 공식 tar.gz(`ANDROID_STUDIO_VERSION`/`ANDROID_STUDIO_FILENAME`/`ANDROID_STUDIO_URL` ARG로 버전 고정, `/opt/android-studio`에 압축 해제)를 설치. 파일명이 버전 문자열이 아닌 코드네임 기반일 수 있어(예: `android-studio-quail2-linux.tar.gz`) `ANDROID_STUDIO_VERSION`(경로용)과 `ANDROID_STUDIO_FILENAME`(실제 파일명)을 분리해 관리한다. 컨테이너 홈 전체(`/home/ubuntu`)를 `ANDROID_STUDIO_DATA_DIR`(기본 `/obigo/android_data`)에 영속화해 SDK/AVD/Gradle 캐시/IDE 설정을 보존하고, 그 안의 `AndroidStudioProjects` 서브디렉토리만 별도 호스트 경로(`ANDROID_STUDIO_SRC_DIR`, 기본 `/obigo/projects/android`)로 다시 마운트해 소스코드 저장 위치를 분리. 에뮬레이터 가속은 `lib/common.sh`의 `wire_kvm`(호스트 `/dev/kvm` 존재 시 `--device /dev/kvm` + 해당 GID를 `--group-add`)로 처리하며, 이미지 안에 별도 `kvm` 그룹을 만들지 않는다. Android Studio 버전을 올릴 때는 Dockerfile의 ARG만 갱신하면 됨(README.md 표와 동기화).
  - **`/run/user/1000` 권한 self-heal**: `wire_ime`/`wire_audio`가 `/run/user/1000/bus`, `/run/user/1000/pulse/native` 처럼 `/run/user/1000` 하위 경로를 직접 바인드 마운트하는데, 대상 상위 디렉토리가 컨테이너 안에 없으면 dockerd가 그 자리에서 **root 소유로 자동 생성**해버린다. 그 상태로 `ubuntu`가 `studio.sh`를 돌리면 에뮬레이터가 그 아래 `avd/running/<pid>/jwks/...`를 만들지 못해 `Failed to create jwk directory` 로 죽는다. 그래서 `run-android-studio.sh`는 컨테이너를 `--user root` + `--entrypoint bash`로 띄운 뒤, `/run/user/1000`(하위 바인드 마운트는 건드리지 않고 최상위 디렉토리만)을 `ubuntu:ubuntu`/`0700`으로 고치고 `runuser -u ubuntu -- studio.sh`로 전환해서 실행한다. Dockerfile의 `ENV`(PATH/HOME/ANDROID_HOME 등)는 `--user` 오버라이드와 무관하게 그대로 적용되므로 이 전환으로 인한 환경변수 유실은 없다.
- **input_leaf**: GUI 없음. `cmake -DINPUTLEAP_BUILD_TESTS=OFF` 로 테스트 제외, `make -j$(nproc)` 컴파일, `bin/*`을 마운트된 output 폴더로 복사.

## 네이밍 규칙 (확장 시 필수 준수)
새 **GUI 실행형/빌드형** 프로젝트는 기존과의 일관성을 위해 아래 규칙을 따릅니다.
- 이미지 태그: `<앱>-ubuntu:latest`
- 컨테이너 이름(GUI형): `<앱>-gui`
- 호스트 데이터 폴더: `~/.<앱>_docker`
- 실행 스크립트: `run-<앱>.sh`, 빌드형은 `build-<앱>.sh`
- 컨테이너 내부 사용자: `ubuntu` (UID 1000) 고정

> **서비스형 예외**: `mcp_server` 는 GUI 앱이 아니라 위 규칙을 따르지 않습니다(이미지 `personal-rules-mcp-server:latest`, 컨테이너 `personal-rules-mcp`, 데이터는 레포 내 `host_rules/` 마운트, 실행은 `docker compose`). 새 서비스형 프로젝트는 이 패턴을 참고하세요.

## 새 앱 추가 절차 (Claude용 체크리스트)
1. `<앱>/` 디렉토리와 `Dockerfile` 생성 — 위 [Dockerfile 공통 패턴] 골격 사용, 기존 파일에서 `ubuntu` 계정 블록을 복사.
2. `run-<앱>.sh` 생성 — 가장 유사한 기존 스크립트(`run-firefox.sh` 또는 `run-kakao.sh`)를 복제 후 조정. **배선은 `lib/common.sh`의 `wire_*` 헬퍼를 재사용**하고, 새 배선 로직이 공통이면 `common.sh`에 함수를 추가.
3. [배선 규칙] 표에서 **해당 앱이 실제로 필요로 하는 리소스의 `wire_*`만 호출**(예: 오디오 불필요하면 `wire_audio` 제외).
4. 네이밍 규칙 준수 확인.
5. `chmod +x run-<앱>.sh`.
6. README.md의 "프로젝트 구성"에 항목 추가.

## 주의사항 / 제약
- **호스트 UID 1000 가정**: 컨테이너 `ubuntu` 계정과 볼륨 소유권 매칭을 위함. 다른 UID 환경에서는 조정 필요.
- **X11 전용**: Wayland에서는 XWayland가 필요. 스크립트는 X11 소켓/`DISPLAY`에 의존.
- **호스트 ibus 의존**: 한글 입력은 호스트에서 ibus 데몬이 떠 있어야 동작.
- **보안 트레이드오프**: `xhost +local:docker`, `--net=host`, seccomp/apparmor unconfined 등은 편의를 위해 격리를 일부 완화함. 신뢰된 로컬 환경 전용.
- **비밀정보 없음**: 저장소에 자격증명·토큰을 커밋하지 말 것. 앱 로그인 데이터는 볼륨(호스트 폴더)에만 존재.
- Git: 현재 `master` 브랜치 단일. 커밋 요청이 없으면 임의로 커밋하지 말 것.

## 문서 유지보수
코드(스크립트/Dockerfile)를 변경하면 README.md와 이 파일의 관련 표(태그·경로·플래그)를 함께 갱신하세요. 특히 이미지 태그, 컨테이너 이름, 호스트 데이터 경로가 바뀌면 두 문서의 표를 동기화해야 합니다.

`mcp_server` 는 **자체 문서 세트**를 가집니다. 도구·규칙·전송 방식이 바뀌면 다음을 함께 갱신하세요.
- [`mcp_server/README.md`](./mcp_server/README.md) / [`README.ko.md`](./mcp_server/README.ko.md) — 도구 표·host_rules 트리
- [`mcp_server/docs/tools-and-prompts.ko.md`](./mcp_server/docs/tools-and-prompts.ko.md) — 도구·프롬프트 용도 안내(사용자용)
- [`mcp_server/docs/architecture.md`](./mcp_server/docs/architecture.md) (+ `.html`) — 도구 개수·엔드포인트·구성
