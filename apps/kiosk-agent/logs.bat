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

powershell -NoProfile -ExecutionPolicy Bypass -Command "$dir='%~dp0'; $commonPath=[System.IO.Path]::Combine($env:ProgramData, 'EmployeeID\KioskAgent\logs'); $localPath=[System.IO.Path]::Combine($dir, 'logs'); $files = Get-ChildItem -Path $commonPath, $localPath -Filter *.log -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending; if ($files.Count -gt 0) { Write-Host '[LIVE LOG FILE]' $files[0].FullName -ForegroundColor Yellow; Get-Content -Path $files[0].FullName -Wait -Tail 50 } else { Write-Host '[NOTICE] No log files found yet in:' -ForegroundColor Red; Write-Host '  1)' $commonPath -ForegroundColor Gray; Write-Host '  2)' $localPath -ForegroundColor Gray; Write-Host 'Please run AutoStart_Hidden.vbs first to start KioskAgent.' -ForegroundColor Yellow }"

echo.
echo --------------------------------------------------------
echo Log stream ended.
pause
