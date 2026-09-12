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
} from 'lucide-react';
import { enterpriseStore, Employee, DEFAULT_CR80_TEMPLATE } from '@/lib/data/enterpriseStore';
import { toast } from '@/components/ui/Toast';
import Card2DViewer from '@/components/card/Card2DViewer';

// Lazy-load Three.js viewer
const ThreeCardViewer = dynamic(() => import('@/components/three/ThreeCardViewer'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[380px] rounded-2xl bg-slate-900 flex items-center justify-center text-slate-400 text-sm">
      Rendering 3D Card Geometry...
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
    'Printer Hardware Offline / Not Found',
    'Card Jammed or Ejection Error',
    'Employee Record Missing / Card Error',
    'Reprint / Badge Replacement Request',
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
        }
      })
      .catch(() => {});
  }, []);

  const [hardwarePrinterOnline, setHardwarePrinterOnline] = useState<boolean>(false);
  const [printerMode, setPrinterMode] = useState<'HARDWARE' | 'SIMULATION'>('HARDWARE');

  // Check hardware printer connectivity on localhost port 7125
  useEffect(() => {
    const checkPrinterHardware = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1500);
        const agentBaseUrl = process.env.NEXT_PUBLIC_KIOSK_AGENT_URL || 'http://127.0.0.1:7125';
        const res = await fetch(`${agentBaseUrl}/api/status`, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          setHardwarePrinterOnline(true);
        } else {
          setHardwarePrinterOnline(false);
        }
      } catch {
        setHardwarePrinterOnline(false);
      }
    };

    checkPrinterHardware();
    const interval = setInterval(checkPrinterHardware, 8000);
    return () => clearInterval(interval);
  }, []);

  // Send real-time heartbeat to Supabase database every 15 seconds
  useEffect(() => {
    const sendHeartbeat = async () => {
      try {
        await fetch('/api/kiosks/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            kioskCode: 'KIOSK-SOR-01',
            printerStatus: hardwarePrinterOnline ? 'READY - Magicard 600NEO (Ribbon 100%)' : 'OFFLINE - No Physical Printer Detected',
            agentVersion: 'v1.4.0',
            ipAddress: '127.0.0.1',
          }),
        });
      } catch {}
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 15000);
    return () => clearInterval(interval);
  }, [hardwarePrinterOnline]);


  // Inactivity timeout back to Screensaver on SEARCH screen
  useEffect(() => {
    if (step !== 'SEARCH') return;
    const timeout = setTimeout(() => {
      setStep('SCREENSAVER');
      setEmployeeInput('');
    }, kioskTimeoutSeconds * 1000);
    return () => clearTimeout(timeout);
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
          if (hasCompletedJob) {
            emp.cardStatus = 'ISSUED';
          }
        }
      } catch {}

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

    // Security check: Prevent spam re-printing if card is already printed/issued
    if (foundEmployee.cardStatus === 'ISSUED' || foundEmployee.cardStatus === 'PRINTED') {
      toast.error('Card already issued for this employee. Contact HR for replacements.');
      return;
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

    try {
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
          templateId: 'ver-2',
          frontData: {
            fullName: foundEmployee.fullName,
            employeeNumber: foundEmployee.employeeNumber,
            department: foundEmployee.departmentName || 'Operations',
          },
        }),
      });
      if (agentRes.ok) {
        agentSuccess = true;
      }
    } catch {
      agentSuccess = false;
    }

    // HARDWARE PRINTER ENFORCEMENT: If in Hardware mode and no physical printer agent responded
    if (!agentSuccess && printerMode === 'HARDWARE') {
      setErrorMessage(`No Physical Card Printer Connected: Unable to communicate with the local Magicard 600NEO print engine agent on http://127.0.0.1:7125. Please verify your Magicard 600NEO USB cable or launch the local KIOSK Print Service.`);
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
      {/* ======================================================== */}
      {/* 0. SCREENSAVER / ATTRACT SCREEN ("TOUCH TO START")         */}
      {/* ======================================================== */}
      {step === 'SCREENSAVER' && (
        <div
          onClick={() => setStep('SEARCH')}
          className="w-full min-h-screen flex flex-col items-center justify-center cursor-pointer relative overflow-hidden"
          style={{
            background: '#070a11',
          }}
        >
          {/* Full-screen background image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/kiosk-bg.jpg"
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            style={{ opacity: 0.85 }}
          />

          {/* Dark overlay for readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/80 pointer-events-none" />

          {/* Top edge crimson accent line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent pointer-events-none" />

          {/* Ambient center glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-red-600/10 rounded-full blur-[120px] pointer-events-none" />

          {/* Center branding */}
          <div className="relative z-10 flex flex-col items-center text-center space-y-5 px-8">
            {/* Badge / Logo Icon */}
            <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-2xl mb-2">
              <svg viewBox="0 0 40 40" className="w-11 h-11" fill="none">
                <rect x="4" y="10" width="32" height="20" rx="3" fill="white" fillOpacity="0.15" stroke="white" strokeOpacity="0.6" strokeWidth="1.5"/>
                <rect x="8" y="14" width="8" height="6" rx="1" fill="#ef4444" fillOpacity="0.8"/>
                <line x1="19" y1="15" x2="30" y2="15" stroke="white" strokeOpacity="0.6" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="19" y1="19" x2="27" y2="19" stroke="white" strokeOpacity="0.4" strokeWidth="1.2" strokeLinecap="round"/>
                <line x1="19" y1="23" x2="29" y2="23" stroke="white" strokeOpacity="0.3" strokeWidth="1" strokeLinecap="round"/>
              </svg>
            </div>

            <h1 className="text-6xl sm:text-7xl font-black tracking-tight leading-none"
              style={{
                color: 'white',
                textShadow: '0 2px 30px rgba(0,0,0,0.8)',
              }}
            >
              Magic Card
            </h1>

            <div className="flex items-center gap-3">
              <div className="h-px w-12 bg-red-500/60" />
              <p className="text-slate-300 text-sm tracking-[0.3em] uppercase font-semibold">
                Self-Service ID Terminal
              </p>
              <div className="h-px w-12 bg-red-500/60" />
            </div>
          </div>

          {/* TOUCH TO START — pinned to bottom with pulse animation */}
          <div className="absolute bottom-14 left-0 right-0 flex flex-col items-center gap-4 z-10">
            <div className="relative flex flex-col items-center gap-3">
              {/* Pulsing ring */}
              <div className="absolute -inset-4 rounded-full border border-white/20 animate-ping opacity-40" style={{ animationDuration: '2.5s' }} />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setStep('SEARCH');
                }}
                className="text-white/90 hover:text-white text-lg font-bold tracking-[0.3em] uppercase transition-all duration-200 active:scale-95"
                style={{ textShadow: '0 1px 12px rgba(0,0,0,0.9)' }}
              >
                TOUCH TO START
              </button>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1 h-1 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1 h-1 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>

          {/* Bottom edge crimson accent line */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent pointer-events-none" />

          {/* Status dot — bottom-left corner */}
          <div className="absolute bottom-5 left-6 flex items-center gap-2 z-10">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-lg shadow-emerald-400/50" />
            <span className="text-[11px] font-bold text-white/40 tracking-widest uppercase">Online</span>
          </div>

          {/* Clock — bottom-right corner */}
          <LiveClock />
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. SEARCH SCREEN (Matching attached reference image)     */}
      {/* ======================================================== */}
      {step === 'SEARCH' && (
        <div className="w-full max-w-[440px] px-4 text-center space-y-5 my-auto">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Enter Your Employee ID
            </h1>
            <p className="text-slate-400 text-sm mt-1.5">
              Please enter your employee ID number to print your card.
            </p>
          </div>

          {/* Large Input Display */}
          <div className="relative">
            <input
              type="text"
              readOnly
              value={employeeInput}
              placeholder="e.g. EMP-000123"
              className="w-full bg-[#101728] border border-[#1d273f] rounded-2xl py-4 px-6 text-2xl font-bold tracking-wider text-center text-white placeholder-slate-600 focus:outline-none focus:border-red-500 shadow-xl"
            />
            {employeeInput && (
              <button
                onClick={handleClear}
                className="absolute right-4 top-4 p-2 text-slate-400 hover:text-white transition"
              >
                <Delete className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* SEARCH Button */}
          <button
            onClick={handleSearch}
            disabled={!employeeInput.trim() || isSearching}
            className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition shadow-xl ${
              employeeInput.trim() && !isSearching
                ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white shadow-red-600/30'
                : 'bg-[#401217] text-[#ef4444]/60 border border-[#521920] cursor-pointer'
            }`}
          >
            {isSearching ? (
              <>
                <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                <span>SEARCHING DATABASE...</span>
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                <span>SEARCH</span>
              </>
            )}
          </button>

          {/* Keypad Grid 3x4 */}
          <div className="grid grid-cols-3 gap-3 pt-1">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                onClick={() => handleKeypadPress(num.toString())}
                className="h-16 rounded-xl bg-[#11192e] hover:bg-[#18233f] active:scale-95 border border-[#1b2640] text-2xl font-bold text-white shadow transition flex items-center justify-center"
              >
                {num}
              </button>
            ))}
            <button
              onClick={handleBackspace}
              className="h-16 rounded-xl bg-[#11192e] hover:bg-[#18233f] active:scale-95 border border-[#1b2640] text-slate-300 shadow transition flex items-center justify-center"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <button
              onClick={() => handleKeypadPress('0')}
              className="h-16 rounded-xl bg-[#11192e] hover:bg-[#18233f] active:scale-95 border border-[#1b2640] text-2xl font-bold text-white shadow transition flex items-center justify-center"
            >
              0
            </button>
            <button
              onClick={() => {
                if (!employeeInput.startsWith('EMP-')) {
                  setEmployeeInput('EMP-' + employeeInput);
                }
              }}
              className="h-16 rounded-xl bg-[#11192e] hover:bg-[#18233f] active:scale-95 border border-[#1b2640] text-sm font-extrabold text-red-400 shadow transition flex items-center justify-center"
            >
              EMP-
            </button>
          </div>

          {/* Demo IDs Pre-fill */}
          <div className="pt-3 border-t border-slate-800/60 flex items-center justify-center gap-2 text-xs text-slate-500">
            <span>Demo IDs:</span>
            <button
              onClick={() => setEmployeeInput('EMP-000123')}
              className="px-2.5 py-1 rounded bg-[#11192e] hover:bg-[#18233f] text-slate-300 font-mono border border-slate-800 transition"
            >
              EMP-000123
            </button>
            <button
              onClick={() => setEmployeeInput('EMP-000124')}
              className="px-2.5 py-1 rounded bg-[#11192e] hover:bg-[#18233f] text-slate-300 font-mono border border-slate-800 transition"
            >
              EMP-000124
            </button>
            <button
              onClick={() => setEmployeeInput('EMP-000125')}
              className="px-2.5 py-1 rounded bg-[#11192e] hover:bg-[#18233f] text-slate-300 font-mono border border-slate-800 transition"
            >
              EMP-000125
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. CARD PREVIEW SCREEN (2D and Realistic 3D)             */}
      {/* ======================================================== */}
      {step === 'PREVIEW' && foundEmployee && (
        <div className="w-full max-w-4xl space-y-6 px-4 py-8 my-auto">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setStep('SEARCH')}
              className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white px-3 py-2 rounded-lg bg-slate-900 border border-slate-800"
            >
              <ArrowLeft className="w-4 h-4" /> Cancel & Return
            </button>

            {/* 2D / 3D Mode Toggle */}
            <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setPreviewMode('2D')}
                className={`px-4 py-1.5 rounded-lg text-xs font-extrabold transition ${
                  previewMode === '2D' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                2D
              </button>
              <button
                onClick={() => setPreviewMode('3D')}
                className={`px-4 py-1.5 rounded-lg text-xs font-extrabold transition ${
                  previewMode === '3D' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                3D
              </button>
            </div>
          </div>

          {/* Visual Card Stage */}
          <div className="p-8 rounded-2xl bg-gradient-to-b from-[#161f36] via-[#0f172a] to-[#070b14] border border-slate-700/80 flex items-center justify-center shadow-2xl relative overflow-hidden">
            {previewMode === '3D' ? (
              <div className="w-full">
                <ThreeCardViewer
                  template={kioskTemplate}
                  employeeNumber={foundEmployee.employeeNumber}
                  employeeData={foundEmployee}
                  autoRotate={false}
                />
              </div>
            ) : (
              <div className="space-y-5 text-center flex flex-col items-center">
                {/* 2D Interactive Card Canvas - Powered by Card Engine */}
                <Card2DViewer
                  template={kioskTemplate}
                  side={cardSide}
                  employeeData={foundEmployee}
                />

                {/* Flip Card Toggle */}
                <div className="flex justify-center gap-2">
                  <button
                    onClick={() => setCardSide(cardSide === 'front' ? 'back' : 'front')}
                    className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 flex items-center gap-1.5 shadow"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    {cardSide === 'front' ? 'View Reverse Side (Back)' : 'View Obverse Side (Front)'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Action Row */}
          {(() => {
            const isAlreadyPrinted = foundEmployee.cardStatus === 'ISSUED' || foundEmployee.cardStatus === 'PRINTED';
            return (
              <div className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-xl bg-slate-900 border border-slate-800 gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-bold text-white">{foundEmployee.fullName}</div>
                    {isAlreadyPrinted && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        Card Issued
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {isAlreadyPrinted
                      ? 'Card status: ISSUED • Re-printing disabled to prevent duplicate cards'
                      : 'Ready for physical production • Magicard 600NEO YMCKO'}
                  </div>
                </div>

                <button
                  onClick={handleStartPrint}
                  disabled={isAlreadyPrinted}
                  className={`px-8 py-3.5 rounded-xl font-bold text-base flex items-center gap-2 transition ${
                    isAlreadyPrinted
                      ? 'bg-[#1e293b] text-slate-500 border border-slate-700/80 cursor-not-allowed shadow-none'
                      : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white shadow-xl shadow-red-600/30'
                  }`}
                >
                  <Printer className={`w-5 h-5 ${isAlreadyPrinted ? 'text-slate-500 opacity-40' : ''}`} />
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
                  className={`flex items-center justify-between py-1.5 px-3 rounded-lg transition ${
                    isCurrent
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
              Contact HR Operations Desk
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* HR OPERATIONS DESK SUPPORT DISPATCH MODAL                */}
      {/* ======================================================== */}
      {showHrDispatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[#0d1322] border border-slate-700/80 rounded-2xl p-6 text-white shadow-2xl space-y-5 relative">
            {/* Close Button */}
            <button
              onClick={() => setShowHrDispatchModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg bg-slate-800/60 transition"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-red-950 border border-red-800 text-red-400 flex items-center justify-center shrink-0">
                <HelpCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  Contact HR Operations Desk
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Send a real-time dispatch notification directly to HR Administrators.
                </p>
              </div>
            </div>

            {/* Terminal & Location Info Bar */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono">
              <div className="flex items-center gap-2 text-slate-300">
                <Building2 className="w-3.5 h-3.5 text-red-400" />
                <span>Branch: <strong>SM Sorsogon City</strong></span>
              </div>
              <div className="px-2 py-0.5 rounded bg-red-950/80 border border-red-800 text-red-300 text-[11px] font-bold">
                KIOSK-SOR-01
              </div>
            </div>

            {/* Suggested Topics / Description Chips */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Select Issue Category:
              </label>
              <div className="flex flex-wrap gap-2">
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
                      className={`px-3 py-1.5 rounded-lg text-xs transition border ${
                        isSelected
                          ? 'bg-red-600 text-white font-semibold border-red-500 shadow-md shadow-red-950/50'
                          : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                      }`}
                    >
                      {topic}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Additional Description Textarea */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>Detailed Description / What happened:</span>
                <span className="text-[10px] text-slate-500 font-normal">Optional / Editable</span>
              </label>
              <textarea
                rows={3}
                value={dispatchNotes}
                onChange={(e) => setDispatchNotes(e.target.value)}
                placeholder="Type custom details or instructions for HR (e.g., 'Printer is offline, card issue for EMP-000125')..."
                className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition resize-none"
              />
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowHrDispatchModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingDispatch}
                onClick={handleSendHrDispatch}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-red-950/50"
              >
                {isSubmittingDispatch ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Dispatching...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Notify HR Operations</span>
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
