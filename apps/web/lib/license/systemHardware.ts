import { execSync } from 'child_process';
import os from 'os';

let cachedSerialNumber: string | null = null;

/**
 * Dynamically resolves the real hardware serial number of the PC or laptop.
 * In Windows, this directly mirrors VB.NET's `GetVolumeInformation(drive_letter, ...)`:
 * 1. Reads the volume serial number of the application drive (e.g. C:).
 * 2. Converts the 32-bit hex (e.g. 2846-1C7B) to decimal UInt32 (e.g. 675683451).
 * 3. Fallbacks to BIOS hardware serial or machine-id if volume query is unavailable.
 */
export function getRealSystemSerialNumber(): string {
  if (cachedSerialNumber) {
    return cachedSerialNumber;
  }

  // 1. Windows platform hardware resolution
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

    // C. Tertiary: BIOS Motherboard Serial Number
    try {
      const biosOutput = execSync(
        `powershell -NoProfile -NonInteractive -Command "(Get-CimInstance Win32_BIOS).SerialNumber"`,
        { encoding: 'utf8', timeout: 4000, windowsHide: true }
      ).trim();

      if (biosOutput && biosOutput.toLowerCase() !== 'to be filled by o.e.m.' && biosOutput.toLowerCase() !== 'none') {
        // Hash string to stable UInt32
        let hash = 0;
        for (let i = 0; i < biosOutput.length; i++) {
          hash = (Math.imul(31, hash) + biosOutput.charCodeAt(i)) | 0;
        }
        const dec = (hash >>> 0).toString();
        cachedSerialNumber = dec;
        return dec;
      }
    } catch (err) {
      console.warn('[License Hardware] Failed to query BIOS serial via PowerShell:', err);
    }
  }

  // 2. Linux / Unix machine-id resolution
  if (process.platform === 'linux') {
    try {
      const fs = require('fs');
      let mid = '';
      if (fs.existsSync('/etc/machine-id')) {
        mid = fs.readFileSync('/etc/machine-id', 'utf8').trim();
      } else if (fs.existsSync('/var/lib/dbus/machine-id')) {
        mid = fs.readFileSync('/var/lib/dbus/machine-id', 'utf8').trim();
      }
      if (mid) {
        let hash = 0;
        for (let i = 0; i < mid.length; i++) {
          hash = (Math.imul(31, hash) + mid.charCodeAt(i)) | 0;
        }
        const dec = (hash >>> 0).toString();
        cachedSerialNumber = dec;
        return dec;
      }
    } catch {}
  }

  // 3. Fallback: Stable hash of Hostname + CPU Architecture
  let hash = 0;
  const seed = `${os.hostname()}-${os.cpus()[0]?.model || 'magiccard-workstation'}`;
  for (let i = 0; i < seed.length; i++) {
    hash = (Math.imul(31, hash) + seed.charCodeAt(i)) | 0;
  }
  const fallbackDec = (hash >>> 0).toString();
  cachedSerialNumber = fallbackDec;
  return fallbackDec;
}

