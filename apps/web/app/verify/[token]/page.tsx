'use client';

import { use } from 'react';
import Link from 'next/link';
import { ShieldCheck, CheckCircle2, AlertTriangle, Building2, User, Calendar } from 'lucide-react';
import { enterpriseStore } from '@/lib/data/enterpriseStore';

export default function VerifyCardPage({ params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = use(params);
  const token = resolvedParams.token;
  const employee = enterpriseStore.findEmployeeByNumber(token);

  const isValid = employee && employee.employmentStatus === 'ACTIVE';

  return (
    <div className="min-h-screen bg-[#0b0f17] text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Acme Credential Brand */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-red-600 mx-auto flex items-center justify-center font-bold text-xl text-white shadow-xl shadow-red-600/30 mb-3">
            ID
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Official Credential Verification
          </h1>
          <p className="text-slate-400 text-xs mt-0.5">
            Acme Corporation Public Trust & Security Services
          </p>
        </div>

        {/* Status Card */}
        <div className="rounded-2xl bg-[#111827] border border-slate-800 p-6 shadow-2xl space-y-6">
          {isValid ? (
            <>
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-xs">
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
                <div>
                  <div className="font-bold text-emerald-200">Valid & Verified Active Credential</div>
                  <div className="text-[11px] text-emerald-400/80">Issued via Acme Central ID Card Platform</div>
                </div>
              </div>

              {/* Public Safe Employee Details */}
              <div className="flex items-center gap-4 py-2 border-b border-slate-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={employee.photoUrl}
                  alt={employee.fullName}
                  className="w-16 h-16 rounded-xl object-cover border border-slate-700 shadow"
                />
                <div>
                  <h2 className="text-lg font-bold text-white">{employee.fullName}</h2>
                  <div className="text-xs text-red-400 font-semibold">{employee.positionTitle}</div>
                  <div className="text-xs font-mono text-slate-400 mt-1">
                    ID: {employee.employeeNumber}
                  </div>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Department</span>
                  <span className="font-semibold text-white">{employee.departmentName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Branch Location</span>
                  <span className="font-semibold text-white">{employee.branchName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Card Status</span>
                  <span className="font-semibold text-emerald-400">OFFICIALLY ISSUED</span>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-6 space-y-3">
              <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
              <h2 className="text-lg font-bold text-white">Credential Invalid or Revoked</h2>
              <p className="text-xs text-slate-400 px-4">
                No active employee verification record found for token &quot;{token}&quot;. If you believe this is an error, please contact corporate security.
              </p>
            </div>
          )}

          <div className="pt-4 border-t border-slate-800 text-center">
            <Link
              href="/"
              className="text-xs text-slate-400 hover:text-white"
            >
              ← Return to Portal Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
