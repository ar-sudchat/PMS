@echo off
REM ============================================================
REM  PMS Console - Start
REM ============================================================
setlocal

REM Move to the folder this script lives in
cd /d "%~dp0"

REM Load environment variables
if exist "config.env" (
    call "config.env"
) else (
    echo [ERROR] config.env not found. Copy config.env.example to config.env and edit.
    exit /b 1
)

REM Sanity-check bundled Node.js
if not exist "node\node.exe" (
    echo [ERROR] node\node.exe not found. Did install.bat run successfully?
    exit /b 1
)

REM Sanity-check app bundle
if not exist "app\server.js" (
    echo [ERROR] app\server.js not found. The standalone build is missing.
    exit /b 1
)

echo Starting PMS Console on http://%HOSTNAME%:%PORT% ...
"%~dp0node\node.exe" "%~dp0app\server.js"

endlocal
