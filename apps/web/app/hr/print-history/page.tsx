'use client';

import { useState, useEffect } from 'react';
import { 
  Printer, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Filter, 
  Download 
} from 'lucide-react';
import { PrintJobRecord } from '@/lib/data/enterpriseStore';
import { toast } from '@/components/ui/Toast';

export default function HrPrintHistoryPage() {
  const [printJobs, setPrintJobs] = useState<PrintJobRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    fetch('/api/print-jobs')
      .then((r) => r.json())
      .then((json) => {
        setPrintJobs(json.data ?? []);
      })
      .catch(() => toast.error('Failed to load print history from database.'))
      .finally(() => setIsLoading(false));
  }, []);

  const filteredJobs = printJobs.filter((job) => {
    const matchesSearch =
      (job.jobNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (job.employeeName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (job.employeeNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (job.kioskCode || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || job.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Print History & Audits</h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs">
            Comprehensive audit trail of all physical card print jobs dispatched to Magicard Trust ID hardware.
          </p>
        </div>

        <button
          onClick={() => toast.info('Exporting print logs... (feature coming soon)')}
          className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" /> Export Audit Log
        </button>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-xl bg-white dark:bg-[#111827]/90 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-red-500"
          >
            <option value="ALL">All Print Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search job #, employee, kiosk..."
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-red-500"
          />
        </div>
      </div>

      {/* Print Jobs Table */}
      <div className="rounded-xl bg-white dark:bg-[#111827]/90 border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-3 font-semibold">Job Number</th>
                <th className="px-5 py-3 font-semibold">Employee</th>
                <th className="px-5 py-3 font-semibold">KIOSK Terminal</th>
                <th className="px-5 py-3 font-semibold">Branch</th>
                <th className="px-5 py-3 font-semibold">Template</th>
                <th className="px-5 py-3 font-semibold">Duration</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Date & Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-slate-500">
                    <div className="inline-flex items-center gap-2">
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-400 border-t-red-500 animate-spin" />
                      Loading print history from database...
                    </div>
                  </td>
                </tr>
              ) : filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-slate-500">
                    No print jobs recorded yet.
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                    <td className="px-5 py-3 font-mono font-bold text-slate-900 dark:text-white">{job.jobNumber}</td>
                    <td className="px-5 py-3">
                      <div className="font-semibold text-slate-900 dark:text-white">{job.employeeName}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{job.employeeNumber}</div>
                    </td>
                    <td className="px-5 py-3 font-mono text-slate-600 dark:text-slate-300">{job.kioskCode}</td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400">{job.branchName}</td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400">{job.templateVersion}</td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400">
                      {job.durationMs ? `${(job.durationMs / 1000).toFixed(1)}s` : 'N/A'}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border flex items-center gap-1 w-fit ${
                        job.status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-400 dark:border-emerald-800/60'
                          : 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/80 dark:text-rose-400 dark:border-rose-800/60'
                      }`}>
                        {job.status === 'COMPLETED' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {job.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-500 dark:text-slate-400">
                      {new Date(job.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
