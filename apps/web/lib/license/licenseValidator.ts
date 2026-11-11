/**
 * MagicCard License Validation Engine
 * 100% Bit-for-Bit Compatible with RG Key Generator (C:\Users\MIS-WILBERT\Desktop\GENERATOR\Generator\Form1.vb):
 * - Program ID: 2267918294 (RG Generator default) and 2267918298
 * - Client ID: 25
 * - Hardware / Volume Serial Number (UInt32)
 * - serialFL: last digit + first digit of serial number string
 * - Product Key 1: Main Validation Key = Encrypt(program_id, serial_number) via .NET Random algorithm
 * - Product Key 2: Duration Key (15, 30, 45, 60 days, Lifetime)
 * - Product Key 3: System Type Key (Standalone, Standalone Branch / Consolidator, Server, IMS)
 */

export const PROGRAM_ID = '2267918294';
export const PROGRAM_ID_ALT = '2267918298';
export const CLIENT_ID = '25';
export const DEFAULT_PRODUCT_ID = '675683451';

export interface LicenseRecord {
  productId: string;
  productKey: string;     // Product Key 1 (Main Validation Key)
  productKey1: string;    // Product Key 2 (Duration Key)
  productKey2: string;    // Product Key 3 (System Type Key)
  status: string;
  edition: string;
  consolidator: boolean;
  installedAt: string;
  endDate: string;        // ISO date string or "Lifetime"
  isRegistered: boolean;
}

export interface LicenseStatusResult {
  isRegistered: boolean;
  isExpired: boolean;
  isGracePeriod: boolean;
  daysRemaining: number | string;
  status: string;
  edition: string;
  consolidator: boolean;
  installedAt?: string;
  endDate?: string;
  productId: string;
  programId: string;
  clientId: string;
  message?: string;
}

/**
 * Re-implementation of .NET Framework System.Random (Knuth subtractive generator)
 * Produces identical output to .NET `New Random(seed).NextDouble()`
 */
class DotNetRandom {
  private SeedArray: number[] = new Array(56);
  private inext: number;
  private inextp: number;

  constructor(seed: number) {
    const subtraction = seed === -2147483648 ? 2147483647 : Math.abs(seed);
    let mj = 161803398 - subtraction;
    this.SeedArray[55] = mj;
    let mk = 1;
    for (let i = 1; i < 55; i++) {
      const ii = (21 * i) % 55;
      this.SeedArray[ii] = mk;
      mk = mj - mk;
      if (mk < 0) mk += 2147483647;
      mj = this.SeedArray[ii];
    }
    for (let k = 1; k < 5; k++) {
      for (let i = 1; i < 56; i++) {
        this.SeedArray[i] -= this.SeedArray[1 + ((i + 30) % 55)];
        if (this.SeedArray[i] < 0) this.SeedArray[i] += 2147483647;
      }
    }
    this.inext = 0;
    this.inextp = 21;
  }

  sample(): number {
    let locINext = this.inext + 1;
    let locINextp = this.inextp + 1;
    if (locINext >= 56) locINext = 1;
    if (locINextp >= 56) locINextp = 1;
    let retVal = this.SeedArray[locINext] - this.SeedArray[locINextp];
    if (retVal === 2147483647) retVal--;
    if (retVal < 0) retVal += 2147483647;
    this.SeedArray[locINext] = retVal;
    this.inext = locINext;
    this.inextp = locINextp;
    return retVal * (1.0 / 2147483647);
  }

  nextDouble(): number {
    return this.sample();
  }
}

/**
 * Mirrors VB.NET:
 * Private Function Encrypt(ByVal seed As UInt32, ByVal value As UInt32) As UInt32
 *     Dim rand As New Random(CInt(seed \ 2))
 *     Return (value Xor CUInt(UInt32.MaxValue * rand.NextDouble()))
 * End Function
 */
export function encrypt(programId: number | string, serialNumber: number | string): string {
  const pId = Number(programId);
  const sNum = Number(serialNumber);
  const seed = Math.floor(pId / 2);
  const rand = new DotNetRandom(seed);
  const factor = Math.floor(4294967295 * rand.nextDouble());
  return ((sNum ^ factor) >>> 0).toString();
}

/**
 * serialFL = last digit + first digit of serial number string
 */
export function extractSerialFL(productId: string): string {
  const clean = String(productId || '').trim();
  if (!clean) return '00';
  const lastChar = clean.slice(-1);
  const firstChar = clean.slice(0, 1);
  return `${lastChar}${firstChar}`;
}

export function validateProductKeys(
  productId: string,
  productKey1_Main: string,    // txtProductkey1 in RG Generator (Main Validation Key)
  productKey2_Duration: string,// txtProductkey2 in RG Generator (Duration Key)
  productKey3_SystemType: string,// txtProductkey3 in RG Generator (System Type)
  existingInstalledAt?: string
): { valid: boolean; license?: LicenseRecord; message?: string } {
  const cleanProductId = String(productId || '').trim();
  const cleanKey1 = String(productKey1_Main || '').trim();
  const cleanKey2 = String(productKey2_Duration || '').trim();
  const cleanKey3 = String(productKey3_SystemType || '').trim();

  if (!cleanProductId) {
    return { valid: false, message: 'Hardware / Volume Serial Number is required.' };
  }
  if (!cleanKey1) {
    return { valid: false, message: 'Product Key 1 (Main Validation Key) is required.' };
  }
  if (!cleanKey2) {
    return { valid: false, message: 'Product Key 2 (Duration Key) is required.' };
  }
  if (!cleanKey3) {
    return { valid: false, message: 'Product Key 3 (System Type) is required.' };
  }

  const serialFL = extractSerialFL(cleanProductId);

  // 1. Validate Product Key 1 (Main Validation Key = Encrypt(program_id, serial_number))
  const expectedKey_2267918294 = encrypt(PROGRAM_ID, cleanProductId);
  const expectedKey_2267918298 = encrypt(PROGRAM_ID_ALT, cleanProductId);

  const isMainKeyValid =
    cleanKey1 === expectedKey_2267918294 ||
    cleanKey1 === expectedKey_2267918298;

  if (!isMainKeyValid) {
    return {
      valid: false,
      message: `Product Key 1 is incorrect for Hardware Serial ${cleanProductId}. Please check the key in RG Generator.`,
    };
  }

  // 2. Validate Product Key 2 (Duration Key)
  let daysToAdd = 0;
  let status = '';
  let isLifetime = false;

  if (cleanKey2 === `${serialFL}1068023436`) {
    daysToAdd = 15;
    status = 'Trial Version - 15 days';
  } else if (cleanKey2 === `${serialFL}3311823075`) {
    daysToAdd = 37; // 30 days + 7 days grace period
    status = 'License with validity - 30 days';
  } else if (cleanKey2 === `${serialFL}1260655418`) {
    daysToAdd = 52; // 45 days + 7 days grace period
    status = 'License with validity - 45 days';
  } else if (cleanKey2 === `${serialFL}3504455057`) {
    daysToAdd = 67; // 60 days + 7 days grace period
    status = 'License with validity - 60 days';
  } else if (cleanKey2 === `${serialFL}3119191093`) {
    isLifetime = true;
    status = 'Lifetime';
  } else {
    return {
      valid: false,
      message: `Invalid Product Key 2 (Duration Key) for Serial ${cleanProductId}. Key prefix must match (${serialFL}).`,
    };
  }

  // 3. Validate Product Key 3 (System Type)
  let consolidator = false;
  let edition = '';

  if (cleanKey3 === `${serialFL}1453287400`) {
    consolidator = false;
    edition = 'Standalone Edition';
  } else if (cleanKey3 === `${serialFL}3697087039`) {
    consolidator = true;
    edition = 'Standalone Branch / Consolidator';
  } else if (cleanKey3 === `${serialFL}1645919382`) {
    consolidator = true;
    edition = 'Enterprise Server Edition';
  } else if (cleanKey3 === `${serialFL}1838551364`) {
    consolidator = true;
    edition = 'IMS Full Suite Edition';
  } else {
    return {
      valid: false,
      message: `Invalid Product Key 3 (System Type Key) for Serial ${cleanProductId}. Key prefix must match (${serialFL}).`,
    };
  }

  const installedAtDate = existingInstalledAt ? new Date(existingInstalledAt) : new Date();
  let endDateStr = 'Lifetime';

  if (!isLifetime) {
    const end = new Date(installedAtDate);
    end.setDate(end.getDate() + daysToAdd);
    endDateStr = end.toISOString();
  }

  const license: LicenseRecord = {
    productId: cleanProductId,
    productKey: cleanKey1,
    productKey1: cleanKey2,
    productKey2: cleanKey3,
    status,
    edition,
    consolidator,
    installedAt: installedAtDate.toISOString(),
    endDate: endDateStr,
    isRegistered: true,
  };

  return {
    valid: true,
    license,
    message: isLifetime
      ? 'Lifetime License activated successfully.'
      : `License activated for ${status}.`,
  };
}

export function evaluateLicenseStatus(license: LicenseRecord | null): LicenseStatusResult {
  if (!license || !license.isRegistered) {
    return {
      isRegistered: false,
      isExpired: true,
      isGracePeriod: false,
      daysRemaining: 0,
      status: 'Unregistered',
      edition: 'Unlicensed',
      consolidator: false,
      productId: DEFAULT_PRODUCT_ID,
      programId: PROGRAM_ID,
      clientId: CLIENT_ID,
      message: 'System is unregistered. Please enter valid product keys to activate.',
    };
  }

  if (license.endDate === 'Lifetime' || license.status === 'Lifetime') {
    return {
      isRegistered: true,
      isExpired: false,
      isGracePeriod: false,
      daysRemaining: 'Lifetime',
      status: 'Lifetime',
      edition: license.edition,
      consolidator: license.consolidator,
      installedAt: license.installedAt,
      endDate: 'Lifetime',
      productId: license.productId,
      programId: PROGRAM_ID,
      clientId: CLIENT_ID,
      message: 'Lifetime License Active.',
    };
  }

  const now = new Date();
  const end = new Date(license.endDate);
  const diffMs = end.getTime() - now.getTime();
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (daysLeft <= 0) {
    return {
      isRegistered: false,
      isExpired: true,
      isGracePeriod: false,
      daysRemaining: 0,
      status: 'Expired',
      edition: license.edition,
      consolidator: license.consolidator,
      installedAt: license.installedAt,
      endDate: license.endDate,
      productId: license.productId,
      programId: PROGRAM_ID,
      clientId: CLIENT_ID,
      message: 'License has expired. Please contact your software provider to renew.',
    };
  }

  const isGrace = daysLeft <= 7;
  return {
    isRegistered: true,
    isExpired: false,
    isGracePeriod: isGrace,
    daysRemaining: daysLeft,
    status: license.status,
    edition: license.edition,
    consolidator: license.consolidator,
    installedAt: license.installedAt,
    endDate: license.endDate,
    productId: license.productId,
    programId: PROGRAM_ID,
    clientId: CLIENT_ID,
    message: isGrace
      ? `Grace Period: ${daysLeft} days left on your license. Please contact your software provider.`
      : `${daysLeft} days left on your license.`,
  };
}
