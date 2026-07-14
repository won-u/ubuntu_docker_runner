#!/usr/bin/env bash
#
# run-kakao.sh — Wine 기반 카카오톡 실행 (없으면 이미지 자동 빌드)
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../lib/common.sh
source "$SCRIPT_DIR/../lib/common.sh"

IMAGE_TAG="kakaotalk-ubuntu:latest"
CONTAINER_NAME="kakaotalk-gui"
DOCKERFILE="$SCRIPT_DIR/Dockerfile.kakao"

# 사전 검증
require_docker
require_x11
resolve_host_paths
allow_x_access

# 이미지 없으면 자동 빌드, 찌꺼기 컨테이너 정리
ensure_image "$IMAGE_TAG" "$SCRIPT_DIR" "$DOCKERFILE"
remove_stale_container "$CONTAINER_NAME"

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

# 데이터 볼륨: Wine 프리픽스 전체를 호스트에 영속화
wire_data "$HOME/.kakaotalk_docker" "/home/ubuntu/.wine"

# 리소스 배선 (조건부)
wire_display
wire_audio
wire_ime
wire_locale
# 시간대: 호스트 시계 공유
if [ -e /etc/localtime ]; then
    DOCKER_MOUNTS+=( -v /etc/localtime:/etc/localtime:ro )
fi
DOCKER_ENVS+=( -e "TZ=Asia/Seoul" )

# 도커 실행
exec docker run \
  --name "$CONTAINER_NAME" \
  --net=host \
  --ipc=host \
  "${DOCKER_MOUNTS[@]}" \
  "${DOCKER_ENVS[@]}" \
  "${DOCKER_DEVICES[@]}" \
  --rm \
  "$IMAGE_TAG" bash -c "$START_CMD"