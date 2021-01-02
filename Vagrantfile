# -*- mode: ruby -*-
# vi: set ft=ruby :

Vagrant.require_plugin "vagrant-reload"

home_path = "~"
if ENV['HOMESHARE']
  home_path = ENV['HOMESHARE']
end

Vagrant.configure("2") do |config|
  config.vm.box = "generic/ubuntu2010"

  config.vm.network "forwarded_port", guest: 5000, host: 5000

  # Let git know who we are
  config.vm.provision "file", source: "#{home_path}/.gitconfig", destination: ".gitconfig", run: "always"

  # Install docker in the guest
  config.vm.provision "docker" do |d|
  end

  # Custom provisioning
  config.vm.provision "shell", inline: <<-SHELL
    # Install necessary packages
    apt update
    DEBIAN_FRONTEND=noninteractive apt install -y git make xubuntu-core
    snap install go --classic
    snap install node --classic
    snap install code --classic

    # Allow our user to interact with docker engine
    usermod -aG docker vagrant

    # Increase the amount of inotify watchers
    echo fs.inotify.max_user_watches=65536 | tee -a /etc/sysctl.conf && sysctl -p
  SHELL

  # Reboot so that we get the GUI on the first up
  config.vm.provision :reload

  config.vm.provider "libvirt" do |lv, override|
    lv.memory = "4096"

    override.vm.synced_folder './', '/vagrant', type: '9p', disabled: false, accessmode: "mapped"
  end

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
