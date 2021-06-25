NPROCS = $(shell grep -c 'processor' /proc/cpuinfo)
MAKEFLAGS += -j$(NPROCS)
BUILD_DIR=build
BUILD_LIN_AMD64_DIR=$(BUILD_DIR)/linux/amd64
BUILD_LIN_ARM_DIR=$(BUILD_DIR)/linux/arm/v7
BUILD_LIN_ARM64_DIR=$(BUILD_DIR)/linux/arm64
BUILD_WIN_AMD64_DIR=$(BUILD_DIR)/windows/amd64
DB_MIGRATIONS_REL_DIR=db/migrations
CLIENT_BUILD_DIR=static/build/default

GO_LIN_LD_FLAGS=-ldflags '-extldflags "-static -static-libgcc"'
GO_ENV_LIN_AMD64=GOOS=linux GOARCH=amd64 CGO_ENABLED=1
GO_ENV_LIN_ARM=GOOS=linux GOARCH=arm CGO_ENABLED=1 CC=arm-linux-gnueabihf-gcc
GO_ENV_LIN_ARM64=GOOS=linux GOARCH=arm64 CGO_ENABLED=1 CC=aarch64-linux-gnu-gcc
GO_ENV_WIN_AMD64=GOOS=windows GOARCH=amd64 CGO_ENABLED=1 CC=x86_64-w64-mingw32-gcc

.DEFAULT_GOAL := rebuild

.PHONY: rebuild
rebuild:
	@$(MAKE) clean
	@$(MAKE) build

.PHONY: reinstall
reinstall:
	@$(MAKE) uninstall
	@$(MAKE) install

.PHONY: install
install: install-node install-go

.PHONY: install-node
install-node: static/node_modules

static/node_modules:
	cd static && npm install --silent

.PHONY: install-go
install-go:
	go get ./...

.PHONY: uninstall
uninstall:
	cd static && npm run clear && rm -rf node_modules

.PHONY: lint
lint: lint-node lint-go

.PHONY: lint-node
lint-node: install
	cd static && npm run lint

.PHONY: lint-go
lint-go:
	go vet ./...

.PHONY: build
build: build-linux-amd64 build-linux-arm build-linux-arm64 build-windows-amd64

.PHONY: clean
clean: clean-linux-amd64 clean-linux-arm clean-linux-arm64 clean-windows-amd64

.PHONY: clean-client
clean-client:
	cd static && npm run clean

$(CLIENT_BUILD_DIR): install-node
	cd static && npm run build

.PHONY: clean-linux-amd64
clean-linux-amd64: clean-client
	$(GO_ENV_LIN_AMD64) go clean -i ./...
	rm -rf $(BUILD_LIN_AMD64_DIR)

.PHONY: build-linux-amd64
build-linux-amd64: $(BUILD_LIN_AMD64_DIR)

$(BUILD_LIN_AMD64_DIR): install-go $(CLIENT_BUILD_DIR)
	$(GO_ENV_LIN_AMD64) go build -o $(BUILD_LIN_AMD64_DIR)/gomp $(GO_LIN_LD_FLAGS)
	mkdir -p $(BUILD_LIN_AMD64_DIR)/$(DB_MIGRATIONS_REL_DIR) && cp -R $(DB_MIGRATIONS_REL_DIR)/* $(BUILD_LIN_AMD64_DIR)/$(DB_MIGRATIONS_REL_DIR)
	mkdir -p $(BUILD_LIN_AMD64_DIR)/static && cp -R $(CLIENT_BUILD_DIR)/* $(BUILD_LIN_AMD64_DIR)/static

.PHONY: rebuild-linux-amd64
rebuild-linux-amd64: clean-linux-amd64 build-linux-amd64

.PHONY: clean-linux-arm
clean-linux-arm: clean-client
	$(GO_ENV_LIN_ARM) go clean -i ./...
	rm -rf $(BUILD_LIN_ARM_DIR)

.PHONY: build-linux-arm
build-linux-arm: $(BUILD_LIN_ARM_DIR)

$(BUILD_LIN_ARM_DIR): install-go $(CLIENT_BUILD_DIR)
	$(GO_ENV_LIN_ARM) go build -o $(BUILD_LIN_ARM_DIR)/gomp $(GO_LIN_LD_FLAGS)
	mkdir -p $(BUILD_LIN_ARM_DIR)/$(DB_MIGRATIONS_REL_DIR) && cp -R $(DB_MIGRATIONS_REL_DIR)/* $(BUILD_LIN_ARM_DIR)/$(DB_MIGRATIONS_REL_DIR)
	mkdir -p $(BUILD_LIN_ARM_DIR)/static && cp -R $(CLIENT_BUILD_DIR)/* $(BUILD_LIN_ARM_DIR)/static

.PHONY: rebuild-linux-arm
rebuild-linux-arm: clean-linux-arm build-linux-arm

.PHONY: clean-linux-arm64
clean-linux-arm64: clean-client
	$(GO_ENV_LIN_ARM64) go clean -i ./...
	rm -rf $(BUILD_LIN_ARM64_DIR)

.PHONY: build-linux-arm64
build-linux-arm64: $(BUILD_LIN_ARM64_DIR)

$(BUILD_LIN_ARM64_DIR): install-go $(CLIENT_BUILD_DIR)
	$(GO_ENV_LIN_ARM64) go build -o $(BUILD_LIN_ARM64_DIR)/gomp $(GO_LIN_LD_FLAGS)
	mkdir -p $(BUILD_LIN_ARM64_DIR)/$(DB_MIGRATIONS_REL_DIR) && cp -R $(DB_MIGRATIONS_REL_DIR)/* $(BUILD_LIN_ARM64_DIR)/$(DB_MIGRATIONS_REL_DIR)
	mkdir -p $(BUILD_LIN_ARM64_DIR)/static && cp -R $(CLIENT_BUILD_DIR)/* $(BUILD_LIN_ARM64_DIR)/static

.PHONY: rebuild-linux-arm64
rebuild-linux-arm64: clean-linux-arm64 build-linux-arm64

.PHONY: clean-windows-amd64
clean-windows-amd64: clean-client
	$(GO_ENV_WIN_AMD64) go clean -i ./...
	rm -rf $(BUILD_WIN_AMD64_DIR)

.PHONY: build-windows-amd64
build-windows-amd64: $(BUILD_WIN_AMD64_DIR)

$(BUILD_WIN_AMD64_DIR): install-go $(CLIENT_BUILD_DIR)
	$(GO_ENV_WIN_AMD64) go build -o $(BUILD_WIN_AMD64_DIR)/gomp.exe
	mkdir -p $(BUILD_WIN_AMD64_DIR)/$(DB_MIGRATIONS_REL_DIR) && cp -R $(DB_MIGRATIONS_REL_DIR)/* $(BUILD_WIN_AMD64_DIR)/$(DB_MIGRATIONS_REL_DIR)
	mkdir -p $(BUILD_WIN_AMD64_DIR)/static && cp -R $(CLIENT_BUILD_DIR)/* $(BUILD_WIN_AMD64_DIR)/static

.PHONY: rebuild-windows-amd64
rebuild-windows-amd64: clean-windows-amd64 build-windows-amd64

.PHONY: docker
docker: build
ifndef DOCKER_TAG
	docker buildx build --platform linux/amd64,linux/arm,linux/arm64 -t cwmr/gomp:local .
else
	docker buildx build --push --platform linux/amd64,linux/arm,linux/arm64 -t cwmr/gomp:$(DOCKER_TAG) .
endif

.PHONY: archive
archive: build
	rm -f $(BUILD_DIR)/gomp-linux-amd64.tar.gz
	tar -C $(BUILD_LIN_AMD64_DIR) -zcf $(BUILD_DIR)/gomp-linux-amd64.tar.gz .
	rm -f $(BUILD_DIR)/gomp-linux-arm.tar.gz
	tar -C $(BUILD_LIN_ARM_DIR) -zcf $(BUILD_DIR)/gomp-linux-arm.tar.gz .
	rm -f $(BUILD_DIR)/gomp-linux-arm64.tar.gz
	tar -C $(BUILD_LIN_ARM64_DIR) -zcf $(BUILD_DIR)/gomp-linux-arm64.tar.gz .
	rm -f $(BUILD_DIR)/gomp-windows-amd64.zip
	cd $(BUILD_WIN_AMD64_DIR) && zip -rq ../../gomp-windows-amd64.zip *
