@echo off
title EmployeeID KioskAgent - Termination Utility
color 0C
cls
echo ========================================================
echo         EMPLOYEE ID KIOSK AGENT - STOP UTILITY           
echo ========================================================
echo.
echo [1/4] Notifying Web Backend (Setting status to OFFLINE)...
powershell -NoProfile -ExecutionPolicy Bypass -Command "^
    try { ^
        $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition; ^
        $configPath = Join-Path $scriptDir 'appsettings.json'; ^
        $kioskId = 'KIOSK-001'; ^
        $url = 'https://magic-card-trust-id.vercel.app'; ^
        if (Test-Path $configPath) { ^
            $json = Get-Content $configPath -Raw | ConvertFrom-Json; ^
            if ($json.Kiosk.KioskId) { $kioskId = $json.Kiosk.KioskId }; ^
            if ($json.Kiosk.SupabaseUrl) { $url = $json.Kiosk.SupabaseUrl }; ^
        } ^
        $endpoint = ($url.TrimEnd('/') + '/api/kiosks/heartbeat'); ^
        $body = @{ kioskCode = $kioskId; status = 'OFFLINE' } | ConvertTo-Json; ^
        Invoke-RestMethod -Uri $endpoint -Method POST -Body $body -ContentType 'application/json' -TimeoutSec 3 -ErrorAction SilentlyContinue | Out-Null; ^
    } catch {} ^
" >nul 2>nul

echo [2/4] Terminating Background Watchdog Worker (watchdog.vbs)...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*watchdog*' -or $_.CommandLine -like '*start_hidden*' } | Stop-Process -Force -ErrorAction SilentlyContinue" >nul 2>nul
wmic process where "name='wscript.exe' and commandline like '%%watchdog%%'" call terminate >nul 2>nul

echo [3/4] Terminating PM2 Managed Process (if active)...
where pm2 >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    pm2 stop KioskAgent >nul 2>nul
    pm2 delete KioskAgent >nul 2>nul
)

echo [4/4] Force stopping KioskAgent.exe...
taskkill /F /IM KioskAgent.exe /T >nul 2>nul

echo.
echo ========================================================
echo SUCCESS: KioskAgent and background watchdog processes stopped.
echo STATUS: Backend Dashboard updated to 'OFFLINE' in real-time.
echo ========================================================
echo.
pause

