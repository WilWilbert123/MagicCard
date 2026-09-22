'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  Search,
  Delete,
  ArrowLeft,
  Printer,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  RefreshCw,
  Check,
  User,
  HelpCircle,
  X,
  Send,
  Building2,
  Maximize,
} from 'lucide-react';
import { enterpriseStore, Employee, DEFAULT_CR80_TEMPLATE } from '@/lib/data/enterpriseStore';
import { renderCardToCanvas } from '@workspace/card-engine';
import { toast } from '@/components/ui/Toast';
import Card2DViewer from '@/components/card/Card2DViewer';

import PixelBlast from '@/components/kiosk/PixelBlast';

// Lazy-load Three.js viewer
const ThreeCardViewer = dynamic(() => import('@/components/three/ThreeCardViewer'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[380px] rounded-2xl bg-slate-900 flex items-center justify-center text-slate-400 text-sm">
      Rendering...
    </div>
  ),
});

type KioskStep = 'SCREENSAVER' | 'SEARCH' | 'PREVIEW' | 'PRINTING' | 'SUCCESS' | 'ERROR';

// Live clock shown in the screensaver bottom-right corner
function LiveClock() {
  const [time, setTime] = useState<Date | null>(null);
  useEffect(() => {
    setTime(new Date());
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Render nothing on the server (avoids SSR hydration mismatch)
  if (!time) return null;

  const hh = time.getHours().toString().padStart(2, '0');
  const mm = time.getMinutes().toString().padStart(2, '0');
  const ss = time.getSeconds().toString().padStart(2, '0');
  const dateStr = time.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  return (
    <div className="absolute bottom-4 right-6 flex flex-col items-end z-10 pointer-events-none select-none">
      <div className="text-2xl font-black font-mono text-white/80 leading-none tracking-wider" style={{ textShadow: '0 1px 8px rgba(0,0,0,0.8)' }}>
        {hh}:{mm}<span className="text-white/40 text-xl">:{ss}</span>
      </div>
      <div className="text-[10px] font-semibold text-white/30 tracking-widest uppercase mt-0.5">
        {dateStr}
      </div>
    </div>
  );
}

export default function KioskMainPage() {
  const [step, setStep] = useState<KioskStep>('SCREENSAVER');
  const [employeeInput, setEmployeeInput] = useState('');
  const [foundEmployee, setFoundEmployee] = useState<Employee | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [previewMode, setPreviewMode] = useState<'2D' | '3D'>('3D');
  const [cardSide, setCardSide] = useState<'front' | 'back'>('front');
  const [kioskTemplate, setKioskTemplate] = useState<any>(DEFAULT_CR80_TEMPLATE);

  // Print pipeline animation state
  const [currentPrintStepIndex, setCurrentPrintStepIndex] = useState(0);
  const [assignedJobNumber, setAssignedJobNumber] = useState('');
  const [inactivityCountdown, setInactivityCountdown] = useState(15);

  const printSteps = [
    'Validate Employee Identity',
    'Validate KIOSK Security Credential',
    'Validate Active Card Template (v2.0.0)',
    'Create Print Job in Supabase',
    'Transmit Job to Local KIOSK Agent',
    'MagicCard Trust ID Handshake',
    'Physical YMCKO Card Printing',
    'Verify Card Ejection Sensor',
    'Update Supabase Print Record',
    'Finalize Security Audit Log',
  ];

  const [kioskTimeoutSeconds, setKioskTimeoutSeconds] = useState(45);
  const [allowSelfServiceReprint, setAllowSelfServiceReprint] = useState(true);

  // HR Operations Desk Dispatch Modal state
  const [showHrDispatchModal, setShowHrDispatchModal] = useState(false);
  const [dispatchCategory, setDispatchCategory] = useState('Printer Hardware Offline / Not Found');
  const [dispatchNotes, setDispatchNotes] = useState('');
  const [isSubmittingDispatch, setIsSubmittingDispatch] = useState(false);

  const dispatchSuggestions = [
    "Can't Print / Printing Stopped",
    'KIOSK Error / Terminal Frozen',
    'Printer Hardware Offline / Not Found',
    'Card Jammed or Ejection Error',
    'Ribbon / YMCKO Supply Empty',
    'Employee Record Missing / Not Found',
    'Cross-Branch Printing Restricted',
    'Reprint / Badge Replacement Request',
    'Touchscreen / UI Unresponsive',
    'Network / Server Connection Error',
    'General HR Assistance Request',
  ];

  const handleSendHrDispatch = async () => {
    try {
      setIsSubmittingDispatch(true);
      const res = await fetch('/api/audit-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-kiosk-request': 'true',
        },
        body: JSON.stringify({
          action: 'HR_ASSISTANCE_REQUESTED',
          branchName: 'SM Sorsogon City',
          kioskCode: 'KIOSK-SOR-01',
          category: dispatchCategory,
          userNotes: dispatchNotes.trim() || 'No additional details provided.',
          employeeId: foundEmployee?.employeeNumber || foundEmployee?.id || undefined,
          employeeName: foundEmployee ? `${foundEmployee.firstName} ${foundEmployee.lastName}` : undefined,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to submit dispatch ticket.');
      }

      toast.success('HR Operations Desk notified! Alert sent to HR Header Notifications.');
      setShowHrDispatchModal(false);
      setDispatchNotes('');
    } catch (err: any) {
      toast.error(err.message || 'Error contacting HR Operations Desk.');
    } finally {
      setIsSubmittingDispatch(false);
    }
  };

  const [verificationBaseUrl, setVerificationBaseUrl] = useState<string>(process.env.NEXT_PUBLIC_APP_URL || '');

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((json) => {
        if (json.data) {
          if (typeof json.data.allowSelfServiceReprint === 'boolean') {
            setAllowSelfServiceReprint(json.data.allowSelfServiceReprint);
          }
          if (json.data.kioskInactivityTimeoutSeconds) {
            setKioskTimeoutSeconds(json.data.kioskInactivityTimeoutSeconds);
          }
          if (json.data.verificationBaseUrl) {
            setVerificationBaseUrl(json.data.verificationBaseUrl);
          }
        }
      })
      .catch(() => { });
  }, []);

  // Automatically request Fullscreen as soon as the KIOSK page loads or is touched
  useEffect(() => {
    const enterFullscreen = () => {
      if (typeof document !== 'undefined' && !document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => { });
      }
    };

    enterFullscreen();

    const handleGesture = () => enterFullscreen();
    window.addEventListener('click', handleGesture, { once: false });
    window.addEventListener('touchstart', handleGesture, { once: false });
    window.addEventListener('keydown', handleGesture, { once: false });

    return () => {
      window.removeEventListener('click', handleGesture);
      window.removeEventListener('touchstart', handleGesture);
      window.removeEventListener('keydown', handleGesture);
    };
  }, []);

  const [hardwarePrinterOnline, setHardwarePrinterOnline] = useState<boolean>(false);
  const [printerMode, setPrinterMode] = useState<'HARDWARE' | 'SIMULATION'>('HARDWARE');
  const [localKioskId, setLocalKioskId] = useState<string>('KIOSK-001');
  const [isTerminalDisabled, setIsTerminalDisabled] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const kParam = params.get('kiosk') || params.get('kioskCode') || params.get('code');
      if (kParam) {
        setLocalKioskId(kParam.trim().toUpperCase());
      }
    }
  }, []);

  // Poll central server every 5 seconds to enforce real-time DISABLE status set by HR Admin
  useEffect(() => {
    const checkKioskStatus = async () => {
      try {
        const res = await fetch('/api/kiosks');
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json.data)) {
            const currentKiosk = json.data.find(
              (k: any) =>
                k.code?.toUpperCase() === localKioskId.toUpperCase() ||
                k.id === localKioskId
            );
            if (currentKiosk && currentKiosk.status === 'DISABLED') {
              setIsTerminalDisabled(true);
            } else {
              setIsTerminalDisabled(false);
            }
          }
        }
      } catch {
        // Retain last state on network glitch
      }
    };

    checkKioskStatus();
    const interval = setInterval(checkKioskStatus, 5000);
    return () => clearInterval(interval);
  }, [localKioskId]);

  // Check hardware printer connectivity on localhost port 7125 and ping central backend
  useEffect(() => {
    const checkPrinterHardware = async () => {
      let agentPrinterName = '';
      let agentPrinterStatus = '';
      let agentPrinterType = '';

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const agentBaseUrl = process.env.NEXT_PUBLIC_KIOSK_AGENT_URL || 'http://127.0.0.1:7125';
        const res = await fetch(`${agentBaseUrl}/api/kiosk/status`, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json();
          setHardwarePrinterOnline(true);
          if (data.kioskId) setLocalKioskId(data.kioskId);
          if (data.printerName) agentPrinterName = data.printerName;
          if (data.printerStatus) agentPrinterStatus = data.printerStatus;
          if (data.printerType) agentPrinterType = data.printerType;
        } else {
          const statusRes = await fetch(`${agentBaseUrl}/api/status`);
          setHardwarePrinterOnline(statusRes.ok);
        }
      } catch {
        setHardwarePrinterOnline(false);
      }

      // Send real-time telemetry ping to central server from kiosk interface
      try {
        fetch('/api/kiosks/heartbeat', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-kiosk-request': 'true',
          },
          body: JSON.stringify({
            kioskCode: localKioskId,
            status: 'ONLINE',
            agentVersion: 'v1.4.0',
            printerModel: agentPrinterName || 'Magicard 600NEO',
            printerType: agentPrinterType || 'MagicCard',
            printerStatus: agentPrinterStatus || (hardwarePrinterOnline ? 'READY (Agent Online)' : 'READY (Kiosk Active)'),
          }),
        }).catch(() => {});
      } catch {}
    };

    checkPrinterHardware();
    const interval = setInterval(checkPrinterHardware, 5000);
    return () => clearInterval(interval);
  }, [localKioskId, hardwarePrinterOnline]);




  // Touchscreen Inactivity Timeout — Auto-resets KIOSK to SCREENSAVER if abandoned during search, preview, confirm or error
  useEffect(() => {
    if (step === 'SCREENSAVER' || step === 'PRINTING' || step === 'SUCCESS') return;

    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setStep('SCREENSAVER');
        setEmployeeInput('');
        setFoundEmployee(null);
        setErrorMessage('');
      }, (kioskTimeoutSeconds || 45) * 1000);
    };

    resetTimer();

    const handleUserActivity = () => resetTimer();
    window.addEventListener('pointerdown', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('touchstart', handleUserActivity);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('pointerdown', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('touchstart', handleUserActivity);
    };
  }, [step, employeeInput, kioskTimeoutSeconds]);

  // Keypad Handlers
  const handleKeypadPress = (val: string) => {
    if (employeeInput.length < 12) {
      setEmployeeInput(employeeInput + val);
    }
  };

  const handleBackspace = () => {
    setEmployeeInput(employeeInput.slice(0, -1));
  };

  const handleClear = () => {
    setEmployeeInput('');
  };

  const [isSearching, setIsSearching] = useState(false);

  // Search Logic via Supabase API
  const handleSearch = async () => {
    const term = employeeInput.trim();
    if (!term) return;

    setIsSearching(true);
    setErrorMessage('');

    try {
      const kioskHeaders = { 'x-kiosk-request': 'true' };

      // 1. Try matching by exact employee number via API
      let res = await fetch(`/api/employees?employeeNumber=${encodeURIComponent(term)}`, { headers: kioskHeaders });
      let json = res.ok ? await res.json() : null;
      let emp = json?.data?.[0];

      // 2. If not found, try broad query search (partial number or name) via API
      if (!emp) {
        res = await fetch(`/api/employees?q=${encodeURIComponent(term)}`, { headers: kioskHeaders });
        json = res.ok ? await res.json() : null;
        emp = json?.data?.[0];
      }

      // 3. If not found, try direct employee number route
      if (!emp) {
        res = await fetch(`/api/employees/${encodeURIComponent(term)}`, { headers: kioskHeaders });
        json = res.ok ? await res.json() : null;
        if (json?.data) {
          emp = json.data;
        }
      }

      // 4. Fallback search in enterpriseStore local state if network or API lookup returned nothing
      if (!emp) {
        const localEmp = enterpriseStore.findEmployeeByNumber(term) || enterpriseStore.employees.find(e =>
          e.employeeNumber.toLowerCase() === term.toLowerCase() ||
          e.fullName.toLowerCase().includes(term.toLowerCase())
        );
        if (localEmp) {
          emp = {
            id: localEmp.id,
            employeeNumber: localEmp.employeeNumber,
            fullName: localEmp.fullName,
            firstName: localEmp.firstName,
            lastName: localEmp.lastName,
            departmentName: localEmp.departmentName,
            departmentId: localEmp.departmentId,
            positionTitle: localEmp.positionTitle,
            branchName: localEmp.branchName,
            branchId: localEmp.branchId,
            photoUrl: localEmp.photoUrl,
            employmentStatus: localEmp.employmentStatus,
            cardStatus: localEmp.cardStatus,
          };
        }
      }

      if (!emp) {
        setErrorMessage(`Employee ID or Name "${term}" was not found in the directory. Please verify your Employee ID or contact HR.`);
        setStep('ERROR');
        return;
      }

      if (emp.employmentStatus && emp.employmentStatus !== 'ACTIVE') {
        setErrorMessage(`Employee record for ${emp.fullName} (${emp.employeeNumber}) is currently ${emp.employmentStatus}. Please see HR.`);
        setStep('ERROR');
        return;
      }

      // Check print job history in Supabase to accurately reflect card issuance status
      try {
        const pjRes = await fetch(`/api/print-jobs?q=${encodeURIComponent(emp.employeeNumber)}`, { headers: kioskHeaders });
        const pjJson = pjRes.ok ? await pjRes.json() : null;
        if (pjJson?.data && Array.isArray(pjJson.data) && pjJson.data.length > 0) {
          const hasCompletedJob = pjJson.data.some((j: any) => j.status === 'COMPLETED');
          if (hasCompletedJob && emp.cardStatus !== 'REPRINT_REQUESTED') {
            emp.cardStatus = 'ISSUED';
          }
        }
      } catch { }

      setFoundEmployee(emp);

      // Fetch dynamic active published card template for employee's branch or global default
      try {
        const tplRes = await fetch('/api/card-templates', { headers: kioskHeaders });
        const tplJson = tplRes.ok ? await tplRes.json() : null;
        if (tplJson?.data && Array.isArray(tplJson.data)) {
          const templates = tplJson.data;
          const matchingBranchTpl = templates.find(
            (t: any) =>
              t.branchId &&
              (t.branchId === emp.branchId ||
                (emp.branchName && t.branchName?.toLowerCase() === emp.branchName?.toLowerCase()) ||
                (emp.branchCode && t.branchCode === emp.branchCode))
          );
          const defaultTpl = templates.find((t: any) => t.isDefault) || templates[0];
          const targetTpl = matchingBranchTpl || defaultTpl;

          if (targetTpl) {
            const detailRes = await fetch(`/api/card-templates/${targetTpl.id}`, { headers: kioskHeaders });
            const detailJson = detailRes.ok ? await detailRes.json() : null;
            if (detailJson?.data?.layout) {
              setKioskTemplate(detailJson.data.layout);
            } else if (targetTpl.layout) {
              setKioskTemplate(targetTpl.layout);
            }
          }
        }
      } catch (err) {
        console.warn('Failed to fetch published card template for KIOSK:', err);
      }

      setStep('PREVIEW');
    } catch (err: any) {
      setErrorMessage(`Failed to verify employee record: ${err.message}`);
      setStep('ERROR');
    } finally {
      setIsSearching(false);
    }
  };

  // Start Hardware Print Pipeline Simulation
  const handleStartPrint = async () => {
    if (!foundEmployee) return;

    // Security check: If card is already issued/printed, enforce HR self-service re-issue policy
    if (foundEmployee.cardStatus === 'ISSUED' || foundEmployee.cardStatus === 'PRINTED') {
      if (!allowSelfServiceReprint) {
        toast.error('Self-service badge re-issuance is disabled by HR policy. Please contact HR to authorize a replacement card.');
        return;
      }
    }

    setStep('PRINTING');
    setCurrentPrintStepIndex(0);

    const idempotencyKey = `idem-kiosk-${Date.now()}`;

    // Step-by-step visual progression up to Agent Handshake (Step 5)
    for (let i = 0; i < 5; i++) {
      setCurrentPrintStepIndex(i);
      await new Promise((resolve) => setTimeout(resolve, 350));
    }

    // Attempt local hardware agent communication on port 7125 (/api/print)
    const agentBaseUrl = process.env.NEXT_PUBLIC_KIOSK_AGENT_URL || 'http://127.0.0.1:7125';
    let agentSuccess = false;
    let agentErrorMessage = '';

    try {
      // Render offscreen canvases for high-resolution 300DPI front & back ID card graphics
      const activeTemplate = kioskTemplate || DEFAULT_CR80_TEMPLATE;
      const frontCanvas = document.createElement('canvas');
      const backCanvas = document.createElement('canvas');

      await Promise.all([
        renderCardToCanvas(frontCanvas, activeTemplate, 'front', foundEmployee, { scale: 3, baseUrl: verificationBaseUrl }),
        renderCardToCanvas(backCanvas, activeTemplate, 'back', foundEmployee, { scale: 3, baseUrl: verificationBaseUrl }),
      ]);

      const frontCanvasDataUrl = frontCanvas.toDataURL('image/png');
      const backCanvasDataUrl = backCanvas.toDataURL('image/png');

      const agentRes = await fetch(`${agentBaseUrl}/api/print`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Kiosk-Agent-Secret': 'super-secret-local-agent-token-2026',
        },
        body: JSON.stringify({
          requestId: `REQ-${Date.now()}`,
          idempotencyKey,
          employeeId: foundEmployee.id,
          employeeNumber: foundEmployee.employeeNumber,
          templateId: activeTemplate?.id || 'ver-2',
          frontCanvasDataUrl,
          backCanvasDataUrl,
          frontData: {
            fullName: foundEmployee.fullName,
            employeeNumber: foundEmployee.employeeNumber,
            department: foundEmployee.departmentName || 'Operations',
          },
        }),
      });

      const agentData = await agentRes.json().catch(() => ({}));

      if (agentRes.ok && agentData.success) {
        agentSuccess = true;
      } else {
        agentSuccess = false;
        agentErrorMessage = agentData.errorMessage || agentData.error || `KioskAgent returned HTTP ${agentRes.status}`;
      }
    } catch (err: any) {
      agentSuccess = false;
      agentErrorMessage = err.message || 'Unable to connect to local KioskAgent daemon on port 7125.';
    }

    if (!agentSuccess) {
      setErrorMessage(`Physical Card Print Failed: ${agentErrorMessage}. Please verify your Magicard 600NEO USB cable, power status, and printer driver on your kiosk laptop.`);
      setStep('ERROR');
      return;
    }

    // Finish remaining print pipeline steps (6..9)
    for (let i = 5; i < printSteps.length; i++) {
      setCurrentPrintStepIndex(i);
      await new Promise((resolve) => setTimeout(resolve, 350));
    }

    // Register completed job in Supabase
    let generatedJobNum = `PRINT-${Date.now().toString().slice(-6)}`;
    try {
      const res = await fetch('/api/print-jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-kiosk-request': 'true',
        },
        body: JSON.stringify({
          employeeId: foundEmployee.id,
          employeeNumber: foundEmployee.employeeNumber,
          employeeName: foundEmployee.fullName,
          branchName: foundEmployee.branchName || 'Main Campus',
          branchId: foundEmployee.branchId || null,
          departmentName: foundEmployee.departmentName || 'General',
          departmentId: foundEmployee.departmentId || null,
          kioskCode: localKioskId,
          kioskId: localKioskId,
          idempotencyKey,
          status: 'COMPLETED',
        }),
      });
      const data = await res.json();
      if (data.data?.jobNumber || data.data?.job_number) {
        generatedJobNum = data.data?.jobNumber || data.data?.job_number;
      }
    } catch {
      // Graceful fallback
    }

    // Immediately mark employee as ISSUED in state & store
    setFoundEmployee((prev) => (prev ? { ...prev, cardStatus: 'ISSUED' } : null));
    enterpriseStore.updateEmployee(foundEmployee.id, { cardStatus: 'ISSUED' });

    setAssignedJobNumber(generatedJobNum);
    setStep('SUCCESS');
    setInactivityCountdown(12);
  };

  // Auto Reset Countdown Timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 'SUCCESS' || step === 'ERROR') {
      timer = setInterval(() => {
        setInactivityCountdown((prev) => {
          if (prev <= 1) {
            handleResetToHome();
            return 12;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step]);

  const handleResetToHome = () => {
    setStep('SCREENSAVER');
    setEmployeeInput('');
    setFoundEmployee(null);
    setErrorMessage('');
    setCurrentPrintStepIndex(0);
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center bg-[#070a11] text-white select-none overflow-hidden touch-none font-sans relative">
      {/* Real-Time Terminal Disabled Lock Screen Overlay */}
      {isTerminalDisabled && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center animate-fade-in">
          <div className="w-24 h-24 rounded-3xl bg-red-950/80 border-2 border-red-500/50 flex items-center justify-center mb-6 shadow-2xl shadow-red-950/80">
            <AlertCircle className="w-12 h-12 text-red-500 animate-pulse" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-wider uppercase mb-3">
            Terminal Out of Service
          </h1>
          <p className="text-base text-slate-400 max-w-md mb-8">
            This kiosk terminal has been temporarily disabled by an HR Administrator. Please contact the HR Operations Desk for assistance.
          </p>
          <div className="px-4 py-2 rounded-xl bg-red-950/40 border border-red-900/60 text-xs text-red-400 font-mono font-bold tracking-widest uppercase flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            Status: TERMINAL_DISABLED ({localKioskId})
          </div>
        </div>
      )}
      {/* ======================================================== */}
      {/* 0. SCREENSAVER / ATTRACT SCREEN ("PIXELBLAST")           */}
      {/* ======================================================== */}
      <div
        onClick={() => {
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => { });
          }
          if (step === 'SCREENSAVER') setStep('SEARCH');
        }}
        className={`absolute inset-0 w-full h-full min-h-screen flex flex-col items-center justify-between cursor-pointer overflow-hidden select-none bg-black transition-opacity duration-500 z-20 ${step === 'SCREENSAVER' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
      >
        {/* Responsive PixelBlast Canvas Container */}
        <div className="absolute inset-0 w-full h-full pointer-events-none">
          <PixelBlast
            variant="square"
            pixelSize={7}
            color="#555454"
            patternScale={3.5}
            patternDensity={0.65}
            pixelSizeJitter={0}
            enableRipples={false}
            rippleSpeed={0.4}
            rippleThickness={0.12}
            rippleIntensityScale={1.5}
            liquid={false}
            liquidStrength={0.12}
            liquidRadius={1.2}
            liquidWobbleSpeed={5}
            speed={0.75}
            edgeFade={0}
            transparent
          />
        </div>

        {/* Top edge subtle crimson accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent pointer-events-none z-20" />

        {/* Vignette dark gradient overlay for optimal readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-black/70 pointer-events-none z-10" />

        {/* Center branding */}
        <div className="relative z-20 flex-1 flex flex-col items-center justify-center text-center px-6 pointer-events-none">
          <h1 className="text-6xl sm:text-7xl md:text-8xl font-black tracking-tight leading-none text-white drop-shadow-[0_4px_35px_rgba(0,0,0,0.9)] uppercase">
            BISMAC CARD
          </h1>

          <div className="flex items-center gap-4 mt-4">
            <div className="h-px w-12 sm:w-16 bg-gradient-to-r from-transparent to-red-500/80" />
            <p className="text-white/90 text-sm sm:text-base md:text-lg tracking-[0.35em] uppercase font-extrabold drop-shadow-md">
              SELF-SERVICE
            </p>
            <div className="h-px w-12 sm:w-16 bg-gradient-to-l from-transparent to-red-500/80" />
          </div>
        </div>

        {/* TOUCH TO START OR PRINT YOUR ID — Pinned to bottom (Pure Text without background or border) */}
        <div className="relative z-20 pb-14 sm:pb-16 flex flex-col items-center gap-3 pointer-events-none px-6">
          <h2 className="text-white text-2xl sm:text-3xl md:text-4xl font-black tracking-[0.2em] sm:tracking-[0.28em] uppercase animate-pulse text-center select-none">
            TOUCH TO START
          </h2>
          <div className="flex items-center gap-2.5 mt-1">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>

        {/* Bottom edge subtle crimson accent bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent pointer-events-none z-20" />

        {/* Status dot — bottom-left corner */}
        <div className="absolute bottom-5 left-6 flex items-center gap-2 z-20 pointer-events-none">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-lg shadow-emerald-400/50" />
          <span className="text-xs font-bold text-white/50 tracking-widest uppercase">System Ready</span>
        </div>

        {/* Clock — bottom-right corner */}
        <LiveClock />
      </div>

      {/* ======================================================== */}
      {/* 1. SEARCH SCREEN (Matching attached reference image)     */}
      {/* ======================================================== */}
      {step === 'SEARCH' && (
        <div className="w-full max-w-[540px] px-6 text-center space-y-6 my-auto relative z-10">
          {/* Top Return to Screensaver button */}
          <div className="flex items-center justify-between mb-1">
            <button
              onClick={handleResetToHome}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs sm:text-sm font-semibold tracking-wider transition active:scale-95"
            >
              <ArrowLeft className="w-4.5 h-4.5 text-red-500" />

            </button>
            {employeeInput && (
              <button
                onClick={handleClear}
                className="text-xs sm:text-sm text-slate-400 hover:text-red-400 font-bold tracking-wider transition uppercase"
              >
                Clear All
              </button>
            )}
          </div>

          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight drop-shadow-md">
              Enter Your Employee ID
            </h1>

          </div>

          {/* Large Input Display with Per-Character Delete Button */}
          <div className="relative group">
            <input
              type="text"
              readOnly
              value={employeeInput}
              placeholder="e.g. EMP-000123"
              className={`w-full bg-slate-900/90 border-2 rounded-2xl py-5 sm:py-6 pl-6 pr-16 text-3xl sm:text-4xl font-black tracking-widest text-center text-white placeholder-slate-600 focus:outline-none shadow-2xl transition-all ${employeeInput ? 'border-red-500 shadow-red-950/30' : 'border-slate-800'
                }`}
            />
            {employeeInput && (
              <button
                onClick={handleBackspace}
                title="Delete character"
                className="absolute right-3.5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-xl bg-slate-800/90 hover:bg-slate-700 active:bg-slate-600 text-slate-300 hover:text-white transition-all flex items-center justify-center active:scale-90 border border-slate-700/60 shadow-md"
              >
                <Delete className="w-6 h-6 text-red-400" />
              </button>
            )}
          </div>

          {/* SEARCH Button */}
          <button
            onClick={handleSearch}
            disabled={!employeeInput.trim() || isSearching}
            className={`w-full py-5 sm:py-5.5 rounded-2xl font-black text-xl sm:text-2xl tracking-widest uppercase flex items-center justify-center gap-3 transition-all duration-200 shadow-xl ${employeeInput.trim() && !isSearching
              ? 'bg-gradient-to-r from-red-600 via-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white shadow-red-600/35 active:scale-[0.98]'
              : 'bg-slate-900/80 text-slate-500 border border-slate-800 cursor-not-allowed'
              }`}
          >
            {isSearching ? (
              <>
                <div className="w-6 h-6 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                <span>SEARCHING...</span>
              </>
            ) : (
              <>
                <Search className="w-6 h-6" />
                <span>SEARCH</span>
              </>
            )}
          </button>

          {/* Keypad Grid 3x4 */}
          <div className="grid grid-cols-3 gap-3.5 pt-1">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                onClick={() => handleKeypadPress(num.toString())}
                className="h-18 sm:h-20 rounded-2xl bg-slate-900/90 hover:bg-slate-800/90 active:scale-95 border border-slate-800 hover:border-slate-700 text-3xl font-bold text-white shadow-md transition-all flex items-center justify-center"
              >
                {num}
              </button>
            ))}
            <button
              onClick={handleBackspace}
              title="Delete last digit"
              className="h-18 sm:h-20 rounded-2xl bg-slate-900/90 hover:bg-slate-800/90 active:scale-95 border border-slate-800 hover:border-slate-700 text-slate-300 shadow-md transition-all flex items-center justify-center"
            >
              <ArrowLeft className="w-7 h-7 text-slate-400" />
            </button>
            <button
              onClick={() => handleKeypadPress('0')}
              className="h-18 sm:h-20 rounded-2xl bg-slate-900/90 hover:bg-slate-800/90 active:scale-95 border border-slate-800 hover:border-slate-700 text-3xl font-bold text-white shadow-md transition-all flex items-center justify-center"
            >
              0
            </button>
            <button
              onClick={() => {
                if (!employeeInput.startsWith('EMP-')) {
                  setEmployeeInput('EMP-' + employeeInput);
                }
              }}
              className="h-18 sm:h-20 rounded-2xl bg-red-950/25 hover:bg-red-950/45 active:scale-95 border border-red-900/50 hover:border-red-800/70 text-base font-black text-red-400 shadow-md transition-all flex items-center justify-center tracking-wider"
            >
              EMP-
            </button>
          </div>

          {/* Quick Fill Demo IDs */}
          <div className="pt-4 border-t border-slate-800/60 flex items-center justify-center gap-2.5 text-xs sm:text-sm text-slate-500">
            <span className="font-semibold text-slate-400">Demo IDs:</span>
            <button
              onClick={() => setEmployeeInput('EMP-000123')}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 font-mono border border-slate-800 transition active:scale-95"
            >
              EMP-000123
            </button>
            <button
              onClick={() => setEmployeeInput('EMP-000124')}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 font-mono border border-slate-800 transition active:scale-95"
            >
              EMP-000124
            </button>
            <button
              onClick={() => setEmployeeInput('EMP-000125')}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 font-mono border border-slate-800 transition active:scale-95"
            >
              EMP-000125
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. CARD PREVIEW SCREEN (Full-Screen Pure Black KIOSK)    */}
      {/* ======================================================== */}
      {step === 'PREVIEW' && foundEmployee && (
        <div className="fixed inset-0 z-30 bg-black flex flex-col justify-between overflow-hidden select-none">
          {/* Top Control Bar Overlay */}
          <div className="absolute top-6 left-6 right-6 z-40 flex items-center justify-between pointer-events-auto">
            {/* Top Left: Return Button */}
            <button
              onClick={() => setStep('SEARCH')}
              className="flex items-center gap-2.5 px-4.5 py-2.5 rounded-2xl bg-slate-950/80 hover:bg-slate-900 border border-slate-800 text-slate-200 hover:text-white font-bold text-xs tracking-wide shadow-2xl backdrop-blur-md transition active:scale-95"
            >
              <ArrowLeft className="w-4 h-4 text-red-500" />
              <span>Return to Search</span>
            </button>

            {/* Top Right: 2D / 3D Mode Switcher */}
            <div className="flex bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800 backdrop-blur-md shadow-2xl">
              <button
                onClick={() => setPreviewMode('2D')}
                className={`px-5 py-2 rounded-xl text-xs font-black tracking-wider transition ${previewMode === '2D' ? 'bg-red-600 text-white shadow-lg shadow-red-600/30' : 'text-slate-400 hover:text-white'
                  }`}
              >
                2D
              </button>
              <button
                onClick={() => setPreviewMode('3D')}
                className={`px-5 py-2 rounded-xl text-xs font-black tracking-wider transition ${previewMode === '3D' ? 'bg-red-600 text-white shadow-lg shadow-red-600/30' : 'text-slate-400 hover:text-white'
                  }`}
              >
                3D
              </button>
            </div>
          </div>

          {/* Center Full-Screen Stage (Centered 3D/2D Card Geometry) */}
          <div className="w-full h-full relative flex items-center justify-center pt-16 pb-24">
            {previewMode === '3D' ? (
              <div className="w-full h-full flex items-center justify-center">
                <ThreeCardViewer
                  template={kioskTemplate}
                  employeeNumber={foundEmployee.employeeNumber}
                  employeeData={foundEmployee}
                  baseUrl={verificationBaseUrl}
                  autoRotate={false}
                  showControls={true}
                  className="!border-none !bg-transparent !shadow-none"
                />
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center space-y-6">
                {/* 2D Interactive Card Canvas - Powered by Card Engine */}
                <Card2DViewer
                  template={kioskTemplate}
                  side={cardSide}
                  employeeData={foundEmployee}
                  baseUrl={verificationBaseUrl}
                />

                {/* Flip Card Toggle */}
                <button
                  onClick={() => setCardSide(cardSide === 'front' ? 'back' : 'front')}
                  className="px-5 py-2.5 rounded-2xl bg-slate-950/80 hover:bg-slate-900 text-xs font-extrabold text-slate-200 border border-slate-800 flex items-center gap-2 shadow-2xl backdrop-blur-md transition active:scale-95"
                >
                  <RotateCcw className="w-4 h-4 text-red-400" />
                  <span>{cardSide === 'front' ? 'View Reverse Side (Back)' : 'View Obverse Side (Front)'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Bottom Floating Action Bar */}
          {(() => {
            const isAlreadyPrinted = foundEmployee.cardStatus === 'ISSUED' || foundEmployee.cardStatus === 'PRINTED';
            return (
              <div className="absolute bottom-6 left-6 right-6 z-40 p-5 rounded-2xl bg-slate-950/85 border border-slate-800/80 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xl">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-500 font-extrabold text-base shrink-0">
                    {foundEmployee.firstName?.[0] || 'E'}{foundEmployee.lastName?.[0] || 'M'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <div className="text-base font-black text-white">{foundEmployee.fullName}</div>
                      <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold uppercase bg-red-500/10 text-red-400 border border-red-500/20">
                        {foundEmployee.employeeNumber}
                      </span>
                      {isAlreadyPrinted && (
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          Card Issued
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5 font-medium">
                      {foundEmployee.departmentName || 'Operations'} • {foundEmployee.positionTitle || 'Staff'} • {foundEmployee.branchName || 'Main Headquarters'}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleStartPrint}
                  disabled={isAlreadyPrinted}
                  className={`px-10 py-4 rounded-2xl font-black text-lg tracking-wider flex items-center gap-3 transition shadow-2xl ${isAlreadyPrinted
                    ? 'bg-[#1e293b] text-slate-500 border border-slate-700/80 cursor-not-allowed shadow-none'
                    : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white shadow-red-600/40 hover:scale-105 active:scale-95'
                    }`}
                >
                  <Printer className={`w-6 h-6 ${isAlreadyPrinted ? 'text-slate-500 opacity-40' : ''}`} />
                  <span>{isAlreadyPrinted ? 'CARD ALREADY PRINTED' : 'PRINT CARD'}</span>
                </button>
              </div>
            );
          })()}
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. PRINTING PIPELINE SCREEN (Progress Checklist)         */}
      {/* ======================================================== */}
      {step === 'PRINTING' && (
        <div className="w-full max-w-md space-y-6 px-4 py-8 my-auto">
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-950 border border-red-800 text-red-400 mx-auto flex items-center justify-center mb-3">
              <RefreshCw className="w-7 h-7 animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-white">Printing in Progress</h2>
            <p className="text-slate-400 text-xs mt-1">
              Communicating with local Magicard Trust ID print engine...
            </p>
          </div>

          {/* 10-Step Progress Pipeline */}
          <div className="rounded-xl bg-[#111827] border border-slate-800 p-5 space-y-2 text-xs">
            {printSteps.map((stepName, idx) => {
              const isDone = idx < currentPrintStepIndex;
              const isCurrent = idx === currentPrintStepIndex;

              return (
                <div
                  key={stepName}
                  className={`flex items-center justify-between py-1.5 px-3 rounded-lg transition ${isCurrent
                    ? 'bg-red-950/60 border border-red-800/80 text-white font-semibold'
                    : isDone
                      ? 'text-slate-300'
                      : 'text-slate-600'
                    }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-slate-500">{idx + 1}.</span>
                    <span>{stepName}</span>
                  </span>

                  {isDone && <Check className="w-4 h-4 text-emerald-400" />}
                  {isCurrent && <RefreshCw className="w-3.5 h-3.5 text-red-400 animate-spin" />}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. SUCCESS SCREEN                                        */}
      {/* ======================================================== */}
      {step === 'SUCCESS' && (
        <div className="w-full max-w-md text-center space-y-6 px-4 py-8 my-auto">
          <div className="w-16 h-16 rounded-2xl bg-emerald-950 border border-emerald-800 text-emerald-400 mx-auto flex items-center justify-center shadow-xl shadow-emerald-950/50">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-3xl font-extrabold text-white tracking-tight">
              Print Completed Successfully
            </h2>
            <p className="text-slate-400 text-sm mt-2">
              Please collect your physical badge from the printer output tray.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs font-mono">
            Print Job ID: <strong>{assignedJobNumber || 'PRINT-2026-000342'}</strong>
          </div>

          <div className="text-xs text-slate-500">
            Screen returning to home in <strong className="text-white">{inactivityCountdown}s</strong>...
          </div>

          <button
            onClick={handleResetToHome}
            className="w-full py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold border border-slate-700 transition"
          >
            Return to Home Now
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. ERROR SCREEN                                          */}
      {/* ======================================================== */}
      {step === 'ERROR' && (
        <div className="w-full max-w-md text-center space-y-6 px-4 py-8 my-auto">
          <div className="w-16 h-16 rounded-2xl bg-rose-950 border border-rose-800 text-rose-400 mx-auto flex items-center justify-center shadow-xl shadow-rose-950/50">
            <AlertCircle className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white">Attention Required</h2>
            <p className="text-slate-300 text-sm mt-3 leading-relaxed bg-rose-950/30 p-4 rounded-xl border border-rose-800/40">
              {errorMessage}
            </p>
          </div>

          <div className="space-y-2 pt-2">
            {errorMessage.includes('Printer') && (
              <button
                onClick={() => {
                  setPrinterMode('SIMULATION');
                  toast.info('Switched to Demo / Simulation Mode for testing.');
                  setStep('PREVIEW');
                }}
                className="w-full py-3 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 font-semibold border border-amber-500/30 text-xs transition"
              >
                Switch to Demo / Simulation Mode for Testing
              </button>
            )}
            <button
              onClick={handleResetToHome}
              className="w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition"
            >
              Try Again
            </button>
            <button
              onClick={() => setShowHrDispatchModal(true)}
              className="w-full py-3.5 rounded-xl border border-rose-800/80 bg-rose-950/40 hover:bg-rose-900/60 text-rose-200 font-semibold text-xs transition flex items-center justify-center gap-2 shadow-lg"
            >
              <HelpCircle className="w-4 h-4 text-rose-400" />
              Contact HR
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* HR OPERATIONS DESK SUPPORT DISPATCH MODAL                */}
      {/* ======================================================== */}
      {showHrDispatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-[#0b101d] border border-slate-700/90 rounded-3xl p-7 sm:p-8 text-white shadow-[0_15px_60px_rgba(0,0,0,0.8)] space-y-6 relative">
            {/* Close Button */}
            <button
              onClick={() => setShowHrDispatchModal(false)}
              className="absolute top-5 right-5 p-2.5 text-slate-400 hover:text-white rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/50 transition active:scale-90"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-red-950/80 border border-red-700/80 text-red-400 flex items-center justify-center shrink-0 shadow-lg shadow-red-950/40">
                <HelpCircle className="w-7 h-7" />
              </div>
              <div className="pt-0.5">
                <h3 className="text-2xl font-black text-white flex items-center gap-2 tracking-tight">
                  Contact HR
                </h3>
                <p className="text-sm text-slate-400 mt-1">
                  Send notification directly to HR Administrators.
                </p>
              </div>
            </div>

            {/* Terminal & Location Info Bar */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-sm font-mono">
              <div className="flex items-center gap-2.5 text-slate-300">
                <Building2 className="w-4 h-4 text-red-400" />
                <span>Branch: <strong className="text-white font-bold">SM Sorsogon City</strong></span>
              </div>
              <div className="px-3 py-1 rounded-lg bg-red-950/90 border border-red-800/80 text-red-300 text-xs font-black tracking-wider">
                {localKioskId}
              </div>
            </div>

            {/* Suggested Topics / Scrollable Category Box */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300 uppercase tracking-widest">
                <span>Select Issue ({dispatchSuggestions.length} Topics):</span>

              </div>
              <div className="max-h-[175px] overflow-y-auto pr-1.5 flex flex-wrap gap-2.5 p-3 rounded-2xl bg-slate-950/90 border border-slate-800/90 scrollbar-thin scrollbar-thumb-slate-700">
                {dispatchSuggestions.map((topic) => {
                  const isSelected = dispatchCategory === topic;
                  return (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => {
                        setDispatchCategory(topic);
                        if (!dispatchNotes) {
                          setDispatchNotes(`Reporting issue: ${topic}`);
                        }
                      }}
                      className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all border ${isSelected
                        ? 'bg-gradient-to-r from-red-600 to-red-700 text-white font-bold border-red-500 shadow-md shadow-red-950/60 scale-[1.02]'
                        : 'bg-slate-900 hover:bg-slate-800/90 text-slate-300 hover:text-white border-slate-800 hover:border-slate-700'
                        }`}
                    >
                      {topic}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Additional Description Textarea */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center justify-between">
                <span>What happened:</span>
                <span className="text-[11px] text-slate-500 font-normal">Optional</span>
              </label>
              <textarea
                rows={3}
                value={dispatchNotes}
                onChange={(e) => setDispatchNotes(e.target.value)}
                placeholder="Type custom details or instructions for HR (e.g., 'Printer is offline, card issue for EMP-000125')..."
                className="w-full bg-slate-950/90 border border-slate-800 rounded-2xl p-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition-all resize-none shadow-inner"
              />
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => setShowHrDispatchModal(false)}
                className="px-6 py-3 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white text-sm font-bold transition active:scale-95"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingDispatch}
                onClick={handleSendHrDispatch}
                className="px-7 py-3 rounded-xl bg-gradient-to-r from-red-600 via-red-600 to-red-700 hover:from-red-500 hover:to-red-600 disabled:opacity-50 text-white text-sm font-black tracking-wider uppercase transition-all flex items-center gap-2.5 shadow-lg shadow-red-950/60 active:scale-[0.98]"
              >
                {isSubmittingDispatch ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Dispatching...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Notify HR</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
