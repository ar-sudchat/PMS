#!/usr/bin/env bash
# =============================================================
# migrate-db-export.sh — Take a .bak from the existing MSSQL host
# (10.8.8.88 / MoveonDB) using a temporary container with sqlcmd.
#
# Run from your Mac while connected to the office VPN. Output is
# written to scripts/dump/MoveonDB-<timestamp>.bak which you then
# scp to the VPS for restore.
#
# Usage:
#   ./scripts/migrate-db-export.sh
#
# Env overrides (optional):
#   SRC_HOST   default 10.8.8.88
#   SRC_USER   default sa
#   SRC_PASS   default reads from .env  (DB_PASSWORD)
#   SRC_DB     default MoveonDB
# =============================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DUMP_DIR="$ROOT_DIR/scripts/dump"
mkdir -p "$DUMP_DIR"

# Load .env if it exists (only the variables we need)
if [[ -f "$ROOT_DIR/.env" ]]; then
  # shellcheck disable=SC1091
  set -a; . "$ROOT_DIR/.env"; set +a
fi

SRC_HOST="${SRC_HOST:-10.8.8.88}"
SRC_USER="${SRC_USER:-sa}"
SRC_PASS="${SRC_PASS:-${DB_PASSWORD:-}}"
SRC_DB="${SRC_DB:-MoveonDB}"

if [[ -z "$SRC_PASS" ]]; then
  echo "ERROR: source password missing. Set SRC_PASS env var or DB_PASSWORD in .env" >&2
  exit 1
fi

STAMP=$(date +%Y%m%d-%H%M%S)
REMOTE_BAK="/var/opt/mssql/backup/${SRC_DB}-${STAMP}.bak"
LOCAL_BAK="$DUMP_DIR/${SRC_DB}-${STAMP}.bak"

echo "[1/3] Asking ${SRC_HOST} to take a BACKUP DATABASE..."

# We use the official tools image and just connect over the network.
docker run --rm \
  mcr.microsoft.com/mssql-tools:latest \
  /opt/mssql-tools/bin/sqlcmd \
    -S "$SRC_HOST" -U "$SRC_USER" -P "$SRC_PASS" -C \
    -Q "BACKUP DATABASE [$SRC_DB] TO DISK = N'$REMOTE_BAK' WITH INIT, COMPRESSION, FORMAT, STATS = 10;"

echo "[2/3] Copying ${REMOTE_BAK} off the server..."
# The source MSSQL host already exposes \\10.8.8.88\ftp — we use that share
# to fetch the .bak. If your environment differs, scp/cifs-mount this file
# manually instead.
if command -v smbclient >/dev/null 2>&1; then
  smbclient "//${SRC_HOST}/ftp" "$SRC_PASS" -U "$SRC_USER" \
    -c "get backup/$(basename "$REMOTE_BAK") $LOCAL_BAK" \
    || echo "WARN: smbclient pull failed — please copy $REMOTE_BAK to $LOCAL_BAK manually"
else
  echo "WARN: smbclient not installed. Copy $REMOTE_BAK to $LOCAL_BAK manually."
  echo "      e.g. mount the FTP share and cp the .bak across."
fi

echo "[3/3] Done. Local dump: $LOCAL_BAK"
echo "Next step: scp $LOCAL_BAK hetzner:/tmp/ && run migrate-db-restore.sh on the VPS"
