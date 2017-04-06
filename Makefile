.PHONY: all
all: deps build

.PHONY: deps
deps:
    glide install
    npm install

.PHONY: build
build:
    GOOS=linux GOARCH=amd64 go build -o build/gomp-linux-amd64
    GOOS=linux GOARCH=arm go build -o build/gomp-linux-arm

.PHONY: docker
docker:
    docker run --rm --privileged multiarch/qemu-user-static:register --reset
    docker build -t cwmr/gomp:latest .
    docker build -t cwmr/gomp:armhf -f Dockerfile.armhf .