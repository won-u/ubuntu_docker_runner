#!/bin/bash

# 호스트의 X 서버 접근 허용
xhost +local:docker > /dev/null 2>&1

USER_UID=$(id -u)
HOST_DBUS_PATH="/run/user/${USER_UID}/bus"
IBUS_SOCKET_PATH="$HOME/.config/ibus/bus"
XAUTH=${XAUTHORITY:-$HOME/.Xauthority}

# 🌟 핵심 1: 이미 컨테이너가 실행 중인지 확인
if [ "$(docker ps -q -f name=firefox-gui)" ]; then
    # 실행 중이라면 기존 컨테이너 안에서 전달받은 옵션(--new-window 등)을 실행하고 스크립트 종료
    docker exec -d firefox-gui firefox "$@"
    exit 0
fi

# 실행 중이 아니라면 찌꺼기 컨테이너 정리 후 새로 시작
docker rm -f firefox-gui 2>/dev/null

# 폴더 생성 및 권한 개방
mkdir -p "$HOME/Downloads/firefox_docker"
mkdir -p "$HOME/.mozilla_docker/my_profile"
chmod -R 777 "$HOME/Downloads/firefox_docker"
chmod -R 777 "$HOME/.mozilla_docker"

# (위쪽 코드는 기존과 동일하게 유지)

# 잠금 파일 강제 삭제 (에러 방지용)
find "$HOME/.mozilla_docker" -name ".parentlock" -delete 2>/dev/null
find "$HOME/.mozilla_docker" -name "lock" -delete 2>/dev/null

# 🌟 변경점: -d를 빼고 exec를 추가하여 프로세스를 우분투가 추적할 수 있게 만듭니다.
exec docker run \
  --name firefox-gui \
  --net=host \
  --ipc=host \
  --shm-size=2g \
  --security-opt seccomp=unconfined \
  --security-opt apparmor=unconfined \
  -v /tmp/.X11-unix:/tmp/.X11-unix:rw \
  -v "$XAUTH:$XAUTH:ro" \
  -v "$XDG_RUNTIME_DIR/pulse/native:$XDG_RUNTIME_DIR/pulse/native" \
  -v "$HOME/Downloads/firefox_docker:/home/ubuntu/Downloads" \
  -v "$HOME/.mozilla_docker:/home/ubuntu/.mozilla" \
  -v "${HOST_DBUS_PATH}:${HOST_DBUS_PATH}" \
  -v "${IBUS_SOCKET_PATH}:/home/ubuntu/.config/ibus/bus:ro" \
  -e XAUTHORITY=$XAUTH \
  -e DISPLAY=$DISPLAY \
  -e PULSE_SERVER=unix:$XDG_RUNTIME_DIR/pulse/native \
  -e DBUS_SESSION_BUS_ADDRESS="unix:path=${HOST_DBUS_PATH}" \
  -e GTK_IM_MODULE=xim \
  -e QT_IM_MODULE=xim \
  -e XMODIFIERS=@im=ibus \
  -e LANG="ko_KR.UTF-8" \
  -e LANGUAGE="ko_KR:ko" \
  -e LC_ALL="ko_KR.UTF-8" \
  --device /dev/dri \
  --device /dev/snd \
  --rm \
  firefox-ubuntu:latest firefox --profile /home/ubuntu/.mozilla/my_profile "$@"