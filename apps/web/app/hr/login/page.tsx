'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck, Lock, Mail, ArrowRight, AlertCircle, Eye, EyeOff, CreditCard } from 'lucide-react';

function HrLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/hr/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

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
              Sign in to manage employees, card designs, & issuance fleet
            </p>
          </div>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-xl p-7 shadow-[0_20px_50px_rgba(0,0,0,0.6)] space-y-5">
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

          {/* Security Notice */}
          <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/80 text-[11px] text-slate-400 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <span className="leading-tight">
              Authorized personnel only. Sessions are monitored and audit-logged under corporate security policy.
            </span>
          </div>
        </div>

        {/* Security Footer */}
        <div className="text-center space-y-1">
          <p className="text-[11px] text-slate-500 font-medium">
            MagicCard Trust ID Enterprise Platform &copy; 2026
          </p>
          <p className="text-[10px] text-slate-600">
            256-Bit SSL Encrypted • Immutable Audit Trail Enabled
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
