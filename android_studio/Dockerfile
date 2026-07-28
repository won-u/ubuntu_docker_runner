# 1. 안정성 위해 Ubuntu 24.04 LTS 베이스 사용 (KVM/에뮬레이터 조합 검증됨)
FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive

# 2. 필수 패키지 설치: Android Studio 실행 의존 라이브러리 + 한글 로케일/폰트/IME + JDK
RUN apt-get update && apt-get install -y \
    wget \
    curl \
    ca-certificates \
    sudo \
    locales \
    language-pack-ko \
    fonts-nanum \
    fonts-noto-cjk \
    dbus-x11 \
    ibus \
    ibus-gtk3 \
    alsa-utils \
    pulseaudio \
    libasound2t64 \
    libgl1-mesa-dri \
    libgl1 \
    libglx-mesa0 \
    libglu1-mesa \
    libgtk-3-0 \
    libnss3 \
    libxss1 \
    libxtst6 \
    libxi6 \
    openjdk-21-jdk \
    git \
    unzip \
    zip \
    xz-utils \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# 3. 한국어 로케일(Locale) 설정
RUN locale-gen ko_KR.UTF-8
ENV LANG=ko_KR.UTF-8
ENV LANGUAGE=ko_KR:ko
ENV LC_ALL=ko_KR.UTF-8

# 4. Android Studio 공식 tar.gz 다운로드 (snap 미사용)
#    버전이 바뀌면 https://developer.android.com/studio/archive 에서
#    최신 버전 디렉토리명(ANDROID_STUDIO_VERSION)과 실제 tar.gz 파일명
#    (ANDROID_STUDIO_FILENAME — 버전 문자열이 아닌 코드네임 기반일 수 있음, 예: quail2)을 확인해 갱신하세요.
ARG ANDROID_STUDIO_VERSION=2026.1.2.10
ARG ANDROID_STUDIO_FILENAME=android-studio-quail2-linux.tar.gz
ARG ANDROID_STUDIO_URL=https://redirector.gvt1.com/edgedl/android/studio/ide-zips/${ANDROID_STUDIO_VERSION}/${ANDROID_STUDIO_FILENAME}

RUN wget -q \
    --user-agent="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" \
    --tries=5 --waitretry=10 --retry-connrefused \
    "$ANDROID_STUDIO_URL" -O /tmp/android-studio.tar.gz \
    && tar -xzf /tmp/android-studio.tar.gz -C /opt \
    && rm /tmp/android-studio.tar.gz

# 5. 마운트될 폴더를 미리 생성하여 root 권한 꼬임 차단
ARG USERNAME=ubuntu
RUN echo "$USERNAME ALL=(root) NOPASSWD:ALL" > /etc/sudoers.d/$USERNAME \
    && chmod 0440 /etc/sudoers.d/$USERNAME \
    && mkdir -p /home/$USERNAME/.config/ibus \
                /home/$USERNAME/AndroidStudioProjects \
                /home/$USERNAME/Android/Sdk \
                /home/$USERNAME/.android \
                /home/$USERNAME/.gradle \
    && chown -R $USERNAME:$USERNAME /home/$USERNAME /opt/android-studio

# 6. 실행 환경 설정
USER $USERNAME
ENV HOME=/home/$USERNAME
ENV ANDROID_HOME=/home/$USERNAME/Android/Sdk
ENV PATH="${PATH}:/opt/android-studio/bin:${ANDROID_HOME}/platform-tools:${ANDROID_HOME}/cmdline-tools/latest/bin"

# 7. Android Studio 실행 명령어 정의
CMD ["studio.sh"]
