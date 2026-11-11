'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  CreditCard,
  Key,
  CheckCircle2,
  Copy,
  Check,
  Cpu,
  Clock,
  Layers,
} from 'lucide-react';
import {
  PROGRAM_ID,
  CLIENT_ID,
  DEFAULT_PRODUCT_ID,
  LicenseStatusResult,
} from '@/lib/license/licenseValidator';

function HrLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/hr/dashboard';

  // License State
  const [licenseChecking, setLicenseChecking] = useState(true);
  const [licenseInfo, setLicenseInfo] = useState<LicenseStatusResult | null>(null);

  // Registration Form State (when unlicensed or expired)
  const [regProductId, setRegProductId] = useState(DEFAULT_PRODUCT_ID);
  const [regProductKey, setRegProductKey] = useState('');
  const [regProductKey1, setRegProductKey1] = useState('');
  const [regProductKey2, setRegProductKey2] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState('');
  const [copiedId, setCopiedId] = useState(false);

  // Login Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch initial license status
  const getClientDeviceSerial = () => {
    if (typeof window === 'undefined') return '675683451';
    let saved = localStorage.getItem('magiccard_device_serial')?.trim();
    if (saved) return saved;

    // Check if this browser already had an existing authenticated session (e.g. host machine)
    const hasExistingSession = document.cookie.includes('sb-') || document.cookie.includes('auth');
    if (hasExistingSession) {
      saved = '675683451';
    } else {
      // New device/laptop: generate a fresh unique 9-digit serial number
      if (window.crypto?.getRandomValues) {
        const arr = new Uint32Array(1);
        window.crypto.getRandomValues(arr);
        saved = (100000000 + (arr[0] % 900000000)).toString();
      } else {
        saved = Math.floor(100000000 + Math.random() * 900000000).toString();
      }
    }
    localStorage.setItem('magiccard_device_serial', saved);
    return saved;
  };

  const checkLicense = async (customId?: string) => {
    try {
      setLicenseChecking(true);
      const targetSerial = customId?.trim() || regProductId?.trim() || getClientDeviceSerial();
      setRegProductId(targetSerial);
      localStorage.setItem('magiccard_device_serial', targetSerial);

      const res = await fetch(`/api/license?deviceId=${encodeURIComponent(targetSerial)}&t=${Date.now()}`, { cache: 'no-store' });
      const json = await res.json();
      if (json.data) {
        setLicenseInfo(json.data);
      }
      const detectedId = json.systemInfo?.deviceSerialNumber || json.data?.productId || targetSerial;
      if (detectedId) {
        setRegProductId(detectedId);
        localStorage.setItem('magiccard_device_serial', detectedId);
      }
    } catch (err) {
      console.error('Failed to check license:', err);
    } finally {
      setLicenseChecking(false);
    }
  };

  useEffect(() => {
    checkLicense();
  }, []);

  const handleCopyProductId = () => {
    navigator.clipboard.writeText(regProductId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleRegisterLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegLoading(true);
    setRegError('');
    setRegSuccess('');

    try {
      const res = await fetch('/api/license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: regProductId.trim(),
          productKey1: regProductKey.trim(),
          productKey2: regProductKey1.trim(),
          productKey3: regProductKey2.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setRegError(json.error || 'Invalid product key. Please check with your software provider.');
        setRegLoading(false);
        return;
      }

      localStorage.setItem('magiccard_device_serial', regProductId.trim());
      setRegSuccess('Product registered successfully! System unlocked.');
      setLicenseInfo(json.data);
      setTimeout(() => {
        setRegSuccess('');
      }, 2000);
    } catch {
      setRegError('Failed to communicate with activation service. Please try again.');
    } finally {
      setRegLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.message || 'Authentication failed. Please check your credentials.');
        setLoading(false);
        return;
      }

      // Successful login
      router.replace(redirectPath);
      router.refresh();
    } catch {
      setErrorMessage('Network error during authentication. Please try again.');
      setLoading(false);
    }
  };

  // Determine if license registration view should be shown
  const isLicenseLocked = !licenseChecking && licenseInfo && (!licenseInfo.isRegistered || licenseInfo.isExpired);

  return (
    <div className="min-h-screen w-full bg-[#070a12] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-950/20 via-[#0a0e1a] to-[#05070e] flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Subtle Background Grid & Ambient Glows */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-rose-600/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center p-0.5 rounded-2xl bg-gradient-to-br from-red-500/40 via-red-600/20 to-transparent shadow-xl shadow-red-950/50">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-red-700 via-red-600 to-rose-500 flex items-center justify-center text-white shadow-lg border border-red-400/30">
              <CreditCard className="w-7 h-7 text-white drop-shadow" />
            </div>
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              MagicCard Administration
            </h1>
            <p className="text-slate-400 text-xs mt-1">
              {isLicenseLocked
                ? 'Product registration required before administrative access'
                : 'Sign in to manage employees, card designs, & issuance fleet'}
            </p>
          </div>
        </div>

        {/* LOADING STATE */}
        {licenseChecking ? (
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-xl p-10 shadow-[0_20px_50px_rgba(0,0,0,0.6)] text-center space-y-3">
            <div className="w-7 h-7 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400 font-mono">Verifying hardware product license...</p>
          </div>
        ) : isLicenseLocked ? (
          /* ==================================================================== */
          /* OPTION 1: LICENSE REGISTRATION GATE (BLOCKS LOGIN UNTIL REGISTERED)  */
          /* ==================================================================== */
          <div className="rounded-2xl border border-red-900/60 bg-slate-900/80 backdrop-blur-xl p-7 shadow-[0_20px_50px_rgba(0,0,0,0.7)] space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
                <Key className="w-4 h-4 text-red-500" />
                <span>Product License Activation</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-950 text-red-400 border border-red-800">
                {licenseInfo?.isExpired ? 'LICENSE EXPIRED' : 'UNREGISTERED'}
              </span>
            </div>

            {regError && (
              <div className="p-3 rounded-xl bg-red-950/50 border border-red-800/70 text-xs text-red-200 flex items-start gap-2.5 animate-in fade-in duration-150">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{regError}</span>
              </div>
            )}

            {regSuccess && (
              <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-800/70 text-xs text-emerald-200 flex items-start gap-2.5 animate-in fade-in duration-150">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{regSuccess}</span>
              </div>
            )}

            {/* System / Hardware Telemetry Card */}
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs">
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-400 font-medium flex items-center gap-1.5 shrink-0">
                  <Cpu className="w-3.5 h-3.5 text-slate-500" /> Device Product Number:
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={regProductId}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/\D/g, '');
                      setRegProductId(clean);
                      if (clean) {
                        localStorage.setItem('magiccard_device_serial', clean);
                      }
                    }}
                    onBlur={() => {
                      if (regProductId) checkLicense(regProductId);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (regProductId) checkLicense(regProductId);
                      }
                    }}
                    className="font-mono font-bold text-white bg-slate-900 px-2.5 py-1 rounded border border-slate-700 text-xs w-32 text-center focus:outline-none focus:border-red-500"
                    title="Device Hardware Serial (Editable)"
                  />
                  <button
                    type="button"
                    onClick={handleCopyProductId}
                    className="p-1.5 rounded text-slate-400 hover:text-white bg-slate-900 border border-slate-700 transition"
                    title="Copy Product Number"
                  >
                    {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* License Registration Form */}
            <form onSubmit={handleRegisterLicense} autoComplete="off" className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Product Key 1 (Main Validation Key) *
                </label>
                <input
                  type="text"
                  required
                  value={regProductKey}
                  onChange={(e) => setRegProductKey(e.target.value.trim())}
                  className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-red-500 font-mono tracking-wider"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Product Key 2 (Duration Key) *
                </label>
                <input
                  type="text"
                  required
                  value={regProductKey1}
                  onChange={(e) => setRegProductKey1(e.target.value.trim())}
                  className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-red-500 font-mono tracking-wider"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Product Key 3 (System Type Key) *
                </label>
                <input
                  type="text"
                  required
                  value={regProductKey2}
                  onChange={(e) => setRegProductKey2(e.target.value.trim())}
                  className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-red-500 font-mono tracking-wider"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={regLoading || !regProductKey || !regProductKey1 || !regProductKey2}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-rose-600 hover:from-red-500 hover:to-rose-500 active:scale-[0.99] text-white font-semibold text-xs shadow-lg shadow-red-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {regLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Verifying Product Keys...</span>
                    </div>
                  ) : (
                    <>
                      <Key className="w-3.5 h-3.5" />
                      <span>Verify & Unlock Portal</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="text-center pt-1 border-t border-slate-800/80">
              <p className="text-[10px] text-slate-400">
                Please contact your software provider to obtain your authorization product keys.
              </p>
            </div>
          </div>
        ) : (
          /* ==================================================================== */
          /* LICENSED & VALID: SHOW NORMAL ADMIN LOGIN FORM                      */
          /* ==================================================================== */
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-xl p-7 shadow-[0_20px_50px_rgba(0,0,0,0.6)] space-y-5 animate-in fade-in duration-200">
            {/* Grace period warning if <= 7 days */}
            {licenseInfo?.isGracePeriod && (
              <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-800/70 text-xs text-amber-200 flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span className="leading-tight">
                  <strong>License Warning:</strong> {licenseInfo.daysRemaining} days remaining in Grace Period. Please renew your product key in Settings.
                </span>
              </div>
            )}

            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-950/50 border border-red-800/70 text-xs text-red-200 flex items-start gap-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleLogin} autoComplete="off" className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Corporate Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    autoComplete="off"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="sample@gmail.com"
                    className="w-full bg-slate-950/70 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-300 placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all font-medium"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                    Password
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" /> MFA Protected
                  </span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-slate-950/70 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-300 placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 transition"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-rose-600 hover:from-red-500 hover:to-rose-500 active:scale-[0.99] text-white font-semibold text-xs shadow-lg shadow-red-600/30 hover:shadow-red-600/40 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Authenticating...</span>
                    </div>
                  ) : (
                    <>
                      <span>Sign In to Portal</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* License & Security Status pill */}
            <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Licensed ({licenseInfo?.status || 'Active'})
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {licenseInfo?.edition || 'Standalone'}
              </span>
            </div>
          </div>
        )}

        {/* Security Footer */}
        <div className="text-center space-y-1">
          <p className="text-[11px] text-slate-500 font-medium">
            MagicCard Trust ID Enterprise Platform &copy; 2026
          </p>

        </div>
      </div>
    </div>
  );
}

export default function HrLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#070a12]" />}>
      <HrLoginForm />
    </Suspense>
  );
}
