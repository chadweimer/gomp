BUILD_DIR = build
BUILD_DIR_AMD64 = $(BUILD_DIR)/amd64
BUILD_DIR_ARMHF = $(BUILD_DIR)/armhf
VENDOR_DIR = vendor
NODE_MODULES_DIR =  node_modules
BOWER_COMPONENTS_DIR = static/bower_components
POLYMER_BUILD_DIR = static/build

.PHONY: clean
clean:
	GOOS=linux GOARCH=amd64 go clean -i ./...
	GOOS=linux GOARCH=arm go clean -i ./...
	rm -rf $(BUILD_DIR) $(VENDOR_DIR) $(NODE_MODULES_DIR) $(BOWER_COMPONENTS_DIR) $(POLYMER_BUILD_DIR)

.PHONY: all
all: clean deps build

.PHONY: deps
deps:
	glide install
	npm install

.PHONY: build
build:
	GOOS=linux GOARCH=amd64 go build -v -o $(BUILD_DIR_AMD64)/gomp
	cp db/ $(BUILD_DIR_AMD64)/db/
	cp static/ $(BUILD_DIR_AMD64)/static/
	cp templates/ $(BUILD_DIR_AMD64)/templates/

	GOOS=linux GOARCH=arm go build -v -o $(BUILD_DIR_ARMHF)/gomp
	cp db/ $(BUILD_DIR_ARMHF)/db/
	cp static/ $(BUILD_DIR_ARMHF)/static/
	cp templates/ $(BUILD_DIR_ARMHF)/templates/

.PHONY: docker
docker:
	docker run --rm --privileged multiarch/qemu-user-static:register --reset
	docker build -t cwmr/gomp:latest .
	docker build -t cwmr/gomp:armhf -f Dockerfile.armhf .