@echo off
title EmployeeID KioskAgent - Termination Utility
color 0C
cls
echo ========================================================
echo         EMPLOYEE ID KIOSK AGENT - STOP UTILITY           
echo ========================================================
echo.
echo [1/3] Terminating PM2 Managed Process (if active)...
where pm2 >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    pm2 stop KioskAgent >nul 2>nul
    pm2 delete KioskAgent >nul 2>nul
)

echo [2/3] Terminating Background Watchdog Worker (watchdog.vbs)...
powershell -NoProfile -ExecutionPolicy Bypass -Command "^
    Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*watchdog.vbs*' } | Stop-Process -Force -ErrorAction SilentlyContinue; ^
" >nul 2>nul

echo [3/3] Force stopping KioskAgent.exe...
taskkill /F /IM KioskAgent.exe /T >nul 2>nul

echo.
echo ========================================================
echo SUCCESS: KioskAgent and background watchdog processes stopped.
echo ========================================================
echo.
pause
