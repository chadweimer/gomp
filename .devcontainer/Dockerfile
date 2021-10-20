ARG GO_VERSION=1.16
FROM mcr.microsoft.com/vscode/devcontainers/go:$GO_VERSION

# Install Node.js
ARG NODE_VERSION=14
RUN su vscode -c "umask 0002 && . /usr/local/share/nvm/nvm.sh && nvm install $NODE_VERSION 2>&1"

ARG DEVCONTAINER_VERSION="0.184.0"
RUN apt-get update \
    && export DEBIAN_FRONTEND=noninteractive \
    && apt-get install -y --no-install-recommends \
    zip \
    binfmt-support \
    qemu-user-static \
    gcc-arm-linux-gnueabihf \
    libc6-dev-armhf-cross \
    gcc-aarch64-linux-gnu \
    libc6-dev-arm64-cross \
    gcc-mingw-w64-x86-64 \
    # Puppeteer dependencies
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxshmfence1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    wget \
    xdg-utils \
    && bash -c "$(curl -fsSL "https://raw.githubusercontent.com/microsoft/vscode-dev-containers/v${DEVCONTAINER_VERSION}/script-library/docker-debian.sh")" \
    && rm -rf /var/lib/apt/lists/*

ENTRYPOINT ["/usr/local/share/docker-init.sh"]
CMD ["sleep", "infinity"]
