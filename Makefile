BUILD_DIR=./build
BUILD_LIN_AMD64_DIR=$(BUILD_DIR)/linux/amd64
BUILD_LIN_ARM_DIR=$(BUILD_DIR)/linux/arm
BUILD_LIN_ARM64_DIR=$(BUILD_DIR)/linux/arm64
BUILD_WIN_AMD64_DIR=$(BUILD_DIR)/windows/amd64
DB_MIGRATIONS_REL_DIR=db/migrations

GO_LIN_LD_FLAGS=-ldflags '-extldflags "-static -static-libgcc"'
GO_ENV_LIN_AMD64=GOOS=linux GOARCH=amd64 CGO_ENABLED=1
GO_ENV_LIN_ARM=GOOS=linux GOARCH=arm CGO_ENABLED=1 CC=arm-linux-gnueabihf-gcc
GO_ENV_LIN_ARM64=GOOS=linux GOARCH=arm64 CGO_ENABLED=1 CC=aarch64-linux-gnu-gcc
GO_ENV_WIN_AMD64=GOOS=windows GOARCH=amd64 CGO_ENABLED=1 CC=x86_64-w64-mingw32-gcc

.DEFAULT_GOAL := rebuild

.PHONY: rebuild
rebuild: clean build

.PHONY: reinstall
reinstall: uninstall install

.PHONY: install
install:
	go install
	cd static && npm install --silent

.PHONY: uninstall
uninstall:
	cd static && npm run clear

.PHONY: lint
lint:
	go vet ./...
	cd static && npm run lint

.PHONY: build
build: build-linux-amd64 build-linux-arm build-linux-arm64 build-windows-amd64

.PHONY: clean
clean: clean-linux-amd64 clean-linux-arm clean-linux-arm64 clean-windows-amd64
	cd static && npm run clean

.PHONY: prebuild
prebuild:
	cd static && npm run build

.PHONY: clean-linux-amd64
clean-linux-amd64:
	$(GO_ENV_LIN_AMD64) go clean -i ./...
	rm -rf $(BUILD_LIN_AMD64_DIR)

.PHONY: build-linux-amd64
build-linux-amd64: prebuild
	$(GO_ENV_LIN_AMD64) go build -o $(BUILD_LIN_AMD64_DIR)/gomp $(GO_LIN_LD_FLAGS)
	mkdir -p $(BUILD_LIN_AMD64_DIR)/$(DB_MIGRATIONS_REL_DIR) && cp -R $(DB_MIGRATIONS_REL_DIR)/* $(BUILD_LIN_AMD64_DIR)/$(DB_MIGRATIONS_REL_DIR)
	mkdir -p $(BUILD_LIN_AMD64_DIR)/static && cp -R static/build/default/* $(BUILD_LIN_AMD64_DIR)/static

.PHONY: rebuild-linux-amd64
rebuild-linux-amd64: clean-linux-amd64 build-linux-amd64

.PHONY: clean-linux-arm
clean-linux-arm:
	$(GO_ENV_LIN_ARM) go clean -i ./...
	rm -rf $(BUILD_LIN_ARM_DIR)

.PHONY: build-linux-arm
build-linux-arm: prebuild
	$(GO_ENV_LIN_ARM) go build -o $(BUILD_LIN_ARM_DIR)/gomp $(GO_LIN_LD_FLAGS)
	mkdir -p $(BUILD_LIN_ARM_DIR)/$(DB_MIGRATIONS_REL_DIR) && cp -R $(DB_MIGRATIONS_REL_DIR)/* $(BUILD_LIN_ARM_DIR)/$(DB_MIGRATIONS_REL_DIR)
	mkdir -p $(BUILD_LIN_ARM_DIR)/static && cp -R static/build/default/* $(BUILD_LIN_ARM_DIR)/static

.PHONY: rebuild-linux-arm
rebuild-linux-arm: clean-linux-arm build-linux-arm

.PHONY: clean-linux-arm64
clean-linux-arm64:
	$(GO_ENV_LIN_ARM64) go clean -i ./...
	rm -rf $(BUILD_LIN_ARM64_DIR)

.PHONY: build-linux-arm64
build-linux-arm64: prebuild
	$(GO_ENV_LIN_ARM64) go build -o $(BUILD_LIN_ARM64_DIR)/gomp $(GO_LIN_LD_FLAGS)
	mkdir -p $(BUILD_LIN_ARM64_DIR)/$(DB_MIGRATIONS_REL_DIR) && cp -R $(DB_MIGRATIONS_REL_DIR)/* $(BUILD_LIN_ARM64_DIR)/$(DB_MIGRATIONS_REL_DIR)
	mkdir -p $(BUILD_LIN_ARM64_DIR)/static && cp -R static/build/default/* $(BUILD_LIN_ARM64_DIR)/static

.PHONY: rebuild-linux-arm64
rebuild-linux-arm64: clean-linux-arm64 build-linux-arm64

.PHONY: clean-windows-amd64
clean-windows-amd64:
	$(GO_ENV_WIN_AMD64) go clean -i ./...
	rm -rf $(BUILD_WIN_AMD64_DIR)

.PHONY: build-windows-amd64
build-windows-amd64: prebuild
	$(GO_ENV_WIN_AMD64) go build -o $(BUILD_WIN_AMD64_DIR)/gomp.exe
	mkdir -p $(BUILD_WIN_AMD64_DIR)/$(DB_MIGRATIONS_REL_DIR) && cp -R $(DB_MIGRATIONS_REL_DIR)/* $(BUILD_WIN_AMD64_DIR)/$(DB_MIGRATIONS_REL_DIR)
	mkdir -p $(BUILD_WIN_AMD64_DIR)/static && cp -R static/build/default/* $(BUILD_WIN_AMD64_DIR)/static

.PHONY: rebuild-windows-amd64
rebuild-windows-amd64: clean-windows-amd64 build-windows-amd64

.PHONY: docker-linux-amd64
docker-linux-amd64: build-linux-amd64
	docker build -t cwmr/gomp:amd64 .

.PHONY: docker-linux-arm
docker-linux-arm: build-linux-arm
	docker build -t cwmr/gomp:arm --build-arg ARCH=armv7hf --build-arg BUILD_DIR=$(BUILD_LIN_ARM_DIR) .

.PHONY: docker-linux-arm64
docker-linux-arm64: build-linux-arm64
	docker build -t cwmr/gomp:arm64 --build-arg ARCH=aarch64 --build-arg BUILD_DIR=$(BUILD_LIN_ARM64_DIR) .

.PHONY: docker
docker: docker-linux-amd64 docker-linux-arm docker-linux-arm64

.PHONY: docker-publish
ifndef DOCKER_TAG
docker-publish:
	docker push cwmr/gomp:amd64
	docker push cwmr/gomp:arm
	docker push cwmr/gomp:arm64
	docker run --rm mplatform/manifest-tool --username ${DOCKERHUB_USERNAME} --password ${DOCKERHUB_TOKEN} push from-args --platforms linux/amd64,linux/arm,linux/arm64 --template cwmr/gomp:ARCH --target cwmr/gomp:latest
else
docker-publish:
	docker tag cwmr/gomp:amd64 cwmr/gomp:$(DOCKER_TAG)-amd64
	docker tag cwmr/gomp:arm cwmr/gomp:$(DOCKER_TAG)-arm
	docker tag cwmr/gomp:arm64 cwmr/gomp:$(DOCKER_TAG)-arm64
	docker push cwmr/gomp:$(DOCKER_TAG)-amd64
	docker push cwmr/gomp:$(DOCKER_TAG)-arm
	docker push cwmr/gomp:$(DOCKER_TAG)-arm64
	docker run --rm mplatform/manifest-tool --username ${DOCKERHUB_USERNAME} --password ${DOCKERHUB_TOKEN} push from-args --platforms linux/amd64,linux/arm,linux/arm64 --template cwmr/gomp:$(DOCKER_TAG)-ARCH --target cwmr/gomp:$(DOCKER_TAG)
endif

.PHONY: archive
archive:
	rm -f $(BUILD_DIR)/gomp-linux-amd64.tar.gz
	tar -C $(BUILD_LIN_AMD64_DIR) -zcf $(BUILD_DIR)/gomp-linux-amd64.tar.gz .
	rm -f $(BUILD_DIR)/gomp-linux-arm.tar.gz
	tar -C $(BUILD_LIN_ARM_DIR) -zcf $(BUILD_DIR)/gomp-linux-arm.tar.gz .
	rm -f $(BUILD_DIR)/gomp-linux-arm64.tar.gz
	tar -C $(BUILD_LIN_ARM64_DIR) -zcf $(BUILD_DIR)/gomp-linux-arm64.tar.gz .
	rm -f $(BUILD_DIR)/gomp-windows-amd64.zip
	cd $(BUILD_WIN_AMD64_DIR) && zip -rq ../../gomp-windows-amd64.zip *
