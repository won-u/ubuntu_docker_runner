---
name: new-container-app
description: 이 저장소에 새로운 컨테이너화 GUI 애플리케이션 프로젝트를 스캐폴딩합니다. 사용자가 "새 앱 추가", "OO를 도커로 실행하게 만들어줘", "<앱이름> 컨테이너 만들어줘" 등 기존 firefox/kakao 패턴을 따르는 새 GUI 앱 격리 실행 환경을 요청할 때 사용합니다.
---

# 새 컨테이너화 GUI 앱 추가

이 저장소의 `firefox`/`kakao` 패턴을 그대로 따라, X11 리눅스 데스크톱에서 GUI 앱을 컨테이너에 격리 실행하는 새 프로젝트를 만듭니다. 작업 전 저장소 루트의 `CLAUDE.md`(공통 패턴·네이밍 규칙)와 `README.md`를 먼저 확인하세요.

## 절차

1. **요구사항 파악** — 사용자에게 다음이 불명확하면 물어봅니다:
   - 앱 이름(디렉토리·태그에 쓸 짧은 소문자 슬러그)
   - 설치 방식: APT 저장소 패키지 / `.deb` 다운로드 / Wine(Windows 앱) / 소스 빌드
   - 필요한 리소스: 오디오, GPU 가속, 한글 입력(IME), 데이터 영속화 여부

2. **기존 프로젝트를 템플릿으로 선택**
   - 리눅스 네이티브 GUI 앱 → `firefox/`를 복제 기준으로
   - Windows 앱(Wine 필요) → `kakao/`를 복제 기준으로

3. **`<앱>/Dockerfile` 작성** — CLAUDE.md의 "Dockerfile 공통 패턴" 순서를 지킵니다:
   `FROM ubuntu:<버전>`(안정성 필요 시 24.04 LTS) → `ENV DEBIAN_FRONTEND=noninteractive` → 패키지 설치(앱 + `locales language-pack-ko fonts-nanum fonts-noto-cjk` + 필요 시 `ibus ibus-gtk3`) → `locale-gen ko_KR.UTF-8` + `LANG/LANGUAGE/LC_ALL` → `ubuntu`(UID 1000) 계정 블록(sudo NOPASSWD, 마운트 대상 폴더 미리 생성) → `USER ubuntu` + `ENV HOME=/home/ubuntu`.

4. **`<앱>/run-<앱>.sh` 작성** — 선택한 템플릿 스크립트를 복제 후 조정:
   - 상단: `xhost +local:docker`, `USER_UID`/`XAUTH`/`HOST_DBUS_PATH` 계산 (그대로 유지)
   - 데이터 폴더 `~/.<앱>_docker` 생성·권한 개방
   - `docker run` 플래그는 **필요한 리소스만** 아래 표에서 선택
   - 마지막에 `exec docker run ... <앱>-ubuntu:latest <실행명령>`

5. **실행 권한 부여**: `chmod +x <앱>/run-<앱>.sh`

6. **문서 갱신**: `README.md`의 "프로젝트 구성"과 트리, `CLAUDE.md`의 명령어/네이밍 표에 새 항목 추가.

## 리소스 배선 표 (필요한 것만 선택)

| 리소스 | docker run 플래그 |
|--------|-------------------|
| 화면 | `-v /tmp/.X11-unix:/tmp/.X11-unix:rw -e DISPLAY=$DISPLAY` |
| X 인증 | `-v "$XAUTH:$XAUTH:ro" -e XAUTHORITY=$XAUTH` |
| 오디오 | `-v "$XDG_RUNTIME_DIR/pulse/native:$XDG_RUNTIME_DIR/pulse/native" -e PULSE_SERVER=unix:$XDG_RUNTIME_DIR/pulse/native --device /dev/snd` |
| GPU | `--device /dev/dri` |
| 한글입력(IME) | ibus 소켓/D-Bus 마운트 + `-e GTK_IM_MODULE=xim -e QT_IM_MODULE=xim -e XMODIFIERS=@im=ibus` |
| 로캘 | `-e LANG=ko_KR.UTF-8 -e LANGUAGE=ko_KR:ko -e LC_ALL=ko_KR.UTF-8` |
| 데이터 영속화 | `-v "$HOME/.<앱>_docker:/home/ubuntu/<컨테이너내경로>"` |

## 네이밍 규칙 (필수)

- 이미지 태그: `<앱>-ubuntu:latest`
- 컨테이너 이름: `<앱>-gui`
- 호스트 데이터 폴더: `~/.<앱>_docker`
- 실행 스크립트: `run-<앱>.sh` (빌드 전용 프로젝트는 `build-<앱>.sh`)
- 컨테이너 내부 사용자: `ubuntu` (UID 1000) 고정

## 완료 후 안내

빌드·실행 명령을 사용자에게 알려줍니다:
```bash
cd <앱> && docker build -t <앱>-ubuntu:latest -f <Dockerfile> .
./run-<앱>.sh
```
실제 실행 검증이 필요하면 `run-container-app` skill을 참고하세요.
