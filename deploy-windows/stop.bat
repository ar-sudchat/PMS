@echo off
REM ============================================================
REM  PMS Console - Stop
REM ============================================================
setlocal

echo Stopping scheduled task (if exists) ...
schtasks /End /TN "PMSConsole" >nul 2>&1

echo Stopping any running PMS node.exe processes ...
REM Kill node.exe processes launched from this folder
for /f "tokens=2" %%a in ('tasklist /FI "IMAGENAME eq node.exe" /FO LIST ^| findstr /B "PID:"') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo Done.
endlocal
