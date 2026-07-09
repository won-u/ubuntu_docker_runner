# 1. Base 이미지로 Ubuntu 26.04 사용
FROM ubuntu:26.04

# 2. 패키지 설치 시 인터랙티브 팝업 방지
ENV DEBIAN_FRONTEND=noninteractive

# 3. 🌟 추가: 한국어 언어팩(language-pack-ko) 및 입력기 통신 모듈(ibus-gtk3) 설치
RUN apt-get update && apt-get install -y \
    wget \
    gpg \
    alsa-utils \
    pulseaudio \
    libgl1-mesa-dri \
    libgl1 \
    libglx-mesa0 \
    sudo \
    locales \
    language-pack-ko \
    fonts-nanum \
    fonts-noto-cjk \
    dbus-x11 \
    ibus \
    ibus-gtk3 \
    && apt-get clean

# 4. 한국어 로캘(Locale) 설정
RUN locale-gen ko_KR.UTF-8
ENV LANG=ko_KR.UTF-8
ENV LANGUAGE=ko_KR:ko
ENV LC_ALL=ko_KR.UTF-8

# 5. Mozilla 공식 APT 저장소 추가
RUN install -d -m 0755 /etc/apt/keyrings \
    && wget -q https://packages.mozilla.org/apt/repo-signing-key.gpg -O- | tee /etc/apt/keyrings/packages.mozilla.org.asc > /dev/null \
    && echo "deb [signed-by=/etc/apt/keyrings/packages.mozilla.org.asc] https://packages.mozilla.org/apt mozilla main" | tee -a /etc/apt/sources.list.d/mozilla.list > /dev/null

# 6. Snap 패키지 대신 Mozilla 저장소를 최우선으로 쓰도록 설정
RUN echo 'Package: *\nPin: origin packages.mozilla.org\nPin-Priority: 1000' | tee /etc/apt/preferences.d/mozilla

# 7. 진짜 Firefox 및 한글 언어팩 설치
RUN apt-get update && apt-get install -y firefox firefox-l10n-ko \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# 8. 마운트될 폴더를 미리 생성하여 Root 권한 꼬임 완벽 차단
ARG USERNAME=ubuntu
RUN echo "$USERNAME ALL=(root) NOPASSWD:ALL" > /etc/sudoers.d/$USERNAME \
    && chmod 0440 /etc/sudoers.d/$USERNAME \
    && mkdir -p /home/$USERNAME/.config/ibus /home/$USERNAME/Downloads /home/$USERNAME/.mozilla \
    && chown -R $USERNAME:$USERNAME /home/$USERNAME

# 9. 실행 환경 설정
USER $USERNAME
ENV HOME=/home/$USERNAME

# 10. Firefox 실행 명령어 정의
CMD ["firefox", "--new-instance"]
