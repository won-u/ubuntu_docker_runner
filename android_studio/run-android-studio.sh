#!/usr/bin/env bash
#
# run-android-studio.sh — 컨테이너화된 Android Studio 실행 (없으면 이미지 자동 빌드)
#
#   ./run-android-studio.sh
#   ANDROID_STUDIO_SRC_DIR=~/dev/android ./run-android-studio.sh    # 소스 워크스페이스 경로 변경
#   ANDROID_STUDIO_DATA_DIR=~/android_data ./run-android-studio.sh  # SDK/AVD/설정 경로 변경
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../lib/common.sh
source "$SCRIPT_DIR/../lib/common.sh"

IMAGE_TAG="android-studio-ubuntu:latest"
CONTAINER_NAME="android-studio-gui"

# 소스 워크스페이스: Android 프로젝트 소스코드가 저장될 호스트 경로 (기본값 재정의 가능)
# SRC_DIR="${ANDROID_STUDIO_SRC_DIR:-$HOME/AndroidStudioProjects}"
SRC_DIR="${ANDROID_STUDIO_SRC_DIR:-/obigo/projects/android}"
# 데이터 영속화: SDK/AVD/Gradle 캐시/IDE 설정 등 컨테이너 홈 전체를 보관
# DATA_DIR="${ANDROID_STUDIO_DATA_DIR:-$HOME/.android_studio_docker}"
DATA_DIR="${ANDROID_STUDIO_DATA_DIR:-/obigo/android_data}"

# 사전 검증
require_docker
require_x11
resolve_host_paths
allow_x_access

# 이미지 없으면 자동 빌드, 찌꺼기 컨테이너 정리
ensure_image "$IMAGE_TAG" "$SCRIPT_DIR"
remove_stale_container "$CONTAINER_NAME"

# 데이터 볼륨: 컨테이너 홈 전체(SDK/AVD/Gradle 캐시/IDE 설정)를 영속화하고,
# 그 안의 프로젝트 워크스페이스만 별도 호스트 경로로 덮어 마운트한다.
wire_data "$DATA_DIR" "/home/ubuntu"
wire_data "$SRC_DIR"  "/home/ubuntu/AndroidStudioProjects"

# 리소스 배선 (조건부)
wire_display
wire_audio
wire_ime
wire_gpu
wire_kvm
wire_locale

log_info "소스 워크스페이스: $SRC_DIR"
log_info "SDK/AVD/설정 데이터: $DATA_DIR"

# Docker가 -v /run/user/1000/bus, .../pulse/native 같은 하위 경로를 바인드 마운트할 때
# 아직 없는 상위 디렉토리(/run/user/1000)를 root 소유로 자동 생성해버려, 정작 studio.sh를
# 실행하는 ubuntu(UID 1000)가 그 밑에 새 디렉토리(에뮬레이터의 avd/running/.../jwks/... 등)를
# 만들지 못해 "Failed to create jwk directory" 로 에뮬레이터가 죽는 문제가 있다. 컨테이너를
# root로 띄운 뒤 최상위 디렉토리 소유권만(하위 바인드 마운트는 건드리지 않고) 고치고 나서
# ubuntu로 전환해 studio.sh를 실행한다.
STUDIO_ENTRYPOINT='
set -e
mkdir -p /run/user/1000
chown ubuntu:ubuntu /run/user/1000
chmod 700 /run/user/1000

# --group-add로 root 프로세스에 붙인 KVM GID는 runuser가 ubuntu 전환 시 /etc/group 기준으로
# initgroups()를 다시 실행하면서 사라진다(ubuntu가 실제로 그 그룹의 멤버가 아니므로). 따라서
# runuser 전에 KVM GID에 대응하는 그룹을 /etc/group에 만들고 ubuntu를 실제로 가입시켜야 한다.
if [ -e /dev/kvm ]; then
  KVM_GID="$(stat -c "%g" /dev/kvm)"
  KVM_GROUP="$(getent group "$KVM_GID" | cut -d: -f1)"
  if [ -z "$KVM_GROUP" ]; then
    KVM_GROUP=kvm_host
    groupadd -g "$KVM_GID" "$KVM_GROUP"
  fi
  usermod -aG "$KVM_GROUP" ubuntu
fi

exec runuser -u ubuntu -- studio.sh
'

# 프로세스를 호스트가 추적하도록 exec 사용
exec docker run \
  --name "$CONTAINER_NAME" \
  --net=host \
  --ipc=host \
  --shm-size=2g \
  --security-opt seccomp=unconfined \
  --security-opt apparmor=unconfined \
  --user root \
  --entrypoint bash \
  "${DOCKER_MOUNTS[@]}" \
  "${DOCKER_ENVS[@]}" \
  "${DOCKER_DEVICES[@]}" \
  --rm \
  "$IMAGE_TAG" \
  -c "$STUDIO_ENTRYPOINT"
