# -*- mode: ruby -*-
# vi: set ft=ruby :

Vagrant.configure("2") do |config|
  # Every Vagrant development environment requires a box. You can search for
  # boxes at https://vagrantcloud.com/search.
  config.vm.box = "ubuntu/bionic64"
  config.vm.box_url = "https://app.vagrantup.com/ubuntu/boxes/bionic64"

  config.vm.synced_folder ".", "/vagrant", disabled: true
  config.vm.synced_folder ".", "/go/src/github.com/chadweimer/gomp"

  config.vm.provider "virtualbox" do |vb|
    # Display the VirtualBox GUI when booting the machine
    vb.gui = true

    # Customize the amount of memory on the VM:
    vb.memory = "1024"
  end

  config.vm.provision "docker" do |d|
  end
  config.vm.provision "shell", inline: <<-SHELL
    apt update
    apt install -y git golang go-dep nodejs npm make

    chown -R vagrant:vagrant /go
    export GOPATH=/go
    echo "export GOPATH=$GOPATH" >> .bashrc
  SHELL
end
