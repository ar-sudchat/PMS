#!/usr/bin/env bash
# ============================================================
#  PMS Console - Build & Package for Windows Server
#
#  Run this on the Mac dev machine. It produces:
#    deploy-windows/node/   <- Node.js 20 portable (Windows x64)
#    deploy-windows/app/    <- Next.js standalone bundle + Win sharp binaries
#    deploy-windows-<date>.zip  <- shippable archive
#
#  Usage:
#    cd /Users/artit/PMS
#    ./deploy-windows/build-and-package.sh
# ============================================================
set -euo pipefail

NODE_VERSION="v20.18.1"
NODE_DIST="node-${NODE_VERSION}-win-x64"
NODE_URL="https://nodejs.org/dist/${NODE_VERSION}/${NODE_DIST}.zip"

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEPLOY_DIR="${PROJECT_ROOT}/deploy-windows"
APP_DIR="${DEPLOY_DIR}/app"
NODE_DIR="${DEPLOY_DIR}/node"
CACHE_DIR="${DEPLOY_DIR}/.cache"

cd "${PROJECT_ROOT}"

echo "==> [1/6] Cleaning previous build artifacts"
rm -rf "${APP_DIR}" "${NODE_DIR}"
mkdir -p "${CACHE_DIR}"

echo "==> [2/6] Running Next.js production build (standalone)"
# Skip OS-specific optional binaries during build (same trick as Dockerfile)
NEXT_TELEMETRY_DISABLED=1 npm run build

if [ ! -f "${PROJECT_ROOT}/.next/standalone/server.js" ]; then
    echo "ERROR: .next/standalone/server.js was not produced. Check next.config.ts has output: 'standalone'."
    exit 1
fi

echo "==> [3/6] Assembling app/ (standalone + static + public)"
mkdir -p "${APP_DIR}"
# Standalone bundle (server.js + minimal node_modules + .next/server)
cp -R "${PROJECT_ROOT}/.next/standalone/." "${APP_DIR}/"
# Static assets - go inside the standalone .next/static path
mkdir -p "${APP_DIR}/.next/static"
cp -R "${PROJECT_ROOT}/.next/static/." "${APP_DIR}/.next/static/"
# Public assets
if [ -d "${PROJECT_ROOT}/public" ]; then
    mkdir -p "${APP_DIR}/public"
    cp -R "${PROJECT_ROOT}/public/." "${APP_DIR}/public/"
fi

echo "==> [4/6] Swapping native binaries: darwin/linux -> win32-x64"
# Sharp (Next.js image optimization) ships platform-specific binaries.
# Pull the Windows variants in a temp project and copy them into app/node_modules.
TMP_SHARP="${CACHE_DIR}/sharp-win"
rm -rf "${TMP_SHARP}"
mkdir -p "${TMP_SHARP}"
pushd "${TMP_SHARP}" >/dev/null
cat > package.json <<'JSON'
{ "name": "sharp-fetch", "version": "1.0.0", "private": true }
JSON
# Force install of Windows x64 sharp binary on a non-Windows host
npm install --silent --no-audit --no-fund --os=win32 --cpu=x64 sharp >/dev/null 2>&1 || {
    echo "WARNING: failed to fetch Windows sharp - image optimization may not work on the server."
}
popd >/dev/null

if [ -d "${TMP_SHARP}/node_modules/@img" ]; then
    # Remove darwin/linux variants in standalone
    rm -rf "${APP_DIR}/node_modules/@img/sharp-darwin-"*
    rm -rf "${APP_DIR}/node_modules/@img/sharp-libvips-darwin-"*
    rm -rf "${APP_DIR}/node_modules/@img/sharp-linux-"*
    rm -rf "${APP_DIR}/node_modules/@img/sharp-libvips-linux-"*

    # Copy Windows variants in
    mkdir -p "${APP_DIR}/node_modules/@img"
    for d in "${TMP_SHARP}/node_modules/@img"/*win32*; do
        if [ -d "$d" ]; then
            cp -R "$d" "${APP_DIR}/node_modules/@img/"
            echo "    + copied $(basename "$d")"
        fi
    done
fi

# @next/swc - only needed at build time. Standalone runtime doesn't load it.
# Remove all darwin/linux swc binaries to keep bundle clean.
rm -rf "${APP_DIR}/node_modules/@next/swc-darwin-"* 2>/dev/null || true
rm -rf "${APP_DIR}/node_modules/@next/swc-linux-"* 2>/dev/null || true

# Next.js 16 Turbopack sometimes emits chunk file names with ':' in them
# (e.g. "lib_actions_data:3b55bf_0876070b._.js"). Colons are reserved on
# NTFS, so the zip blows up when extracted on Windows. Walk the bundle,
# rename any such files, and patch every manifest reference.
echo "    Patching colon-named Turbopack chunks for NTFS compatibility ..."
COLON_COUNT=0
# Use find -print0 / while-read to handle weird names without arrays (works on bash 3.2)
while IFS= read -r -d '' f; do
    COLON_COUNT=$((COLON_COUNT + 1))
    dir="$(dirname "$f")"
    old="$(basename "$f")"
    new="${old//:/__}"
    mv "$f" "$dir/$new"
    echo "      renamed $old -> $new"
    # Rewrite manifests / chunk maps that reference the old name
    grep -rl --include='*.json' --include='*.js' "$old" "${APP_DIR}" 2>/dev/null | while read -r mf; do
        LC_ALL=C sed -i '' "s|${old}|${new}|g" "$mf"
    done
done < <(find "${APP_DIR}" -name '*:*' -type f -print0 2>/dev/null)
if [ "$COLON_COUNT" -eq 0 ]; then
    echo "      no colon-named chunks (build is clean)"
fi

echo "==> [5/6] Downloading Node.js portable (${NODE_DIST})"
NODE_ZIP="${CACHE_DIR}/${NODE_DIST}.zip"
if [ ! -f "${NODE_ZIP}" ]; then
    echo "    Fetching ${NODE_URL}"
    curl -fsSL -o "${NODE_ZIP}" "${NODE_URL}"
fi
echo "    Extracting ..."
rm -rf "${CACHE_DIR}/node-extract"
mkdir -p "${CACHE_DIR}/node-extract"
unzip -q "${NODE_ZIP}" -d "${CACHE_DIR}/node-extract"
mkdir -p "${NODE_DIR}"
# Flatten: contents of node-vXX-win-x64/ -> deploy-windows/node/
cp -R "${CACHE_DIR}/node-extract/${NODE_DIST}/." "${NODE_DIR}/"
if [ ! -f "${NODE_DIR}/node.exe" ]; then
    echo "ERROR: node.exe not found after extraction."
    exit 1
fi

echo "==> [6/6] Creating shippable archive"
TS="$(date +%Y%m%d-%H%M)"
ARCHIVE_NAME="deploy-windows-${TS}.zip"
ARCHIVE_PATH="${PROJECT_ROOT}/${ARCHIVE_NAME}"

# Clean cache from the archive
rm -rf "${CACHE_DIR}"

pushd "${PROJECT_ROOT}" >/dev/null
# Archive the folder so it extracts as "deploy-windows/" on the target.
# Exclude .DS_Store and any leftover .cache.
zip -qr "${ARCHIVE_PATH}" deploy-windows \
    -x "deploy-windows/.cache/*" \
    -x "*.DS_Store"
popd >/dev/null

echo ""
echo "============================================================"
echo " Build complete"
echo "============================================================"
echo " Archive : ${ARCHIVE_PATH}"
echo " Size    : $(du -h "${ARCHIVE_PATH}" | cut -f1)"
echo ""
echo " Next steps:"
echo "   1. Copy ${ARCHIVE_NAME} to Windows Server 192.168.88.98"
echo "   2. Extract on Desktop"
echo "   3. cd deploy-windows"
echo "   4. Copy config.env.example -> config.env, edit DB password and secrets"
echo "   5. Right-click install.bat -> Run as administrator"
echo "============================================================"
