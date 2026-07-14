#!/usr/bin/env bash
#
# run-firefox.sh — 컨테이너화된 Firefox 실행
#   ./run-firefox.sh                 # 브라우저 실행 (없으면 이미지 자동 빌드)
#   ./run-firefox.sh --new-window    # 이미 실행 중이면 새 창만 추가
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../lib/common.sh
source "$SCRIPT_DIR/../lib/common.sh"

IMAGE_TAG="firefox-ubuntu:latest"
CONTAINER_NAME="firefox-gui"
PROFILE_DIR="/home/ubuntu/.mozilla/my_profile"

# 사전 검증
require_docker
require_x11
resolve_host_paths
allow_x_access

# 이미 실행 중이면 기존 인스턴스에 옵션 전달 (싱글 인스턴스)
if [ -n "$(docker ps -q -f "name=^${CONTAINER_NAME}$")" ]; then
    docker exec -d "$CONTAINER_NAME" firefox "$@"
    exit 0
fi

# 이미지 없으면 자동 빌드, 찌꺼기 컨테이너 정리
ensure_image "$IMAGE_TAG" "$SCRIPT_DIR"
remove_stale_container "$CONTAINER_NAME"

# 데이터 볼륨 (호스트 폴더 생성 + 마운트)
wire_data "$HOME/Downloads/firefox_docker" "/home/ubuntu/Downloads"
wire_data "$HOME/.mozilla_docker"           "/home/ubuntu/.mozilla"

# 프로필 잠금 파일 제거 (crash 후 재실행 시 잠금 에러 방지)
find "$HOME/.mozilla_docker" \( -name ".parentlock" -o -name "lock" \) -delete 2>/dev/null || true

# 리소스 배선 (조건부)
wire_display
wire_audio
wire_ime
wire_gpu
wire_locale

# 프로세스를 호스트가 추적하도록 exec 사용
exec docker run \
  --name "$CONTAINER_NAME" \
  --net=host \
  --ipc=host \
  --shm-size=2g \
  --security-opt seccomp=unconfined \
  --security-opt apparmor=unconfined \
  "${DOCKER_MOUNTS[@]}" \
  "${DOCKER_ENVS[@]}" \
  "${DOCKER_DEVICES[@]}" \
  --rm \
  "$IMAGE_TAG" firefox --profile "$PROFILE_DIR" "$@"