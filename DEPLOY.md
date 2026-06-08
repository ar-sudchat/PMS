# PMS → Hetzner VPS + Coolify (with MSSQL) — Deploy Guide

This guide assumes you have already provisioned a Hetzner VPS the same way you
did for ClevrGold (Ubuntu 24.04, ufw, fail2ban, sudo user, Coolify installed).
The only differences from the ClevrGold playbook are:

- **Database is MSSQL 2022**, not Postgres.
- **File storage is a local volume** on the VPS at `/data/pms-files` (no SMB).
- **Domain** uses DuckDNS the same way (e.g. `pms.duckdns.org`).

---

## 0. One-time prerequisites on your VPS

```bash
# (Already done for ClevrGold — skip if Coolify is already up.)
ssh hetzner
sudo apt update && sudo apt -y upgrade
# verify Coolify UI: http://<vps-ip>:8000
```

Create the host folder that will back the file-attachment volume:

```bash
sudo mkdir -p /data/pms-files /data/pms-files-dev
sudo chown 1001:1001 /data/pms-files /data/pms-files-dev   # nextjs user inside container
```

---

## 1. Add the MSSQL container in Coolify

1. Coolify → **+ New Resource** → **Application** → **Docker Image**.
2. Image: `mcr.microsoft.com/mssql/server:2022-latest`
3. Name: `pms-mssql`
4. Environment:

   | Key | Value |
   |-----|-------|
   | `ACCEPT_EULA` | `Y` |
   | `MSSQL_SA_PASSWORD` | a strong password (≥8 chars, mixed case + digit + symbol) |
   | `MSSQL_PID` | `Developer`  *(or `Express` if you prefer)* |

5. **Volumes**: add a persistent volume mapping
   `/var/opt/mssql` → `pms-mssql-data` (Coolify will create the named volume).
6. **Network**: keep on the same Coolify project network as the app — they'll
   reach each other by service name (`pms-mssql`).
7. **Public**: only expose port `1433` publicly **if** you need to connect
   from your Mac for migration; otherwise leave it private.
8. Deploy → wait until status = healthy.

> Hardware: MSSQL Developer wants ~2 GB RAM. The CX23 (4 GB) is tight but OK
> if you don't also run another DB on it.

---

## 2. Restore the real database

Two halves: **export** from `10.8.8.88` (run on your Mac while on VPN), then
**restore** into the VPS container.

### 2a. Export `.bak` from the existing MSSQL host

```bash
cd ~/PMS
./scripts/migrate-db-export.sh
# → produces scripts/dump/MoveonDB-<timestamp>.bak
```

(The script asks `10.8.8.88` to write a `.bak` into its own backup directory,
then pulls it down over the existing FTP share. If your environment differs,
copy the `.bak` to your Mac however you usually would.)

### 2b. Ship the backup to the VPS

```bash
# Copy onto the host
scp scripts/dump/MoveonDB-*.bak hetzner:/tmp/

# Move it into the mssql container's backup directory (volume-backed)
ssh hetzner
sudo docker cp /tmp/MoveonDB-*.bak pms-mssql:/var/opt/mssql/backup/MoveonDB.bak
```

### 2c. Restore inside the container

```bash
# Still on the VPS:
cd /tmp
curl -O https://raw.githubusercontent.com/<your-user>/<repo>/main/scripts/migrate-db-restore.sh
# (or scp it: scp scripts/migrate-db-restore.sh hetzner:/tmp/)
chmod +x migrate-db-restore.sh
sudo ./migrate-db-restore.sh pms-mssql /var/opt/mssql/backup/MoveonDB.bak
```

You should see `state_desc = ONLINE` at the end.

### 2d. Point file storage at the Linux volume

Open Coolify → `pms-mssql` → **Terminal** (or use any MSSQL client) and run
`scripts/78_update_file_storage_paths_for_linux.sql`. Verify:

```sql
SELECT config_key, config_value FROM pms.system_configs
WHERE config_key LIKE 'FILE_STORAGE%';
-- FILE_STORAGE_PATH_PROD  /data/pms-files
-- FILE_STORAGE_PATH_DEV   /data/pms-files-dev
-- FILE_STORAGE_ACTIVE     PROD
```

> If you have file attachments worth keeping on the old NAS, mount the share
> once on your Mac, then `rsync` the contents to `hetzner:/data/pms-files/`
> before launching the app.

---

## 3. Deploy the PMS app in Coolify

1. Coolify → **+ New Resource** → **Public Repository** (or private with token).
2. Repository: your PMS git URL — branch `main`.
3. Build pack: **Dockerfile** (Coolify will detect the `Dockerfile` at the
   project root).
4. **Port**: `3000`.
5. **Volumes**: bind-mount the host folder so file attachments persist across
   deploys:

   | Source (host)          | Target (container) |
   |------------------------|--------------------|
   | `/data/pms-files`      | `/data/pms-files`  |
   | `/data/pms-files-dev`  | `/data/pms-files-dev` |

6. **Environment** (copy from `.env.example`, replace placeholders):

   ```
   DB_SERVER=pms-mssql
   DB_NAME=MoveonDB
   DB_USER=sa
   DB_PASSWORD=<same as MSSQL_SA_PASSWORD>
   DB_PORT=1433
   JWT_SECRET=<openssl rand -base64 48>
   NEXTAUTH_SECRET=<openssl rand -base64 48>
   NEXTAUTH_URL=https://pms.duckdns.org
   NEXT_TELEMETRY_DISABLED=1
   ```

7. **Domain**:
   - Register `pms.duckdns.org` (or whatever subdomain you like) in DuckDNS,
     A record → the VPS IP.
   - In Coolify, set the application FQDN to `https://pms.duckdns.org` —
     Traefik will issue a Let's Encrypt cert automatically.

8. Deploy.

The first build takes 3–5 min. When it's done, open
`https://pms.duckdns.org` and log in.

---

## 4. Sanity checks after first deploy

- Log in with a known account.
- Open **Settings → File Storage** — paths should read `/data/pms-files`.
- Upload a small test file from any project; verify it lands under
  `/data/pms-files/` on the host (`ls -la /data/pms-files/` over SSH).
- Open `/team-tracking`, create a tracking entry, refresh — entry persists.
- Check Coolify "Scheduled Backups" — add a daily backup on `pms-mssql`.

---

## 5. Operations

| Task | How |
|------|-----|
| Deploy a code change | `git push` → Coolify → **Deploy** on the app card |
| DB backup | Coolify Scheduled Backups → daily → 30 retained |
| Restore from backup | `docker cp` the `.bak` into the container, run `RESTORE DATABASE` |
| View app logs | Coolify → app → **Logs** |
| View DB logs | Coolify → `pms-mssql` → **Logs** |
| Rotate DB password | Update `MSSQL_SA_PASSWORD` on `pms-mssql` + `DB_PASSWORD` on the app → redeploy both |

---

## 6. Loose ends to watch

- **Initial files migration** — the new `/data/pms-files` starts empty. If old
  attachments matter, rsync them from `\\10.8.8.88\ftp\pms` before users
  start uploading.
- **SA account** — Coolify exposes `1433` publicly only if you toggle it on.
  Leave it private after migration; access via Coolify terminal or `docker exec`.
- **Memory** — MSSQL Developer on 4 GB is tight. Watch `free -h`; consider
  CX33 if the app + DB together push above 3 GB used.
- **MSSQL EULA** — `ACCEPT_EULA=Y` is required by Microsoft for the container
  to start. Confirm your licensing fits (`Developer` is free for non-prod /
  internal use; `Express` is free up to 10 GB).
