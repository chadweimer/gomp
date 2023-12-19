FROM alpine:3.19 AS alpine
ARG TARGETPLATFORM

RUN apk add --no-cache ca-certificates

FROM scratch
ARG TARGETPLATFORM
LABEL org.opencontainers.image.source "https://github.com/chadweimer/gomp"
LABEL org.opencontainers.image.title "GOMP: Go Meal Planner"
LABEL org.opencontainers.image.description "Web-based recipe book."

EXPOSE 5000

WORKDIR /var/app/gomp
VOLUME /var/app/gomp/data

COPY --from=alpine /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY build/$TARGETPLATFORM ./

ENTRYPOINT ["./gomp"]
