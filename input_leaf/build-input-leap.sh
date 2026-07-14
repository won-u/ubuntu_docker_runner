#!/usr/bin/env bash
#
# build-input-leap.sh — Input Leap을 컨테이너에서 빌드해 바이너리만 호스트로 추출
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IMAGE_TAG="input-leap-builder"
DOCKERFILE="$SCRIPT_DIR/Dockerfile.builder"

# docker 사용 가능 여부 확인
command -v docker >/dev/null 2>&1 || { echo "[ERROR] docker 명령을 찾을 수 없습니다." >&2; exit 1; }
docker info >/dev/null 2>&1 || { echo "[ERROR] docker 데몬에 접근할 수 없습니다." >&2; exit 1; }

# 완성된 파일을 받을 호스트 폴더 생성
OUTPUT_DIR="$HOME/Desktop/InputLeap_Build"
mkdir -p "$OUTPUT_DIR"

echo "==== [1/3] 빌드 전용 도커 이미지 생성 중... ===="
docker build -t "$IMAGE_TAG" -f "$DOCKERFILE" "$SCRIPT_DIR"

echo "==== [2/3] 도커 내부에서 소스코드 다운로드 및 컴파일 시작... (시간이 조금 걸립니다) ===="
docker run --rm -v "$OUTPUT_DIR:/home/ubuntu/workspace/output" "$IMAGE_TAG" bash -euc "
    echo '>> Git 저장소 복제 중 (서브모듈 포함)...' && \
    git clone --recursive https://github.com/input-leap/input-leap.git source_code && \
    cd source_code && \
    mkdir build && cd build && \
    echo '>> Cmake 설정 중 (테스트 빌드 생략)...' && \
    cmake -DINPUTLEAP_BUILD_TESTS=OFF .. && \
    echo '>> 본격적인 컴파일 시작...' && \
    make -j\$(nproc) && \
    echo '>> 컴파일 완료! 호스트 폴더로 바이너리 복사 중...' && \
    cp -r bin/* /home/ubuntu/workspace/output/
"

echo "==== [3/3] 모든 작업이 완료되었습니다! ===="
echo "호스트 PC의 바탕화면(Desktop/InputLeap_Build)을 확인해 보세요."
