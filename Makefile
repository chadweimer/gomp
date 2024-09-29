NPROCS = $(shell grep -c 'processor' /proc/cpuinfo)
MAKEFLAGS += -j$(NPROCS)

BUILD_VERSION?=
ARCHIVE_SUFFIX:=
ifdef BUILD_VERSION
	ARCHIVE_SUFFIX:=-$(BUILD_VERSION)
endif

COPYRIGHT := "Copyright 2016-$(shell date +%Y) Chad Weimer"

BUILD_DIR=build
BUILD_LIN_AMD64_DIR=$(BUILD_DIR)/linux/amd64
BUILD_LIN_ARM_DIR=$(BUILD_DIR)/linux/arm/v7
BUILD_LIN_ARM64_DIR=$(BUILD_DIR)/linux/arm64
BUILD_WIN_AMD64_DIR=$(BUILD_DIR)/windows/amd64
CLIENT_INSTALL_DIR=static/node_modules
CLIENT_BUILD_DIR=static/www/static

CLIENT_CODEGEN_DIR=static/src/generated
MODELS_CODEGEN_FILE=models/models.gen.go
API_CODEGEN_FILE=api/routes.gen.go
MOCKS_CODEGEN_DIR=mocks
CODEGEN_FILES=$(API_CODEGEN_FILE) $(MODELS_CODEGEN_FILE) $(MOCKS_CODEGEN_DIR)

REPO_NAME ?= chadweimer/gomp
GO_MODULE_NAME ?= github.com/$(REPO_NAME)
GOOS := linux
GOARCH := amd64
GO_ENV=GOOS=$(GOOS) GOARCH=$(GOARCH) CGO_ENABLED=0
GO_LD_FLAGS=-ldflags "-X '$(GO_MODULE_NAME)/metadata.BuildVersion=$(BUILD_VERSION)' -X '$(GO_MODULE_NAME)/metadata.Copyright=$(COPYRIGHT)'"

CONTAINER_REGISTRY ?= ghcr.io

GO_FILES := $(shell find . -type f -name "*.go" ! -name "*.gen.go")
DB_MIGRATION_FILES := $(shell find db/migrations -type f -name "*.*")
CLIENT_FILES := $(filter-out $(shell test -d $(CLIENT_CODEGEN_DIR) && find $(CLIENT_CODEGEN_DIR) -name "*"), $(shell find static -maxdepth 1 -type f -name "*") $(shell find static/src -type f -name "*"))

.DEFAULT_GOAL := build

# ---- INSTALL ----

.PHONY: install
install: $(CLIENT_INSTALL_DIR)
	go get ./...

$(CLIENT_INSTALL_DIR): static/package.json
	cd static && npm install --silent

.PHONY: uninstall
uninstall:
	cd static && npm run clear


# ---- CODEGEN ----
$(CLIENT_CODEGEN_DIR): $(CLIENT_INSTALL_DIR) openapi.yaml models.yaml
	cd static && npm run codegen

$(API_CODEGEN_FILE): $(MODELS_CODEGEN_FILE) openapi.yaml api/cfg.yaml
	go generate $(GO_MODULE_NAME)/api

$(MODELS_CODEGEN_FILE): models.yaml models/cfg.yaml
	go generate $(GO_MODULE_NAME)/models

$(MOCKS_CODEGEN_DIR): $(GO_FILES) $(MODELS_CODEGEN_FILE)
	go generate $(GO_MODULE_NAME)/db $(GO_MODULE_NAME)/upload

# ---- LINT ----

.PHONY: lint
lint: lint-client lint-server

.PHONY: lint-client
lint-client: $(CLIENT_INSTALL_DIR) $(CLIENT_CODEGEN_DIR)
	cd static && npm run lint

.PHONY: lint-server
lint-server: $(CODEGEN_FILES)
	mkdir -p $(BUILD_DIR)
	go vet ./...
	go run github.com/mgechev/revive -config=revive.toml ./... > $(BUILD_DIR)/revive.golint
	go run github.com/securego/gosec/v2/cmd/gosec -no-fail -fmt=sonarqube -out=$(BUILD_DIR)/gosec.json -stdout ./...


# ---- BUILD ----

.PHONY: build
build: $(BUILD_LIN_AMD64_DIR) $(BUILD_LIN_ARM_DIR) $(BUILD_LIN_ARM64_DIR) $(BUILD_WIN_AMD64_DIR)

.PHONY: clean
clean: clean-linux-amd64 clean-linux-arm clean-linux-arm64 clean-windows-amd64
	rm -rf $(BUILD_DIR)
	find . -type f -name "*.gen.go" -delete
	rm -rf $(MOCKS_CODEGEN_DIR)
	cd static && npm run clean

# - GENERIC ARCH -

$(CLIENT_BUILD_DIR): $(CLIENT_INSTALL_DIR) $(CLIENT_CODEGEN_DIR) $(CLIENT_FILES)
	rm -rf $@ && cd static && npm run build

$(BUILD_DIR)/%/db/migrations: $(DB_MIGRATION_FILES)
	rm -rf $@ && mkdir -p $@ && cp -R db/migrations/* $@

$(BUILD_DIR)/%/static: $(CLIENT_BUILD_DIR)
	rm -rf $@ && mkdir -p $@ && cp -R $</* $@

$(BUILD_DIR)/linux/%/gomp: go.mod $(CODEGEN_FILES) $(GO_FILES)
	$(GO_ENV) go build -o $@ $(GO_LD_FLAGS)

$(BUILD_DIR)/windows/%/gomp.exe: GOOS := windows
$(BUILD_DIR)/windows/%/gomp.exe: go.mod $(CODEGEN_FILES) $(GO_FILES)
	$(GO_ENV) go build -o $@ $(GO_LD_FLAGS)

.PHONY: clean-$(BUILD_DIR)/%
clean-$(BUILD_DIR)/%:
	rm -rf $(BUILD_DIR)/$*

.PHONY: clean-$(BUILD_DIR)/linux/%/gomp clean-$(BUILD_DIR)/windows/%/gomp.exe
clean-$(BUILD_DIR)/linux/%/gomp:
	$(GO_ENV) go clean -i ./...
clean-$(BUILD_DIR)/windows/%/gomp.exe: GOOS := windows
clean-$(BUILD_DIR)/windows/%/gomp.exe:
	$(GO_ENV) go clean -i ./...

# - AMD64 -

$(BUILD_LIN_AMD64_DIR): $(BUILD_LIN_AMD64_DIR)/gomp $(BUILD_LIN_AMD64_DIR)/db/migrations $(BUILD_LIN_AMD64_DIR)/static

.PHONY: clean-linux-amd64
clean-linux-amd64: clean-$(BUILD_LIN_AMD64_DIR)/gomp clean-$(BUILD_LIN_AMD64_DIR) clean-$(BUILD_DIR)/gomp-linux-amd64.tar.gz

# - ARM32 -

$(BUILD_LIN_ARM_DIR): $(BUILD_LIN_ARM_DIR)/gomp $(BUILD_LIN_ARM_DIR)/db/migrations $(BUILD_LIN_ARM_DIR)/static

$(BUILD_LIN_ARM_DIR)/gomp: GOARCH := arm

.PHONY: clean-linux-arm
clean-linux-arm: GOARCH := arm
clean-linux-arm: clean-$(BUILD_LIN_ARM_DIR)/gomp clean-$(BUILD_LIN_ARM_DIR) clean-$(BUILD_DIR)/gomp-linux-arm.tar.gz

# - ARM64 -

$(BUILD_LIN_ARM64_DIR): $(BUILD_LIN_ARM64_DIR)/gomp $(BUILD_LIN_ARM64_DIR)/db/migrations $(BUILD_LIN_ARM64_DIR)/static

$(BUILD_LIN_ARM64_DIR)/gomp: GOARCH := arm64

.PHONY: clean-linux-arm64
clean-linux-arm64: GOARCH := arm64
clean-linux-arm64: clean-$(BUILD_LIN_ARM64_DIR)/gomp clean-$(BUILD_LIN_ARM64_DIR) clean-$(BUILD_DIR)/gomp-linux-arm64.tar.gz

# - WINDOWS -

$(BUILD_WIN_AMD64_DIR): $(BUILD_WIN_AMD64_DIR)/gomp.exe $(BUILD_WIN_AMD64_DIR)/db/migrations $(BUILD_WIN_AMD64_DIR)/static

.PHONY: clean-windows-amd64
clean-windows-amd64: clean-$(BUILD_WIN_AMD64_DIR)/gomp.exe clean-$(BUILD_WIN_AMD64_DIR) clean-$(BUILD_DIR)/gomp-windows-amd64.zip


# ---- TEST ----
.PHONY: test
test: $(BUILD_DIR)/coverage/server $(BUILD_DIR)/coverage/client

$(BUILD_DIR)/coverage/server: go.mod $(CODEGEN_FILES) $(GO_FILES)
	rm -rf $@
	mkdir -p $@
	go test -coverprofile=$@/coverage.out -coverpkg=./... -json > $@/results.json ./...
	sed -i '/^.\+\.gen\.go.\+$$/d' $@/coverage.out
	go tool cover -html=$@/coverage.out -o $@/coverage.html

$(BUILD_DIR)/coverage/client: $(CLIENT_FILES) $(CLIENT_CODEGEN_DIR)
	rm -rf $@
	mkdir -p $@
	cd static && npm run cover
	cp -r static/coverage/* $@


# ---- DOCKER ----

.PHONY: docker
docker: build
ifndef CONTAINER_TAG
	docker buildx build --platform linux/amd64,linux/arm,linux/arm64 -t $(CONTAINER_REGISTRY)/$(REPO_NAME):local .
else
	docker buildx build --push --platform linux/amd64,linux/arm,linux/arm64 -t $(CONTAINER_REGISTRY)/$(REPO_NAME):$(CONTAINER_TAG) .
endif


# ---- ARCHIVE ----

.PHONY: archive
archive: $(BUILD_DIR)/gomp-linux-amd64$(ARCHIVE_SUFFIX).tar.gz $(BUILD_DIR)/gomp-linux-arm$(ARCHIVE_SUFFIX).tar.gz $(BUILD_DIR)/gomp-linux-arm64$(ARCHIVE_SUFFIX).tar.gz $(BUILD_DIR)/gomp-windows-amd64$(ARCHIVE_SUFFIX).zip

$(BUILD_DIR)/gomp-linux-amd64$(ARCHIVE_SUFFIX).tar.gz: $(BUILD_LIN_AMD64_DIR)
$(BUILD_DIR)/gomp-linux-arm$(ARCHIVE_SUFFIX).tar.gz: $(BUILD_LIN_ARM_DIR)
$(BUILD_DIR)/gomp-linux-arm64$(ARCHIVE_SUFFIX).tar.gz: $(BUILD_LIN_ARM64_DIR)
$(BUILD_DIR)/gomp-linux-%$(ARCHIVE_SUFFIX).tar.gz:
	tar -C $< -zcf $@ .

$(BUILD_DIR)/gomp-windows-amd64$(ARCHIVE_SUFFIX).zip: $(BUILD_WIN_AMD64_DIR)
	cd $< && zip -rq ../../../$@ *
