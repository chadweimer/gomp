FROM balenalib/amd64-ubuntu:focal
LABEL maintainer="ch@dweimer.com"

EXPOSE 5000

WORKDIR /var/app/gomp
VOLUME /var/app/gomp/data
COPY build/linux/amd64/ ./

ENTRYPOINT ["./gomp"]
