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
 * Probes the local Windows KioskAgent daemon running on http://127.0.0.1:7125
 * Returns real-time hardware status including target printer model and ribbon level.
 */
export async function checkLocalHardwareAgent(agentBaseUrl = DEFAULT_AGENT_URL): Promise<LocalHardwareAgentStatus> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1200);

  try {
    const res = await fetch(`${agentBaseUrl}/api/health`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return {
        isOnline: false,
        printerModel: 'Unknown',
        printerStatus: 'HTTP_ERROR',
        printerConnected: false,
        ribbonLevelPct: 0,
        ribbonType: 'YMCKO',
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

    return {
      isOnline: true,
      printerModel: data.printerModel || 'Windows Card Printer',
      printerStatus: data.printerStatus || 'READY',
      printerConnected: data.printerConnected !== false,
      ribbonLevelPct: ribbonPct,
      ribbonType: 'YMCKO',
      agentVersion: data.agentVersion || '1.0.0',
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    return {
      isOnline: false,
      printerModel: 'Offline / Standalone',
      printerStatus: 'AGENT_NOT_DETECTED',
      printerConnected: false,
      ribbonLevelPct: 0,
      ribbonType: 'YMCKO',
      agentVersion: 'None',
      error: err?.name === 'AbortError' ? 'Connection timed out' : 'Local hardware agent not reachable',
    };
  }
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
 * Dispatches an ID card print job to the physical printer via the local KioskAgent daemon.
 */
export async function dispatchHardwarePrintJob({
  employee,
  template = DEFAULT_CR80_TEMPLATE,
  verificationBaseUrl = '',
  agentBaseUrl = DEFAULT_AGENT_URL,
  preRenderedCanvases,
  onProgress,
}: {
  employee: Employee;
  template?: any;
  verificationBaseUrl?: string;
  agentBaseUrl?: string;
  preRenderedCanvases?: { frontDataUrl: string; backDataUrl: string };
  onProgress?: (state: PrintProgressState) => void;
}): Promise<{ success: boolean; error?: string; jobId?: string }> {
  // Step 1: Probe local agent
  onProgress?.({
    stage: 'CHECKING',
    stepNumber: 1,
    totalSteps: 4,
    message: 'Checking local printer hardware agent connection...',
    percent: 15,
  });

  const agentStatus = await checkLocalHardwareAgent(agentBaseUrl);
  if (!agentStatus.isOnline) {
    const errorMsg = 'Local Kiosk Agent daemon is not running on this PC. Please start the KioskAgent service or use Browser Print.';
    onProgress?.({
      stage: 'FAILED',
      stepNumber: 1,
      totalSteps: 4,
      message: errorMsg,
      percent: 15,
      error: errorMsg,
    });
    return { success: false, error: errorMsg };
  }

  // Step 2: Render or reuse 300 DPI high-res card canvases (instant reuse if pre-rendered)
  onProgress?.({
    stage: 'RENDERING',
    stepNumber: 2,
    totalSteps: 4,
    message: 'Preparing 300 DPI front & back card raster graphics...',
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

  // Step 3: Spool to physical printer via local KioskAgent
  onProgress?.({
    stage: 'SPOOLING',
    stepNumber: 3,
    totalSteps: 4,
    message: `Sending print raster to ${agentStatus.printerModel}...`,
    percent: 75,
  });

  const requestId = `ADMIN-PRINT-${Date.now()}`;
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

    // Step 4: Record in central database & update employee card status
    onProgress?.({
      stage: 'PRINTING',
      stepNumber: 4,
      totalSteps: 4,
      message: 'Card printed! Syncing issuance record with enterprise database...',
      percent: 90,
    });

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
        printerModel: agentStatus.printerModel,
      }),
    }).catch(() => { });

    onProgress?.({
      stage: 'COMPLETED',
      stepNumber: 4,
      totalSteps: 4,
      message: `Card successfully printed on ${agentStatus.printerModel}!`,
      percent: 100,
    });

    return { success: true, jobId: agentResult.jobId || requestId };
  } catch (netErr: any) {
    const errorMsg = `Communication with hardware printer failed: ${netErr?.message || 'Network error'}`;
    onProgress?.({
      stage: 'FAILED',
      stepNumber: 3,
      totalSteps: 4,
      message: errorMsg,
      percent: 75,
      error: errorMsg,
    });
    return { success: false, error: errorMsg };
  }
}

/**
 * Triggers standard browser-based high-DPI print dialog calibrated to exact CR80 credit-card dimensions (85.6mm x 54mm).
 * Usable on any standalone admin PC even without the KioskAgent daemon running.
 */
export async function triggerBrowserCardPrint({
  employee,
  template = DEFAULT_CR80_TEMPLATE,
  verificationBaseUrl = '',
}: {
  employee: Employee;
  template?: any;
  verificationBaseUrl?: string;
}): Promise<void> {
  const { frontDataUrl, backDataUrl } = await renderEmployeeCardCanvases(employee, template, verificationBaseUrl);

  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (!printWindow) {
    throw new Error('Pop-up window blocked. Please allow pop-ups to print badges.');
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Print ID Badge - ${employee.fullName} (${employee.employeeNumber})</title>
        <style>
          @page {
            size: 85.6mm 54mm;
            margin: 0;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            background-color: #fff;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .card-page {
            width: 85.6mm;
            height: 54mm;
            page-break-after: always;
            page-break-inside: avoid;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
          }
          .card-page:last-child {
            page-break-after: auto;
          }
          .card-img {
            width: 100%;
            height: 100%;
            object-fit: fill;
            display: block;
          }
        </style>
      </head>
      <body>
        <div class="card-page">
          <img class="card-img" src="${frontDataUrl}" alt="Card Front" />
        </div>
        <div class="card-page">
          <img class="card-img" src="${backDataUrl}" alt="Card Back" />
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.focus();
              window.print();
              setTimeout(function() { window.close(); }, 1000);
            }, 300);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  // Log print job in database
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
      kioskCode: 'ADMIN-BROWSER',
      status: 'COMPLETED',
      printerModel: 'Browser Driver / System Print',
    }),
  }).catch(() => { });
}

