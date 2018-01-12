BUILD_DIR=build
VENDOR_DIR=vendor
NODE_MODULES_DIR=node_modules
BOWER_COMPONENTS_DIR=static/bower_components
POLYMER_BUILD_DIR=static/build

.DEFAULT_GOAL := rebuild

.PHONY: rebuild
rebuild: clean build

.PHONY: reinstall
reinstall: uninstall install

.PHONY: install
install:
	dep ensure
	yarn install --silent

.PHONY: uninstall
uninstall:
	rm -rf $(VENDOR_DIR) $(NODE_MODULES_DIR) $(BOWER_COMPONENTS_DIR)

.PHONY: build
build: build-linux-amd64 build-linux-armhf build-windows-amd64

.PHONY: clean
clean: clean-linux-amd64 clean-linux-armhf clean-windows-amd64
	rm -rf $(POLYMER_BUILD_DIR)

.PHONY: prebuild
prebuild:
	cd static && ../$(NODE_MODULES_DIR)/.bin/polymer build && cd ../

.PHONY: clean-linux-amd64
clean-linux-amd64:
	GOOS=linux GOARCH=amd64 go clean -i ./...
	rm -rf $(BUILD_DIR)/linux/amd64

.PHONY: build-linux-amd64
build-linux-amd64: prebuild
	GOOS=linux GOARCH=amd64 go build -o $(BUILD_DIR)/linux/amd64/gomp
	mkdir -p $(BUILD_DIR)/linux/amd64/db && cp -R db/* $(BUILD_DIR)/linux/amd64/db
	mkdir -p $(BUILD_DIR)/linux/amd64/static && cp -R static/build/default/* $(BUILD_DIR)/linux/amd64/static

.PHONY: rebuild-linux-amd64
rebuild-linux-amd64: clean-linux-amd64 build-linux-amd64

.PHONY: clean-linux-armhf
clean-linux-armhf:
	GOOS=linux GOARCH=armhf go clean -i ./...
	rm -rf $(BUILD_DIR)/linux/armhf

.PHONY: build-linux-armhf
build-linux-armhf: prebuild
	GOOS=linux GOARCH=arm go build -o $(BUILD_DIR)/linux/armhf/gomp
	mkdir -p $(BUILD_DIR)/linux/armhf/db && cp -R db/* $(BUILD_DIR)/linux/armhf/db
	mkdir -p $(BUILD_DIR)/linux/armhf/static && cp -R static/build/default/* $(BUILD_DIR)/linux/armhf/static

.PHONY: rebuild-linux-armhf
rebuild-linux-armhf: clean-linux-armhf build-linux-armhf

.PHONY: clean-windows-amd64
clean-windows-amd64:
	GOOS=windows GOARCH=amd64 go clean -i ./...
	rm -rf $(BUILD_DIR)/windows/amd64

.PHONY: build-windows-amd64
build-windows-amd64: prebuild
	GOOS=linux GOARCH=amd64 go build -o $(BUILD_DIR)/windows/amd64/gomp
	mkdir -p $(BUILD_DIR)/windows/amd64/db && cp -R db/* $(BUILD_DIR)/windows/amd64/db
	mkdir -p $(BUILD_DIR)/windows/amd64/static && cp -R static/build/default/* $(BUILD_DIR)/windows/amd64/static

.PHONY: rebuild-windows-amd64
rebuild-windows-amd64: clean-windows-amd64 build-windows-amd64

.PHONY: docker-linux-amd64
docker-linux-amd64: build-linux-amd64
	docker build -t cwmr/gomp:latest .

.PHONY: docker-linux-armhf
docker-linux-armhf: build-linux-armhf
	docker run --rm --privileged multiarch/qemu-user-static:register --reset
	docker build -t cwmr/gomp:armhf -f Dockerfile.armhf .

.PHONY: docker
docker: docker-linux-amd64 docker-linux-armhf

.PHONY: archive
archive:
	rm -f $(BUILD_DIR)/gomp-linux-amd64.tar.gz
	tar -C $(BUILD_DIR)/linux/amd64 -zcf $(BUILD_DIR)/gomp-linux-amd64.tar.gz .
	rm -f $(BUILD_DIR)/gomp-linux-armhf.tar.gz
	tar -C $(BUILD_DIR)/linux/armhf -zcf $(BUILD_DIR)/gomp-linux-armhf.tar.gz .
	rm -f $(BUILD_DIR)/gomp-windows-amd64.zip
	cd build/windows/amd64 && zip -rq ../../gomp-windows-amd64.zip * && cd ../../../
