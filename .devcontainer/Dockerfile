FROM ubuntu:21.04

RUN apt-get update \
    && export DEBIAN_FRONTEND=noninteractive \
    && apt-get install -y --no-install-recommends \
        openssh-client \
        git \
        make \
        nodejs \
        npm \
        golang-go \
        zip \
        gcc \
        libc6-dev \
        gcc-arm-linux-gnueabihf \
        libc6-dev-armhf-cross \
        gcc-aarch64-linux-gnu \
        libc6-dev-arm64-cross \
        gcc-mingw-w64-x86-64 \
    && rm -rf /var/lib/apt/lists/*

RUN useradd -ms /bin/bash devuser
