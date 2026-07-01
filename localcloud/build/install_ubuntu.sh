#!/bin/bash
# install_ubuntu.sh - Auto-build and install LocalCloud on Ubuntu/Debian

set -e

echo "=== LocalCloud Auto-Build and Installer for Ubuntu ==="

# 1. Install prerequisites
echo "Installing GTK and WebKitGTK build dependencies..."
sudo apt update
sudo apt install -y build-essential libgtk-3-dev libwebkit2gtk-4.0-dev pkg-config git

# 2. Install Go and Node
echo "Installing Go and Node.js..."
sudo snap install go --classic
sudo snap install node --classic

# Ensure Go path is loaded
export PATH=$PATH:/snap/bin:$(go env GOPATH)/bin

# 3. Install Wails CLI
echo "Installing Wails CLI..."
go install github.com/wailsapp/wails/v2/cmd/wails@latest

# 4. Compile and package the app
# Move to the localcloud project directory
cd "$(dirname "$0")/.."

if [ -f "wails.json" ]; then
    echo "Building application..."
    wails build
    
    echo "Creating .deb installer package..."
    chmod +x build/package_deb.sh
    ./build/package_deb.sh
else
    echo "Error: Please run this script from the localcloud folder."
    exit 1
fi

echo "=== LocalCloud Build Complete! ==="
echo "The compiled .deb package is located at: build/bin/localcloud_1.0.0_amd64.deb"
