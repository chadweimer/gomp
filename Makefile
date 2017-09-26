BUILD_DIR = build
VENDOR_DIR = vendor
NODE_MODULES_DIR =  node_modules
BOWER_COMPONENTS_DIR = static/bower_components
POLYMER_BUILD_DIR = static/build

.DEFAULT_GOAL := all

.PHONY: all
all: build-all docker

.PHONY: clean
clean:
	GOOS=linux GOARCH=amd64 go clean -i ./...
	GOOS=linux GOARCH=arm go clean -i ./...
	rm -rf $(BUILD_DIR) $(VENDOR_DIR) $(NODE_MODULES_DIR) $(BOWER_COMPONENTS_DIR) $(POLYMER_BUILD_DIR)

.PHONY: deps
deps: clean
	glide --quiet install
	yarn install --silent

.PHONY: build-dev
build-dev:
	go build -v

.PHONY: build-all
build-all: build-linux-amd64 build-linux-armhf build-windows-amd64

.PHONY: build-linux-amd64
build-linux-amd64: deps clean
	GOOS=linux GOARCH=amd64 go build -o $(BUILD_DIR)/linux/amd64/gomp
	cp -R db $(BUILD_DIR)/linux/amd64
	cp -R static $(BUILD_DIR)/linux/amd64
	tar -C $(BUILD_DIR)/linux/amd64 -zcf $(BUILD_DIR)/gomp-linux-amd64.tar.gz .

.PHONY: build-linux-armhf
build-linux-armhf: deps clean
	GOOS=linux GOARCH=arm go build -o $(BUILD_DIR)/linux/armhf/gomp
	cp -R db $(BUILD_DIR)/linux/armhf
	cp -R static $(BUILD_DIR)/linux/armhf
	tar -C $(BUILD_DIR)/linux/armhf -zcf $(BUILD_DIR)/gomp-linux-armhf.tar.gz .

.PHONY: build-windows-amd64
build-windows-amd64: deps clean
	GOOS=linux GOARCH=amd64 go build -o $(BUILD_DIR)/windows/amd64/gomp
	cp -R db $(BUILD_DIR)/windows/amd64
	cp -R static $(BUILD_DIR)/windows/amd64
	cd build/windows/amd64 && zip -rq ../../gomp-windows-amd64.zip * && cd ../../

.PHONY: docker
docker: build-linux-amd64 build-linux-armhf
	docker run --rm --privileged multiarch/qemu-user-static:register --reset
	docker build -t cwmr/gomp:latest .
	docker build -t cwmr/gomp:armhf -f Dockerfile.armhf .
