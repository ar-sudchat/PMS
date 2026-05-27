# PMS Console — คู่มือ deploy ขึ้น Windows Server (เวอร์ชันละเอียด)

โครงร่างนี้เอาไปใช้กับโครงการ Next.js อื่นได้ — โดยเปลี่ยน path, secret, ชื่อ service ให้ตรงโครงการนั้น

---

## 1. โครงสร้างที่ deploy

```
ระบบ        Next.js standalone bundle + Node.js portable
Target      Windows Server (ภายในองค์กร, ไม่เปิดเน็ตภายนอก)
DB          MSSQL ที่เครื่องอื่น (เชื่อมผ่าน private network)
Service     Scheduled Task แบบ ONSTART → start เองตอนเปิดเครื่อง
ภาษา        TypeScript / React / SQL Server
```

ไม่ใช้ Docker, ไม่ใช้ Coolify, ไม่ใช้ cloud — รันเป็น Node process บน Windows ตรง ๆ

---

## 2. สิ่งที่ต้องมีก่อน deploy

| ฝั่ง dev (Mac/Linux) | ฝั่ง server (Windows) |
|---|---|
| Node.js 20+ (สำหรับ build) | Administrator login |
| npm install เสร็จแล้ว | RDP port เปิด (ค่าเริ่มต้น 3389) |
| `next.config.ts` ตั้ง `output: 'standalone'` | Firewall เปิด port ที่ app ฟัง (ค่าตั้งต้น 3000) |
| zip / curl | network ที่เข้าถึง MSSQL ได้ |
| สิทธิ์เขียน SMB share `\\<server>\<staging>` (ถ้าใช้) | (option) SMB share สำหรับ staging |

---

## 3. โครงสร้างโฟลเดอร์ในชุด deploy

```
deploy-windows/
├── INSTALL.txt              คู่มือเวอร์ชันสั้น (ภายในซองติดตั้ง)
├── DEPLOY.md                ไฟล์นี้
├── build-and-package.sh     สคริปต์ build ฝั่ง Mac
├── config.env.example       template environment vars
├── config.env               !! ไฟล์จริง — gitignored, ใส่ secret
├── install.bat              ติดตั้งครั้งแรก (รัน admin)
├── update.bat               อัปเดต version ใหม่ (รัน admin)
├── deploy.ps1               สคริปต์ update แบบ PowerShell (เลือกใช้ตัวใดตัวหนึ่ง)
├── start.bat / stop.bat     สั่ง start/stop service ด้วยมือ
├── uninstall.bat            ถอนการติดตั้ง
├── app/                     Next.js standalone bundle (สร้างจาก build)
└── node/                    Node.js 20 portable for Windows (สร้างจาก build)
```

หลังติดตั้ง บน server จะมีโครงสร้าง:

```
C:\PMS\
├── app/                     ตัวโปรแกรม (overwrite ทุก deploy)
├── app.bak/                 backup ของ deploy ก่อนหน้า (auto-rotated)
├── app.bak.prev/            backup ของ deploy ก่อนหน้าอีกชั้น
├── node/                    Node.js runtime (ทำครั้งเดียว)
├── config.env               environment vars (ห้ามแตะ)
└── pms.log                  log จาก service
```

---

## 4. ขั้นตอน deploy ครั้งแรก (First-time install)

### 4.1 บน Mac (dev) — สร้าง zip

```bash
cd /path/to/your-project

# ทดสอบ build ก่อนว่าไม่ error
npm run build

# สร้าง deploy package
bash deploy-windows/build-and-package.sh

# จะได้ไฟล์ deploy-windows-YYYYMMDD-HHMM.zip ที่ root (~50–60 MB)
```

ภายในสคริปต์จะทำ:
1. `next build` (output: standalone)
2. ดาวน์โหลด Node.js 20 Windows x64 portable
3. swap native binary ของ `sharp` จาก darwin/linux → win32-x64
4. ลบ binary `@next/swc-*` ที่ใช้แค่ตอน build
5. zip ทั้งโฟลเดอร์ `deploy-windows/`

### 4.2 บน Mac — push zip ขึ้น staging (ถ้าใช้ SMB)

```bash
mkdir -p /tmp/server-share
mount_smbfs "//<user>@<server-ip>/<share-name>" /tmp/server-share
# ใส่ password ตอนถาม

cp /path/to/your-project/deploy-windows-*.zip       /tmp/server-share/PMS-Deploy/
cp /path/to/your-project/deploy-windows/deploy.ps1  /tmp/server-share/PMS-Deploy/
```

ถ้าไม่มี SMB share ให้ส่งไฟล์ผ่าน USB / RDP file copy / OneDrive / Google Drive แทน

### 4.3 บน server (RDP) — ติดตั้ง

1. RDP เข้าเครื่อง server
2. แตก zip จะได้โฟลเดอร์ `deploy-windows/` (ไว้บน Desktop ก็ได้)
3. เปิดโฟลเดอร์ → copy `config.env.example` เป็น `config.env`
4. เปิด `config.env` ด้วย Notepad แก้ค่า:
   ```bat
   set DB_PASSWORD=<รหัสจริง>
   set JWT_SECRET=<random 48 ตัวอักษร>
   set NEXTAUTH_SECRET=<random 48 ตัวอักษร>
   set NEXTAUTH_URL=http://<server-ip>:<port>
   ```
   สร้าง random string ใน PowerShell:
   ```powershell
   -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 48 | % {[char]$_})
   ```
5. คลิกขวา `install.bat` → **Run as administrator**
6. รอ ~30 วินาที สังเกตข้อความ:
   ```
   [1/6] Copying files to C:\PMS\
   [2/6] Verifying bundled Node.js
   [3/6] Verifying app bundle
   [4/6] Configuring Windows Firewall
   [5/6] Registering autostart
   [6/6] Pre-flight + start
   PMS Console is running. URL: http://<server-ip>:3000/
   ```
7. เปิดเบราว์เซอร์ทดสอบหน้า login

### 4.4 ที่ `install.bat` ทำให้

| Step | คำสั่ง | ผล |
|---|---|---|
| Copy | `xcopy /E /Y /I /Q` | คัดลอกโฟลเดอร์ทั้งหมดไป `C:\PMS\` |
| Firewall | `netsh advfirewall firewall add rule` | เปิด port 3000 inbound |
| Autostart | `schtasks /Create /TN PMSConsole /SC ONSTART /RU SYSTEM /RL HIGHEST` | สร้าง scheduled task ที่รันเองตอนเปิดเครื่อง |
| Start | รัน `start.bat` background | เปิด service ครั้งแรก |
| Ping | HTTP GET `localhost:3000` | ตรวจว่าตอบ |

---

## 5. ขั้นตอน update (deploy version ใหม่)

### 5.1 บน Mac — build zip ใหม่

เหมือนข้อ 4.1 — ได้ zip ใหม่ที่มี timestamp

### 5.2 บน Mac — push ขึ้น staging

```bash
cp deploy-windows-*.zip /tmp/server-share/PMS-Deploy/
```

### 5.3 บน server (RDP) — เลือก 1 ใน 2 วิธี

**วิธี A — ใช้ `update.bat` (เก่า, batch script):**
- คลิกขวา `update.bat` → Run as administrator
- ทำ: stop → backup `C:\PMS\app` → app.bak → copy app ใหม่ → start

**วิธี B — ใช้ `deploy.ps1` (ใหม่, PowerShell, แนะนำ):**
```powershell
# เปิด PowerShell แบบ Run as administrator
Set-ExecutionPolicy -Scope Process Bypass -Force
cd 'C:\path\to\PMS-Deploy'
.\deploy.ps1
```

`deploy.ps1` ดีกว่า `update.bat` ที่:
- Auto-pick zip ใหม่สุดในโฟลเดอร์ — ไม่ต้องแก้ path ทุกรอบ
- Rotate backup 2 ชั้น (app.bak / app.bak.prev) — rollback ได้ 2 รุ่น
- Kill เฉพาะ `node.exe` ที่รูทจาก `C:\PMS\` — ไม่ kill Node อื่น
- Pre-flight HTTP ping พร้อมข้อความ rollback ถ้า fail

**สำคัญ:** `config.env` ของเดิมไม่ถูกแตะตอน update — secrets ปลอดภัย

---

## 6. Rollback (กรณี version ใหม่ใช้ไม่ได้)

```powershell
Stop-Process -Name node -Force
Rename-Item C:\PMS\app          C:\PMS\app.broken
Rename-Item C:\PMS\app.bak      C:\PMS\app
& C:\PMS\start.bat
```

ถ้าจะถอยลงไปอีกขั้น (สอง deploy ก่อนหน้า):
```powershell
Rename-Item C:\PMS\app.bak.prev C:\PMS\app
```

---

## 7. การจัดการ service หลังติดตั้ง

| คำสั่ง | ทำอะไร |
|---|---|
| `C:\PMS\start.bat` | start service ด้วยมือ |
| `C:\PMS\stop.bat` | stop service |
| `schtasks /Query /TN PMSConsole /V` | ดูสถานะ scheduled task |
| `schtasks /Run /TN PMSConsole` | trigger autostart task |
| `schtasks /End /TN PMSConsole` | สั่ง task หยุด |
| `Get-Process node` | ดู Node process ที่รันอยู่ |

Log อยู่ที่ `C:\PMS\pms.log` — รวม stdout/stderr ของ Node

---

## 8. Troubleshooting

| ปัญหา | สาเหตุที่มักเจอ | วิธีตรวจ/แก้ |
|---|---|---|
| เปิด URL ไม่ขึ้น | service ไม่ start | ดู `C:\PMS\pms.log`; `tasklist | findstr node.exe` |
| Connect DB ไม่ได้ | config.env ผิด หรือ network block | `telnet <db-ip> 1433`; ตรวจ DB_SERVER/USER/PASSWORD |
| หลัง reboot ไม่ start | schtasks ไม่ได้ตั้ง / not running as SYSTEM | `schtasks /Query /TN PMSConsole /V`; รัน install.bat ใหม่ |
| Port 3000 ถูกใช้ | process อื่นใช้ port อยู่ | `netstat -ano | findstr :3000`; เปลี่ยน PORT ใน config.env |
| Firewall block | rule ไม่ได้สร้าง | `netsh advfirewall firewall show rule name="PMS Console"` |
| Upload file ไม่ได้ | service account ไม่มีสิทธิ์เข้า network share | ตรวจ permission ของ SYSTEM ต่อ `\\<file-share>` |

---

## 9. การปรับใช้กับโครงการอื่น

ใช้ Template เดียวกัน — ปรับ 7 จุดตามนี้:

1. **ชื่อ install dir** ใน `install.bat`, `update.bat`, `deploy.ps1`
   ```
   set "INSTALL_DIR=C:\PMS"   →   set "INSTALL_DIR=C:\<NEW_APP>"
   ```
2. **ชื่อ scheduled task**:
   ```
   set "TASK_NAME=PMSConsole" →   set "TASK_NAME=<NEW_APP>Console"
   ```
3. **ชื่อ firewall rule** + port (ถ้าไม่ใช่ 3000):
   ```
   set "FW_RULE=PMS Console" + set "PORT=3000"
   ```
4. **config.env.example** — เปลี่ยนค่า default ให้ตรงโครงการใหม่ (DB host, secret name, file storage path)
5. **build-and-package.sh** — ตรวจว่าโครงการใหม่:
   - มี `next.config.ts` ตั้ง `output: 'standalone'`
   - ใช้ `sharp` หรือไม่ (ถ้าไม่ใช้ ลบ Step 4 ที่ swap sharp binary ออก)
6. **เพิ่ม env vars** ใน `config.env.example` ที่โครงการใหม่ต้องการ
7. **DEPLOY.md** — เปลี่ยนชื่อระบบ, IP, port ในคู่มือ

---

## 10. ความปลอดภัย (สำคัญ)

- `config.env` มี DB password และ JWT secret — **ห้ามขึ้น git** (.gitignored แล้ว) และ **ห้ามทิ้งไว้บน SMB staging ถาวร**
- หลัง deploy เสร็จ ลบไฟล์ `config.env`, old zip, debug `.bat` ที่ค้างไว้บน staging ออก เหลือเฉพาะ `config.env.example`
- Server เปิดเฉพาะ port ที่ใช้งานจริง (3000 inbound), อย่าเปิด admin shares ออกเน็ตภายนอก
- ถ้า scheduled task รันด้วย SYSTEM ให้แน่ใจว่ามีสิทธิ์ขั้นต่ำจริง ๆ ที่ต้องใช้เท่านั้น

---

## 11. ที่อยู่ของไฟล์สำคัญ (สำหรับ PMS เท่านั้น)

| ไฟล์ | ตำแหน่ง |
|---|---|
| Production app | `192.168.88.98:C:\PMS\` |
| Production URL | http://192.168.88.98:3000/ |
| Production DB | MSSQL บน `10.8.8.88` (DB: `MoveonDB`) |
| File storage | `\\10.8.8.88\ftp\pms\` |
| Staging share | `\\192.168.88.98\DBShared\PMS-Deploy\` |
| Service name | `PMSConsole` (scheduled task) |
| Log | `C:\PMS\pms.log` |
