CURRENT_DIR=$(shell pwd)
BUILD_DIR=$(CURRENT_DIR)/build
BACKEND_DIR=$(CURRENT_DIR)/backend
FRONTEND_DIR=$(CURRENT_DIR)/frontend
VENDOR_DIR=$(BACKEND_DIR)/vendor
NODE_MODULES_DIR=$(FRONTEND_DIR)/node_modules
BOWER_COMPONENTS_DIR=$(FRONTEND_DIR)/bower_components
POLYMER_BUILD_DIR=$(FRONTEND_DIR)/build

.DEFAULT_GOAL := rebuild

.PHONY: rebuild
rebuild: clean build

.PHONY: reinstall
reinstall: uninstall install

.PHONY: install
install:
	cd $(BACKEND_DIR) && glide --quiet install && cd ../
	cd $(FRONTEND_DIR) && yarn install --silent && cd ../

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
	cd $(FRONTEND_DIR) && $(NODE_MODULES_DIR)/.bin/polymer build --preset es6-unbundled && cd ../

.PHONY: clean-linux-amd64
clean-linux-amd64:
	cd $(BACKEND_DIR) && GOOS=linux GOARCH=amd64 go clean -i ./... && cd ../
	rm -rf $(BUILD_DIR)/linux/amd64
	rm -f $(BUILD_DIR)/gomp-linux-amd64.tar.gz

.PHONY: build-linux-amd64
build-linux-amd64: prebuild
	cd $(BACKEND_DIR) && GOOS=linux GOARCH=amd64 go build -o $(BUILD_DIR)/linux/amd64/gomp && cd ../
	mkdir -p $(BUILD_DIR)/linux/amd64/db && cp -R $(BACKEND_DIR)/db/* $(BUILD_DIR)/linux/amd64/db
	mkdir -p $(BUILD_DIR)/linux/amd64/static && cp -R $(FRONTEND_DIR)/build/es6-unbundled/* $(BUILD_DIR)/linux/amd64/static
	tar -C $(BUILD_DIR)/linux/amd64 -zcf $(BUILD_DIR)/gomp-linux-amd64.tar.gz .

.PHONY: clean-linux-armhf
clean-linux-armhf:
	cd $(BACKEND_DIR) && GOOS=linux GOARCH=armhf go clean -i ./... && cd ../
	rm -rf $(BUILD_DIR)/linux/armhf
	rm -f $(BUILD_DIR)/gomp-linux-armhf.tar.gz

.PHONY: build-linux-armhf
build-linux-armhf: prebuild
	cd $(BACKEND_DIR) && GOOS=linux GOARCH=arm go build -o $(BUILD_DIR)/linux/armhf/gomp && cd ../
	mkdir -p $(BUILD_DIR)/linux/armhf/db && cp -R $(BACKEND_DIR)/db/* $(BUILD_DIR)/linux/armhf/db
	mkdir -p $(BUILD_DIR)/linux/armhf/static && cp -R $(FRONTEND_DIR)/build/es6-unbundled/* $(BUILD_DIR)/linux/armhf/static
	tar -C $(BUILD_DIR)/linux/armhf -zcf $(BUILD_DIR)/gomp-linux-armhf.tar.gz .

.PHONY: clean-windows-amd64
clean-windows-amd64:
	cd $(BACKEND_DIR) && GOOS=windows GOARCH=amd64 go clean -i ./... && cd ../
	rm -rf $(BUILD_DIR)/windows/amd64
	rm -f $(BUILD_DIR)/gomp-windows-amd64.zip

.PHONY: build-windows-amd64
build-windows-amd64: prebuild
	cd $(BACKEND_DIR) && GOOS=windows GOARCH=amd64 go build -o $(BUILD_DIR)/windows/amd64/gomp && cd ../
	mkdir -p $(BUILD_DIR)/windows/amd64/db && cp -R $(BACKEND_DIR)/db/* $(BUILD_DIR)/windows/amd64/db
	mkdir -p $(BUILD_DIR)/windows/amd64/static && cp -R $(FRONTEND_DIR)/build/es6-unbundled/* $(BUILD_DIR)/windows/amd64/static
	cd $(BUILD_DIR)/windows/amd64 && zip -rq ../../gomp-windows-amd64.zip * && cd ../../../

.PHONY: docker
docker: build-linux-amd64 build-linux-armhf
	docker run --rm --privileged multiarch/qemu-user-static:register --reset
	docker build -t cwmr/gomp:latest .
	docker build -t cwmr/gomp:armhf -f Dockerfile.armhf .
