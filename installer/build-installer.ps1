# EmployeeID KioskAgent Build and Packaging Script
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
Write-Host "  EmployeeID KioskAgent Installer Build Script   "
Write-Host "=================================================="

# 1. Ensure Output Directory
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

# 2. Publish .NET KioskAgent Executable (self-contained win-x64)
Write-Host "[1/3] Publishing KioskAgent (.NET 9 self-contained $Runtime)..."
dotnet publish $CsprojPath -c $Configuration -r $Runtime --self-contained true /p:PublishSingleFile=false

if ($LASTEXITCODE -ne 0) {
    Write-Error "dotnet publish failed. Check build output above."
    exit 1
}

Write-Host "[1/3] DONE - Binary publish completed: $PublishDir"

# Copy VBS background scripts, logs batch, stop batch, PM2 config to publish folder
Write-Host "Copying invisible background execution scripts to publish folder..."
$KioskAgentDir = Join-Path $RootDir "apps\kiosk-agent"
$FilesToCopy = @("AutoStart_Hidden.vbs", "start_hidden.vbs", "watchdog.vbs", "install_startup.vbs", "ecosystem.config.js", "logs.bat", "stop.bat", "install_all.bat", "launch_kiosk_fullscreen.bat")
foreach ($file in $FilesToCopy) {
    $src = Join-Path $KioskAgentDir $file
    if (Test-Path $src) {
        Copy-Item -Path $src -Destination $PublishDir -Force
        Write-Host "  -> Copied $file to publish folder"
    }
}

# 3. Build Inno Setup installer if ISCC is available
$IsccPath = "C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
$IssFile = Join-Path $ScriptDir "KioskAgentSetup.iss"

$hasInno = Test-Path -Path $IsccPath
Write-Host "Inno Setup present: $hasInno"

if ($hasInno) {
    Write-Host "[2/3] Compiling Inno Setup installer..."
    cmd /c ('"' + $IsccPath + '" /O"' + $OutputDir + '" "' + $IssFile + '"')
    Write-Host "[2/3] DONE - EmployeeID-KioskAgent-Setup.exe created in $OutputDir"
} else {
    Write-Host "[2/3] Inno Setup not found. Skipping .exe installer. A portable .zip will be created instead."
}

# 4. Create Standalone Portable ZIP Bundle
$ZipOutput = Join-Path $OutputDir "EmployeeID-KioskAgent-Setup.zip"
if (Test-Path $ZipOutput) { Remove-Item $ZipOutput -Force }

Write-Host "[3/3] Creating standalone deployable zip: $ZipOutput"
Compress-Archive -Path (Join-Path $PublishDir "*") -DestinationPath $ZipOutput -Force

# 5. Write the PowerShell-based service installer script for zip-based deployment
$OneClickScript = Join-Path $OutputDir "install-service.ps1"
$scriptContent = @"
# EmployeeID KioskAgent Quick Service Installer
# Run as Administrator from the folder where you extracted the zip
# appsettings.json and appsettings.Production.json are already bundled in the zip.
# Edit them before running this script if you need to change KIOSK ID, Branch, or Server URL.

`$dest = "C:\Program Files\EmployeeID\KioskAgent"
`$data = "C:\ProgramData\EmployeeID\KioskAgent"
New-Item -ItemType Directory -Force -Path `$dest | Out-Null
New-Item -ItemType Directory -Force -Path "`$data\logs" | Out-Null

Copy-Item -Path "*" -Destination `$dest -Recurse -Force

# appsettings.json and appsettings.Production.json are copied as-is from the zip.
# To change KIOSK ID, BranchId, or SupabaseUrl - edit appsettings.json BEFORE running this script.

netsh advfirewall firewall add rule name="EmployeeID KioskAgent Port 7125" dir=in action=allow protocol=TCP localport=7125
wscript.exe "`$dest\install_startup.vbs"
wscript.exe "`$dest\start_hidden.vbs"
Write-Host "KioskAgent installed and started successfully!"
"@

Set-Content -Path $OneClickScript -Value $scriptContent

Write-Host ""
Write-Host "=================================================="
Write-Host "  BUILD COMPLETE"
Write-Host "  Output: $OutputDir"
Write-Host ""
Write-Host "  HOW TO DEPLOY ON KIOSK LAPTOP:"
Write-Host "  1. Copy EmployeeID-KioskAgent-Setup.zip to KIOSK laptop"
Write-Host "  2. Extract the zip"
Write-Host "  3a. Double-click AutoStart_Hidden.vbs  (quick launch)"
Write-Host "  3b. OR run install-service.ps1 as Admin (full install to Program Files)"
Write-Host "=================================================="
