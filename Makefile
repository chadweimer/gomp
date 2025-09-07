NPROCS = $(shell grep -c 'processor' /proc/cpuinfo)
MAKEFLAGS += -j$(NPROCS)

# Variables typically overridden
TARGETOS?=linux
TARGETARCH?=amd64
REPO_NAME?=chadweimer/gomp
GO_MODULE_NAME?=github.com/$(REPO_NAME)
DOCKER_ARGS?=--platform $(TARGETOS)/$(TARGETARCH)
BUILD_VERSION?=
ARCHIVE_SUFFIX=
ifdef BUILD_VERSION
	ARCHIVE_SUFFIX=-$(BUILD_VERSION)
endif

# Basic metadata
COPYRIGHT:=Copyright © 2016-$(shell date +%Y) Chad Weimer

# Output directories
ROOT_BUILD_DIR:=build
BUILD_DIR=$(ROOT_BUILD_DIR)/$(TARGETOS)/$(TARGETARCH)
CLIENT_INSTALL_DIR:=static/node_modules
CLIENT_BUILD_DIR:=static/www/static

# Codegen-related files and directories
CLIENT_CODEGEN_DIR:=static/src/generated
MODELS_CODEGEN_FILE:=models/models.gen.go
API_CODEGEN_FILE:=api/routes.gen.go
MOCKS_CODEGEN_DIR:=mocks
CODEGEN_FILES=$(API_CODEGEN_FILE) $(MODELS_CODEGEN_FILE) $(MOCKS_CODEGEN_DIR)/db/mocks.gen.go $(MOCKS_CODEGEN_DIR)/fileaccess/mocks.gen.go

# Source files
GO_FILES:=$(shell find . -type f -name "*.go" ! -name "*.gen.go")
DB_MIGRATION_FILES:=$(shell find db/migrations -type f -name "*.*")
CLIENT_FILES:=$(filter-out $(shell test -d $(CLIENT_CODEGEN_DIR) && find $(CLIENT_CODEGEN_DIR) -name "*"), $(shell find static -maxdepth 1 -type f -name "*") $(shell find static/src -type f -name "*"))

# Go command arguments
GO_ENV=GOOS=$(TARGETOS) GOARCH=$(TARGETARCH) CGO_ENABLED=0
GO_LD_FLAGS=-ldflags '-X "$(GO_MODULE_NAME)/metadata.BuildVersion=$(BUILD_VERSION)" -X "$(GO_MODULE_NAME)/metadata.Copyright=$(COPYRIGHT)"'


.DEFAULT_GOAL:=$(ROOT_BUILD_DIR)


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

$(MOCKS_CODEGEN_DIR)/%/mocks.gen.go: $(GO_FILES) $(MODELS_CODEGEN_FILE)
	go generate $(GO_MODULE_NAME)/$*


# ---- LINT ----

.PHONY: lint
lint: lint-client lint-server

.PHONY: lint-client
lint-client: $(CLIENT_INSTALL_DIR) $(CLIENT_CODEGEN_DIR)
	cd static && npm run lint

.PHONY: lint-server
lint-server: $(CODEGEN_FILES)
	mkdir -p $(ROOT_BUILD_DIR)
	go vet ./...
	go run github.com/mgechev/revive -config=revive.toml ./... > $(ROOT_BUILD_DIR)/revive.golint
	go run github.com/securego/gosec/v2/cmd/gosec -no-fail -fmt=sonarqube -out=$(ROOT_BUILD_DIR)/gosec.json -stdout ./...


# ---- CLEAN ----

.PHONY: clean
clean:
	rm -rf $(ROOT_BUILD_DIR)
	find . -type f -name "*.gen.go" -delete
	rm -rf $(MOCKS_CODEGEN_DIR)
	cd static && npm run clean
	$(GO_ENV) go clean -i ./...


# ---- BUILD ----

$(ROOT_BUILD_DIR): $(BUILD_DIR)

$(CLIENT_BUILD_DIR): $(CLIENT_INSTALL_DIR) $(CLIENT_CODEGEN_DIR) $(CLIENT_FILES)
	rm -rf $@ && cd static && npm run build

$(BUILD_DIR): $(BUILD_DIR)/gomp $(BUILD_DIR)/db/migrations $(BUILD_DIR)/static

$(BUILD_DIR)/db/migrations: $(DB_MIGRATION_FILES)
	rm -rf $@ && mkdir -p $@ && cp -R db/migrations/* $@

$(BUILD_DIR)/static: $(CLIENT_BUILD_DIR)
	rm -rf $@ && mkdir -p $@ && cp -R $</* $@

$(BUILD_DIR)/gomp: go.mod $(CODEGEN_FILES) $(GO_FILES)
	$(GO_ENV) go build -o $@ $(GO_LD_FLAGS)


# ---- TEST ----

.PHONY: test
test: $(ROOT_BUILD_DIR)/coverage/server $(ROOT_BUILD_DIR)/coverage/client

$(ROOT_BUILD_DIR)/coverage/server: go.mod $(CODEGEN_FILES) $(GO_FILES)
	rm -rf $@
	mkdir -p $@
	go test -coverprofile=$@/coverage.out -coverpkg=./... -json > $@/results.json ./...
	sed -i '/^.\+\.gen\.go.\+$$/d' $@/coverage.out
	go tool cover -html=$@/coverage.out -o $@/coverage.html

$(ROOT_BUILD_DIR)/coverage/client: $(CLIENT_FILES) $(CLIENT_CODEGEN_DIR)
	rm -rf $@
	mkdir -p $@
	cd static && npm run cover
	cp -r static/coverage/* $@


# ---- ARCHIVE ----

.PHONY: archive
archive: $(ROOT_BUILD_DIR)/gomp-$(TARGETOS)-$(TARGETARCH)$(ARCHIVE_SUFFIX).tar.gz

$(ROOT_BUILD_DIR)/gomp-$(TARGETOS)-$(TARGETARCH)$(ARCHIVE_SUFFIX).tar.gz: $(BUILD_DIR)
	tar -C $< -zcf $@ .


# ---- DOCKER ----

.PHONY: docker
# This make target does not directly require any other targets,
# and assumes that the required archives are already present,
# so that it can be used in an optimized way in the github actions workflow.
docker:
	docker buildx build --build-arg ARCHIVE_SUFFIX=$(ARCHIVE_SUFFIX) $(DOCKER_ARGS) .
