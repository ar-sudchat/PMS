#!/usr/bin/env bash
# =============================================================
# migrate-db-restore.sh — Restore a MoveonDB-*.bak file into the
# MSSQL container running on the VPS via Coolify.
#
# Run this ON THE VPS, after you have:
#   1) Provisioned an MSSQL container in Coolify (image:
#      mcr.microsoft.com/mssql/server:2022-latest)
#   2) Copied the .bak file to a path the container can see,
#      e.g.  /var/lib/docker/volumes/pms-mssql-data/_data/MoveonDB.bak
#      OR via Coolify "File Mount" feature.
#
# Usage:
#   sudo ./migrate-db-restore.sh <container-name> <path-to-bak-inside-container>
#
# Example:
#   sudo ./migrate-db-restore.sh pms-mssql /var/opt/mssql/backup/MoveonDB.bak
# =============================================================
set -euo pipefail

CONTAINER="${1:-pms-mssql}"
BAK_PATH="${2:-/var/opt/mssql/backup/MoveonDB.bak}"
TARGET_DB="${TARGET_DB:-MoveonDB}"

# Read SA password from the container's environment so it stays out of args.
SA_PASS=$(docker exec "$CONTAINER" printenv MSSQL_SA_PASSWORD || true)
if [[ -z "$SA_PASS" ]]; then
  echo "ERROR: Could not read MSSQL_SA_PASSWORD from container $CONTAINER" >&2
  echo "Pass it explicitly:  SA_PASS=... $0 $CONTAINER $BAK_PATH" >&2
  SA_PASS="${SA_PASS_OVERRIDE:-}"
fi

echo "[1/3] Inspecting $BAK_PATH for logical file names..."
LOGICAL_FILES=$(docker exec -i "$CONTAINER" \
  /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P "$SA_PASS" -C \
  -Q "RESTORE FILELISTONLY FROM DISK = N'$BAK_PATH';" -h -1 -W -s "|")

echo "$LOGICAL_FILES"

# Pull out the data + log logical names (first two rows of FILELISTONLY)
DATA_LOGICAL=$(echo "$LOGICAL_FILES" | awk -F'|' 'NR==1 {print $1}' | xargs)
LOG_LOGICAL=$(echo "$LOGICAL_FILES"  | awk -F'|' 'NR==2 {print $1}' | xargs)

echo "  data logical: $DATA_LOGICAL"
echo "  log  logical: $LOG_LOGICAL"

echo "[2/3] Restoring database $TARGET_DB ..."
docker exec -i "$CONTAINER" \
  /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P "$SA_PASS" -C \
  -Q "RESTORE DATABASE [$TARGET_DB] FROM DISK = N'$BAK_PATH'
       WITH MOVE N'$DATA_LOGICAL' TO N'/var/opt/mssql/data/${TARGET_DB}.mdf',
            MOVE N'$LOG_LOGICAL'  TO N'/var/opt/mssql/data/${TARGET_DB}_log.ldf',
            REPLACE, STATS = 10;"

echo "[3/3] Verifying..."
docker exec -i "$CONTAINER" \
  /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P "$SA_PASS" -C \
  -Q "SELECT name, state_desc FROM sys.databases WHERE name = N'$TARGET_DB';"

echo "Restore complete. Update Coolify env: DB_NAME=$TARGET_DB DB_SERVER=$CONTAINER"
