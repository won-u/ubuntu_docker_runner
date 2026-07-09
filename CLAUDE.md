# CLAUDE.md

이 파일은 이 저장소에서 작업하는 Claude Code(및 향후 기여자)를 위한 안내서입니다. 저장소의 목적, 구조, 관례, 그리고 확장 시 반드시 지켜야 할 규칙을 담고 있습니다.

## 저장소 개요

리눅스 데스크톱(X11) 환경에서 **GUI 애플리케이션과 빌드 도구를 Docker 컨테이너에 격리 실행**하기 위한 스크립트 모음입니다. 각 하위 디렉토리는 독립적인 프로젝트이며, 서로 의존하지 않습니다. 빌드 시스템·패키지 매니저·모노레포 도구는 없고, 순수하게 `Dockerfile` + shell 스크립트로 구성됩니다.

핵심 아이디어: **앱은 컨테이너에 격리하되, 호스트의 X11/오디오/IME/GPU/데이터를 마운트해 네이티브 앱처럼 동작시킨다.**

## 디렉토리 구조

```
docker_files/
├── README.md              # 사용자용 문서
├── CLAUDE.md              # 이 파일
├── firefox/               # GUI 실행형: 컨테이너화된 Firefox
│   ├── Dockerfile
│   └── run-firefox.sh
├── kakao/                 # GUI 실행형: Wine 위 카카오톡
│   ├── Dockerfile.kakao
│   └── run-kakao.sh
└── input_leaf/            # 빌드형: Input Leap 소스 컴파일 → 바이너리 추출
    ├── Dockerfile.builder
    └── build-input-leap.sh
```

프로젝트에는 두 가지 유형이 있습니다.
- **GUI 실행형** (`firefox`, `kakao`): 컨테이너에서 GUI 앱을 계속 실행. `Dockerfile` + `run-*.sh`.
- **빌드형** (`input_leaf`): 컨테이너에서 컴파일 후 산출물만 호스트로 복사. `Dockerfile.builder` + `build-*.sh`.

## 명령어 (빌드 & 실행)

> 주의: 실행 스크립트는 이미지가 **미리 빌드되어 있다고 가정**합니다(태그명 하드코딩). 스크립트 자체는 이미지를 빌드하지 않으므로, GUI 실행형은 먼저 `docker build`를 수행해야 합니다.

```bash
# firefox
cd firefox && docker build -t firefox-ubuntu:latest .
./run-firefox.sh [firefox 옵션]

# kakao
cd kakao && docker build -t kakaotalk-ubuntu:latest -f Dockerfile.kakao .
./run-kakao.sh

# input_leaf (빌드+추출을 스크립트가 모두 수행)
cd input_leaf && ./build-input-leap.sh   # 결과: ~/Desktop/InputLeap_Build/
```

| 프로젝트 | 이미지 태그 | 컨테이너 이름 | 호스트 데이터 경로 |
|----------|-------------|----------------|--------------------|
| firefox | `firefox-ubuntu:latest` | `firefox-gui` | `~/.mozilla_docker`, `~/Downloads/firefox_docker` |
| kakao | `kakaotalk-ubuntu:latest` | `kakaotalk-gui` | `~/.kakaotalk_docker` |
| input_leaf | `input-leap-builder` | (임시, `--rm`) | `~/Desktop/InputLeap_Build` |

## 아키텍처와 관례

### Dockerfile 공통 패턴
모든 `Dockerfile`은 동일한 골격을 따릅니다. 새 파일 작성 시 이 순서를 유지하세요.
1. `FROM ubuntu:<버전>` — `kakao`는 안정성 위해 24.04 LTS, `firefox`/`input_leaf`는 26.04 사용
2. `ENV DEBIAN_FRONTEND=noninteractive`
3. 패키지 설치 (앱 + 한글 로캘/폰트/IME)
4. `locale-gen ko_KR.UTF-8` + `LANG`/`LANGUAGE`/`LC_ALL` 환경변수
5. **`ubuntu`(UID 1000) 계정 세팅** — sudo NOPASSWD 부여, 홈 디렉토리 하위 마운트 대상 폴더를 **미리 생성**해 root 권한 꼬임 방지
6. `USER ubuntu` + `ENV HOME=/home/ubuntu`

### 실행 스크립트 공통 패턴
`run-*.sh`는 다음을 수행합니다.
1. `xhost +local:docker` 로 컨테이너의 X 서버 접근 허용
2. `USER_UID`, `HOST_DBUS_PATH`, `XAUTH`, `IBUS_SOCKET_PATH` 등 호스트 리소스 경로 계산
3. 데이터용 호스트 폴더 생성 및 권한 개방
4. 기존 컨테이너 정리(`docker rm -f`) 후 `docker run` — 마지막에 `exec`를 써서 호스트가 프로세스를 추적 가능하게 함
5. `--rm`으로 종료 시 컨테이너 자동 삭제 (데이터는 볼륨에 남음)

### 컨테이너에 전달하는 리소스 (배선 규칙)
| 리소스 | 플래그 |
|--------|--------|
| 화면 | `-v /tmp/.X11-unix:/tmp/.X11-unix:rw`, `-e DISPLAY=$DISPLAY` |
| X 인증 | `-v "$XAUTH:$XAUTH:ro"`, `-e XAUTHORITY=$XAUTH` |
| 오디오 | `-v "$XDG_RUNTIME_DIR/pulse/native:..."`, `-e PULSE_SERVER=...`, `--device /dev/snd` |
| GPU | `--device /dev/dri` (firefox) |
| IME | ibus 소켓/D-Bus 마운트, `-e GTK_IM_MODULE=xim -e QT_IM_MODULE=xim -e XMODIFIERS=@im=ibus` |
| 로캘 | `-e LANG=ko_KR.UTF-8` 등 |
| 데이터 | `-v "$HOME/.앱_docker:/home/ubuntu/..."` |

### 앱별 특이사항
- **firefox**: 실행 중이면 `docker exec`로 기존 인스턴스에 옵션 전달(싱글 인스턴스). 시작 전 `.parentlock`/`lock` 파일을 삭제해 프로필 잠금 에러 방지. `--net=host --ipc=host --shm-size=2g`, seccomp/apparmor unconfined 사용.
- **kakao**: 컨테이너 진입 후 `START_CMD`(인라인 bash)로 Wine 초기화 → 폰트 치환 레지스트리(`font.reg`) 적용 → 카카오톡 최초 실행 시 CDN에서 설치파일 다운로드 후 설치, 이후엔 직접 실행. Wine 프리픽스 전체를 `~/.kakaotalk_docker`에 영속화. `TZ=Asia/Seoul` 설정.
- **input_leaf**: GUI 없음. `cmake -DINPUTLEAP_BUILD_TESTS=OFF` 로 테스트 제외, `make -j$(nproc)` 컴파일, `bin/*`을 마운트된 output 폴더로 복사.

## 네이밍 규칙 (확장 시 필수 준수)
새 프로젝트는 기존과의 일관성을 위해 아래 규칙을 따릅니다.
- 이미지 태그: `<앱>-ubuntu:latest`
- 컨테이너 이름(GUI형): `<앱>-gui`
- 호스트 데이터 폴더: `~/.<앱>_docker`
- 실행 스크립트: `run-<앱>.sh`, 빌드형은 `build-<앱>.sh`
- 컨테이너 내부 사용자: `ubuntu` (UID 1000) 고정

## 새 앱 추가 절차 (Claude용 체크리스트)
1. `<앱>/` 디렉토리와 `Dockerfile` 생성 — 위 [Dockerfile 공통 패턴] 골격 사용, 기존 파일에서 `ubuntu` 계정 블록을 복사.
2. `run-<앱>.sh` 생성 — 가장 유사한 기존 스크립트(`run-firefox.sh` 또는 `run-kakao.sh`)를 복제 후 조정.
3. [배선 규칙] 표에서 **해당 앱이 실제로 필요로 하는 리소스만** 선택(예: 오디오 불필요하면 pulse/snd 제외).
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
