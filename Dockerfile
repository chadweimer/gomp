FROM alpine:3.12
LABEL maintainer="ch@dweimer.com"

RUN apk add --no-cache ca-certificates

EXPOSE 5000

WORKDIR /var/app/gomp
VOLUME /var/app/gomp/data
COPY build/linux/amd64/ ./

ENTRYPOINT ["./gomp"]
