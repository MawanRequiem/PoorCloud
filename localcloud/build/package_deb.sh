#!/bin/bash
# package_deb.sh - Package Wails localcloud app into a .deb file for Ubuntu/Debian

set -e

# Move to the root of the localcloud project
cd "$(dirname "$0")/.."

# 1. Build the binary first
echo "Compiling the application..."
wails build

# 2. Setup Debian build directory structure
DEB_DIR="build/deb_package"
rm -rf "$DEB_DIR"
mkdir -p "$DEB_DIR"/DEBIAN
mkdir -p "$DEB_DIR"/usr/bin
mkdir -p "$DEB_DIR"/usr/share/applications
mkdir -p "$DEB_DIR"/usr/share/pixmaps

# 3. Copy files
echo "Copying compiled binary and assets..."
cp build/bin/localcloud "$DEB_DIR"/usr/bin/localcloud
cp build/appicon.png "$DEB_DIR"/usr/share/pixmaps/localcloud.png

# 4. Generate Debian Control File
echo "Generating DEBIAN/control file..."
cat <<EOF > "$DEB_DIR"/DEBIAN/control
Package: localcloud
Version: 1.0.0
Section: utils
Priority: optional
Architecture: amd64
Depends: libgtk-3-0, libwebkit2gtk-4.0-37
Maintainer: LocalCloud Maintainers <maintainer@localcloud.local>
Description: LocalCloud Desktop Reverse Tunnel Orchestrator.
 Orchestrate reverse tunnels and local OS resources with zero friction.
EOF

# 5. Generate Desktop Entry File
echo "Generating .desktop launcher file..."
cat <<EOF > "$DEB_DIR"/usr/share/applications/localcloud.desktop
[Desktop Entry]
Name=LocalCloud
Comment=Orchestrate reverse tunnels and local OS resources
Exec=/usr/bin/localcloud
Icon=localcloud
Terminal=false
Type=Application
Categories=Development;Utility;
EOF

# 6. Build the .deb package
echo "Building debian package..."
dpkg-deb --build "$DEB_DIR" build/bin/localcloud_1.0.0_amd64.deb

# 7. Cleanup
rm -rf "$DEB_DIR"

echo "Success! Package created at build/bin/localcloud_1.0.0_amd64.deb"
