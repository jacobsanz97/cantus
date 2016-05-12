# -*- mode: ruby -*-
# vi: set ft=ruby :

Vagrant.configure(2) do |config|
  config.vm.box = "ubuntu/trusty32"

  config.vm.network :forwarded_port, guest: 8000, host: 8000
  config.vm.network :forwarded_port, guest: 22, host: 2223, id: "ssh"

  # Solr Port, needed to access admin page
  config.vm.network :forwarded_port, guest: 8080, host: 8080

  config.vm.provision "shell", privileged: false, path: "etc/provision/setup.sh", args: ["/vagrant"]

  config.vm.provider "virtualbox" do |vb|
    vb.customize ["modifyvm", :id, "--ioapic", "on"]
    vb.customize ["modifyvm", :id, "--cpus", "4"]
    vb.customize ["modifyvm", :id, "--memory", "2048"]
  end
end
