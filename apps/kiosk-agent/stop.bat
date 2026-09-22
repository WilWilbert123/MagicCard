@echo off
title EmployeeID KioskAgent - Termination Utility
color 0C
cls
echo [1/3] Terminating Background Watchdogs (wscript.exe)...
taskkill /F /IM wscript.exe /T >nul 2>nul

echo [2/3] Freeing TCP Port 7125...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :7125') do taskkill /F /PID %%a >nul 2>nul

echo [3/3] Terminating KioskAgent.exe...
taskkill /F /IM KioskAgent.exe /T >nul 2>nul
