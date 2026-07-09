#!/bin/bash

# X 서버 및 권한 설정
xhost +local:docker > /dev/null 2>&1
USER_UID=$(id -u)
HOST_DBUS_PATH="/run/user/${USER_UID}/bus"
XAUTH=${XAUTHORITY:-$HOME/.Xauthority}

# 카카오톡 데이터 영구 저장용 폴더
mkdir -p "$HOME/.kakaotalk_docker"
chmod -R 777 "$HOME/.kakaotalk_docker"

docker rm -f kakaotalk-gui 2>/dev/null

# 자동 시작 명령어: 한글 글꼴 레지스트리 패치 및 순정 실행
START_CMD='
export WINEDEBUG=-all
export WINEPREFIX="$HOME/.wine"

sudo mkdir -p /run/user/1000
sudo chown -R ubuntu:ubuntu /run/user/1000 2>/dev/null || true

# 글자 깨짐(ㅁㅁㅁ) 방지용 마법의 레지스트리 파일 생성
cat <<EOF > /tmp/font.reg
REGEDIT4

[HKEY_LOCAL_MACHINE\Software\Microsoft\Windows NT\CurrentVersion\FontSubstitutes]
"Malgun Gothic"="NanumGothic"
"맑은 고딕"="NanumGothic"
"Gulim"="NanumGothic"
"GulimChe"="NanumGothic"
"Dotum"="NanumGothic"
"DotumChe"="NanumGothic"
"Tahoma"="NanumGothic"
EOF

# 최초 실행 시 순정 Wine 환경 구성 및 폰트 적용
if [ ! -d "$WINEPREFIX/drive_c" ]; then
    echo ">> 순정 Wine 환경을 구성하고 한글 폰트를 매핑합니다..."
    wineboot -u
    wine regedit /tmp/font.reg
fi

KAKAO_EXE="$HOME/.wine/drive_c/Program Files (x86)/Kakao/KakaoTalk/KakaoTalk.exe"

if [ ! -f "$KAKAO_EXE" ]; then
    echo ">> 카카오톡 설치 파일을 다운로드하고 실행합니다..."
    wget -qO $HOME/KakaoSetup.exe https://app-pc.kakaocdn.net/talk/win32/KakaoTalk_Setup.exe
    wine $HOME/KakaoSetup.exe
else
    echo ">> 카카오톡을 실행합니다..."
    wine "$KAKAO_EXE"
fi
'

# 도커 실행
exec docker run \
  --name kakaotalk-gui \
  --net=host \
  --ipc=host \
  -v /tmp/.X11-unix:/tmp/.X11-unix:rw \
  -v "$XAUTH:$XAUTH:ro" \
  -v "$HOME/.kakaotalk_docker:/home/ubuntu/.wine" \
  -v "$XDG_RUNTIME_DIR/pulse/native:$XDG_RUNTIME_DIR/pulse/native" \
  -v /etc/localtime:/etc/localtime:ro \
  -e XAUTHORITY=$XAUTH \
  -e DISPLAY=$DISPLAY \
  -e PULSE_SERVER=unix:$XDG_RUNTIME_DIR/pulse/native \
  -e GTK_IM_MODULE=xim \
  -e QT_IM_MODULE=xim \
  -e XMODIFIERS=@im=ibus \
  -e LANG="ko_KR.UTF-8" \
  -e TZ="Asia/Seoul" \
  --device /dev/snd \
  --rm \
  kakaotalk-ubuntu:latest bash -c "$START_CMD"
  