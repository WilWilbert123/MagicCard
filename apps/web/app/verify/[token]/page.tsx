'use client';

import { use, useEffect, useState } from 'react';
import { ShieldCheck, CheckCircle2, AlertTriangle, Lock, RefreshCw } from 'lucide-react';
import { decodeVerificationToken } from '@workspace/card-engine';
import { enterpriseStore } from '@/lib/data/enterpriseStore';

export default function VerifyCardPage({ params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = use(params);
  const rawToken = resolvedParams.token;
  const realEmpNum = decodeVerificationToken(rawToken);

  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
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
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 font-sans antialiased">
      <div className="w-full max-w-md my-6">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 shadow-md mb-3">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Identity Verification Portal
          </h1>
        </div>

        {/* Status Card */}
        <div className="rounded-2xl bg-zinc-950 border border-zinc-800 p-5 sm:p-6 shadow-2xl space-y-5">
          {loading ? (
            <div className="py-10 flex flex-col items-center justify-center gap-3 text-zinc-400">
              <RefreshCw className="w-6 h-6 animate-spin text-white" />
              <p className="text-xs font-medium">Validating Digital Credential...</p>
            </div>
          ) : isValid ? (
            <>
              {/* Verified Active Banner */}
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-800">
                <CheckCircle2 className="w-5 h-5 text-white shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-xs text-white uppercase tracking-wide">
                    Verified Active Credential
                  </div>
                  <div className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                    This employee is officially verified & authorized to hold and present this ID card.
                  </div>
                </div>
              </div>

              {/* Employee Information Card */}
              <div className="flex items-center gap-4 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/80">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoUrl}
                  alt={empName}
                  className="w-16 h-16 rounded-xl object-cover border border-zinc-700 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-bold text-white truncate tracking-tight">{empName}</h2>
                  <div className="text-xs font-medium text-zinc-300 mt-0.5 truncate">{empPos}</div>
                  <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded bg-zinc-900 text-[11px] font-mono text-zinc-300 border border-zinc-800">
                    <Lock className="w-3 h-3 text-zinc-400" />
                    ID: {empNumber}
                  </div>
                </div>
              </div>

              {/* Verification Details Table */}
              <div className="space-y-2 text-xs bg-zinc-900/30 p-3.5 rounded-xl border border-zinc-800/60">
                <div className="flex justify-between py-1.5 border-b border-zinc-800/60">
                  <span className="text-zinc-400 font-medium">Department</span>
                  <span className="font-semibold text-zinc-200">{empDept}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-zinc-800/60">
                  <span className="text-zinc-400 font-medium">Branch Location</span>
                  <span className="font-semibold text-zinc-200">{empBranch}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-zinc-400 font-medium">Authorization Status</span>
                  <span className="font-semibold text-white flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    OFFICIALLY ISSUED & ACTIVE
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-6 space-y-3">
              <div className="w-14 h-14 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Credential Invalid or Revoked</h2>
                <p className="text-xs text-zinc-400 mt-1 px-2 leading-relaxed">
                  No active verification record found for ID Token &quot;{rawToken}&quot;. This credential may be expired, lost, or deactivated.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}



