FROM debian:10-slim
LABEL maintainer="ch@dweimer.com"

RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates

RUN update-ca-certificates

EXPOSE 5000

WORKDIR /var/app/gomp
VOLUME /var/app/gomp/data
COPY build/linux/amd64/ ./

ENTRYPOINT ["./gomp"]
