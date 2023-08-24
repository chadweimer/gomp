FROM alpine:3.16
ARG TARGETPLATFORM
LABEL org.opencontainers.image.source "https://github.com/chadweimer/gomp"
LABEL org.opencontainers.image.title "GOMP: Go Meal Planner"
LABEL org.opencontainers.image.description "Web-based recipe book."

RUN apk add --no-cache ca-certificates

EXPOSE 5000

WORKDIR /var/app/gomp
VOLUME /var/app/gomp/data

COPY build/$TARGETPLATFORM ./

ENTRYPOINT ["./gomp"]
