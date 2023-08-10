FROM alpine:3.18 as alpine
ARG TARGETPLATFORM
LABEL org.opencontainers.image.source "https://github.com/chadweimer/gomp"
LABEL org.opencontainers.image.title "GOMP: Go Meal Planner"
LABEL org.opencontainers.image.description "Web-based recipe book."

RUN apk add --no-cache ca-certificates

FROM scratch
ARG TARGETPLATFORM

EXPOSE 5000

WORKDIR /var/app/gomp
VOLUME /var/app/gomp/data

COPY build/$TARGETPLATFORM ./
COPY --from=alpine /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

ENTRYPOINT ["./gomp"]
