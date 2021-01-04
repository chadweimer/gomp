FROM scratch
ARG ARCH=amd64
LABEL maintainer="ch@dweimer.com"

EXPOSE 5000

WORKDIR /var/app/gomp
VOLUME /var/app/gomp/data
COPY build/linux/${ARCH}/ ./

ENTRYPOINT ["./gomp"]
