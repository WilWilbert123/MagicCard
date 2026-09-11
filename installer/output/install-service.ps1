# EmployeeID KioskAgent Quick Service Installer
# Run as Administrator from the folder where you extracted the zip
param(
    [string]$KioskId = "KIOSK-001",
    [string]$BranchId = "BRANCH-001"
)

$dest = "C:\Program Files\EmployeeID\KioskAgent"
$data = "C:\ProgramData\EmployeeID\KioskAgent"
New-Item -ItemType Directory -Force -Path $dest | Out-Null
New-Item -ItemType Directory -Force -Path "$data\logs" | Out-Null

Copy-Item -Path "*" -Destination $dest -Recurse -Force

Set-Content -Path "$dest\appsettings.json" -Value ('{"Kiosk":{"KioskId":"' + $KioskId + '","Port":7125,"BranchId":"' + $BranchId + '"},"Printer":{"Name":"Magicard 300 Duo","Type":"MagicCard","UseMock":true}}')

netsh advfirewall firewall add rule name="EmployeeID KioskAgent Port 7125" dir=in action=allow protocol=TCP localport=7125
sc.exe create EmployeeIDKioskAgent binPath= "$dest\KioskAgent.exe" start= auto displayName= "EmployeeID KioskAgent Service"
sc.exe start EmployeeIDKioskAgent
Write-Host "KioskAgent installed and started successfully!"
