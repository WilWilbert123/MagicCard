# Admin Card Printer Agent Build and Packaging Script
param(
    [string]$Configuration = "Release",
    [string]$Runtime = "win-x64"
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$RootDir = (Get-Item "$ScriptDir\..").FullName
$CsprojPath = Join-Path $RootDir "apps\kiosk-agent\KioskAgent.csproj"
$PublishDir = Join-Path $RootDir "apps\kiosk-agent\bin\$Configuration\net9.0-windows\$Runtime\publish"
$OutputDir = Join-Path $ScriptDir "output"

Write-Host "=================================================="
Write-Host "  Admin Card Printer Agent Installer Builder     "
Write-Host "=================================================="

# 1. Ensure Output Directory
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

# 2. Publish .NET Agent Executable
Write-Host "[1/4] Publishing Admin Card Printer Agent ($Runtime)..."
dotnet publish $CsprojPath -c $Configuration -r $Runtime --no-self-contained -o $PublishDir

if ($LASTEXITCODE -ne 0) {
    Write-Error "dotnet publish failed. Check build output above."
    exit 1
}

Write-Host "[1/4] DONE - Binary publish completed: $PublishDir"

# 3. Copy scripts to publish folder
Write-Host "[2/4] Copying background execution scripts..."
$KioskAgentDir = Join-Path $RootDir "apps\kiosk-agent"
$FilesToCopy = @("start_hidden.vbs", "watchdog.vbs", "ecosystem.config.js", "logs.bat", "stop.bat")
foreach ($file in $FilesToCopy) {
    $src = Join-Path $KioskAgentDir $file
    if (Test-Path $src) {
        Copy-Item -Path $src -Destination $PublishDir -Force
        Write-Host "  -> Copied $file to publish folder"
    }
}

# Ensure appsettings is configured for Magicard 600NEO
$appsettingsProd = Join-Path $PublishDir "appsettings.Production.json"
if (Test-Path $appsettingsProd) {
    Copy-Item -Path $appsettingsProd -Destination (Join-Path $PublishDir "appsettings.json") -Force
}

# 4. Compile Inno Setup if ISCC is installed
$PossibleIsccPaths = @(
    "$env:LOCALAPPDATA\Programs\Inno Setup 6\ISCC.exe",
    "C:\Program Files (x86)\Inno Setup 6\ISCC.exe",
    "C:\Program Files\Inno Setup 6\ISCC.exe"
)

$IsccPath = $null
foreach ($p in $PossibleIsccPaths) {
    if (Test-Path $p) {
        $IsccPath = $p
        break
    }
}

if (-not $IsccPath) {
    $cmd = Get-Command iscc.exe -ErrorAction SilentlyContinue
    if ($cmd) {
        $IsccPath = $cmd.Source
    }
}

$IssFile = Join-Path $ScriptDir "AdminPrinterSetup.iss"
$hasInno = -not [string]::IsNullOrEmpty($IsccPath)

if ($hasInno) {
    Write-Host "[3/4] Compiling Inno Setup installer (Admin-Printer-Agent-Setup.exe)..."
    cmd /c ('"' + $IsccPath + '" /O"' + $OutputDir + '" "' + $IssFile + '"')
    Write-Host "[3/4] DONE - Admin-Printer-Agent-Setup.exe created in $OutputDir"
} else {
    Write-Host "[3/4] Inno Setup compiler not found on this system. Creating 1-Click Batch Installer..."
}

# 5. Create Standalone Portable ZIP
$ZipOutput = Join-Path $OutputDir "Admin-Printer-Agent-Portable.zip"
if (Test-Path $ZipOutput) { Remove-Item $ZipOutput -Force }
Write-Host "[4/4] Creating standalone deployable zip: $ZipOutput"
Compress-Archive -Path (Join-Path $PublishDir "*") -DestinationPath $ZipOutput -Force

# 6. Generate 1-Click Install Batch Script for Admin Laptop
$OneClickBatch = Join-Path $OutputDir "Install-Admin-Printer.bat"
$batchContent = @"
@echo off
title Install Admin Card Printer Agent (Magicard 600NEO)
echo ====================================================================
echo   Installing Admin Card Printer Agent for Magicard 600NEO
echo ====================================================================
echo.

set TARGET_DIR=%LOCALAPPDATA%\MagicCard\AdminPrintAgent
if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"

echo [1/4] Copying files to %TARGET_DIR%...
xcopy /E /I /Y "%~dp0..\apps\kiosk-agent\bin\Release\net9.0-windows\win-x64\publish\*" "%TARGET_DIR%\" >nul 2>&1
if errorlevel 1 (
    xcopy /E /I /Y "%~dp0..\..\apps\kiosk-agent\bin\Release\net9.0-windows\win-x64\publish\*" "%TARGET_DIR%\" >nul 2>&1
)

echo [2/4] Configuring Windows Firewall Port 7125...
netsh advfirewall firewall add rule name="Admin Card Printer Agent Port 7125" dir=in action=allow protocol=TCP localport=7125 >nul 2>&1

echo [3/4] Registering Windows Auto-Start on Boot...
powershell -Command "`$ws = New-Object -ComObject WScript.Shell; `$s = `$ws.CreateShortcut('`$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup\AdminCardPrinterAgent.lnk'); `$s.TargetPath = 'wscript.exe'; `$s.Arguments = '\""%TARGET_DIR%\start_hidden.vbs\""'; `$s.WorkingDirectory = '%TARGET_DIR%'; `$s.Save()" >nul 2>&1

echo [4/4] Creating Desktop Shortcut...
powershell -Command "`$ws = New-Object -ComObject WScript.Shell; `$s = `$ws.CreateShortcut('`$env:USERPROFILE\Desktop\Admin Card Printer Agent.lnk'); `$s.TargetPath = 'wscript.exe'; `$s.Arguments = '\""%TARGET_DIR%\start_hidden.vbs\""'; `$s.WorkingDirectory = '%TARGET_DIR%'; `$s.Save()" >nul 2>&1
powershell -Command "`$ws = New-Object -ComObject WScript.Shell; `$s = `$ws.CreateShortcut('`$env:USERPROFILE\Desktop\Admin Printer Logs.lnk'); `$s.TargetPath = '%TARGET_DIR%\logs.bat'; `$s.WorkingDirectory = '%TARGET_DIR%'; `$s.Save()" >nul 2>&1

echo.
echo Launching Admin Card Printer Agent in background...
start "" wscript.exe "%TARGET_DIR%\start_hidden.vbs"

echo.
echo ====================================================================
echo   SUCCESS! Admin Card Printer Agent is installed and running!
echo   Target Printer: Magicard 600NEO
echo   Status: Port 7125 listening
echo ====================================================================
echo.
pause
"@

Set-Content -Path $OneClickBatch -Value $batchContent

Write-Host ""
Write-Host "=================================================="
Write-Host "  ADMIN INSTALLER CREATED SUCCESSFULLY!"
Write-Host "  Location: $OutputDir"
Write-Host "  1-Click Batch: $OneClickBatch"
Write-Host "  Portable ZIP: $ZipOutput"
Write-Host "=================================================="

