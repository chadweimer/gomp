ARG ARCH=amd64
FROM balenalib/$ARCH-alpine:3.12
LABEL maintainer="ch@dweimer.com"

EXPOSE 5000

WORKDIR /var/app/gomp
VOLUME /var/app/gomp/data

ARG BUILD_DIR=build/linux/amd64/
COPY $BUILD_DIR ./

ENTRYPOINT ["./gomp"]
