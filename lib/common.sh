# shellcheck shell=bash
#
# common.sh — GUI 컨테이너 실행 스크립트 공통 헬퍼
#
# 사용법: 각 run-*.sh 상단에서 source 한다.
#   SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
#   source "$SCRIPT_DIR/../lib/common.sh"
#
# 이 라이브러리는 X11/오디오/IME/D-Bus 등 호스트 리소스를 컨테이너에
# 전달하기 위한 사전 검증·배선 로직을 한곳에 모아 중복을 제거한다.
# 저장소 관례: 이미지 태그 <앱>-ubuntu:latest, 컨테이너 <앱>-gui,
# 데이터 폴더 ~/.<앱>_docker, 컨테이너 내부 사용자 ubuntu(UID 1000).

# --- 전역 상태 ---------------------------------------------------------------
# DOCKER_MOUNTS / DOCKER_ENVS / DOCKER_DEVICES 배열에 조건부로 옵션을 쌓은 뒤
# docker run 에 "${DOCKER_MOUNTS[@]}" 형태로 전개한다.
DOCKER_MOUNTS=()
DOCKER_ENVS=()
DOCKER_DEVICES=()

# 컨테이너 내부 사용자 UID (볼륨 소유권 매칭 기준)
CONTAINER_UID=1000

# --- 로그 유틸 ---------------------------------------------------------------
log_info()  { printf '\033[0;34m[INFO]\033[0m %s\n'  "$*"; }
log_warn()  { printf '\033[0;33m[WARN]\033[0m %s\n'  "$*" >&2; }
log_error() { printf '\033[0;31m[ERROR]\033[0m %s\n' "$*" >&2; }
die()       { log_error "$*"; exit 1; }

# --- 사전 요구사항 검증 ------------------------------------------------------

# docker 명령 존재 및 데몬 접근 가능 여부 확인
require_docker() {
    command -v docker >/dev/null 2>&1 || die "docker 명령을 찾을 수 없습니다. Docker Engine을 설치하세요."
    docker info >/dev/null 2>&1 || die "docker 데몬에 접근할 수 없습니다. 데몬 실행 여부 및 docker 그룹 권한을 확인하세요."
}

# GUI 실행에 필수인 X11 환경 확인
require_x11() {
    [ -n "${DISPLAY:-}" ] || die "DISPLAY 환경변수가 없습니다. X11 세션에서 실행하세요."
    [ -S /tmp/.X11-unix/X"${DISPLAY##*:}" ] || [ -d /tmp/.X11-unix ] \
        || log_warn "X11 소켓(/tmp/.X11-unix)을 찾지 못했습니다. 화면 출력이 안 될 수 있습니다."
    if [ "$(id -u)" -ne "$CONTAINER_UID" ]; then
        log_warn "호스트 UID가 $(id -u) 입니다. 컨테이너는 UID $CONTAINER_UID(ubuntu)를 가정하므로 볼륨 파일 소유권이 어긋날 수 있습니다."
    fi
}

# --- 호스트 리소스 경로 계산 -------------------------------------------------
# 계산 결과를 전역 변수로 노출: USER_UID, HOST_DBUS_PATH, IBUS_SOCKET_PATH, XAUTH
resolve_host_paths() {
    USER_UID="$(id -u)"
    HOST_DBUS_PATH="/run/user/${USER_UID}/bus"
    IBUS_SOCKET_PATH="$HOME/.config/ibus/bus"
    XAUTH="${XAUTHORITY:-$HOME/.Xauthority}"
}

# 컨테이너의 X 서버 접근 허용 (신뢰된 로컬 환경 전용)
allow_x_access() {
    command -v xhost >/dev/null 2>&1 || { log_warn "xhost 미설치 — X 접근 허용을 건너뜁니다."; return; }
    xhost +local:docker >/dev/null 2>&1 || log_warn "xhost +local:docker 실패."
}

# --- 배선 헬퍼 (조건부 마운트) ----------------------------------------------

# X11 화면 + 인증을 마운트/환경변수에 추가
wire_display() {
    DOCKER_MOUNTS+=( -v /tmp/.X11-unix:/tmp/.X11-unix:rw )
    DOCKER_ENVS+=( -e "DISPLAY=$DISPLAY" )
    if [ -f "$XAUTH" ]; then
        DOCKER_MOUNTS+=( -v "$XAUTH:$XAUTH:ro" )
        DOCKER_ENVS+=( -e "XAUTHORITY=$XAUTH" )
    else
        log_warn "Xauthority($XAUTH) 파일이 없어 마운트를 건너뜁니다."
    fi
}

# PulseAudio 소켓 + 사운드 디바이스 (존재할 때만)
wire_audio() {
    local sock="${XDG_RUNTIME_DIR:-}/pulse/native"
    if [ -n "${XDG_RUNTIME_DIR:-}" ] && [ -S "$sock" ]; then
        DOCKER_MOUNTS+=( -v "$sock:$sock" )
        DOCKER_ENVS+=( -e "PULSE_SERVER=unix:$sock" )
    else
        log_warn "PulseAudio 소켓을 찾지 못해 오디오 소켓 마운트를 건너뜁니다."
    fi
    if [ -e /dev/snd ]; then
        DOCKER_DEVICES+=( --device /dev/snd )
    fi
}

# 한글 IME(ibus) 소켓 + D-Bus + IM 모듈 환경변수 (존재할 때만)
wire_ime() {
    if [ -S "$HOST_DBUS_PATH" ]; then
        DOCKER_MOUNTS+=( -v "$HOST_DBUS_PATH:$HOST_DBUS_PATH" )
        DOCKER_ENVS+=( -e "DBUS_SESSION_BUS_ADDRESS=unix:path=$HOST_DBUS_PATH" )
    else
        log_warn "D-Bus 세션 소켓($HOST_DBUS_PATH)이 없어 마운트를 건너뜁니다."
    fi
    if [ -S "$IBUS_SOCKET_PATH" ]; then
        DOCKER_MOUNTS+=( -v "$IBUS_SOCKET_PATH:/home/ubuntu/.config/ibus/bus:ro" )
    else
        log_warn "ibus 소켓($IBUS_SOCKET_PATH)이 없어 한글 입력이 안 될 수 있습니다."
    fi
    DOCKER_ENVS+=( -e "GTK_IM_MODULE=xim" -e "QT_IM_MODULE=xim" -e "XMODIFIERS=@im=ibus" )
}

# GPU(DRI) 가속 (존재할 때만)
wire_gpu() {
    if [ -e /dev/dri ]; then
        DOCKER_DEVICES+=( --device /dev/dri )
    fi
}

# KVM 하드웨어 가속 (Android 에뮬레이터 등, 존재할 때만)
# 호스트 /dev/kvm의 그룹 GID를 컨테이너 프로세스의 supplementary group으로 추가해
# 이미지 안에 별도 kvm 그룹을 만들지 않고도 접근 권한을 맞춘다.
wire_kvm() {
    if [ -e /dev/kvm ]; then
        DOCKER_DEVICES+=( --device /dev/kvm --group-add "$(stat -c '%g' /dev/kvm)" )
    else
        log_warn "/dev/kvm 이 없어 하드웨어 가속 에뮬레이션을 사용할 수 없습니다(에뮬레이터가 느려지거나 실행되지 않을 수 있음)."
    fi
}

# 한글 로캘 환경변수
wire_locale() {
    DOCKER_ENVS+=( -e "LANG=ko_KR.UTF-8" -e "LANGUAGE=ko_KR:ko" -e "LC_ALL=ko_KR.UTF-8" )
}

# 데이터 볼륨: 호스트 폴더를 생성하고 마운트 목록에 추가
# 사용법: wire_data <호스트경로> <컨테이너경로>
wire_data() {
    local host_path="$1" container_path="$2"
    mkdir -p "$host_path"
    DOCKER_MOUNTS+=( -v "$host_path:$container_path" )
}

# --- 이미지 관리 -------------------------------------------------------------
# 이미지가 없으면 자동 빌드
# 사용법: ensure_image <태그> <빌드컨텍스트디렉토리> [Dockerfile경로]
ensure_image() {
    local tag="$1" context="$2" dockerfile="${3:-}"
    if docker image inspect "$tag" >/dev/null 2>&1; then
        return 0
    fi
    log_info "이미지 '$tag' 가 없어 새로 빌드합니다..."
    if [ -n "$dockerfile" ]; then
        docker build -t "$tag" -f "$dockerfile" "$context" || die "이미지 빌드 실패: $tag"
    else
        docker build -t "$tag" "$context" || die "이미지 빌드 실패: $tag"
    fi
}

# 동일 이름의 컨테이너 찌꺼기 제거
remove_stale_container() {
    docker rm -f "$1" >/dev/null 2>&1 || true
}
