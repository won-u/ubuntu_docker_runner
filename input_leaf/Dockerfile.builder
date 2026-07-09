# 1. 호스트와 동일한 Ubuntu 26.04 사용
FROM ubuntu:26.04

ENV DEBIAN_FRONTEND=noninteractive

# 2. Input Leap 컴파일에 필요한 필수 도구 및 라이브러리 설치
RUN apt-get update && apt-get install -y \
    git cmake make g++ \
    qt6-base-dev qt6-tools-dev qt6-tools-dev-tools \
    libavahi-compat-libdnssd-dev libcurl4-openssl-dev libssl-dev \
    libx11-dev libxtst-dev libei-dev libportal-dev libportal-gtk3-dev \
    sudo && apt-get clean

# 3. 우분투 26.04에 이미 존재하는 'ubuntu'(UID 1000) 계정 활용
ARG USERNAME=ubuntu
RUN echo "$USERNAME ALL=(root) NOPASSWD:ALL" > /etc/sudoers.d/$USERNAME \
    && chmod 0440 /etc/sudoers.d/$USERNAME \
    && mkdir -p /home/$USERNAME/workspace \
    && chown -R $USERNAME:$USERNAME /home/$USERNAME/workspace

# 4. 작업 환경 설정
USER $USERNAME
WORKDIR /home/$USERNAME/workspace
