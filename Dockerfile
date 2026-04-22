FROM alpine:3 AS alpine
ARG TARGETOS
ARG TARGETARCH
ARG ARCHIVE_SUFFIX
LABEL org.opencontainers.image.source="https://github.com/chadweimer/gomp"
LABEL org.opencontainers.image.title="GOMP: Go Meal Planner"
LABEL org.opencontainers.image.description="Web-based recipe book."

RUN apk add --no-cache ca-certificates

EXPOSE 5000

WORKDIR /var/app/gomp
VOLUME /var/app/gomp/data

ADD build/gomp-$TARGETOS-$TARGETARCH$ARCHIVE_SUFFIX.tar.gz ./

ENTRYPOINT ["./gomp"]
