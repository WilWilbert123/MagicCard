'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Users, 
  UserCheck, 
  UserX, 
  Monitor, 
  CheckCircle2, 
  AlertCircle, 
  Printer, 
  Calendar, 
  XCircle, 
  ExternalLink,
  ArrowUpRight,
  TrendingUp,
  RefreshCw,
  Clock
} from 'lucide-react';
import { Employee, KioskDevice, PrintJobRecord } from '@/lib/data/enterpriseStore';

export default function HrDashboardPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [kiosks, setKiosks] = useState<KioskDevice[]>([]);
  const [printJobs, setPrintJobs] = useState<PrintJobRecord[]>([]);
  const [branchesCount, setBranchesCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/employees').then((r) => r.json()).catch(() => ({ data: [] })),
      fetch('/api/kiosks').then((r) => r.json()).catch(() => ({ data: [] })),
      fetch('/api/print-jobs').then((r) => r.json()).catch(() => ({ data: [] })),
      fetch('/api/branches').then((r) => r.json()).catch(() => ({ data: [] })),
    ]).then(([empRes, kRes, pjRes, brRes]) => {
      setEmployees(empRes.data ?? []);
      setKiosks(kRes.data ?? []);
      setPrintJobs(pjRes.data ?? []);
      setBranchesCount((brRes.data ?? []).length);
      setIsLoading(false);
    });
  }, []);

  const totalEmployees = employees.length;
  const activeEmployees = employees.filter((e) => e.employmentStatus === 'ACTIVE').length;
  const inactiveEmployees = totalEmployees - activeEmployees;

  const totalKiosks = kiosks.length;
  const onlineKiosks = kiosks.filter((k) => k.status === 'ONLINE').length;
  const offlineKiosks = totalKiosks - onlineKiosks;

  const completedJobs = printJobs.filter((j) => j.status === 'COMPLETED').length;
  const failedJobs = printJobs.filter((j) => j.status === 'FAILED').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs">
            Live metrics synchronized with your Supabase database.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/hr/card-designs/template-acme-cr80/designer"
            className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-md shadow-red-600/20 transition flex items-center gap-1.5"
          >
            Open Card Designer <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/kiosk"
            target="_blank"
            className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
          >
            Launch KIOSK <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Row 1: Core Metrics Grid (6 cards) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Employees */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#111827]/90 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Total Employees</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            {isLoading ? '...' : totalEmployees}
          </div>
          <div className="text-[11px] text-slate-500 mt-1.5">
            {branchesCount} Active Branch{branchesCount !== 1 ? 'es' : ''}
          </div>
        </div>

        {/* Active Employees */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#111827]/90 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Active Employees</span>
            <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            {isLoading ? '...' : activeEmployees}
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1.5">
            Eligible for Badging
          </div>
        </div>

        {/* Inactive Employees */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#111827]/90 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Inactive Employees</span>
            <UserX className="w-4 h-4 text-rose-500 dark:text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            {isLoading ? '...' : inactiveEmployees}
          </div>
          <div className="text-[11px] text-slate-500 mt-1.5">
            Suspended / Archived
          </div>
        </div>

        {/* Total KIOSKs */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#111827]/90 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Total KIOSKs</span>
            <Monitor className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            {isLoading ? '...' : totalKiosks}
          </div>
          <div className="text-[11px] text-slate-500 mt-1.5">
            {totalKiosks === 0 ? 'None Registered' : `${branchesCount} Branch Locations`}
          </div>
        </div>

        {/* Online KIOSKs */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#111827]/90 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Online KIOSKs</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">
            {isLoading ? '...' : onlineKiosks}
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1.5">
            {totalKiosks > 0 ? `${Math.round((onlineKiosks / totalKiosks) * 100)}% Fleet Uptime` : 'No Fleet'}
          </div>
        </div>

        {/* Offline KIOSKs */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#111827]/90 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Offline KIOSKs</span>
            <AlertCircle className="w-4 h-4 text-amber-500 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 tracking-tight">
            {isLoading ? '...' : offlineKiosks}
          </div>
          <div className="text-[11px] text-slate-500 mt-1.5">
            {offlineKiosks > 0 ? 'Needs Attention' : 'All Systems Nominal'}
          </div>
        </div>
      </div>

      {/* Row 2: Production Printing & Template Status (4 cards) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Cards Printed */}
        <div className="p-5 rounded-xl bg-white dark:bg-[#111827]/90 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Cards Issued & Printed</span>
              <Printer className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              {isLoading ? '...' : completedJobs}
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-4">
            <span>Hardware print jobs</span>
          </div>
        </div>

        {/* Total Print Jobs Logged */}
        <div className="p-5 rounded-xl bg-white dark:bg-[#111827]/90 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Print Jobs Logged</span>
              <Calendar className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              {isLoading ? '...' : printJobs.length}
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-4">
            <span>Audit history entries</span>
          </div>
        </div>

        {/* Failed Print Jobs */}
        <div className="p-5 rounded-xl bg-white dark:bg-[#111827]/90 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Failed Print Jobs</span>
              <XCircle className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-3xl font-bold text-rose-600 dark:text-rose-400 tracking-tight">
              {isLoading ? '...' : failedJobs}
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-4">
            <span>Hardware exceptions</span>
          </div>
        </div>

        {/* Template Status Card */}
        <div className="p-5 rounded-xl bg-white dark:bg-[#111827]/90 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-red-600" />
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Template Status</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                Active
              </span>
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-white">v2.0.0 (Published)</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">CR80 Double-Sided</div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">Fleet Synced</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
              {totalKiosks > 0 ? `${onlineKiosks}/${totalKiosks} Online` : 'No Terminals'}
            </span>
          </div>
        </div>
      </div>

      {/* Row 3: Tables Grid (Latest Employees & Recent Print Jobs) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latest Employees Table */}
        <div className="rounded-xl bg-white dark:bg-[#111827]/90 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Latest Employees in Supabase</h2>
            <Link href="/hr/employees" className="text-xs text-red-600 dark:text-red-400 hover:underline font-medium">
              View All ({totalEmployees})
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-5 py-3 font-medium">Photo</th>
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">ID Number</th>
                  <th className="px-5 py-3 font-medium">Department</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-6 text-center text-slate-500">
                      Loading employee records...
                    </td>
                  </tr>
                ) : employees.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-6 text-center text-slate-500">
                      No employees in database. Click &quot;Employees&quot; to add or import.
                    </td>
                  </tr>
                ) : (
                  employees.slice(0, 5).map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                      <td className="px-5 py-3">
                        {emp.photoUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={emp.photoUrl}
                            alt={emp.fullName}
                            className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[11px] font-bold text-slate-600 dark:text-slate-300">
                            {emp.firstName?.[0] || 'E'}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3 font-semibold text-slate-900 dark:text-white">{emp.fullName}</td>
                      <td className="px-5 py-3 font-mono text-slate-600 dark:text-slate-400">{emp.employeeNumber}</td>
                      <td className="px-5 py-3 text-slate-600 dark:text-slate-400">{emp.departmentName}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          emp.employmentStatus === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-400 dark:border-emerald-800/60'
                            : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                        }`}>
                          {emp.employmentStatus}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Print Jobs Table */}
        <div className="rounded-xl bg-white dark:bg-[#111827]/90 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Recent Hardware Print Jobs</h2>
            <Link href="/hr/print-history" className="text-xs text-red-600 dark:text-red-400 hover:underline font-medium">
              View History ({printJobs.length})
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-5 py-3 font-medium">Job Number</th>
                  <th className="px-5 py-3 font-medium">Employee</th>
                  <th className="px-5 py-3 font-medium">KIOSK</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-6 text-center text-slate-500">
                      Loading print jobs...
                    </td>
                  </tr>
                ) : printJobs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-6 text-center text-slate-500">
                      No print jobs recorded yet.
                    </td>
                  </tr>
                ) : (
                  printJobs.slice(0, 5).map((job) => (
                    <tr key={job.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                      <td className="px-5 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">{job.jobNumber}</td>
                      <td className="px-5 py-3 font-semibold text-slate-900 dark:text-white">{job.employeeName}</td>
                      <td className="px-5 py-3 text-slate-600 dark:text-slate-400">{job.kioskCode}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          job.status === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-400 dark:border-emerald-800/60'
                            : 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/80 dark:text-rose-400 dark:border-rose-800/60'
                        }`}>
                          {job.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {new Date(job.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
