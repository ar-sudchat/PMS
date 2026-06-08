@echo off
REM ============================================================
REM  PMS Console - Uninstaller
REM ============================================================
setlocal

set "INSTALL_DIR=C:\PMS"
set "TASK_NAME=PMSConsole"
set "FW_RULE=PMS Console"

echo Stopping PMS Console ...
call "%INSTALL_DIR%\stop.bat" 2>nul

echo Removing scheduled task ...
schtasks /Delete /TN "%TASK_NAME%" /F >nul 2>&1

echo Removing user autostart ...
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "%TASK_NAME%" /f >nul 2>&1

echo Removing firewall rule ...
netsh advfirewall firewall delete rule name="%FW_RULE%" >nul 2>&1

echo.
echo NOTE: %INSTALL_DIR% folder is NOT deleted automatically.
echo       If you want to remove it completely, run:
echo         rmdir /s /q "%INSTALL_DIR%"
echo.
echo Uninstall complete.

endlocal
