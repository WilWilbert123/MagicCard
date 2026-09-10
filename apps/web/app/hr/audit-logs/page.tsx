'use client';

import { useState } from 'react';
import { ShieldCheck, FileText, Search, User, Monitor, Cpu } from 'lucide-react';
import { enterpriseStore } from '@/lib/data/enterpriseStore';

export default function HrAuditLogsPage() {
  const [logs] = useState(enterpriseStore.auditLogs);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLogs = logs.filter((l) =>
    l.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.actor.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.details.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">System Security & Audit Logs</h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs">
            Immutable security event logs tracking administrator actions, KIOSK heartbeats, template publications, and printing authorizations.
          </p>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-white dark:bg-[#111827]/90 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter audit events by keyword..."
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-red-500"
          />
        </div>
      </div>

      <div className="rounded-xl bg-white dark:bg-[#111827]/90 border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
          <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-[10px]">
            <tr>
              <th className="px-5 py-3 font-semibold">Timestamp</th>
              <th className="px-5 py-3 font-semibold">Actor</th>
              <th className="px-5 py-3 font-semibold">Type</th>
              <th className="px-5 py-3 font-semibold">Security Action</th>
              <th className="px-5 py-3 font-semibold">Target Entity</th>
              <th className="px-5 py-3 font-semibold">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/60">
            {filteredLogs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                <td className="px-5 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  {new Date(log.timestamp).toLocaleString()}
                </td>
                <td className="px-5 py-3 font-medium text-slate-900 dark:text-white">{log.actor}</td>
                <td className="px-5 py-3">
                  <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-medium">
                    {log.actorType}
                  </span>
                </td>
                <td className="px-5 py-3 font-mono font-bold text-red-600 dark:text-red-400">{log.action}</td>
                <td className="px-5 py-3 text-slate-600 dark:text-slate-400">{log.entity}</td>
                <td className="px-5 py-3 text-slate-700 dark:text-slate-300">{log.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
