@echo off
title EmployeeID KioskAgent - Termination Utility
color 0C
cls
echo ========================================================
echo         EMPLOYEE ID KIOSK AGENT - STOP UTILITY           
echo ========================================================
echo.
echo [1/3] Terminating Background Script Host (wscript.exe)...
taskkill /F /FI "IMAGENAME eq wscript.exe" /T >nul 2>nul

echo [2/3] Terminating PM2 Processes (if active)...
where pm2 >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    pm2 stop KioskAgent >nul 2>nul
    pm2 delete KioskAgent >nul 2>nul
)

echo [3/3] Terminating KioskAgent.exe...
taskkill /F /IM KioskAgent.exe /T >nul 2>nul

echo.
echo ========================================================
echo SUCCESS: KioskAgent and background workers stopped.
echo STATUS: Backend Dashboard will update to OFFLINE.
echo ========================================================
echo.
pause

