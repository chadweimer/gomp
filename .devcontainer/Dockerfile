FROM mcr.microsoft.com/vscode/devcontainers/typescript-node:14

ARG DEVCONTAINER_VERSION="0.184.0"
RUN apt-get update \
    && export DEBIAN_FRONTEND=noninteractive \
    && apt-get install -y --no-install-recommends \
        openssh-client \
        zip \
        binfmt-support \
        qemu-user-static \
        gcc-arm-linux-gnueabihf \
        libc6-dev-armhf-cross \
        gcc-aarch64-linux-gnu \
        libc6-dev-arm64-cross \
        gcc-mingw-w64-x86-64 \
    && bash -c "$(curl -fsSL "https://raw.githubusercontent.com/microsoft/vscode-dev-containers/v${DEVCONTAINER_VERSION}/script-library/go-debian.sh")" go-debian.sh 1.16.5 \
    && bash -c "$(curl -fsSL "https://raw.githubusercontent.com/microsoft/vscode-dev-containers/v${DEVCONTAINER_VERSION}/script-library/docker-debian.sh")" \
    && rm -rf /var/lib/apt/lists/*

ENTRYPOINT ["/usr/local/share/docker-init.sh"]
CMD ["sleep", "infinity"]
