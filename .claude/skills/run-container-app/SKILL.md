---
name: run-container-app
description: 이 저장소의 컨테이너화 앱(firefox, kakao 등)을 빌드·실행하고 GUI/한글/오디오 관련 문제를 진단합니다. 사용자가 "firefox 실행해줘", "카카오톡 안 떠", "화면이 안 나와", "한글이 깨져", "소리가 안 나" 등 앱 실행·트러블슈팅을 요청할 때 사용합니다.
---

# 컨테이너 앱 빌드·실행·진단

이 저장소의 GUI 앱 컨테이너를 실행하고 흔한 문제를 해결합니다. 실행 스크립트는 이미지가 **미리 빌드되어 있다고 가정**(태그 하드코딩)하므로, 이미지가 없으면 먼저 빌드해야 합니다.

## 빌드 & 실행

```bash
# firefox
cd firefox && docker build -t firefox-ubuntu:latest .
./run-firefox.sh [firefox 옵션]      # 예: --new-window

# kakao
cd kakao && docker build -t kakaotalk-ubuntu:latest -f Dockerfile.kakao .
./run-kakao.sh

# input_leap (빌드형: 컴파일 후 ~/Desktop/InputLeap_Build 로 산출)
cd input_leaf && ./build-input-leap.sh
```

이미지 존재 확인: `docker images | grep -E 'firefox-ubuntu|kakaotalk-ubuntu'`
실행 중 컨테이너 확인: `docker ps -f name=firefox-gui` / `docker ps -f name=kakaotalk-gui`

## 사전 점검 (실행 전 호스트 상태)

- X11 세션인지: `echo $DISPLAY` (비어 있으면 GUI 불가, Wayland면 XWayland 필요)
- X 접근 허용: 스크립트가 `xhost +local:docker`를 실행하지만 수동 확인 가능
- 오디오 소켓: `ls $XDG_RUNTIME_DIR/pulse/native`
- 한글 입력용 ibus 소켓: `ls ~/.config/ibus/bus`
- 호스트 사용자 UID: `id -u` (컨테이너 `ubuntu` 계정과 매칭되려면 1000 권장)

## 트러블슈팅

| 증상 | 진단 / 해결 |
|------|-------------|
| `cannot open display` / 창이 안 뜸 | `$DISPLAY` 세팅과 `xhost +local:docker` 확인. Wayland면 XWayland 필요 |
| 한글 입력 안 됨 | 호스트 ibus 데몬 실행 여부, `~/.config/ibus/bus` 소켓 존재, `XMODIFIERS=@im=ibus` 확인 |
| 글자가 ㅁㅁㅁ로 깨짐 | 폰트 패키지(nanum/noto-cjk) 설치 확인. Wine(kakao)은 폰트 치환 레지스트리(`font.reg`) 적용 여부 확인 |
| 소리 안 남 | `$XDG_RUNTIME_DIR/pulse/native` 소켓, `--device /dev/snd`, `PULSE_SERVER` 확인 |
| Firefox 프로필 잠금 에러 | 스크립트가 `.parentlock`/`lock` 자동 삭제. 남으면 `~/.mozilla_docker`에서 수동 삭제 |
| kakao 첫 실행이 오래 걸림 | 정상. Wine 초기화 + 카카오톡 설치 마법사 진행 중. 로그 확인: `docker logs kakaotalk-gui` |
| 볼륨 파일 권한 꼬임 | 호스트 UID가 1000인지 확인 (컨테이너 `ubuntu` 계정과 불일치 시 발생) |
| 이미지 없음(`Unable to find image`) | 위 빌드 명령 먼저 실행 |

## 로그·디버깅

- 컨테이너 로그: `docker logs <컨테이너이름>`
- 컨테이너 내부 진입: `docker exec -it <컨테이너이름> bash`
- 강제 정리: `docker rm -f <컨테이너이름>` (데이터는 `~/.<앱>_docker` 볼륨에 유지됨)

## 검증

실행 후 실제로 창이 떴는지 사용자에게 확인을 요청하거나, 헤드리스 환경이라면 `docker ps`로 컨테이너가 살아 있는지 확인합니다. 로그에 에러가 없어도 GUI는 호스트 디스플레이에서만 확인 가능함을 유의하세요.
