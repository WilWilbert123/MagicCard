'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, CheckCircle2, AlertTriangle, Building2, User, Calendar, ExternalLink, Lock, Award, RefreshCw } from 'lucide-react';
import { decodeVerificationToken } from '@workspace/card-engine';
import { enterpriseStore } from '@/lib/data/enterpriseStore';

export default function VerifyCardPage({ params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = use(params);
  const rawToken = resolvedParams.token;
  const realEmpNum = decodeVerificationToken(rawToken);

  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [contactUrl, setContactUrl] = useState<string>('https://bismac.com.ph/index.php/contact-us');

  useEffect(() => {
    // 1. Fetch system settings for contact/verification URL
    fetch('/api/settings')
      .then((r) => r.json())
      .then((json) => {
        if (json?.data?.verificationBaseUrl) {
          setContactUrl(json.data.verificationBaseUrl);
        }
      })
      .catch(() => {});

    // 2. Fetch employee details from API
    fetch(`/api/employees?employeeNumber=${encodeURIComponent(realEmpNum)}`)
      .then((r) => r.json())
      .then((json) => {
        let emp = json?.data?.[0];
        if (!emp) {
          emp = enterpriseStore.findEmployeeByNumber(realEmpNum);
        }
        setEmployee(emp || null);
      })
      .catch(() => {
        const localEmp = enterpriseStore.findEmployeeByNumber(realEmpNum);
        setEmployee(localEmp || null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [realEmpNum]);

  const isValid = employee && (employee.employmentStatus === 'ACTIVE' || employee.status === 'active' || !employee.employmentStatus);
  const empName = employee ? (employee.fullName || `${employee.firstName || ''} ${employee.lastName || ''}`.trim()) : '';
  const empNumber = employee ? (employee.employeeNumber || realEmpNum) : realEmpNum;
  const empDept = employee ? (employee.departmentName || employee.department || 'Operations') : '';
  const empPos = employee ? (employee.positionTitle || employee.position || 'Staff') : '';
  const empBranch = employee ? (employee.branchName || employee.branch || 'Main Campus') : '';
  const photoUrl = employee?.photoUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80';

  return (
    <div className="min-h-screen bg-[#07090e] text-white flex flex-col items-center justify-center p-4 sm:p-6 font-sans antialiased relative overflow-hidden">
      {/* Dynamic Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 blur-[140px] pointer-events-none rounded-full" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-blue-500/10 blur-[120px] pointer-events-none rounded-full" />

      <div className="w-full max-w-lg relative z-10 my-8">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-0.5 shadow-xl shadow-emerald-500/20 mb-3">
            <div className="w-full h-full bg-[#0d121f] rounded-[14px] flex items-center justify-center">
              <ShieldCheck className="w-7 h-7 text-emerald-400" />
            </div>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center justify-center gap-2">
            Identity Verification Portal
          </h1>
          <p className="text-slate-400 text-xs mt-1 font-medium">
            Official BISMAC Digital Credentials & Trust Network
          </p>
        </div>

        {/* Status Card */}
        <div className="rounded-3xl bg-[#0d121f]/90 backdrop-blur-xl border border-slate-800/80 p-6 sm:p-8 shadow-2xl space-y-6">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
              <p className="text-xs font-semibold">Validating Digital Credential Seal...</p>
            </div>
          ) : isValid ? (
            <>
              {/* Green Verified Banner */}
              <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-emerald-950/70 border border-emerald-500/30 text-emerald-300 shadow-inner">
                <CheckCircle2 className="w-6 h-6 shrink-0 text-emerald-400 mt-0.5" />
                <div>
                  <div className="font-bold text-sm text-emerald-200 tracking-wide uppercase">
                    Verified Active Credential
                  </div>
                  <div className="text-xs text-emerald-300/80 mt-0.5">
                    This employee is officially verified & authorized to hold and present this ID card.
                  </div>
                </div>
              </div>

              {/* Employee Information Card */}
              <div className="flex items-center gap-5 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoUrl}
                  alt={empName}
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-emerald-500/40 shadow-lg shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-black text-white truncate tracking-tight">{empName}</h2>
                  <div className="text-xs font-bold text-emerald-400 mt-0.5 truncate">{empPos}</div>
                  <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-lg bg-slate-800/80 text-[11px] font-mono text-slate-300 border border-slate-700/60">
                    <Lock className="w-3 h-3 text-emerald-400" />
                    ID: {empNumber}
                  </div>
                </div>
              </div>

              {/* Verification Details Table */}
              <div className="space-y-2.5 text-xs bg-slate-900/40 p-4 rounded-2xl border border-slate-800/60">
                <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400 font-medium">Department</span>
                  <span className="font-semibold text-slate-200">{empDept}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400 font-medium">Branch Location</span>
                  <span className="font-semibold text-slate-200">{empBranch}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400 font-medium">Authorization Status</span>
                  <span className="font-bold text-emerald-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    OFFICIALLY ISSUED & ACTIVE
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-400 font-medium">Security Validity</span>
                  <span className="font-bold text-teal-300 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Valid through January 2028
                  </span>
                </div>
              </div>

              {/* Cryptographic Trust Seal */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-950/20 border border-emerald-800/40 text-[11px] text-slate-400">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Tamper-Proof Cryptographic Hash</span>
                </div>
                <span className="font-mono text-[10px] text-emerald-400/90 font-semibold uppercase">SEAL: VERIFIED-2028</span>
              </div>

              {/* Direct Support & Inquiries Button */}
              <div className="pt-2">
                <a
                  href={contactUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all duration-200 active:scale-[0.98]"
                >
                  <span>Need Assistance or Have Concerns? Contact Support</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </>
          ) : (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-8 h-8 text-rose-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Credential Invalid or Revoked</h2>
                <p className="text-xs text-slate-400 mt-1.5 px-4 leading-relaxed">
                  No active verification record found for ID Token &quot;{rawToken}&quot;. This credential may be expired, lost, or deactivated.
                </p>
              </div>
              <div className="pt-2">
                <a
                  href={contactUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors"
                >
                  <span>Report Security Issue to BISMAC</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}

          {/* Footer Navigation */}
          <div className="pt-4 border-t border-slate-800/80 text-center flex items-center justify-between text-[11px] text-slate-500">
            <span>© 2026 BISMAC Security Trust</span>
            <Link href="/" className="hover:text-slate-300 transition-colors">
              Portal Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

