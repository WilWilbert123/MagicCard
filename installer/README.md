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

Copy `EmployeeID-KioskAgent-Setup.exe` (or `EmployeeID-KioskAgent-Setup.zip`) to each physical Windows KIOSK computer (`KIOSK-001`, `KIOSK-002`, `KIOSK-003`, etc.).

### Option A: Standard Setup Executable
1. Double-click `EmployeeID-KioskAgent-Setup.exe`.
2. Follow the setup wizard:
   - Installation Directory: `C:\Program Files\EmployeeID\KioskAgent\`
   - Input **KIOSK ID** (e.g., `KIOSK-001`).
   - Input **Branch ID** (e.g., `BRANCH-001`).
3. The installer will automatically:
   - Configure **Invisible Background Execution** via `start_hidden.vbs` (no CMD popup window).
   - Register **Auto-Run on Startup/Reboot** (`install_startup.vbs`) in Windows Startup (`shell:startup`).
   - Enable **Watchdog Crash Protection** (`watchdog.vbs` / PM2) to auto-restart `KioskAgent.exe` immediately if an error occurs.
   - Place **`KioskAgent Logs`** and **`Stop KioskAgent`** shortcuts on Desktop and Start Menu.

### Option B: Portable ZIP Deployment
1. Extract `EmployeeID-KioskAgent-Setup.zip` to your desired directory (e.g., `C:\KioskAgent`).
2. Double-click `install_all.bat`. This will:
   - Register `start_hidden.vbs` in Windows Startup.
   - Start `KioskAgent.exe` invisibly in the background.

---

## 3. Included Background Management Toolkit

| Script File | Purpose | Execution Mode |
| :--- | :--- | :--- |
| **`start_hidden.vbs`** | Launches `KioskAgent.exe` / Watchdog in hidden mode (`WindowStyle = 0`). | 100% Invisible (No CMD Window) |
| **`install_startup.vbs`** | Adds `start_hidden.vbs` shortcut to `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup`. | Auto-runs on PC Boot / Restart |
| **`watchdog.vbs`** | Background worker that checks `KioskAgent.exe` every 3s & auto-restarts it on crash/error. | Invisible Watchdog Worker |
| **`ecosystem.config.js`** | PM2 Process Manager configuration for production deployments. | PM2 Managed Worker |
| **`logs.bat`** | Double-click to open live streaming terminal logs (PM2 or Serilog tailing). | Interactive Log Window |
| **`stop.bat`** | Double-click to cleanly terminate `KioskAgent.exe`, Watchdog, and PM2 processes. | Manual Stop Utility |
| **`install_all.bat`** | One-click setup script for portable zip installations. | Interactive Setup |

---

## 4. Verification & Health Check

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

## 5. Manual Controls

- **View Live Logs:** Double-click `logs.bat` on Desktop or installation directory.
- **Stop Agent & Watchdog:** Double-click `stop.bat` on Desktop or installation directory.
- **Restart Agent Invisibly:** Double-click `start_hidden.vbs`.

---

## 6. Troubleshooting Guide

- **Port 7125 Conflict:** Verify no other application is listening on port 7125: `netstat -ano | findstr 7125`. Change `Kiosk:Port` in `appsettings.json` if necessary.
- **Printer Offline Error:** Verify USB/Ethernet connection to the ID Card Printer. Check installed printers in Windows Control Panel -> Devices and Printers.
- **MagicCard Trust ID Integration:** For real hardware deployment, edit `appsettings.json` and set `"Printer": { "UseMock": false }` and `"MagicCard": { "Mode": "Production" }`.
