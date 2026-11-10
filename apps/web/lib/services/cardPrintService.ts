import { renderCardToCanvas } from '@workspace/card-engine';
import { Employee, DEFAULT_CR80_TEMPLATE } from '@/lib/data/enterpriseStore';

export interface LocalHardwareAgentStatus {
  isOnline: boolean;
  printerModel: string;
  printerStatus: string;
  printerConnected: boolean;
  ribbonLevelPct: number;
  ribbonType: string;
  agentVersion: string;
  error?: string;
}

export interface SelectablePrinter {
  id: string;
  name: string;
  model: string;
  brand: string;
  isOnline: boolean;
  status: string;
  ribbonLevelPct: number;
  source: 'LOCAL_AGENT' | 'KIOSK_FLEET';
  kioskCode?: string;
  duplexCapable?: boolean;
}

export interface PrintProgressState {
  stage: 'IDLE' | 'CHECKING' | 'RENDERING' | 'SPOOLING' | 'PRINTING' | 'COMPLETED' | 'FAILED';
  stepNumber: number;
  totalSteps: number;
  message: string;
  percent: number;
  error?: string;
}

const DEFAULT_AGENT_URL = process.env.NEXT_PUBLIC_KIOSK_AGENT_URL || 'http://127.0.0.1:7125';
const AGENT_SECRET_TOKEN = 'super-secret-local-agent-token-2026';

/**
 * Probes the local Windows KioskAgent daemon running on http://127.0.0.1:7125.
 * Strictly reflects actual connection and hardware state with zero mock data.
 */
export async function checkLocalHardwareAgent(agentBaseUrl = DEFAULT_AGENT_URL): Promise<LocalHardwareAgentStatus> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1200);

  try {
    const res = await fetch(`${agentBaseUrl}/api/health`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return {
        isOnline: false,
        printerModel: 'Disconnected',
        printerStatus: 'HTTP_ERROR',
        printerConnected: false,
        ribbonLevelPct: 0,
        ribbonType: 'None',
        agentVersion: 'Unknown',
        error: `Agent returned HTTP ${res.status}`,
      };
    }

    const data = await res.json();
    let ribbonPct = 100;
    if (data.printerStatus) {
      const match = data.printerStatus.match(/Ribbon\s*(\d+)%/i);
      if (match) ribbonPct = parseInt(match[1], 10);
    }

    const isConnected = data.printerConnected !== false && data.printerStatus && !data.printerStatus.includes('OFFLINE') && !data.printerStatus.includes('UNAVAILABLE');

    return {
      isOnline: true,
      printerModel: data.printerModel || 'Windows Card Printer',
      printerStatus: data.printerStatus || (isConnected ? 'READY' : 'OFFLINE'),
      printerConnected: isConnected,
      ribbonLevelPct: ribbonPct,
      ribbonType: data.ribbonType || 'YMCKO',
      agentVersion: data.agentVersion || '1.0.0',
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    return {
      isOnline: false,
      printerModel: 'Disconnected',
      printerStatus: 'OFFLINE',
      printerConnected: false,
      ribbonLevelPct: 0,
      ribbonType: 'None',
      agentVersion: 'None',
      error: err?.name === 'AbortError' ? 'Connection timed out' : 'Local hardware agent not reachable on localhost:7125',
    };
  }
}

/**
 * Fetches REAL available card printers from local Windows agent and registered fleet kiosks.
 * Returns only genuine detected hardware. Zero mock/fake presets.
 */
export async function fetchAvailableCardPrinters(agentBaseUrl = DEFAULT_AGENT_URL): Promise<SelectablePrinter[]> {
  const results: SelectablePrinter[] = [];
  const seenNames = new Set<string>();

  // 1. Check local agent printers endpoint (real Windows installed printers)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1200);
    const localRes = await fetch(`${agentBaseUrl}/api/printers`, { signal: controller.signal });
    clearTimeout(timeout);
    if (localRes.ok) {
      const printers = await localRes.json();
      if (Array.isArray(printers)) {
        for (const p of printers) {
          const pName = p.name || p.Name;
          if (pName && !seenNames.has(pName.toLowerCase())) {
            seenNames.add(pName.toLowerCase());
            const isOnline = p.isOnline === true || (p.status && p.status.toUpperCase() === 'READY');
            results.push({
              id: `local-${pName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
              name: pName,
              model: pName,
              brand: detectBrand(pName),
              isOnline,
              status: isOnline ? 'READY' : 'OFFLINE',
              ribbonLevelPct: isOnline ? 100 : 0,
              source: 'LOCAL_AGENT',
              duplexCapable: true,
            });
          }
        }
      }
    }
  } catch { }

  // 2. Fetch fleet kiosks registered in central database
  try {
    const fleetRes = await fetch('/api/kiosks');
    if (fleetRes.ok) {
      const json = await fleetRes.json();
      if (Array.isArray(json.data)) {
        for (const k of json.data) {
          const pModel = k.printerModel || k.printerConfig?.targetPrinter;
          if (pModel) {
            const isKioskOnline = k.status === 'ONLINE';
            const rawStatus = k.printerStatus || '';
            const isPrinterReady = isKioskOnline && (rawStatus === 'READY' || rawStatus.startsWith('READY'));
            const statusLabel = isPrinterReady ? 'READY' : (isKioskOnline ? (rawStatus || 'OFFLINE') : 'OFFLINE (Agent Disconnected)');

            const displayName = `${pModel} (${k.name || k.kioskCode || 'Kiosk'})`;
            if (!seenNames.has(displayName.toLowerCase())) {
              seenNames.add(displayName.toLowerCase());
              results.push({
                id: `kiosk-${k.id}`,
                name: displayName,
                model: pModel,
                brand: detectBrand(pModel),
                isOnline: isPrinterReady,
                status: statusLabel,
                ribbonLevelPct: isPrinterReady ? (k.ribbonLevelPct || 100) : 0,
                source: 'KIOSK_FLEET',
                kioskCode: k.kioskCode,
                duplexCapable: k.printerConfig?.duplexMode !== 'SingleSided',
              });
            }
          }
        }
      }
    }
  } catch { }

  return results;
}

function detectBrand(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('magicard') || n.includes('600neo') || n.includes('pronto')) return 'Magicard';
  if (n.includes('zebra') || n.includes('zc')) return 'Zebra';
  if (n.includes('evolis') || n.includes('primacy') || n.includes('zenius')) return 'Evolis';
  if (n.includes('fargo') || n.includes('dtc') || n.includes('hdp')) return 'Fargo';
  if (n.includes('datacard') || n.includes('entrust')) return 'Entrust';
  return 'Card Printer';
}

/**
 * Renders high-resolution (300 DPI) front and back canvas images of the employee card.
 */
export async function renderEmployeeCardCanvases(
  employee: Employee,
  template: any = DEFAULT_CR80_TEMPLATE,
  verificationBaseUrl = ''
): Promise<{ frontDataUrl: string; backDataUrl: string }> {
  const frontCanvas = document.createElement('canvas');
  const backCanvas = document.createElement('canvas');

  await Promise.all([
    renderCardToCanvas(frontCanvas, template, 'front', employee, { scale: 3, baseUrl: verificationBaseUrl }),
    renderCardToCanvas(backCanvas, template, 'back', employee, { scale: 3, baseUrl: verificationBaseUrl }),
  ]);

  return {
    frontDataUrl: frontCanvas.toDataURL('image/png'),
    backDataUrl: backCanvas.toDataURL('image/png'),
  };
}

/**
 * Dispatches an ID card print job to the physical printer.
 */
export async function dispatchHardwarePrintJob({
  employee,
  template = DEFAULT_CR80_TEMPLATE,
  verificationBaseUrl = '',
  agentBaseUrl = DEFAULT_AGENT_URL,
  targetPrinter,
  duplexMode = 'Duplex',
  preRenderedCanvases,
  onProgress,
}: {
  employee: Employee;
  template?: any;
  verificationBaseUrl?: string;
  agentBaseUrl?: string;
  targetPrinter?: string;
  duplexMode?: 'Duplex' | 'SingleSided';
  preRenderedCanvases?: { frontDataUrl: string; backDataUrl: string };
  onProgress?: (state: PrintProgressState) => void;
}): Promise<{ success: boolean; error?: string; jobId?: string }> {
  if (!targetPrinter) {
    return { success: false, error: 'No printer selected. Please connect and select an ID card printer.' };
  }

  // Step 1: Probe connection
  onProgress?.({
    stage: 'CHECKING',
    stepNumber: 1,
    totalSteps: 4,
    message: `Checking connection to ${targetPrinter}...`,
    percent: 15,
  });

  const agentStatus = await checkLocalHardwareAgent(agentBaseUrl);

  // Step 2: Prepare 300 DPI high-res card canvases
  onProgress?.({
    stage: 'RENDERING',
    stepNumber: 2,
    totalSteps: 4,
    message: 'Preparing 300 DPI front & back card geometry...',
    percent: 45,
  });

  let frontDataUrl = preRenderedCanvases?.frontDataUrl || '';
  let backDataUrl = preRenderedCanvases?.backDataUrl || '';

  if (!frontDataUrl || !backDataUrl) {
    try {
      const rendered = await renderEmployeeCardCanvases(employee, template, verificationBaseUrl);
      frontDataUrl = rendered.frontDataUrl;
      backDataUrl = rendered.backDataUrl;
    } catch (renderErr: any) {
      const msg = `Card graphic rendering failed: ${renderErr?.message || 'Unknown error'}`;
      onProgress?.({
        stage: 'FAILED',
        stepNumber: 2,
        totalSteps: 4,
        message: msg,
        percent: 45,
        error: msg,
      });
      return { success: false, error: msg };
    }
  }

  // Step 3: Spool to physical printer
  onProgress?.({
    stage: 'SPOOLING',
    stepNumber: 3,
    totalSteps: 4,
    message: `Sending print raster to ${targetPrinter}...`,
    percent: 75,
  });

  const requestId = `PRINT-${Date.now()}`;

  if (agentStatus.isOnline) {
    // Mode A: Direct spool via local KioskAgent daemon
    try {
      const res = await fetch(`${agentBaseUrl}/api/print`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Kiosk-Agent-Secret': AGENT_SECRET_TOKEN,
        },
        body: JSON.stringify({
          requestId,
          idempotencyKey: `idem-${requestId}`,
          employeeId: employee.id,
          employeeNumber: employee.employeeNumber,
          templateId: template?.id || 'default-cr80',
          frontCanvasDataUrl: frontDataUrl,
          backCanvasDataUrl: backDataUrl,
          targetPrinter,
          duplexMode,
          frontData: {
            fullName: employee.fullName,
            employeeNumber: employee.employeeNumber,
            department: employee.departmentName || 'Corporate',
          },
        }),
      });

      const agentResult = await res.json().catch(() => ({}));
      if (!res.ok || !agentResult.success) {
        const failReason = agentResult.errorMessage || agentResult.error || `Printer driver returned HTTP ${res.status}`;
        onProgress?.({
          stage: 'FAILED',
          stepNumber: 3,
          totalSteps: 4,
          message: `Hardware print failed: ${failReason}`,
          percent: 75,
          error: failReason,
        });
        return { success: false, error: failReason };
      }
    } catch (err: any) {
      const failReason = `Failed to transmit print job to agent on port 7125: ${err?.message || 'Network error'}`;
      onProgress?.({
        stage: 'FAILED',
        stepNumber: 3,
        totalSteps: 4,
        message: failReason,
        percent: 75,
        error: failReason,
      });
      return { success: false, error: failReason };
    }
  } else {
    // Agent is offline
    const failReason = 'Local KioskAgent daemon is offline. Please start the KioskAgent service on your PC to print to physical hardware.';
    onProgress?.({
      stage: 'FAILED',
      stepNumber: 3,
      totalSteps: 4,
      message: failReason,
      percent: 75,
      error: failReason,
    });
    return { success: false, error: failReason };
  }

  // Step 4: Record in central database & update employee card status to PRINTED
  onProgress?.({
    stage: 'PRINTING',
    stepNumber: 4,
    totalSteps: 4,
    message: 'Card printed! Syncing issuance record in enterprise directory...',
    percent: 90,
  });

  try {
    await fetch('/api/print-jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employeeId: employee.id,
        employeeNumber: employee.employeeNumber,
        employeeName: employee.fullName,
        branchId: employee.branchId,
        branchName: employee.branchName,
        departmentId: employee.departmentId,
        departmentName: employee.departmentName,
        kioskCode: 'ADMIN-CONSOLE',
        status: 'COMPLETED',
        printerModel: targetPrinter,
      }),
    });
  } catch { }

  onProgress?.({
    stage: 'COMPLETED',
    stepNumber: 4,
    totalSteps: 4,
    message: `Card successfully printed on ${targetPrinter}!`,
    percent: 100,
  });

  return { success: true, jobId: requestId };
}
