# -*- mode: ruby -*-
# vi: set ft=ruby :

home_path = "~"
if ENV['HOMESHARE']
  home_path = ENV['HOMESHARE']
end

Vagrant.configure("2") do |config|
  config.vm.box = "ubuntu/disco64"
  config.vm.box_url = "https://app.vagrantup.com/ubuntu/boxes/disco64"

  config.vm.network "forwarded_port", guest: 5000, host: 5000

  # Let git know who we are
  config.vm.provision "file", source: "#{home_path}/.gitconfig", destination: ".gitconfig", run: "always"

  # Install docker in the guest
  config.vm.provision "docker" do |d|
  end

  # Custom provisioning
  config.vm.provision "shell", inline: <<-SHELL
    # Add the Microsoft package repo
    curl https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > /etc/apt/trusted.gpg.d/microsoft.gpg
    sh -c 'echo "deb [arch=amd64] https://packages.microsoft.com/repos/vscode stable main" > /etc/apt/sources.list.d/vscode.list'

    # Better node and npm source
    curl -sL https://deb.nodesource.com/setup_10.x | bash -

    # Install necessary packages
    apt update
    DEBIAN_FRONTEND=noninteractive apt install -y git golang-1.12 nodejs make code xubuntu-core

    # Allow our user to interact with docker engine
    usermod -aG docker vagrant

    # Increase the amount of inotify watchers
    echo fs.inotify.max_user_watches=65536 | tee -a /etc/sysctl.conf && sysctl -p
  SHELL

  # Reboot so that we get the GUI on the first up
  config.vm.provision :reload

  config.vm.provider "virtualbox" do |vb|
    vb.gui = true
    vb.memory = "4096"

    if Vagrant::Util::Platform.windows? then
      # Make symlinks work even when on a Windows host.
      # This requires that you launch the VM as an admin
      vb.customize ["setextradata", :id, "VBoxInternal2/SharedFoldersEnableSymlinksCreate/vagrant", "1"]
    end

    # Prevent cloudimg-console.log from being written
    vb.customize [ "modifyvm", :id, "--uartmode1", "disconnected" ]
  end
end
