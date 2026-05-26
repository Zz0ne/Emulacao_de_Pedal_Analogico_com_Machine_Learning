#!/usr/bin/env bash
set -e

install_linux_deps() {
    if command -v apt &>/dev/null; then
        sudo apt install -y \
            libwebkit2gtk-4.1-dev \
            libasound2-dev \
            || sudo apt install -y \
            libwebkit2gtk-4.0-dev \
            libasound2-dev
    elif command -v dnf &>/dev/null; then
        sudo dnf install -y \
            webkit2gtk4.1-devel \
            gtk3-devel \
            alsa-lib-devel \
            || sudo dnf install -y \
            webkit2gtk3-devel \
            gtk3-devel \
            alsa-lib-devel
    elif command -v pacman &>/dev/null; then
        sudo pacman -S --noconfirm webkit2gtk alsa-lib
    else
        echo "Unsupported distro — install webkit2gtk and alsa dev packages manually then re-run."
        exit 1
    fi
}

if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    install_linux_deps
elif [[ "$OSTYPE" == "darwin"* ]]; then
    echo "macOS — WebKit is built-in, no dependencies needed."
elif [[ "$OSTYPE" == "msys"* || "$OSTYPE" == "win32" ]]; then
    echo "Windows — WebView2 runtime required (pre-installed on Win11/Win10 post-2022)."
fi

# Detect webkit version for CMake
if pkg-config --exists webkit2gtk-4.1 2>/dev/null; then
    WEBKIT_PKG="webkit2gtk-4.1"
elif pkg-config --exists webkit2gtk-4.0 2>/dev/null; then
    WEBKIT_PKG="webkit2gtk-4.0"
else
    WEBKIT_PKG=""
fi

CMAKE_ARGS="-DCMAKE_BUILD_TYPE=Release"
[[ -n "$WEBKIT_PKG" ]] && CMAKE_ARGS="$CMAKE_ARGS -DJUCE_WEBVIEW2_PACKAGE_NAME=$WEBKIT_PKG"

cmake -B cmake-build-release $CMAKE_ARGS
cmake --build cmake-build-release --config Release -- -j$(nproc 2>/dev/null || sysctl -n hw.ncpu)

echo ""
echo "Build complete."