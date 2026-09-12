'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  Search,
  RefreshCw,
  Printer,
  FileSpreadsheet,
  User,
  Monitor,
  Cpu,
  Clock,
  Building2,
  Briefcase,
} from 'lucide-react';

interface AuditLogItem {
  id: string;
  timestamp: string;
  actor: string;
  actorType: 'USER' | 'KIOSK' | 'SYSTEM' | string;
  action: string;
  entity: string;
  entityType: string;
  details: string;
  ipAddress: string;
  branchId?: string;
  branchName?: string;
  departmentId?: string;
  departmentName?: string;
}

interface FilterOption {
  id: string;
  name: string;
  code?: string;
}

export default function HrAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [branchFilter, setBranchFilter] = useState<string>('ALL');
  const [deptFilter, setDeptFilter] = useState<string>('ALL');

  const [branches, setBranches] = useState<FilterOption[]>([]);
  const [departments, setDepartments] = useState<FilterOption[]>([]);

  // Fetch filter dropdown options
  useEffect(() => {
    async function loadDropdowns() {
      try {
        const [bRes, dRes] = await Promise.all([
          fetch('/api/branches'),
          fetch('/api/departments'),
        ]);
        const bJson = await bRes.json();
        const dJson = await dRes.json();
        if (bRes.ok && Array.isArray(bJson.data)) {
          setBranches(bJson.data);
        }
        if (dRes.ok && Array.isArray(dJson.data)) {
          setDepartments(dJson.data);
        }
      } catch (err) {
        console.error('Failed to load filter options:', err);
      }
    }
    loadDropdowns();
  }, []);

  const fetchAuditLogs = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        type: selectedType,
        branchId: branchFilter,
        departmentId: deptFilter,
      });
      const res = await fetch(`/api/audit-logs?${queryParams.toString()}`);
      const json = await res.json();
      if (res.ok && Array.isArray(json.data)) {
        setLogs(json.data);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedType, branchFilter, deptFilter]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  const filteredLogs = logs.filter((l) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      l.action.toLowerCase().includes(q) ||
      l.actor.toLowerCase().includes(q) ||
      l.entity.toLowerCase().includes(q) ||
      l.details.toLowerCase().includes(q) ||
      (l.branchName && l.branchName.toLowerCase().includes(q)) ||
      (l.departmentName && l.departmentName.toLowerCase().includes(q)) ||
      new Date(l.timestamp).toLocaleString().toLowerCase().includes(q)
    );
  });

  const getActorIcon = (type: string) => {
    switch (type) {
      case 'KIOSK':
        return <Monitor className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
      case 'SYSTEM':
        return <Cpu className="w-3.5 h-3.5 text-purple-500 shrink-0" />;
      default:
        return <User className="w-3.5 h-3.5 text-blue-500 shrink-0" />;
    }
  };

  const getActionBadgeColor = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('CREATE')) return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
    if (act.includes('UPDATE')) return 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border-blue-200 dark:border-blue-800';
    if (act.includes('DELETE') || act.includes('REMOVE')) return 'bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300 border-red-200 dark:border-red-800';
    if (act.includes('PRINT')) return 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-200 dark:border-amber-800';
    return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
  };

  const handleExportCSV = () => {
    if (filteredLogs.length === 0) return;
    const headers = ['Timestamp', 'Actor', 'Actor Type', 'Security Action', 'Target Entity', 'Branch', 'Department', 'Details', 'IP Address'];
    const rows = filteredLogs.map((l) => [
      `"${new Date(l.timestamp).toLocaleString()}"`,
      `"${l.actor.replace(/"/g, '""')}"`,
      `"${l.actorType}"`,
      `"${l.action}"`,
      `"${l.entity.replace(/"/g, '""')}"`,
      `"${(l.branchName || 'N/A').replace(/"/g, '""')}"`,
      `"${(l.departmentName || 'N/A').replace(/"/g, '""')}"`,
      `"${l.details.replace(/"/g, '""')}"`,
      `"${l.ipAddress}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `magiccard_audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const selectedBranchObj = branches.find((b) => b.id === branchFilter || b.name === branchFilter);
    const selectedDeptObj = departments.find((d) => d.id === deptFilter || d.name === deptFilter);

    const activeFilterText = [
      `Actor Type: ${selectedType}`,
      branchFilter !== 'ALL' ? `Branch: ${selectedBranchObj?.name || branchFilter}` : 'All Branches',
      deptFilter !== 'ALL' ? `Department: ${selectedDeptObj?.name || deptFilter}` : 'All Departments',
      searchQuery ? `Search: "${searchQuery}"` : null,
    ].filter(Boolean).join(' • ');

    const rowsHtml = filteredLogs
      .map(
        (l) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${new Date(l.timestamp).toLocaleString()}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px; font-weight: 600;">${l.actor}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">
          <span style="padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; background: #f1f5f9;">${l.actorType}</span>
        </td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px; font-family: monospace; font-weight: bold; color: #dc2626;">${l.action}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${l.entity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px; color: #0284c7; font-weight: 500;">${l.branchName || '—'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px; color: #7c3aed; font-weight: 500;">${l.departmentName || '—'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${l.details}</td>
      </tr>
    `
      )
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>MagicCard - System Security & Audit Log Report</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; color: #0f172a; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #dc2626; padding-bottom: 12px; margin-bottom: 16px; }
            .title { font-size: 20px; font-weight: bold; color: #0f172a; }
            .subtitle { font-size: 12px; color: #64748b; margin-top: 4px; }
            .filter-bar { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; font-size: 11px; color: #334155; margin-bottom: 16px; font-weight: 500; }
            .meta { font-size: 11px; color: #64748b; text-align: right; }
            table { width: 100%; border-collapse: collapse; text-align: left; }
            th { background: #f8fafc; padding: 8px; font-size: 10px; font-weight: 700; text-transform: uppercase; color: #475569; border-bottom: 2px solid #cbd5e1; }
            .footer { margin-top: 30px; font-size: 10px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">MagicCard Enterprise Audit Log Report</div>
              <div class="subtitle">Official Immutable System Security & Administration Activity Register</div>
            </div>
            <div class="meta">
              <div>Generated: ${new Date().toLocaleString()}</div>
              <div>Total Events: ${filteredLogs.length}</div>
            </div>
          </div>
          <div class="filter-bar">
            <strong>Active Report Scope:</strong> ${activeFilterText}
          </div>
          <table>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Actor</th>
                <th>Type</th>
                <th>Security Action</th>
                <th>Target Entity</th>
                <th>Branch</th>
                <th>Department</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <div class="footer">
            Confidential Enterprise Report • MagicCard Corporate ID & Access Management Fleet
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
            <ShieldCheck className="w-6 h-6 text-red-600 dark:text-red-500" />
            System Security & Audit Logs
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
            Real-time immutable security event logs tracking administrator updates, department & branch changes, employee edits, KIOSK badge printing, and account access.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAuditLogs}
            disabled={loading}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            title="Refresh Audit Logs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleExportCSV}
            disabled={filteredLogs.length === 0}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold shadow-sm flex items-center gap-1.5 transition disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Export CSV
          </button>
          <button
            onClick={handleExportPDF}
            disabled={filteredLogs.length === 0}
            className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-md shadow-red-600/20 flex items-center gap-1.5 transition disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            Export PDF Report
          </button>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="p-4 rounded-xl bg-white dark:bg-[#111827]/90 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full lg:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter audit events by actor, action, department, details..."
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-red-500"
          />
        </div>

        {/* Dropdowns & Actor Type Filters */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          {/* Branch Dropdown */}
          <div className="relative flex items-center">
            <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none z-10" />
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-lg pl-8 pr-7 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-red-500 appearance-none font-medium"
            >
              <option value="ALL">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} {b.code ? `(${b.code})` : ''}
                </option>
              ))}
            </select>
            <div className="absolute right-2 pointer-events-none text-slate-400 text-[10px]">▼</div>
          </div>

          {/* Department Dropdown */}
          <div className="relative flex items-center">
            <Briefcase className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none z-10" />
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-lg pl-8 pr-7 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-red-500 appearance-none font-medium"
            >
              <option value="ALL">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} {d.code ? `(${d.code})` : ''}
                </option>
              ))}
            </select>
            <div className="absolute right-2 pointer-events-none text-slate-400 text-[10px]">▼</div>
          </div>

          {/* Type Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-lg border border-slate-200/80 dark:border-slate-800 text-xs">
            {['ALL', 'USER', 'KIOSK', 'SYSTEM'].map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                  selectedType === type
                    ? 'bg-white dark:bg-[#111827] text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Audit Log Data Table */}
      <div className="rounded-xl bg-white dark:bg-[#111827]/90 border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
          <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-[10px]">
            <tr>
              <th className="px-5 py-3 font-semibold">Timestamp</th>
              <th className="px-5 py-3 font-semibold">Actor</th>
              <th className="px-5 py-3 font-semibold">Type</th>
              <th className="px-5 py-3 font-semibold">Security Action</th>
              <th className="px-5 py-3 font-semibold">Target Entity</th>
              <th className="px-5 py-3 font-semibold">Branch & Dept</th>
              <th className="px-5 py-3 font-semibold">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/60">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-slate-500 text-xs">
                  <div className="inline-flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border-2 border-slate-400 border-t-red-500 animate-spin" />
                    Loading audit security logs from database...
                  </div>
                </td>
              </tr>
            ) : filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-slate-500 text-xs">
                  No security audit events match your search or filter options. Perform actions (e.g. edit a department, branch, or employee) to generate audit logs.
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                  <td className="px-5 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap text-[11px] font-mono">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      {new Date(log.timestamp).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-5 py-3 font-semibold text-slate-900 dark:text-white">
                    <div className="flex items-center gap-1.5">
                      {getActorIcon(log.actorType)}
                      <span>{log.actor}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-bold uppercase tracking-wide">
                      {log.actorType}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${getActionBadgeColor(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-semibold text-slate-800 dark:text-slate-200">
                    {log.entity}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-col gap-1">
                      {log.branchName ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 px-1.5 py-0.5 rounded font-medium w-fit">
                          <Building2 className="w-3 h-3 text-sky-500" />
                          {log.branchName}
                        </span>
                      ) : null}
                      {log.departmentName ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 px-1.5 py-0.5 rounded font-medium w-fit">
                          <Briefcase className="w-3 h-3 text-purple-500" />
                          {log.departmentName}
                        </span>
                      ) : null}
                      {!log.branchName && !log.departmentName ? (
                        <span className="text-slate-400 dark:text-slate-500 text-[11px]">—</span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-slate-600 dark:text-slate-300 leading-snug max-w-md">
                    {log.details}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

