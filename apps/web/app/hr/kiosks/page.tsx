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
  Power,
  Trash2,
  Building2,
  Search,
  Edit3,
  Layers,
  X,
  Printer,
  Settings2,
  Sliders,
  Check,
} from 'lucide-react';
import { KioskDevice, Branch } from '@/lib/data/enterpriseStore';
import { toast } from '@/components/ui/Toast';
import { createClient } from '@/lib/supabase/client';

export default function HrKiosksPage() {
  const [kiosks, setKiosks] = useState<KioskDevice[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [newKioskCode, setNewKioskCode] = useState('KIOSK-01');
  const [newKioskName, setNewKioskName] = useState('Main Lobby Kiosk');
  const [newKioskCapacity, setNewKioskCapacity] = useState<number>(50);
  const [selectedBranchId, setSelectedBranchId] = useState('');

  const [branchFilter, setBranchFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Custom Tray Capacity Modal State
  const [editTrayKiosk, setEditTrayKiosk] = useState<KioskDevice | null>(null);
  const [customCapacityInput, setCustomCapacityInput] = useState<number | string>(50);
  const [resetTrayCount, setResetTrayCount] = useState<boolean>(true);
  const [isUpdatingTray, setIsUpdatingTray] = useState(false);

  // Printer Hardware Configuration Modal State
  const [editPrinterKiosk, setEditPrinterKiosk] = useState<KioskDevice | null>(null);
  const [configTargetPrinter, setConfigTargetPrinter] = useState<string>('');
  const [configBrandProfile, setConfigBrandProfile] = useState<string>('Magicard');
  const [configDuplexMode, setConfigDuplexMode] = useState<'Duplex' | 'SingleSided' | 'Auto'>('Duplex');
  const [configRibbonType, setConfigRibbonType] = useState<string>('YMCKO');
  const [configOffsetXmm, setConfigOffsetXmm] = useState<number>(0);
  const [configOffsetYmm, setConfigOffsetYmm] = useState<number>(0);
  const [isSavingPrinterConfig, setIsSavingPrinterConfig] = useState(false);

  const openPrinterConfigModal = (kiosk: KioskDevice) => {
    setEditPrinterKiosk(kiosk);
    setConfigTargetPrinter(kiosk.printerConfig?.targetPrinter || kiosk.printerModel || 'Magicard 600NEO');
    setConfigBrandProfile(kiosk.printerConfig?.brandProfile || 'Magicard');
    setConfigDuplexMode((kiosk.printerConfig?.duplexMode as any) || 'Duplex');
    setConfigRibbonType(kiosk.printerConfig?.ribbonType || kiosk.ribbonType || 'YMCKO');
    setConfigOffsetXmm(kiosk.printerConfig?.offsetXmm ?? 0);
    setConfigOffsetYmm(kiosk.printerConfig?.offsetYmm ?? 0);
  };

  const handleSavePrinterConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPrinterKiosk) return;

    setIsSavingPrinterConfig(true);
    try {
      const printerConfig = {
        targetPrinter: configTargetPrinter.trim(),
        brandProfile: configBrandProfile,
        duplexMode: configDuplexMode,
        ribbonType: configRibbonType,
        offsetXmm: Number(configOffsetXmm) || 0,
        offsetYmm: Number(configOffsetYmm) || 0,
      };

      const res = await fetch('/api/kiosks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editPrinterKiosk.id,
          printerConfig,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update printer configuration');

      toast.success(`Printer config saved for ${editPrinterKiosk.code}! Real-time synchronization active.`);
      setEditPrinterKiosk(null);
      loadKiosks();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save printer configuration.');
    } finally {
      setIsSavingPrinterConfig(false);
    }
  };

  const formatHeartbeatTime = (dateStr?: string) => {
    if (!dateStr) return 'never';
    let rawStr = String(dateStr).trim();
    if (!rawStr.endsWith('Z') && !rawStr.includes('+') && !rawStr.includes('-')) {
      rawStr += 'Z';
    }
    const date = new Date(rawStr);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (isNaN(diffSec)) return 'never';
    if (diffSec < 0 || diffSec < 15) return 'just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  const loadKiosks = async () => {
    try {
      const [kRes, bRes] = await Promise.all([
        fetch('/api/kiosks', { cache: 'no-store' }).then((r) => r.json()),
        fetch('/api/branches', { cache: 'no-store' }).then((r) => r.json()),
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
    
    // 10-second polling fallback
    const interval = setInterval(loadKiosks, 10000);

    // Supabase Realtime Subscription for instant heartbeat & status updates
    const supabase = createClient();
    const channel = supabase
      .channel('kiosk-fleet-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'kiosks' },
        () => {
          loadKiosks();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
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
          maxCardCapacity: newKioskCapacity || 50,
          status: 'OFFLINE',
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

  const handleUpdateTrayCapacity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTrayKiosk) return;

    const numCap = parseInt(String(customCapacityInput), 10);
    if (isNaN(numCap) || numCap < 1) {
      toast.error('Please enter a valid card tray capacity (minimum 1 card).');
      return;
    }

    setIsUpdatingTray(true);
    try {
      const res = await fetch('/api/kiosks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editTrayKiosk.id,
          maxCardCapacity: numCap,
          resetTray: resetTrayCount,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update tray capacity');

      toast.success(
        resetTrayCount
          ? `Card feed tray refilled (${numCap} cards). Batch count reset to 0 / ${numCap}.`
          : `Card feed tray capacity set to ${numCap} cards.`
      );
      setEditTrayKiosk(null);
      loadKiosks();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update tray capacity in database.');
    } finally {
      setIsUpdatingTray(false);
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

  const filteredKiosks = kiosks.filter((k) => {
    if (branchFilter !== 'ALL' && k.branchId !== branchFilter && k.branchName !== branchFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      return (
        k.code.toLowerCase().includes(q) ||
        k.name.toLowerCase().includes(q) ||
        k.branchName.toLowerCase().includes(q) ||
        k.ipAddress.toLowerCase().includes(q)
      );
    }
    return true;
  });

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
          <button
            onClick={loadKiosks}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            title="Refresh Fleet Status"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
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

      {/* Controls Bar: Search & Branch Filter */}
      <div className="p-4 rounded-xl bg-white dark:bg-[#111827]/90 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search terminal code, name, IP..."
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-red-500"
          />
        </div>

        {/* Branch Filter Dropdown */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex items-center w-full sm:w-auto">
            <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none z-10" />
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="w-full sm:w-auto bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-lg pl-8 pr-8 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-red-500 appearance-none font-medium"
            >
              <option value="ALL">All Branches ({kiosks.length} Terminals)</option>
              {branches.map((b) => {
                const count = kiosks.filter((k) => k.branchId === b.id || k.branchName === b.name).length;
                return (
                  <option key={b.id} value={b.id}>
                    {b.name} ({count})
                  </option>
                );
              })}
            </select>
            <div className="absolute right-2.5 pointer-events-none text-slate-400 text-[10px]">▼</div>
          </div>
        </div>
      </div>

      {/* KIOSKs Fleet Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-500 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-[#111827]/90 shadow-sm">
          <div className="w-5 h-5 border-2 border-slate-400 border-t-red-500 rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs">Loading KIOSK fleet from Supabase...</p>
        </div>
      ) : filteredKiosks.length === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827]/90 p-12 text-center text-slate-500 dark:text-slate-400 shadow-sm">
          <Monitor className="w-10 h-10 mx-auto mb-3 text-slate-400 dark:text-slate-600" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">No Matching KIOSK Terminals</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
            {kiosks.length === 0
              ? 'You currently have no hardware KIOSK terminals registered in Supabase.'
              : 'No terminals match your active branch filter or search query.'}
          </p>
          {kiosks.length === 0 ? (
            <button
              onClick={() => setShowRegisterModal(true)}
              className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow transition"
            >
              Register Terminal
            </button>
          ) : (
            <button
              onClick={() => {
                setBranchFilter('ALL');
                setSearchQuery('');
              }}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold shadow transition"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredKiosks.map((kiosk) => {
            const isOnline = kiosk.status === 'ONLINE';
            const isWarning = kiosk.status === 'WARNING';
            const isDisabled = kiosk.status === 'DISABLED';
            const maxCap = kiosk.maxCardCapacity ?? 50;
            const printed = kiosk.cardsPrinted ?? 0;
            const remaining = Math.max(0, maxCap - printed);

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
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 border ${
                        isOnline
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800'
                          : isWarning
                          ? 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800'
                          : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                      }`}
                    >
                      {isOnline && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                      {kiosk.status}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">{kiosk.name}</h3>

                  {/* Specs Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs mb-4">
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 relative group">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 block text-[10px] uppercase font-semibold">Printer Model</span>
                        <button
                          onClick={() => openPrinterConfigModal(kiosk)}
                          className="px-1.5 py-0.5 rounded text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 hover:bg-blue-100 transition flex items-center gap-1"
                          title="Configure Target Hardware Printer & Duplex Mode"
                        >
                          <Settings2 className="w-3 h-3" /> Config
                        </button>
                      </div>
                      <span className="font-semibold text-slate-900 dark:text-white block mt-1 truncate" title={kiosk.printerModel || 'Magicard 600NEO'}>
                        {kiosk.printerModel || 'Magicard 600NEO'}
                      </span>
                      <span
                        className={`block text-[11px] mt-1 font-medium truncate ${
                          isWarning ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                        title={kiosk.printerStatus}
                      >
                        {kiosk.printerStatus}
                      </span>
                    </div>

                    {/* Editable Card Feed Tray Box */}
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 relative group">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 block text-[10px] uppercase font-semibold">Card Feed Tray</span>
                        <button
                          onClick={() => {
                            setEditTrayKiosk(kiosk);
                            setCustomCapacityInput(maxCap);
                            setResetTrayCount(true);
                          }}
                          className="px-1.5 py-0.5 rounded text-[10px] font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 hover:bg-red-100 transition flex items-center gap-1"
                          title="Set cards inserted into tray / Refill"
                        >
                          <Edit3 className="w-3 h-3" /> Set Tray
                        </button>
                      </div>

                      <div className="flex items-center justify-between mt-1">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {printed} / {maxCap} Printed
                        </span>
                      </div>

                      <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mt-1.5 overflow-hidden">
                        <div
                          style={{ width: `${Math.min(100, (printed / maxCap) * 100)}%` }}
                          className={`h-full rounded-full ${printed >= maxCap ? 'bg-red-500' : 'bg-blue-500'}`}
                        />
                      </div>

                      <div className="flex items-center justify-between mt-1">
                        <span className="block text-[10px] text-slate-400">
                          {remaining} cards remaining
                        </span>
                        {typeof kiosk.totalCardsPrinted === 'number' && (
                          <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-mono" title="Lifetime total cards printed across all refills">
                            Total: <strong>{kiosk.totalCardsPrinted}</strong>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                      <span className="text-slate-500 block text-[10px] uppercase font-semibold">Ribbon Gauge</span>
                      <div className="flex items-center justify-between mt-1">
                        <span className="font-bold text-slate-900 dark:text-white">{kiosk.ribbonLevelPct}%</span>
                        <span className="text-[10px] text-slate-400 uppercase font-mono">{kiosk.ribbonType || 'YMCKO'}</span>
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

                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 col-span-2 sm:col-span-1">
                      <span className="text-slate-500 block text-[10px] uppercase font-semibold">Active Template</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{kiosk.activeTemplateVersion}</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Row */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-500 text-[11px] flex items-center gap-1">
                    <Wifi className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    IP: {kiosk.ipAddress} • Last heartbeat: {formatHeartbeatTime(kiosk.lastHeartbeat)}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        try {
                          const res = await fetch('/api/kiosks/pair', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'generate', kioskId: kiosk.id }),
                          });
                          const json = await res.json();
                          if (json.pairingCode) {
                            alert(
                              `KIOSK ${kiosk.code} One-Time Pairing Code:\n\n${json.pairingCode}\n\nEnter this code in KioskAgent setup installer on host.`
                            );
                          } else {
                            toast.error(json.error || 'Failed to generate code');
                          }
                        } catch (err: any) {
                          toast.error(err.message);
                        }
                      }}
                      className="px-2.5 py-1.5 rounded text-xs font-semibold bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 dark:bg-red-950/40 dark:hover:bg-red-900/60 dark:text-red-400 dark:border-red-900 transition flex items-center gap-1"
                      title="Generate 6-digit pairing code for hardware KioskAgent"
                    >
                      <HardDrive className="w-3.5 h-3.5" />
                      Pair Agent
                    </button>

                    <button
                      onClick={() => handleDeleteKiosk(kiosk)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                      title="Delete Terminal"
                    >
                      <Trash2 className="w-4 h-4 text-rose-500" />
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

      {/* Modal: Customize / Refill Card Feed Tray */}
      {editTrayKiosk && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-red-500" />
                  Customize Card Feed Tray
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Set number of cards inserted into <span className="font-semibold text-slate-700 dark:text-slate-200">{editTrayKiosk.code}</span>
                </p>
              </div>
              <button
                onClick={() => setEditTrayKiosk(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateTrayCapacity} className="space-y-4 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-1">
                <div className="text-slate-700 dark:text-slate-300 font-semibold">{editTrayKiosk.name}</div>
                <div className="text-[11px] text-slate-500">Branch: {editTrayKiosk.branchName}</div>
                <div className="text-[11px] text-slate-500">Currently Printed: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{editTrayKiosk.cardsPrinted ?? 0}</span> cards</div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1.5 font-semibold">
                  Inserted Card Quantity (Tray Capacity)
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={500}
                  value={customCapacityInput}
                  onChange={(e) => setCustomCapacityInput(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-red-500"
                />
              </div>

              {/* Quick Presets */}
              <div>
                <span className="block text-[11px] text-slate-500 mb-1.5 font-medium">Quick Presets:</span>
                <div className="grid grid-cols-4 gap-2">
                  {[20, 30, 50, 100].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setCustomCapacityInput(preset)}
                      className={`py-1.5 px-2 rounded-lg border text-xs font-semibold transition ${
                        Number(customCapacityInput) === preset
                          ? 'bg-red-600 text-white border-red-600 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {preset} Cards
                    </button>
                  ))}
                </div>
              </div>

              {/* Refill / Reset Checkbox */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={resetTrayCount}
                    onChange={(e) => setResetTrayCount(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-red-600 focus:ring-red-500 w-4 h-4"
                  />
                  <div>
                    <span className="text-xs font-semibold text-slate-900 dark:text-white block">
                      Refill Tray & Reset Batch Count to 0 / {customCapacityInput || 30}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                      Resets current tray progress to 0 printed cards while preserving historical total lifetime prints ({editTrayKiosk.totalCardsPrinted ?? editTrayKiosk.cardsPrinted ?? 0} total cards).
                    </span>
                  </div>
                </label>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditTrayKiosk(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingTray}
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold shadow flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isUpdatingTray ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save & Update Tray'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Configure Hardware & ID Card Printer */}
      {editPrinterKiosk && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Printer className="w-4 h-4 text-blue-500" />
                  Hardware & Card Printer Configuration
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Configure hardware printer binding, duplex mode, and print calibration for <strong className="text-slate-800 dark:text-slate-200">{editPrinterKiosk.code}</strong>.
                </p>
              </div>
              <button
                onClick={() => setEditPrinterKiosk(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePrinterConfig} className="space-y-4 text-xs">
              {/* Brand Preset Quick Select */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1.5 font-semibold">
                  Card Printer Manufacturer / Model Preset
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { label: 'Magicard 600NEO / 300', brand: 'Magicard', printerName: 'Magicard 600 NEO' },
                    { label: 'Zebra ZC300 / ZC100', brand: 'Zebra', printerName: 'Zebra ZC300' },
                    { label: 'Evolis Primacy / Zenius', brand: 'Evolis', printerName: 'Evolis Primacy' },
                    { label: 'HID Fargo DTC1250e', brand: 'Fargo', printerName: 'Fargo DTC1250e' },
                    { label: 'Entrust / Datacard SD', brand: 'Datacard', printerName: 'Datacard SD260' },
                    { label: 'Universal Windows Spooler', brand: 'Generic', printerName: 'Generic Card Printer' },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setConfigBrandProfile(preset.brand);
                        setConfigTargetPrinter(preset.printerName);
                      }}
                      className={`p-2 rounded-lg text-left border transition text-[11px] ${
                        configBrandProfile === preset.brand
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="font-semibold">{preset.brand}</div>
                      <div className="text-[10px] text-slate-400 truncate">{preset.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Physical Printers Auto-Detected on Host Terminal */}
              {editPrinterKiosk.installedPrinters && editPrinterKiosk.installedPrinters.length > 0 && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Live Physical Printers Detected on Host ({editPrinterKiosk.installedPrinters.length})
                    </span>
                    <span className="text-[10px] text-slate-400">Click to bind</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {editPrinterKiosk.installedPrinters.map((p) => {
                      const isSelected = configTargetPrinter.toLowerCase() === p.name.toLowerCase();
                      return (
                        <button
                          key={p.name}
                          type="button"
                          onClick={() => setConfigTargetPrinter(p.name)}
                          className={`px-2.5 py-1 rounded text-[11px] border transition flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-600 font-semibold'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${p.isOnline ? 'bg-emerald-400' : 'bg-slate-400'}`} />
                          <span className="truncate max-w-[200px]">{p.name}</span>
                          {p.isDefault && <span className="text-[9px] opacity-75">(Default)</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Target Printer Name Field */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">
                  Target Windows Printer Name (or driver substring)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={configTargetPrinter}
                    onChange={(e) => setConfigTargetPrinter(e.target.value)}
                    placeholder="e.g. Magicard 600 NEO, Zebra ZC300, Evolis Primacy"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-blue-500"
                  />
                  {configTargetPrinter && (
                    <button
                      type="button"
                      onClick={() => setConfigTargetPrinter('')}
                      className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Kiosk Agent will search Windows installed printers for an exact or partial match. If left empty, it auto-detects any card printer.
                </p>
              </div>

              {/* Duplex Strategy & Ribbon Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">Duplex Mode (Dual-Sided)</label>
                  <select
                    value={configDuplexMode}
                    onChange={(e) => setConfigDuplexMode(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="Duplex">Automatic Duplex (Dual-Sided 1-Pass)</option>
                    <option value="SingleSided">Single-Sided Only (Front Only)</option>
                    <option value="Auto">Auto (Driver Managed)</option>
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Select Single-Sided for single-sided hardware (e.g. Zebra ZC100, Evolis Zenius).
                  </p>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">Ribbon Consumable Profile</label>
                  <select
                    value={configRibbonType}
                    onChange={(e) => setConfigRibbonType(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="YMCKO">YMCKO (Full Color Front + Overlay)</option>
                    <option value="YMCKOK">YMCKOK (Color Front, Black Resin Back)</option>
                    <option value="Monochrome">Monochrome Resin Black</option>
                    <option value="KO">KO (Black + Clear Protective Overlay)</option>
                  </select>
                </div>
              </div>

              {/* Edge Bleed & Print Alignment Calibration */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-blue-500" />
                    Edge-to-Edge Print Alignment Calibration (CR80)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setConfigOffsetXmm(0);
                      setConfigOffsetYmm(0);
                    }}
                    className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Reset Offsets (0mm)
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-500 font-medium">Horizontal (X-Offset)</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-white">{configOffsetXmm.toFixed(1)} mm</span>
                    </div>
                    <input
                      type="range"
                      min="-3.0"
                      max="3.0"
                      step="0.1"
                      value={configOffsetXmm}
                      onChange={(e) => setConfigOffsetXmm(parseFloat(e.target.value))}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] text-slate-400 mt-0.5">
                      <span>-3.0 mm (Left)</span>
                      <span>+3.0 mm (Right)</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-500 font-medium">Vertical (Y-Offset)</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-white">{configOffsetYmm.toFixed(1)} mm</span>
                    </div>
                    <input
                      type="range"
                      min="-3.0"
                      max="3.0"
                      step="0.1"
                      value={configOffsetYmm}
                      onChange={(e) => setConfigOffsetYmm(parseFloat(e.target.value))}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] text-slate-400 mt-0.5">
                      <span>-3.0 mm (Top)</span>
                      <span>+3.0 mm (Bottom)</span>
                    </div>
                  </div>
                </div>

                {/* Simulated Visual CR80 Alignment Preview */}
                <div className="flex items-center justify-center p-2 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
                  <div className="relative w-40 h-24 rounded border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center overflow-hidden">
                    <div
                      style={{
                        transform: `translate(${configOffsetXmm * 3}px, ${configOffsetYmm * 3}px)`,
                      }}
                      className="w-36 h-20 rounded bg-blue-500/10 border border-blue-500 flex flex-col items-center justify-center text-[9px] font-mono text-blue-600 dark:text-blue-400 transition-transform"
                    >
                      <span>CR80 Card Boundary</span>
                      <span className="text-[8px] opacity-75">
                        ΔX: {configOffsetXmm.toFixed(1)}mm • ΔY: {configOffsetYmm.toFixed(1)}mm
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditPrinterKiosk(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingPrinterConfig}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSavingPrinterConfig ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      Synchronizing...
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Save & Sync Printer
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Register New KIOSK */}
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
                <label className="block text-slate-700 dark:text-slate-300 mb-1 font-medium">Card Feed Tray Capacity (Inserted Cards)</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={500}
                  value={newKioskCapacity}
                  onChange={(e) => setNewKioskCapacity(parseInt(e.target.value, 10) || 50)}
                  placeholder="e.g. 30, 50, 100"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white font-mono"
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
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
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
