ARG ARCH=amd64

FROM scratch
LABEL maintainer="ch@dweimer.com"

WORKDIR /var/app/gomp
COPY build/linux/$ARCH/ ./
VOLUME /var/app/gomp/data

ENV PORT 5000
EXPOSE 5000

ENTRYPOINT ["./gomp"]
