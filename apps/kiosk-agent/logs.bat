@echo off
title EmployeeID KioskAgent - Live System Logs
color 0A
cls
echo ========================================================
echo           EMPLOYEE ID KIOSK AGENT - LOG MONITOR          
echo ========================================================
echo.
echo Press Ctrl+C at any time to exit log stream.
echo.

REM 1. Check if PM2 is active and managing KioskAgent
where pm2 >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    pm2 list 2>nul | findstr /I "KioskAgent" | findstr /I "online" >nul
    if %ERRORLEVEL% EQU 0 (
        echo [INFO] Active PM2 process detected. Streaming PM2 live logs...
        echo --------------------------------------------------------
        pm2 logs KioskAgent
        goto end
    )
)

REM 2. Fallback to live tail of Serilog / Watchdog logs via PowerShell
echo [INFO] Searching for live KioskAgent logs...
echo --------------------------------------------------------
powershell -NoProfile -ExecutionPolicy Bypass -Command "^
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition; ^
    $commonLogPath = Join-Path $env:ProgramData 'EmployeeID\KioskAgent\logs'; ^
    $localLogPath = Join-Path $scriptDir 'logs'; ^
    $logFiles = Get-ChildItem -Path $commonLogPath, $localLogPath -Filter '*.log' -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending; ^
    if ($logFiles.Count -gt 0) { ^
        $targetFile = $logFiles[0].FullName; ^
        Write-Host '[FOUND LOG FILE]' $targetFile -ForegroundColor Yellow; ^
        Get-Content -Path $targetFile -Wait -Tail 50; ^
    } else { ^
        Write-Host '[WARNING] No log files found in:' -ForegroundColor Red; ^
        Write-Host '  1)' $commonLogPath -ForegroundColor Gray; ^
        Write-Host '  2)' $localLogPath -ForegroundColor Gray; ^
        Write-Host 'Waiting for KioskAgent to generate logs...' -ForegroundColor Yellow; ^
        Start-Sleep -Seconds 3; ^
    }"

:end
pause
