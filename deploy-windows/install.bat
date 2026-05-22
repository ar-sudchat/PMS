@echo off
REM ============================================================
REM  PMS Console - One-click Installer
REM
REM  Steps:
REM   1. Copy current folder -> C:\PMS\
REM   2. Verify bundled Node.js runs
REM   3. Verify app bundle is intact
REM   4. Open Windows Firewall port (admin) or fallback to user
REM   5. Register autostart (Task Scheduler / SYSTEM, or HKCU\Run)
REM   6. Start the service + ping localhost as a sanity check
REM ============================================================
setlocal EnableExtensions EnableDelayedExpansion

set "INSTALL_DIR=C:\PMS"
set "TASK_NAME=PMSConsole"
set "FW_RULE=PMS Console"
set "PORT=3000"

REM ----- Step 1: copy files -----
echo.
echo [1/6] Copying files to %INSTALL_DIR% ...
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"
xcopy "%~dp0*" "%INSTALL_DIR%\" /E /Y /I /Q >nul
if errorlevel 1 (
    echo   ERROR: xcopy failed.
    exit /b 1
)

REM Bootstrap config.env if missing
if not exist "%INSTALL_DIR%\config.env" (
    if exist "%INSTALL_DIR%\config.env.example" (
        copy "%INSTALL_DIR%\config.env.example" "%INSTALL_DIR%\config.env" >nul
        echo   * Created config.env from example. EDIT IT before starting the service.
    )
)

REM ----- Step 2: verify Node.js -----
echo.
echo [2/6] Verifying bundled Node.js ...
if not exist "%INSTALL_DIR%\node\node.exe" (
    echo   ERROR: %INSTALL_DIR%\node\node.exe not found.
    exit /b 1
)
"%INSTALL_DIR%\node\node.exe" --version
if errorlevel 1 (
    echo   ERROR: bundled Node.js failed to run.
    exit /b 1
)

REM ----- Step 3: verify app bundle -----
echo.
echo [3/6] Verifying app bundle ...
if not exist "%INSTALL_DIR%\app\server.js" (
    echo   ERROR: %INSTALL_DIR%\app\server.js missing.
    exit /b 1
)
if not exist "%INSTALL_DIR%\app\.next" (
    echo   ERROR: %INSTALL_DIR%\app\.next missing.
    exit /b 1
)
echo   * App bundle OK.

REM ----- Step 4: firewall -----
echo.
echo [4/6] Configuring Windows Firewall ...
net session >nul 2>&1
if %ERRORLEVEL%==0 (
    REM Running as admin
    netsh advfirewall firewall delete rule name="%FW_RULE%" >nul 2>&1
    netsh advfirewall firewall add rule name="%FW_RULE%" dir=in action=allow protocol=TCP localport=%PORT% profile=any >nul
    if errorlevel 1 (
        echo   WARNING: firewall rule add failed.
    ) else (
        echo   * Firewall rule "%FW_RULE%" added on port %PORT%.
    )
    set "IS_ADMIN=1"
) else (
    echo   * Not running as Administrator - skipping firewall.
    echo     To open the port later, run as admin:
    echo       netsh advfirewall firewall add rule name="%FW_RULE%" dir=in action=allow protocol=TCP localport=%PORT% profile=any
    set "IS_ADMIN=0"
)

REM ----- Step 5: autostart -----
echo.
echo [5/6] Registering autostart ...
if "%IS_ADMIN%"=="1" (
    schtasks /Delete /TN "%TASK_NAME%" /F >nul 2>&1
    schtasks /Create /TN "%TASK_NAME%" /TR "\"%INSTALL_DIR%\start.bat\"" /SC ONSTART /RU SYSTEM /RL HIGHEST /F >nul
    if errorlevel 1 (
        echo   WARNING: schtasks create failed - falling back to user autostart.
        reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "%TASK_NAME%" /t REG_SZ /d "\"%INSTALL_DIR%\start.bat\"" /f >nul
        echo   * User autostart registered (runs at login).
    ) else (
        echo   * Scheduled task "%TASK_NAME%" registered (runs at boot as SYSTEM).
    )
) else (
    reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "%TASK_NAME%" /t REG_SZ /d "\"%INSTALL_DIR%\start.bat\"" /f >nul
    echo   * User autostart registered (runs at login).
)

REM ----- Step 6: pre-import sanity + start -----
echo.
echo [6/6] Pre-flight check + start ...

REM Run server.js with --check to detect syntax errors before launching
"%INSTALL_DIR%\node\node.exe" --check "%INSTALL_DIR%\app\server.js"
if errorlevel 1 (
    echo   ERROR: server.js failed syntax check.
    exit /b 1
)

echo   * Pre-flight OK. Launching ...
start "" /B cmd /c ""%INSTALL_DIR%\start.bat" >> "%INSTALL_DIR%\pms.log" 2>&1"

echo   Waiting 8 seconds for service to come up ...
timeout /T 8 /NOBREAK >nul

echo   Pinging http://localhost:%PORT%/ ...
"%INSTALL_DIR%\node\node.exe" -e "require('http').get('http://localhost:%PORT%/',r=>{console.log('  HTTP',r.statusCode);process.exit(r.statusCode<500?0:1)}).on('error',e=>{console.log('  ERROR',e.message);process.exit(1)})"
if errorlevel 1 (
    echo.
    echo   WARNING: service did not respond on port %PORT%.
    echo   Check %INSTALL_DIR%\pms.log for details.
) else (
    echo.
    echo   ===========================================
    echo    PMS Console is running.
    echo    URL: http://192.168.88.98:%PORT%/
    echo    Logs: %INSTALL_DIR%\pms.log
    echo   ===========================================
)

endlocal
