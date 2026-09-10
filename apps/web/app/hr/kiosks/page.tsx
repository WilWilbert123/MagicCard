'use client';

import { useState, useEffect } from 'react';
import { 
  Monitor, 
  Plus, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  RefreshCw, 
  HardDrive, 
  Wifi, 
  ShieldAlert,
  Power
} from 'lucide-react';
import { KioskDevice, Branch } from '@/lib/data/enterpriseStore';
import { toast } from '@/components/ui/Toast';

export default function HrKiosksPage() {
  const [kiosks, setKiosks] = useState<KioskDevice[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [newKioskCode, setNewKioskCode] = useState('KIOSK-01');
  const [newKioskName, setNewKioskName] = useState('Main Lobby Kiosk');
  const [selectedBranchId, setSelectedBranchId] = useState('');

  const loadKiosks = async () => {
    try {
      const [kRes, bRes] = await Promise.all([
        fetch('/api/kiosks').then((r) => r.json()),
        fetch('/api/branches').then((r) => r.json()),
      ]);

      setKiosks(kRes.data ?? []);
      const loadedBranches = bRes.data ?? [];
      setBranches(loadedBranches);
      if (loadedBranches.length > 0 && !selectedBranchId) {
        setSelectedBranchId(loadedBranches[0].id);
      }
    } catch {
      toast.error('Failed to load kiosks from database.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadKiosks();
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/kiosks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newKioskCode,
          name: newKioskName,
          branchId: selectedBranchId || branches[0]?.id,
          status: 'ONLINE',
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to register kiosk');

      toast.success('KIOSK registered successfully in Supabase.');
      setShowRegisterModal(false);
      loadKiosks();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const toggleKioskStatus = async (kiosk: KioskDevice) => {
    const nextStatus = kiosk.status === 'DISABLED' ? 'ONLINE' : 'DISABLED';
    setUpdatingId(kiosk.id);
    try {
      const res = await fetch('/api/kiosks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: kiosk.id,
          status: nextStatus,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update kiosk status');

      // Optimistically update & reload
      setKiosks((prev) =>
        prev.map((k) => (k.id === kiosk.id ? { ...k, status: nextStatus as KioskDevice['status'] } : k))
      );
      toast.success(`KIOSK ${kiosk.code} is now ${nextStatus}. Saved to Supabase.`);
      loadKiosks();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update kiosk status in database.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteKiosk = async (kiosk: KioskDevice) => {
    if (!confirm(`Are you sure you want to delete terminal ${kiosk.code} (${kiosk.name})?`)) return;
    try {
      const res = await fetch(`/api/kiosks?id=${kiosk.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to delete kiosk');

      toast.success(`Terminal ${kiosk.code} deleted.`);
      loadKiosks();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">KIOSK Fleet Management</h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs">
            Monitor real-time heartbeats, printer status, and template synchronization across all physical terminals.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/kiosk"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
          >
            <Monitor className="w-4 h-4 text-red-500" /> Launch KIOSK Terminal
          </a>
          <button
            onClick={() => setShowRegisterModal(true)}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-md shadow-red-600/20 transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Register New KIOSK
          </button>
        </div>
      </div>

      {/* KIOSKs Fleet Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-500 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-[#111827]/90 shadow-sm">
          <div className="w-5 h-5 border-2 border-slate-400 border-t-red-500 rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs">Loading KIOSK fleet from Supabase...</p>
        </div>
      ) : kiosks.length === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827]/90 p-12 text-center text-slate-500 dark:text-slate-400 shadow-sm">
          <Monitor className="w-10 h-10 mx-auto mb-3 text-slate-400 dark:text-slate-600" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">No KIOSK Terminals Configured</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
            You currently have no hardware KIOSK terminals registered in Supabase. Register your first physical terminal to begin monitoring.
          </p>
          <button
            onClick={() => setShowRegisterModal(true)}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow transition"
          >
            Register Terminal
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {kiosks.map((kiosk) => {
          const isOnline = kiosk.status === 'ONLINE';
          const isWarning = kiosk.status === 'WARNING';
          const isDisabled = kiosk.status === 'DISABLED';

          return (
            <div
              key={kiosk.id}
              className="rounded-xl bg-white dark:bg-[#111827]/90 border border-slate-200/80 dark:border-slate-800 p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow"
            >
              <div>
                {/* Header Row */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-800 dark:text-white bg-slate-100 dark:bg-slate-900 px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700">
                      {kiosk.code}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{kiosk.branchName}</span>
                  </div>

                  {/* Status Badge */}
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 border ${
                    isOnline
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800'
                      : isWarning
                      ? 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800'
                      : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                  }`}>
                    {isOnline && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                    {kiosk.status}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">{kiosk.name}</h3>

                {/* Specs Grid */}
                <div className="grid grid-cols-2 gap-3 text-xs mb-4">
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                    <span className="text-slate-500 block text-[10px] uppercase font-semibold">Printer Model</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{kiosk.printerModel}</span>
                    <span className={`block text-[11px] mt-1 font-medium ${isWarning ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {kiosk.printerStatus}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                    <span className="text-slate-500 block text-[10px] uppercase font-semibold">Ribbon Gauge</span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-bold text-slate-900 dark:text-white">{kiosk.ribbonLevelPct}%</span>
                      <span className="text-[10px] text-slate-400">YMCKO</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mt-1.5 overflow-hidden">
                      <div
                        style={{ width: `${kiosk.ribbonLevelPct}%` }}
                        className={`h-full rounded-full ${
                          kiosk.ribbonLevelPct > 30 ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                    <span className="text-slate-500 block text-[10px] uppercase font-semibold">Agent Version</span>
                    <span className="font-mono text-slate-900 dark:text-white">{kiosk.agentVersion} (Daemon: 7125)</span>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                    <span className="text-slate-500 block text-[10px] uppercase font-semibold">Active Template</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{kiosk.activeTemplateVersion}</span>
                  </div>
                </div>
              </div>

              {/* Bottom Row */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-500 text-[11px] flex items-center gap-1">
                  <Wifi className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  IP: {kiosk.ipAddress} • Last heartbeat: just now
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDeleteKiosk(kiosk)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded transition"
                    title="Delete Terminal"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => toggleKioskStatus(kiosk)}
                    disabled={updatingId === kiosk.id}
                    className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition ${
                      updatingId === kiosk.id
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 cursor-not-allowed'
                        : isDisabled
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-900'
                        : 'bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-700 border border-slate-200 dark:bg-slate-800 dark:hover:bg-rose-950 dark:text-slate-300 dark:hover:text-rose-400 dark:border-slate-700'
                    }`}
                  >
                    {updatingId === kiosk.id ? (
                      <>
                        <div className="w-3 h-3 border border-slate-400 border-t-slate-700 rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Power className="w-3.5 h-3.5" />
                        {isDisabled ? 'Activate' : 'Disable'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        </div>
      )}

      {/* Register Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">Register New KIOSK Terminal</h2>
            <form onSubmit={handleRegister} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1 font-medium">KIOSK Identification Code</label>
                <input
                  type="text"
                  required
                  value={newKioskCode}
                  onChange={(e) => setNewKioskCode(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1 font-medium">Friendly Terminal Name</label>
                <input
                  type="text"
                  required
                  value={newKioskName}
                  onChange={(e) => setNewKioskName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1 font-medium">Assigned Branch</label>
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold shadow"
                >
                  Confirm Registration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
