FROM node:12-alpine AS node
WORKDIR /app
COPY static/ .
RUN npm install && npm run build

FROM golang:1.15 AS go
WORKDIR /app
COPY . .
RUN CGO_ENABLED=1 go build -ldflags '-extldflags "-static -static-libgcc"'

FROM alpine:3.12
LABEL maintainer="ch@dweimer.com"

RUN apk add --no-cache ca-certificates

EXPOSE 5000

WORKDIR /var/app/gomp
VOLUME /var/app/gomp/data

COPY --from=node /app/build/default static
COPY --from=go /app/gomp .
COPY db/migrations db/migrations

ENTRYPOINT ["./gomp"]
