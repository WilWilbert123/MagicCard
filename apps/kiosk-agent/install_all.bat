@echo off
title EmployeeID KioskAgent - Complete Background Setup
color 0B
cls
echo ========================================================
echo   EMPLOYEE ID KIOSK AGENT - INVISIBLE SERVICE INSTALLER  
echo ========================================================
echo.
echo [1/3] Installing Windows Startup Shortcut...
cscript //nologo install_startup.vbs

echo.
echo [2/3] Starting Invisible KioskAgent Watchdog...
cscript //nologo start_hidden.vbs

echo.
echo [3/3] Verifying Agent Health Endpoint...
powershell -NoProfile -ExecutionPolicy Bypass -Command "^
    Start-Sleep -Seconds 2; ^
    try { ^
        $res = Invoke-RestMethod -Uri 'http://127.0.0.1:7125/health' -TimeoutSec 5; ^
        Write-Host '[SUCCESS] KioskAgent is running invisibly in background!' -ForegroundColor Green; ^
        Write-Host '[STATUS]' $res.status '| KIOSK:' $res.kioskId '| Printer:' $res.printerStatus -ForegroundColor Cyan; ^
    } catch { ^
        Write-Host '[NOTICE] KioskAgent starting up... Check logs.bat for detailed status.' -ForegroundColor Yellow; ^
    } ^
"

echo.
echo ========================================================
echo SETUP COMPLETE! 
echo - KioskAgent is running INVISIBLY in the background.
echo - Auto-run on reboot/startup is ACTIVATED.
echo - Double-click logs.bat to view live logs.
echo - Double-click stop.bat to stop the agent manually.
echo ========================================================
echo.
pause
