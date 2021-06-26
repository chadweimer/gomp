NPROCS = $(shell grep -c 'processor' /proc/cpuinfo)
MAKEFLAGS += -j$(NPROCS)

BUILD_DIR=build
BUILD_LIN_AMD64_DIR=$(BUILD_DIR)/linux/amd64
BUILD_LIN_ARM_DIR=$(BUILD_DIR)/linux/arm/v7
BUILD_LIN_ARM64_DIR=$(BUILD_DIR)/linux/arm64
BUILD_WIN_AMD64_DIR=$(BUILD_DIR)/windows/amd64
CLIENT_INSTALL_DIR=static/node_modules
CLIENT_BUILD_DIR=static/build/default

GO_LIN_LD_FLAGS=-ldflags '-extldflags "-static -static-libgcc"'
GO_ENV_LIN_AMD64=GOOS=linux GOARCH=amd64 CGO_ENABLED=1
GO_ENV_LIN_ARM=GOOS=linux GOARCH=arm CGO_ENABLED=1 CC=arm-linux-gnueabihf-gcc
GO_ENV_LIN_ARM64=GOOS=linux GOARCH=arm64 CGO_ENABLED=1 CC=aarch64-linux-gnu-gcc
GO_ENV_WIN_AMD64=GOOS=windows GOARCH=amd64 CGO_ENABLED=1 CC=x86_64-w64-mingw32-gcc

GO_FILES := $(wildcard *.go) $(wildcard **/*.go)
DB_MIGRATION_FILES := $(wildcard db/migrations/*) $(wildcard db/migrations/**/*)
CLIENT_FILES := $(wildcard static/*) $(wildcard static/src/*)  $(wildcard static/src/**/*)

.DEFAULT_GOAL := build

# ---- INSTALL ----

.PHONY: install
install: $(CLIENT_INSTALL_DIR)

$(CLIENT_INSTALL_DIR): static/package.json
	cd static && npm install --silent

.PHONY: uninstall
uninstall:
	cd static && npm run clear
	rm -rf $(CLIENT_INSTALL_DIR)


# ---- LINT ----

.PHONY: lint
lint: lint-client lint-server

.PHONY: lint-client
lint-client: $(CLIENT_INSTALL_DIR)
	cd static && npm run lint

.PHONY: lint-server
lint-server:
	go vet ./...


# ---- BUILD ----

.PHONY: build
build: $(BUILD_LIN_AMD64_DIR) $(BUILD_LIN_ARM_DIR) $(BUILD_LIN_ARM64_DIR) $(BUILD_WIN_AMD64_DIR)

.PHONY: clean
clean: clean-linux-amd64 clean-linux-arm clean-linux-arm64 clean-windows-amd64
	rm -rf $(BUILD_DIR)

# - GENERIC ARCH -

$(CLIENT_BUILD_DIR): $(CLIENT_INSTALL_DIR) $(CLIENT_FILES)
	cd static && npm run build

$(BUILD_DIR)/%/db/migrations: $(DB_MIGRATION_FILES)
	mkdir -p $@ && cp -R db/migrations/* $@

$(BUILD_DIR)/%/static: $(CLIENT_BUILD_DIR)
	mkdir -p $@ && cp -R $</* $@

.PHONY: clean-client
clean-client:
	cd static && npm run clean

# - AMD64 -

$(BUILD_LIN_AMD64_DIR): $(BUILD_LIN_AMD64_DIR)/gomp $(BUILD_LIN_AMD64_DIR)/db/migrations $(BUILD_LIN_AMD64_DIR)/static

$(BUILD_LIN_AMD64_DIR)/gomp: go.mod $(GO_FILES)
	$(GO_ENV_LIN_AMD64) go build -o $@ $(GO_LIN_LD_FLAGS)

.PHONY: clean-linux-amd64
clean-linux-amd64: clean-client
	$(GO_ENV_LIN_AMD64) go clean -i ./...
	rm -rf $(BUILD_LIN_AMD64_DIR)
	rm -f $(BUILD_DIR)/gomp-linux-amd64.tar.gz

# - ARM32 -

$(BUILD_LIN_ARM_DIR): $(BUILD_LIN_ARM_DIR)/gomp $(BUILD_LIN_ARM_DIR)/db/migrations $(BUILD_LIN_ARM_DIR)/static

$(BUILD_LIN_ARM_DIR)/gomp: go.mod $(GO_FILES)
	$(GO_ENV_LIN_ARM) go build -o $@ $(GO_LIN_LD_FLAGS)

.PHONY: clean-linux-arm
clean-linux-arm: clean-client
	$(GO_ENV_LIN_ARM) go clean -i ./...
	rm -rf $(BUILD_LIN_ARM_DIR)
	rm -f $(BUILD_DIR)/gomp-linux-arm.tar.gz

# - ARM64 -

$(BUILD_LIN_ARM64_DIR): $(BUILD_LIN_ARM64_DIR)/gomp $(BUILD_LIN_ARM64_DIR)/db/migrations $(BUILD_LIN_ARM64_DIR)/static

$(BUILD_LIN_ARM64_DIR)/gomp: go.mod $(GO_FILES)
	$(GO_ENV_LIN_ARM64) go build -o $@ $(GO_LIN_LD_FLAGS)

.PHONY: clean-linux-arm64
clean-linux-arm64: clean-client
	$(GO_ENV_LIN_ARM64) go clean -i ./...
	rm -rf $(BUILD_LIN_ARM64_DIR)
	rm -f $(BUILD_DIR)/gomp-linux-arm64.tar.gz

# - WINDOWS -

$(BUILD_WIN_AMD64_DIR): $(BUILD_WIN_AMD64_DIR)/gomp.exe $(BUILD_WIN_AMD64_DIR)/db/migrations $(BUILD_WIN_AMD64_DIR)/static

$(BUILD_WIN_AMD64_DIR)/gomp.exe: go.mod $(GO_FILES)
	$(GO_ENV_WIN_AMD64) go build -o $@

.PHONY: clean-windows-amd64
clean-windows-amd64: clean-client
	$(GO_ENV_WIN_AMD64) go clean -i ./...
	rm -rf $(BUILD_WIN_AMD64_DIR)
	rm -f $(BUILD_DIR)/gomp-windows-amd64.zip


# ---- DOCKER ----

.PHONY: docker
docker: build
ifndef DOCKER_TAG
	docker buildx build --platform linux/amd64,linux/arm,linux/arm64 -t cwmr/gomp:local .
else
	docker buildx build --push --platform linux/amd64,linux/arm,linux/arm64 -t cwmr/gomp:$(DOCKER_TAG) .
endif


# ---- ARCHIVE ----

.PHONY: archive
archive: $(BUILD_DIR)/gomp-linux-amd64.tar.gz $(BUILD_DIR)/gomp-linux-arm.tar.gz $(BUILD_DIR)/gomp-linux-arm64.tar.gz $(BUILD_DIR)/gomp-windows-amd64.zip

$(BUILD_DIR)/gomp-linux-amd64.tar.gz: $(BUILD_LIN_AMD64_DIR)
	tar -C $< -zcf $@ .

$(BUILD_DIR)/gomp-linux-arm.tar.gz: $(BUILD_LIN_ARM_DIR)
	tar -C $< -zcf $@ .

$(BUILD_DIR)/gomp-linux-arm64.tar.gz: $(BUILD_LIN_ARM64_DIR)
	tar -C $< -zcf $@ .

$(BUILD_DIR)/gomp-windows-amd64.zip: $(BUILD_WIN_AMD64_DIR)
	cd $< && zip -rq ../../../$@ *
