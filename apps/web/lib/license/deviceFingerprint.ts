/**
 * Client Hardware Fingerprinting Module
 * Computes a deterministic, cross-browser 9-digit Hardware ID
 * based on physical machine attributes (GPU, CPU cores, Screen resolution, Hardware limits)
 * without needing any native desktop app or local server.
 *
 * This ensures that Google Chrome, Mozilla Firefox, Microsoft Edge, and Incognito
 * on the SAME PC/Laptop generate the exact same Product ID.
 */

function fnv1a32(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Normalizes GPU strings so Chrome's ANGLE wrapper and Firefox's Direct3D wrapper
 * produce the exact same normalized signature for the same physical GPU.
 */
export function cleanGpuSignature(renderer: string): string {
  if (!renderer) return 'generic_gpu';

  const clean = renderer
    .replace(/angle\s*\(/gi, '')
    .replace(/\b(direct3d\d*|d3d\d*|opengl|vulkan|webgl)\b/gi, '')
    .replace(/\b(vs|ps)_\d+_\d+\b/gi, '')
    .replace(/google inc\.[^)]*\)/gi, '')
    .replace(/[^a-zA-Z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  // Deduplicate and sort words so word-order variations between browsers match 100%
  const words = Array.from(new Set(clean.split(' '))).filter(Boolean).sort();
  return words.join(' ');
}

export function getHardwareFingerprint(): string {
  if (typeof window === 'undefined') return '';

  const components: string[] = [];

  // 1. CPU Hardware concurrency (number of physical/logical cores, e.g. 8, 12, 16)
  const cores = navigator.hardwareConcurrency || 4;
  components.push(`cpu:${cores}`);

  // 2. Physical display resolution & color depth (e.g. 1920x1080x24)
  const screenWidth = window.screen?.width || 0;
  const screenHeight = window.screen?.height || 0;
  const colorDepth = window.screen?.colorDepth || 24;
  components.push(`screen:${screenWidth}x${screenHeight}x${colorDepth}`);

  // 3. WebGL GPU hardware parameters
  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;

    if (gl) {
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const unmaskedRenderer = ext
        ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || ''
        : '';

      const gpuSig = cleanGpuSignature(String(unmaskedRenderer));
      components.push(`gpu:${gpuSig}`);
    }
  } catch {
    // Ignore restricted context
  }

  // 4. Hash components into 32-bit unsigned integer
  const rawFingerprint = components.join(';');
  const hash32 = fnv1a32(rawFingerprint);

  // Map to a valid 9-digit serial number (100000000 to 999999999)
  const productNumber = (100000000 + (hash32 % 900000000)).toString();
  return productNumber;
}

export const STORAGE_KEY_DEVICE_ID = 'magiccard_device_id_v4';

/**
 * Fast asynchronous query to the local Kiosk Agent (http://127.0.0.1:7125/api/machine-id).
 * If the local agent is running on this Windows PC, it returns the EXACT Windows Drive C:
 * serial number (675683451) matching VB.NET GetVolumeInformation bit-for-bit.
 * Times out gracefully in 400ms if the local agent is not running.
 */
export async function fetchLocalAgentMachineId(): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 400);

    const res = await fetch('http://127.0.0.1:7125/api/machine-id', {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timer);

    if (res.ok) {
      const json = await res.json();
      if (json.serialNumber && /^\d{9,10}$/.test(String(json.serialNumber))) {
        const id = String(json.serialNumber);
        localStorage.setItem(STORAGE_KEY_DEVICE_ID, id);
        return id;
      }
    }
  } catch {
    // Agent not running or loopback unavailable
  }
  return null;
}

/**
 * Returns the current machine's persistent device serial number.
 * 1. If the user explicitly typed/saved a custom ID in this browser, use it.
 * 2. Otherwise, calculates the deterministic hardware fingerprint so Chrome,
 *    Firefox, and Edge on the same PC will return the identical 9-digit ID.
 */
export function getClientDeviceSerial(): string {
  if (typeof window === 'undefined') return '';

  // 1. Check if user explicitly set a custom device ID or v4 already cached
  const savedV4 = localStorage.getItem(STORAGE_KEY_DEVICE_ID)?.trim();
  if (savedV4 && /^\d{9,10}$/.test(savedV4)) {
    return savedV4;
  }

  // 2. Hardware fingerprint (consistent across Chrome, Firefox, Edge on same PC)
  const hardwareSerial = getHardwareFingerprint();
  if (hardwareSerial) {
    localStorage.setItem(STORAGE_KEY_DEVICE_ID, hardwareSerial);
    return hardwareSerial;
  }

  // 3. Fallback to v3 or default
  const savedV3 = localStorage.getItem('magiccard_device_id_v3')?.trim();
  if (savedV3 && /^\d{9,10}$/.test(savedV3)) {
    return savedV3;
  }

  const fallback = '675683451';
  localStorage.setItem(STORAGE_KEY_DEVICE_ID, fallback);
  return fallback;
}
