# ============================================================
#  PMS Console - One-shot Update Script (PowerShell)
#
#  Run on Windows Server 192.168.88.98 as Administrator
#  AFTER copying the deploy-windows-YYYYMMDD-HHMM.zip somewhere accessible.
#
#  Edit the $ZipPath below, then:
#    Right-click PowerShell -> Run as administrator
#    PS> Set-ExecutionPolicy -Scope Process Bypass -Force
#    PS> .\deploy.ps1
#
#  What it does:
#    1. Stop existing service (kill node.exe + end scheduled task)
#    2. Rotate backup: app.bak.prev -> deleted; app.bak -> app.bak.prev; app -> app.bak
#    3. Extract zip to %TEMP%\pms-deploy
#    4. Copy app/ (and node/ if changed) into C:\PMS\
#    5. Preserve C:\PMS\config.env (NEVER touched)
#    6. Start service via schtasks /Run
#    7. HTTP ping localhost:3000 — show OK / FAIL
# ============================================================

# By default, picks the newest deploy-windows-*.zip in the SAME folder as this script.
# Override $ZipPath manually if you want a specific build.
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ZipPath   = (Get-ChildItem -Path $ScriptDir -Filter "deploy-windows-*.zip" |
              Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName

$Install  = "C:\PMS"
$TaskName = "PMSConsole"
$Port     = 3000
$Temp     = Join-Path $env:TEMP "pms-deploy"

function Step([string]$msg) { Write-Host "==> $msg" -ForegroundColor Cyan }
function Ok([string]$msg)   { Write-Host "    [OK] $msg" -ForegroundColor Green }
function Warn([string]$msg) { Write-Host "    [WARN] $msg" -ForegroundColor Yellow }
function Fail([string]$msg) { Write-Host "    [FAIL] $msg" -ForegroundColor Red; exit 1 }

if (-not (Test-Path $ZipPath)) { Fail "Zip not found: $ZipPath  (edit `$ZipPath at top of script)" }
if (-not (Test-Path $Install)) { Fail "$Install does not exist. Run install.bat for first-time install." }

# 1. Stop service
Step "Stopping PMS service ..."
schtasks /End /TN $TaskName 2>$null | Out-Null
Get-Process node -ErrorAction SilentlyContinue | Where-Object {
    $_.Path -and $_.Path.StartsWith($Install)
} | ForEach-Object { Stop-Process -Id $_.Id -Force; Ok "Killed node.exe PID $($_.Id)" }
Start-Sleep -Seconds 2

# 2. Rotate backups
Step "Rotating backups ..."
$App     = Join-Path $Install "app"
$AppBak  = Join-Path $Install "app.bak"
$AppPrev = Join-Path $Install "app.bak.prev"
if (Test-Path $AppPrev) { Remove-Item -Recurse -Force $AppPrev; Ok "Removed app.bak.prev" }
if (Test-Path $AppBak)  { Rename-Item $AppBak $AppPrev;        Ok "app.bak -> app.bak.prev" }
if (Test-Path $App)     { Rename-Item $App $AppBak;            Ok "app -> app.bak" }

# 3. Extract zip
Step "Extracting $ZipPath ..."
if (Test-Path $Temp) { Remove-Item -Recurse -Force $Temp }
New-Item -ItemType Directory -Force -Path $Temp | Out-Null
Expand-Archive -LiteralPath $ZipPath -DestinationPath $Temp -Force
$Src = Join-Path $Temp "deploy-windows"
if (-not (Test-Path $Src)) { Fail "Extracted folder $Src not found — zip layout unexpected." }

# 4. Copy app (always) + node (only if missing on server)
Step "Copying app/ -> $Install\app ..."
Copy-Item -Recurse -Force (Join-Path $Src "app") $Install
Ok "app/ copied"

if (-not (Test-Path (Join-Path $Install "node\node.exe"))) {
    Step "Copying node/ (first-time) ..."
    Copy-Item -Recurse -Force (Join-Path $Src "node") $Install
    Ok "node/ copied"
} else {
    Ok "node/ already present, skipped"
}

# 5. config.env preserved (do nothing — never touch it)
if (Test-Path (Join-Path $Install "config.env")) {
    Ok "config.env preserved"
} else {
    Warn "config.env MISSING — copy from deploy-windows/config.env.example and edit before service can start"
}

# 6. Start
Step "Starting service ..."
$started = schtasks /Run /TN $TaskName 2>&1
if ($LASTEXITCODE -ne 0) {
    Warn "schtasks /Run failed: $started — falling back to direct start.bat"
    Start-Process -FilePath (Join-Path $Install "start.bat") -WindowStyle Hidden
}
Start-Sleep -Seconds 8

# 7. HTTP ping
Step "Checking http://localhost:$Port/ ..."
try {
    $resp = Invoke-WebRequest -Uri "http://localhost:$Port/" -UseBasicParsing -TimeoutSec 10
    if ($resp.StatusCode -lt 500) {
        Ok "HTTP $($resp.StatusCode) — service is up"
        Write-Host ""
        Write-Host "============================================================" -ForegroundColor Green
        Write-Host " Deploy SUCCESS — http://192.168.88.98:$Port/" -ForegroundColor Green
        Write-Host " Rollback: stop -> rename app.bak -> app -> start" -ForegroundColor Gray
        Write-Host "============================================================" -ForegroundColor Green
    } else {
        Warn "HTTP $($resp.StatusCode) — server responded but with server error. Check $Install\pms.log"
    }
} catch {
    Warn "Could not reach localhost:$Port — $_"
    Write-Host "Check log: $Install\pms.log" -ForegroundColor Yellow
    Write-Host "Rollback:  Stop-Process node; Rename-Item $App $App.broken; Rename-Item $AppBak $App; start.bat" -ForegroundColor Yellow
}
