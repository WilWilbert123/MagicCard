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
param(
    [string]`$KioskId = "KIOSK-001",
    [string]`$BranchId = "BRANCH-001"
)

`$dest = "C:\Program Files\EmployeeID\KioskAgent"
`$data = "C:\ProgramData\EmployeeID\KioskAgent"
New-Item -ItemType Directory -Force -Path `$dest | Out-Null
New-Item -ItemType Directory -Force -Path "`$data\logs" | Out-Null

Copy-Item -Path "*" -Destination `$dest -Recurse -Force

Set-Content -Path "`$dest\appsettings.json" -Value ('{"Kiosk":{"KioskId":"' + `$KioskId + '","Port":7125,"BranchId":"' + `$BranchId + '"},"Printer":{"Name":"Magicard 300 Duo","Type":"MagicCard","UseMock":true}}')

netsh advfirewall firewall add rule name="EmployeeID KioskAgent Port 7125" dir=in action=allow protocol=TCP localport=7125
sc.exe create EmployeeIDKioskAgent binPath= "`$dest\KioskAgent.exe" start= auto displayName= "EmployeeID KioskAgent Service"
sc.exe start EmployeeIDKioskAgent
Write-Host "KioskAgent installed and started successfully!"
"@

Set-Content -Path $OneClickScript -Value $scriptContent

Write-Host ""
Write-Host "=================================================="
Write-Host "  BUILD COMPLETE"
Write-Host "  Output: $OutputDir"
Write-Host "=================================================="
