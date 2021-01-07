ARG ARCH=amd64
FROM balenalib/$ARCH-ubuntu:focal
ARG BUILD_DIR=build/linux/amd64/
LABEL maintainer="ch@dweimer.com"

EXPOSE 5000

WORKDIR /var/app/gomp
VOLUME /var/app/gomp/data
COPY $BUILD_DIR ./

ENTRYPOINT ["./gomp"]
