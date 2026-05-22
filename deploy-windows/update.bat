@echo off
REM ============================================================
REM  PMS Console - Update
REM
REM  Usage:
REM    1. Drop a fresh deploy-windows/ folder next to the existing one.
REM    2. Run this update.bat from INSIDE the new folder.
REM    3. It will stop the service, replace app\ + node\, restart.
REM    4. config.env is preserved.
REM ============================================================
setlocal

set "INSTALL_DIR=C:\PMS"
set "TASK_NAME=PMSConsole"

echo [1/4] Stopping running service ...
schtasks /End /TN "%TASK_NAME%" >nul 2>&1
for /f "tokens=2" %%a in ('tasklist /FI "IMAGENAME eq node.exe" /FO LIST ^| findstr /B "PID:"') do (
    taskkill /F /PID %%a >nul 2>&1
)
timeout /T 2 /NOBREAK >nul

echo [2/4] Backing up old app\ ...
if exist "%INSTALL_DIR%\app.bak" rmdir /s /q "%INSTALL_DIR%\app.bak"
if exist "%INSTALL_DIR%\app" move "%INSTALL_DIR%\app" "%INSTALL_DIR%\app.bak" >nul

echo [3/4] Copying new app\ and node\ ...
xcopy "%~dp0app\*" "%INSTALL_DIR%\app\" /E /Y /I /Q >nul
xcopy "%~dp0node\*" "%INSTALL_DIR%\node\" /E /Y /I /Q >nul

REM config.env is preserved (xcopy /Y with files would skip it, but app\ and node\ don't include it)

echo [4/4] Restarting service ...
schtasks /Run /TN "%TASK_NAME%" >nul 2>&1
if errorlevel 1 (
    start "" /B cmd /c ""%INSTALL_DIR%\start.bat" >> "%INSTALL_DIR%\pms.log" 2>&1"
)

timeout /T 5 /NOBREAK >nul
echo Update complete. Check %INSTALL_DIR%\pms.log for status.
echo To roll back: stop service, rename app.bak back to app.

endlocal
