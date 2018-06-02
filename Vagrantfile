# -*- mode: ruby -*-
# vi: set ft=ruby :

Vagrant.configure("2") do |config|
  config.vm.box = "ubuntu/bionic64"
  config.vm.box_url = "https://app.vagrantup.com/ubuntu/boxes/bionic64"

  config.vm.synced_folder ".", "/vagrant", disabled: true
  config.vm.synced_folder ".", "/go/src/github.com/chadweimer/gomp"

  config.vm.provider "virtualbox" do |vb|
    vb.gui = true
    vb.memory = "4096"

    # Prevent cloudimg-console.log from being written
    vb.customize [ "modifyvm", :id, "--uartmode1", "disconnected" ]
  end

  # Install docker in the guest
  config.vm.provision "docker" do |d|
  end

  # Custom provisioning
  config.vm.provision "shell", inline: <<-SHELL
    # Add the Microsoft package repo
    curl https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > /etc/apt/trusted.gpg.d/microsoft.gpg
    sh -c 'echo "deb [arch=amd64] https://packages.microsoft.com/repos/vscode stable main" > /etc/apt/sources.list.d/vscode.list'

    # Install necessary packages
    apt update
    apt install -y git golang go-dep nodejs npm make code xubuntu-core virtualbox-guest-dkms virtualbox-guest-utils virtualbox-guest-x11

    # Set up the go environment
    chown -R vagrant:vagrant /go
    echo "export GOPATH=/go" | tee -a .bashrc

    # Allow our user to interact with docker engine
    usermod -aG docker vagrant

    # Increase the amount of inotify watchers
    echo fs.inotify.max_user_watches=65536 | tee -a /etc/sysctl.conf && sysctl -p
  SHELL

  # Reboot so that we get the GUI on the first up
  config.vm.provision :reload
end
