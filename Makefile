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
	glide --quiet install
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
	pushd .\static & ..\$(NODE_MODULES_DIR)\.bin\polymer build --preset es6-unbundled & popd

.PHONY: clean-linux-amd64
clean-linux-amd64:
	GOOS=linux GOARCH=amd64 go clean -i ./...
	rm -rf $(BUILD_DIR)/linux/amd64
	rm -f $(BUILD_DIR)/gomp-linux-amd64.tar.gz

.PHONY: build-linux-amd64
build-linux-amd64: prebuild
	GOOS=linux GOARCH=amd64 go build -o $(BUILD_DIR)/linux/amd64/gomp
	cp -R db $(BUILD_DIR)/linux/amd64
	cp -R static $(BUILD_DIR)/linux/amd64
	tar -C $(BUILD_DIR)/linux/amd64 -zcf $(BUILD_DIR)/gomp-linux-amd64.tar.gz .

.PHONY: clean-linux-armhf
clean-linux-armhf:
	GOOS=linux GOARCH=armhf go clean -i ./...
	rm -rf $(BUILD_DIR)/linux/armhf
	rm -f $(BUILD_DIR)/gomp-linux-armhf.tar.gz

.PHONY: build-linux-armhf
build-linux-armhf: prebuild
	GOOS=linux GOARCH=arm go build -o $(BUILD_DIR)/linux/armhf/gomp
	cp -R db $(BUILD_DIR)/linux/armhf
	cp -R static $(BUILD_DIR)/linux/armhf
	tar -C $(BUILD_DIR)/linux/armhf -zcf $(BUILD_DIR)/gomp-linux-armhf.tar.gz .

.PHONY: clean-windows-amd64
clean-windows-amd64:
	GOOS=windows GOARCH=amd64 go clean -i ./...
	rm -rf $(BUILD_DIR)/windows/amd64
	rm -f $(BUILD_DIR)/gomp-windows-amd64.zip

.PHONY: build-windows-amd64
build-windows-amd64: prebuild
	GOOS=linux GOARCH=amd64 go build -o $(BUILD_DIR)/windows/amd64/gomp
	cp -R db $(BUILD_DIR)/windows/amd64
	cp -R static $(BUILD_DIR)/windows/amd64
	pushd build/windows/amd64 && zip -rq ../../gomp-windows-amd64.zip * && popd

.PHONY: docker
docker: build-linux-amd64 build-linux-armhf
	docker run --rm --privileged multiarch/qemu-user-static:register --reset
	docker build -t cwmr/gomp:latest .
	docker build -t cwmr/gomp:armhf -f Dockerfile.armhf .
