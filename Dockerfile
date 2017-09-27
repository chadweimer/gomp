FROM alpine:3.5
LABEL maintainer="ch@dweimer.com"

RUN apk add --no-cache ca-certificates \
  && mkdir /lib64 \
  && ln -s /lib/ld-musl-x86_64.so.1 /lib64/ld-linux-x86-64.so.2

WORKDIR /var/app/gomp
COPY build/linux/amd64/ ./
VOLUME /var/app/gomp/data

ENV PORT 5000
EXPOSE 5000

ENTRYPOINT ["./gomp"]
