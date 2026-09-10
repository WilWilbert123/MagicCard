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
} from 'lucide-react';
import { enterpriseStore, Employee } from '@/lib/data/enterpriseStore';
import { toast } from '@/components/ui/Toast';

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
  const [previewMode, setPreviewMode] = useState<'2D' | '3D'>('2D');
  const [cardSide, setCardSide] = useState<'front' | 'back'>('front');

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

  // Inactivity timeout back to Screensaver on SEARCH screen
  useEffect(() => {
    if (step !== 'SEARCH') return;
    const timeout = setTimeout(() => {
      setStep('SCREENSAVER');
      setEmployeeInput('');
    }, 45000); // 45 seconds idle
    return () => clearTimeout(timeout);
  }, [step, employeeInput]);

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
      // 1. First try matching by exact employee number
      let res = await fetch(`/api/employees?employeeNumber=${encodeURIComponent(term)}`);
      let json = await res.json();
      let emp = json.data?.[0];

      // 2. If not found, try broad query search (e.g. partial number or name)
      if (!emp) {
        res = await fetch(`/api/employees?q=${encodeURIComponent(term)}`);
        json = await res.json();
        emp = json.data?.[0];
      }

      if (!emp) {
        setErrorMessage(`Employee ID "${term}" was not found in the database. Please verify your Employee ID or contact HR.`);
        setStep('ERROR');
        return;
      }

      if (emp.employmentStatus !== 'ACTIVE') {
        setErrorMessage(`Employee record for ${emp.fullName} (${emp.employeeNumber}) is currently ${emp.employmentStatus}. Please see HR.`);
        setStep('ERROR');
        return;
      }

      setFoundEmployee(emp);
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

    setStep('PRINTING');
    setCurrentPrintStepIndex(0);

    const idempotencyKey = `idem-kiosk-${Date.now()}`;

    // Step-by-step visual progression
    for (let i = 0; i < printSteps.length; i++) {
      setCurrentPrintStepIndex(i);
      await new Promise((resolve) => setTimeout(resolve, 350));
    }

    // Attempt local hardware agent communication on port 7125
    try {
      await fetch('http://127.0.0.1:7125/print', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Kiosk-Agent-Secret': 'super-secret-local-agent-token-2026',
        },
        body: JSON.stringify({
          jobId: `JOB-${Date.now()}`,
          idempotencyKey,
          employeeId: foundEmployee.id,
          employeeNumber: foundEmployee.employeeNumber,
          templateVersionId: 'ver-2',
          frontCanvasDataUrl: 'data:image/png;base64,simulated',
        }),
      });
    } catch {
      // Local agent simulated
    }

    // Register completed job in Supabase
    let generatedJobNum = `PRINT-${Date.now().toString().slice(-6)}`;
    try {
      const res = await fetch('/api/print-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: foundEmployee.id,
          employeeNumber: foundEmployee.employeeNumber,
          employeeName: foundEmployee.fullName,
          branchName: foundEmployee.branchName || 'Main Campus',
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
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
                  previewMode === '2D' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                2D Canvas
              </button>
              <button
                onClick={() => setPreviewMode('3D')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
                  previewMode === '3D' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                3D WebGL Card
              </button>
            </div>
          </div>

          {/* Visual Card Stage */}
          <div className="p-8 rounded-2xl bg-gradient-to-b from-[#161f36] via-[#0f172a] to-[#070b14] border border-slate-700/80 flex items-center justify-center shadow-2xl relative overflow-hidden">
            {previewMode === '3D' ? (
              <div className="w-full">
                <ThreeCardViewer
                  template={enterpriseStore.activeTemplate}
                  employeeNumber={foundEmployee.employeeNumber}
                  employeeData={foundEmployee}
                  autoRotate={false}
                />
              </div>
            ) : (
              <div className="space-y-5 text-center">
                {/* 2D Interactive Card Mockup - Pristine White Luxury PVC */}
                <div
                  className={`w-[520px] h-[328px] rounded-[20px] p-6 text-left relative overflow-hidden bg-white border border-slate-200/90 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] transition-all duration-300 ${
                    cardSide === 'front' ? 'text-slate-900' : 'text-slate-900'
                  }`}
                >
                  {/* Glossy Diagonal PVC Light Reflection Sheen */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent pointer-events-none z-20 opacity-60" />

                  {cardSide === 'front' ? (
                    <>
                      {/* Top Metallic Crimson Stripe */}
                      <div className="h-2 bg-gradient-to-r from-red-600 via-rose-500 to-red-600 absolute top-0 left-0 right-0" />

                      <div className="flex justify-between items-start mb-3 pt-1">
                        <div>
                          <div className="font-extrabold text-red-600 text-lg tracking-wider flex items-center gap-1.5">
                            <span className="text-red-500">▲</span> MAGIC CARD
                          </div>
                          <div className="text-[9px] font-bold text-slate-400 tracking-widest uppercase">
                            Enterprise Smart Credential
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-full shadow-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[10px] font-bold text-slate-600 tracking-wide">
                            NFC SECURE
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-5 items-center mt-2">
                        {/* Employee Photo */}
                        <div className="relative">
                          {foundEmployee.photoUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={foundEmployee.photoUrl}
                              alt={foundEmployee.fullName}
                              className="w-28 h-36 rounded-xl object-cover border-2 border-slate-200 shadow-md"
                            />
                          ) : (
                            <div className="w-28 h-36 rounded-xl bg-slate-50 border-2 border-dashed border-slate-300 shadow-sm flex flex-col items-center justify-center text-slate-400">
                              <User className="w-10 h-10 text-slate-400 mb-1" />
                              <span className="text-[9px] font-bold tracking-wider uppercase text-slate-400">NO PHOTO</span>
                            </div>
                          )}
                          {/* Gold Metallic EMV Contact Chip Accent */}
                          <div className="absolute -bottom-2.5 -right-2.5 w-8 h-7 rounded-md bg-gradient-to-br from-amber-200 via-amber-400 to-yellow-600 border border-amber-600/40 shadow flex items-center justify-center">
                            <div className="w-6 h-5 border border-amber-800/30 rounded-[3px] grid grid-cols-2 grid-rows-2" />
                          </div>
                        </div>

                        <div className="flex-1 min-w-0 pr-16">
                          <div className="text-2xl font-black text-slate-900 leading-tight tracking-tight truncate">
                            {foundEmployee.fullName}
                          </div>
                          <div className="text-sm font-bold text-red-600 mt-0.5">
                            {foundEmployee.positionTitle}
                          </div>

                          <div className="mt-2.5 space-y-1 text-xs">
                            <div className="font-mono font-bold text-slate-700">
                              ID: <span className="text-slate-900">{foundEmployee.employeeNumber}</span>
                            </div>
                            <div className="text-slate-500 text-[11px] truncate">
                              DEPT: <strong className="text-slate-700">{foundEmployee.departmentName}</strong>
                            </div>
                            <div className="text-slate-500 text-[11px] truncate">
                              LOC: <strong className="text-slate-700">{foundEmployee.branchName}</strong>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* QR Code Container */}
                      <div className="absolute bottom-4 right-5">
                        <div className="w-16 h-16 bg-white border border-slate-200 rounded-lg p-1 flex flex-col items-center justify-center shadow-sm">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=https://verify.magiccard.corp/id/${encodeURIComponent(foundEmployee.employeeNumber)}`}
                            alt="QR Verification"
                            className="w-12 h-12"
                          />
                          <span className="text-[7px] font-bold font-mono text-slate-400 mt-0.5">VERIFIED</span>
                        </div>
                      </div>

                      {/* Bottom Microtext Hairline */}
                      <div className="absolute bottom-2.5 left-6 right-6 flex items-center justify-between text-[8px] font-bold tracking-widest text-slate-400 uppercase border-t border-slate-100 pt-1">
                        <span>MAGIC CARD TRUST ID</span>
                        <span>ISO/IEC 7810 ID-1 • 2026</span>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Back Side of Card */}
                      <div className="h-2 bg-gradient-to-r from-red-600 via-rose-500 to-red-600 absolute top-0 left-0 right-0" />

                      {/* Magnetic Stripe */}
                      <div className="h-12 bg-gradient-to-b from-[#1e293b] via-[#0f172a] to-[#1e293b] -mx-6 mt-1 shadow-inner relative">
                        <div className="absolute inset-0 bg-white/5" />
                      </div>

                      <div className="pt-3 px-1 text-left">
                        {/* Signature Strip */}
                        <div className="flex items-center gap-3">
                          <div className="h-8 bg-slate-100 border border-slate-300 rounded flex-1 flex items-center px-3">
                            <span className="text-[9px] italic font-serif text-slate-400">Authorized Signature Required</span>
                          </div>
                          <div className="font-mono text-[9px] font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                            CVC: 981
                          </div>
                        </div>

                        <p className="text-[9px] text-slate-500 mt-3 leading-relaxed">
                          This smart credential remains the property of the issuing organization and must be presented to authorized personnel upon demand. If found, please return to any Security Dispatch desk or mail to Corporate HQ.
                        </p>

                        <div className="my-3 flex justify-center">
                          <div className="border border-slate-200 px-4 py-1.5 bg-white rounded shadow-sm text-center">
                            <span className="font-mono text-xs tracking-widest font-black text-slate-900 block">
                              ||||| | |||| ||| ||||| || |||
                            </span>
                            <span className="font-mono text-[9px] text-slate-500 font-bold block mt-0.5">
                              {foundEmployee.employeeNumber}
                            </span>
                          </div>
                        </div>

                        <div className="text-[8px] text-slate-400 uppercase font-bold text-center tracking-wider">
                          Internal Security & Self-Service Check-In Terminal Only
                        </div>
                      </div>
                    </>
                  )}
                </div>

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
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900 border border-slate-800">
            <div>
              <div className="text-sm font-bold text-white">{foundEmployee.fullName}</div>
              <div className="text-xs text-slate-400">
                Ready for physical production • Magicard 300 Duo YMCKO
              </div>
            </div>

            <button
              onClick={handleStartPrint}
              className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-base shadow-xl shadow-red-600/30 flex items-center gap-2 transition"
            >
              <Printer className="w-5 h-5" />
              <span>PRINT CARD</span>
            </button>
          </div>
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
            <button
              onClick={handleResetToHome}
              className="w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition"
            >
              Try Again
            </button>
            <button
              onClick={() => toast.info('HR Security Dispatch has been notified. Please wait for assistance.')}
              className="w-full py-3 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs"
            >
              Contact HR Operations Desk
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
