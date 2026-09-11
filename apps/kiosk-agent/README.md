# Windows KioskAgent Hardware Agent

**KioskAgent** is a production-ready C# .NET 9 Windows application operating as a local hardware bridge between the browser-based Next.js KIOSK (`http://127.0.0.1:7125`) and physical ID card printers / MagicCard Trust ID software.

---

## 1. How to Build `KioskAgent`

From PowerShell at the project root:

```powershell
dotnet publish apps/kiosk-agent/KioskAgent.csproj -c Release -r win-x64 --self-contained true
```

---

## 2. How to Get `KioskAgent.exe`

After executing the publish command, `KioskAgent.exe` and its required runtime files are compiled into:

```
apps/kiosk-agent/bin/Release/net9.0-windows/win-x64/publish/KioskAgent.exe
```

---

## 3. How to Build the Installer

Run the automated installer build script from PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File installer/build-installer.ps1
```

---

## 4. Where the Installer is Generated

The final Windows installer package is generated under:

```
installer/output/EmployeeID-KioskAgent-Setup.exe
```

A standalone ZIP bundle is also generated at:

```
installer/output/EmployeeID-KioskAgent-Setup.zip
```

---

## 5. How to Install on `KIOSK-001`

1. Copy `EmployeeID-KioskAgent-Setup.exe` to `KIOSK-001`.
2. Right-click and select **Run as Administrator**.
3. Set **KIOSK ID** to `KIOSK-001`.
4. Set **Branch ID** to your target branch (e.g. `BRANCH-001`).
5. Click **Install**. The setup installs binaries to `C:\Program Files\EmployeeID\KioskAgent\`, creates logs in `C:\ProgramData\EmployeeID\KioskAgent\logs\`, and starts the **`EmployeeIDKioskAgent`** Windows Service.

---

## 6. How to Install on `KIOSK-002` (and `KIOSK-003`, `KIOSK-004`...)

Copy the **exact same installer** (`EmployeeID-KioskAgent-Setup.exe`) to `KIOSK-002`.

1. Run `EmployeeID-KioskAgent-Setup.exe` as Administrator on `KIOSK-002`.
2. Set **KIOSK ID** to `KIOSK-002`.
3. Set **Branch ID** to `BRANCH-002` (or the appropriate branch code).
4. Complete setup. Each machine maintains its unique `KioskId` and local device credentials.

---

## 7. How to Register / Pair Each KIOSK

1. Log into the central HR Admin System (`https://my-domain.com/hr/kiosks`).
2. Locate the terminal (e.g. `KIOSK-001`) and click **Pair Agent**.
3. Copy the generated **6-digit pairing code** (e.g. `A7B9X2`).
4. During setup (or via setup command `KioskAgent.exe --setup`), enter the 6-digit code.
5. `KioskAgent` registers itself with Supabase, receives a secure device token, and saves it locally in `C:\ProgramData\EmployeeID\KioskAgent\credentials.json`.

---

## 8. How to Configure the Printer

Open `C:\Program Files\EmployeeID\KioskAgent\appsettings.json` and configure:

```json
{
  "Printer": {
    "Name": "Magicard 300 Duo",
    "Type": "MagicCard",
    "UseMock": false
  },
  "MagicCard": {
    "Mode": "Production",
    "InstallationPath": "C:\\Program Files\\Magicard\\TrustID\\"
  }
}
```

*Note: Set `"UseMock": true` during development to test without a physical printer connected.*

---

## 9. How to Test the Local Agent

### Option A: Health Check
In PowerShell or Web Browser on the KIOSK machine:

```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:7125/health"
```

Expected output: `status: "healthy"`.

### Option B: Test Print
Execute a test card print request:

```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:7125/api/print/test" -Method Post
```

---

## 10. How to Start / Stop / Restart the Agent

Open PowerShell as Administrator:

```powershell
# Check Status
Get-Service EmployeeIDKioskAgent

# Start Service
Start-Service EmployeeIDKioskAgent

# Stop Service
Stop-Service EmployeeIDKioskAgent

# Restart Service
Restart-Service EmployeeIDKioskAgent
```

---

## 11. How to Uninstall

1. Go to Windows **Settings → Apps → Installed apps**.
2. Locate **EmployeeID KioskAgent** and click **Uninstall**.
3. Alternatively, run `C:\Program Files\EmployeeID\KioskAgent\unins000.exe`.

---

## 12. Troubleshooting Port 7125

If `http://127.0.0.1:7125/health` is unreachable:

1. Verify the service is running: `Get-Service EmployeeIDKioskAgent`.
2. Check if another process is occupying port 7125:
   ```powershell
   netstat -ano | findstr 7125
   ```
3. Inspect local logs at `C:\ProgramData\EmployeeID\KioskAgent\logs\agent-*.log`.

---

## 13. Troubleshooting Printer Problems

- **Printer Offline:** Verify USB/Network cable connection to physical card printer.
- **Card Jam / Out of Ribbon:** Check physical printer LCD control panel or Windows Print Queue (`Win + R` → `control printers`).
- **Wrong Printer Name:** Query installed printer names using `GET http://127.0.0.1:7125/api/printers` and update `Printer:Name` in `appsettings.json`.

---

## 14. Troubleshooting MagicCard Trust ID

1. Ensure MagicCard Trust ID software is installed on the host machine.
2. Verify `InstallationPath` in `appsettings.json` points to the valid Trust ID folder (default `C:\Program Files\Magicard\TrustID\`).
3. Set `MagicCard:Mode` to `"Simulation"` to isolate software errors from hardware faults.

---

## 15. Safe Upgrade Strategy (v1.0 → v1.1 → v1.2)

To upgrade `KioskAgent` without losing device identity or pairing tokens:

1. Run the new `EmployeeID-KioskAgent-Setup.exe`.
2. The installer automatically stops the existing `EmployeeIDKioskAgent` service, updates binary files in `C:\Program Files\EmployeeID\KioskAgent\`, preserves `%ProgramData%\EmployeeID\KioskAgent\credentials.json`, and restarts the service seamlessly.
