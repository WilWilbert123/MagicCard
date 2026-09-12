'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Printer,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  Download,
  Building2,
  Briefcase,
  FileSpreadsheet,
  RefreshCw,
} from 'lucide-react';
import { toast } from '@/components/ui/Toast';

interface PrintJob {
  id: string;
  jobNumber: string;
  idempotencyKey: string;
  employeeId: string;
  employeeNumber: string;
  employeeName: string;
  departmentName: string;
  departmentId: string;
  branchName: string;
  branchId: string;
  kioskCode: string;
  templateVersion: string;
  durationMs: number;
  status: string;
  createdAt: string;
}

interface Branch {
  id: string;
  name: string;
  code: string;
}

interface Department {
  id: string;
  name: string;
  code: string;
}

export default function HrPrintHistoryPage() {
  const [printJobs, setPrintJobs] = useState<PrintJob[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [deptFilter, setDeptFilter] = useState('ALL');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [jobsRes, branchRes, deptRes] = await Promise.all([
        fetch('/api/print-jobs'),
        fetch('/api/branches'),
        fetch('/api/departments'),
      ]);

      const [jobsJson, branchJson, deptJson] = await Promise.all([
        jobsRes.json(),
        branchRes.json(),
        deptRes.json(),
      ]);

      if (jobsRes.ok && Array.isArray(jobsJson.data)) {
        setPrintJobs(jobsJson.data);
      }
      if (branchRes.ok && Array.isArray(branchJson.data)) {
        setBranches(branchJson.data);
      }
      if (deptRes.ok && Array.isArray(deptJson.data)) {
        setDepartments(deptJson.data);
      }
    } catch {
      toast.error('Failed to load print history or organization filters.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredJobs = printJobs.filter((job) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (job.jobNumber || '').toLowerCase().includes(q) ||
      (job.employeeName || '').toLowerCase().includes(q) ||
      (job.employeeNumber || '').toLowerCase().includes(q) ||
      (job.branchName || '').toLowerCase().includes(q) ||
      (job.departmentName || '').toLowerCase().includes(q) ||
      (job.kioskCode || '').toLowerCase().includes(q);

    const matchesStatus = statusFilter === 'ALL' || job.status === statusFilter;
    const matchesBranch =
      branchFilter === 'ALL' ||
      job.branchId === branchFilter ||
      (job.branchName || '').toLowerCase().includes(branchFilter.toLowerCase());

    const matchesDept =
      deptFilter === 'ALL' ||
      job.departmentId === deptFilter ||
      (job.departmentName || '').toLowerCase().includes(deptFilter.toLowerCase());

    return matchesSearch && matchesStatus && matchesBranch && matchesDept;
  });

  const handleExportCSV = () => {
    if (filteredJobs.length === 0) return;
    const headers = ['Job Number', 'Employee Name', 'Employee ID', 'Department', 'Branch', 'KIOSK Code', 'Template', 'Duration (s)', 'Status', 'Date & Time'];
    const rows = filteredJobs.map((j) => [
      `"${j.jobNumber}"`,
      `"${j.employeeName.replace(/"/g, '""')}"`,
      `"${j.employeeNumber}"`,
      `"${j.departmentName.replace(/"/g, '""')}"`,
      `"${j.branchName.replace(/"/g, '""')}"`,
      `"${j.kioskCode}"`,
      `"${j.templateVersion}"`,
      `"${(j.durationMs / 1000).toFixed(1)}"`,
      `"${j.status}"`,
      `"${new Date(j.createdAt).toLocaleString()}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `magiccard_print_history_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const rowsHtml = filteredJobs
      .map(
        (job) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px; font-family: monospace; font-weight: bold;">${job.jobNumber}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">
          <div style="font-weight: 600; color: #0f172a;">${job.employeeName}</div>
          <div style="font-size: 10px; color: #64748b; font-family: monospace;">${job.employeeNumber}</div>
        </td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px; font-weight: 600; color: #dc2626;">${job.departmentName}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${job.branchName}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px; font-family: monospace;">${job.kioskCode}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px; color: #16a34a; font-weight: bold;">${job.status}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${new Date(job.createdAt).toLocaleString()}</td>
      </tr>
    `
      )
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>MagicCard - Print History & Hardware Audit Trail</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; color: #0f172a; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #dc2626; padding-bottom: 12px; margin-bottom: 20px; }
            .title { font-size: 20px; font-weight: bold; color: #0f172a; }
            .subtitle { font-size: 12px; color: #64748b; margin-top: 4px; }
            .meta { font-size: 11px; color: #64748b; text-align: right; }
            table { width: 100%; border-collapse: collapse; text-align: left; }
            th { background: #f8fafc; padding: 8px; font-size: 10px; font-weight: 700; text-transform: uppercase; color: #475569; border-bottom: 2px solid #cbd5e1; }
            .footer { margin-top: 30px; font-size: 10px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">MagicCard Badge Print Audit Trail</div>
              <div class="subtitle">Physical Card Printing Register Across Corporate Branches & Departments</div>
            </div>
            <div class="meta">
              <div>Generated: ${new Date().toLocaleString()}</div>
              <div>Total Jobs: ${filteredJobs.length}</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Job Number</th>
                <th>Employee Details</th>
                <th>Department</th>
                <th>Branch Location</th>
                <th>KIOSK Code</th>
                <th>Status</th>
                <th>Date & Time</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <div class="footer">
            Confidential Enterprise Report • MagicCard Hardware Print Infrastructure
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Printer className="w-6 h-6 text-red-600 dark:text-red-500" />
            Print History & Audits
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
            Comprehensive audit trail of all physical card print jobs dispatched to Magicard Trust ID hardware across corporate branches and departments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            title="Refresh Print Jobs"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleExportCSV}
            disabled={filteredJobs.length === 0}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold shadow-sm flex items-center gap-1.5 transition disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Export CSV
          </button>
          <button
            onClick={handleExportPDF}
            disabled={filteredJobs.length === 0}
            className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-md shadow-red-600/20 transition flex items-center gap-1.5 disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> Export Print Report (PDF)
          </button>
        </div>
      </div>

      {/* Filter Bar with Branch & Department dropdowns */}
      <div className="p-4 rounded-xl bg-white dark:bg-[#111827]/90 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Branch Filter */}
          <div className="relative">
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-red-500"
            >
              <option value="ALL">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
            <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
          </div>

          {/* Department Filter */}
          <div className="relative">
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-red-500"
            >
              <option value="ALL">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
            <Briefcase className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-red-500"
            >
              <option value="ALL">All Print Statuses</option>
              <option value="COMPLETED">Completed</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search job #, employee, kiosk, branch..."
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
                <th className="px-5 py-3 font-semibold">Department</th>
                <th className="px-5 py-3 font-semibold">Branch</th>
                <th className="px-5 py-3 font-semibold">KIOSK Terminal</th>
                <th className="px-5 py-3 font-semibold">Template & Speed</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Date & Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-slate-500">
                    <div className="inline-flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full border-2 border-slate-400 border-t-red-500 animate-spin" />
                      Loading print history from database...
                    </div>
                  </td>
                </tr>
              ) : filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-slate-500">
                    No print jobs match your search or filter criteria. Dispatch a print job from a KIOSK terminal to log print history.
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                    <td className="px-5 py-3 font-mono font-bold text-red-600 dark:text-red-400">{job.jobNumber}</td>
                    <td className="px-5 py-3">
                      <div className="font-bold text-slate-900 dark:text-white">{job.employeeName}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{job.employeeNumber}</div>
                    </td>
                    <td className="px-5 py-3 font-semibold text-slate-900 dark:text-slate-200">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/60">
                        {job.departmentName}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-300 font-medium">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {job.branchName}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono text-slate-600 dark:text-slate-300">{job.kioskCode}</td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400 text-[11px]">
                      <div>{job.templateVersion}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {job.durationMs ? `${(job.durationMs / 1000).toFixed(1)}s print speed` : 'N/A'}
                      </div>
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
                    <td className="px-5 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap text-[11px] font-mono">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {new Date(job.createdAt).toLocaleString()}
                      </div>
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
