# EmployeeID KioskAgent Installer & Deployment Guide

This directory contains the automated build scripts and installer configuration for **KioskAgent**, the Windows hardware bridge for physical ID card printers and MagicCard Trust ID.

---

## 1. How to Build `KioskAgent.exe` and `EmployeeID-KioskAgent-Setup.exe`

From PowerShell at the project root:

```powershell
powershell -ExecutionPolicy Bypass -File installer/build-installer.ps1
```

### What this script does:
1. Compiles and publishes a **self-contained 64-bit Windows executable** (`KioskAgent.exe`) targeting `.NET 9.0`.
2. Locates Inno Setup Compiler (`ISCC.exe`) on your machine.
3. Generates **`EmployeeID-KioskAgent-Setup.exe`** under `installer/output/`.
4. Creates a fallback standalone ZIP deployment bundle (`EmployeeID-KioskAgent-Setup.zip`) and PowerShell script (`install-service.ps1`) under `installer/output/`.

---

## 2. Installing on Physical KIOSK Machines (`KIOSK-001` through `KIOSK-N`)

Copy `EmployeeID-KioskAgent-Setup.exe` to each physical Windows KIOSK computer (`KIOSK-001`, `KIOSK-002`, `KIOSK-003`, etc.).

1. Right-click `EmployeeID-KioskAgent-Setup.exe` → **Run as Administrator**.
2. Follow the setup wizard:
   - Installation Directory: `C:\Program Files\EmployeeID\KioskAgent\`
   - Input **KIOSK ID** (e.g., `KIOSK-001` for Machine 1, `KIOSK-002` for Machine 2).
   - Input **Branch ID** (e.g., `BRANCH-001`).
   - Input **HR Admin Pairing Code** (generated from HR Admin Dashboard).
3. The installer will automatically:
   - Register and start the Windows Service **`EmployeeIDKioskAgent`**.
   - Open local Windows Firewall port `7125`.
   - Create local logging directory at `C:\ProgramData\EmployeeID\KioskAgent\logs\`.

---

## 3. Post-Installation Verification

Open Command Prompt or Web Browser on the physical KIOSK machine and navigate to:

```
http://127.0.0.1:7125/health
```

Expected JSON Response:

```json
{
  "status": "healthy",
  "kioskId": "KIOSK-001",
  "agentVersion": "1.0.0",
  "printerConnected": true,
  "printerModel": "Magicard 300 Duo (Mock)",
  "printerStatus": "READY (Ribbon 94% | Hopper 150 Cards)"
}
```

---

## 4. Managing the Windows Service

To check status, start, stop, or restart the agent service from PowerShell (Admin):

```powershell
# Check service status
Get-Service EmployeeIDKioskAgent

# Restart service
Restart-Service EmployeeIDKioskAgent

# Stop service
Stop-Service EmployeeIDKioskAgent
```

---

## 5. Troubleshooting Guide

- **Port 7125 Conflict:** Verify no other application is listening on port 7125: `netstat -ano | findstr 7125`. Change `Kiosk:Port` in `appsettings.json` if necessary.
- **Printer Offline Error:** Verify USB/Ethernet connection to the ID Card Printer. Check installed printers in Windows Control Panel -> Devices and Printers.
- **MagicCard Trust ID Integration:** For real hardware deployment, edit `appsettings.json` and set `"Printer": { "UseMock": false }` and `"MagicCard": { "Mode": "Production" }`.
