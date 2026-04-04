FROM debian:bookworm

RUN apt-get update \
    && export DEBIAN_FRONTEND=noninteractive \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        lsb-release \
        # openapi-generator dependencies
        openjdk-17-jdk-headless \
    && rm -rf /var/lib/apt/lists/*
