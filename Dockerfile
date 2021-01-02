FROM debian:10-slim
LABEL maintainer="ch@dweimer.com"

WORKDIR /var/app/gomp
COPY build/linux/amd64/ ./
VOLUME /var/app/gomp/data

ENV PORT 5000
EXPOSE 5000

ENTRYPOINT ["./gomp"]
