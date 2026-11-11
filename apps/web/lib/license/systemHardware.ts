import { execSync } from 'child_process';
import { DEFAULT_PRODUCT_ID } from './licenseValidator';

let cachedSerialNumber: string | null = null;

/**
 * Dynamically resolves the real hardware serial number of the PC or laptop.
 * In Windows, this directly mirrors VB.NET's `GetVolumeInformation(drive_letter, ...)`:
 * 1. Reads the volume serial number of the application drive (e.g. C:).
 * 2. Converts the 32-bit hex (e.g. 2846-1C7B) to decimal UInt32 (e.g. 675683451).
 * 3. In cloud/Vercel or non-Windows environments, defaults to DEFAULT_PRODUCT_ID ('675683451').
 */
export function getRealSystemSerialNumber(): string {
  if (cachedSerialNumber) {
    return cachedSerialNumber;
  }

  // 1. Environment variable override (ideal for Vercel/Cloud deployments)
  const envSerial = process.env.DEVICE_SERIAL_NUMBER || process.env.SYSTEM_PRODUCT_NUMBER;
  if (envSerial && envSerial.trim()) {
    cachedSerialNumber = envSerial.trim();
    return cachedSerialNumber;
  }

  // 2. Windows platform hardware resolution (Local PC / Laptop / Server)
  if (process.platform === 'win32') {
    // A. Primary: Drive Volume Serial Number via cmd 'vol' (identical to Win32 GetVolumeInformation)
    try {
      const drive = (process.cwd().slice(0, 2) || 'C:').toUpperCase();
      const output = execSync(`cmd.exe /c "vol ${drive}"`, {
        encoding: 'utf8',
        timeout: 3000,
        windowsHide: true,
      });

      const match = output.match(/Volume Serial Number is ([0-9A-Fa-f]{4}-[0-9A-Fa-f]{4})/i);
      if (match && match[1]) {
        const hex = match[1].replace('-', '');
        const dec = (parseInt(hex, 16) >>> 0).toString();
        if (dec && dec !== '0') {
          cachedSerialNumber = dec;
          return dec;
        }
      }
    } catch (err) {
      console.warn('[License Hardware] Failed to query vol via cmd:', err);
    }

    // B. Secondary: PowerShell LogicalDisk VolumeSerialNumber
    try {
      const driveLetter = (process.cwd().slice(0, 1) || 'C').toUpperCase();
      const psOutput = execSync(
        `powershell -NoProfile -NonInteractive -Command "(Get-CimInstance Win32_LogicalDisk -Filter \\"DeviceID='${driveLetter}:'\\").VolumeSerialNumber"`,
        { encoding: 'utf8', timeout: 4000, windowsHide: true }
      ).trim();

      if (psOutput) {
        const dec = (parseInt(psOutput, 16) >>> 0).toString();
        if (dec && dec !== '0') {
          cachedSerialNumber = dec;
          return dec;
        }
      }
    } catch (err) {
      console.warn('[License Hardware] Failed to query LogicalDisk via PowerShell:', err);
    }
  }

  // 3. Fallback: Default to configured real workstation ID (675683451)
  cachedSerialNumber = DEFAULT_PRODUCT_ID;
  return DEFAULT_PRODUCT_ID;
}
