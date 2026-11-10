'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Printer,
  X,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  HardDrive,
  Sliders,
  ExternalLink,
  Layers,
  Check,
} from 'lucide-react';
import { Employee, DEFAULT_CR80_TEMPLATE } from '@/lib/data/enterpriseStore';
import {
  checkLocalHardwareAgent,
  dispatchHardwarePrintJob,
  triggerBrowserCardPrint,
  renderEmployeeCardCanvases,
  LocalHardwareAgentStatus,
  PrintProgressState,
} from '@/lib/services/cardPrintService';
import { toast } from '@/components/ui/Toast';

interface AdminPrintModalProps {
  employee: Employee | null;
  isOpen: boolean;
  onClose: () => void;
  onPrintSuccess?: (employeeId: string) => void;
  verificationBaseUrl?: string;
  template?: any;
}

export default function AdminPrintModal({
  employee,
  isOpen,
  onClose,
  onPrintSuccess,
  verificationBaseUrl = '',
  template = DEFAULT_CR80_TEMPLATE,
}: AdminPrintModalProps) {
  const [hardwareStatus, setHardwareStatus] = useState<LocalHardwareAgentStatus | null>(null);
  const [isCheckingHardware, setIsCheckingHardware] = useState(false);
  const [activeTab, setActiveTab] = useState<'front' | 'back'>('front');
  const [frontPreviewUrl, setFrontPreviewUrl] = useState<string>('');
  const [backPreviewUrl, setBackPreviewUrl] = useState<string>('');
  const [isRenderingPreview, setIsRenderingPreview] = useState(false);

  const [printProgress, setPrintProgress] = useState<PrintProgressState | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  // Probe hardware whenever modal opens
  const probeHardware = async () => {
    setIsCheckingHardware(true);
    try {
      const status = await checkLocalHardwareAgent();
      setHardwareStatus(status);
    } catch {
      setHardwareStatus({
        isOnline: false,
        printerModel: 'Standalone / No Agent',
        printerStatus: 'OFFLINE',
        printerConnected: false,
        ribbonLevelPct: 0,
        ribbonType: 'YMCKO',
        agentVersion: 'None',
      });
    } finally {
      setIsCheckingHardware(false);
    }
  };

  // Generate visual card preview
  useEffect(() => {
    if (!isOpen || !employee) {
      setPrintProgress(null);
      setIsPrinting(false);
      return;
    }

    probeHardware();

    let isMounted = true;
    setIsRenderingPreview(true);

    renderEmployeeCardCanvases(employee, template, verificationBaseUrl)
      .then(({ frontDataUrl, backDataUrl }) => {
        if (isMounted) {
          setFrontPreviewUrl(frontDataUrl);
          setBackPreviewUrl(backDataUrl);
          setIsRenderingPreview(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setIsRenderingPreview(false);
          console.error('Failed to render card preview:', err);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, employee, template, verificationBaseUrl]);

  if (!isOpen || !employee) return null;

  const handleHardwarePrint = async () => {
    if (isPrinting) return;
    setIsPrinting(true);

    try {
      const result = await dispatchHardwarePrintJob({
        employee,
        template,
        verificationBaseUrl,
        preRenderedCanvases: frontPreviewUrl && backPreviewUrl ? {
          frontDataUrl: frontPreviewUrl,
          backDataUrl: backPreviewUrl,
        } : undefined,
        onProgress: (state) => setPrintProgress(state),
      });

      if (result.success) {
        toast.success(`Badge successfully printed for ${employee.fullName}!`);
        onPrintSuccess?.(employee.id);
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        toast.error(result.error || 'Hardware print job failed.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Printing error occurred.');
    } finally {
      setIsPrinting(false);
    }
  };

  const handleBrowserPrint = async () => {
    if (isPrinting) return;
    setIsPrinting(true);
    try {
      toast.info('Preparing print preview for system dialog...');
      await triggerBrowserCardPrint({
        employee,
        template,
        verificationBaseUrl,
      });
      toast.success(`Print preview launched for ${employee.fullName}.`);
      onPrintSuccess?.(employee.id);
    } catch (err: any) {
      toast.error(err.message || 'Failed to launch browser print.');
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-400 flex items-center justify-center border border-red-200 dark:border-red-900">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                Print Employee ID Badge
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {employee.employeeNumber}
                </span>
              </h3>
              <p className="text-slate-500 text-xs">
                Direct hardware card printing & driver spooling console
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isPrinting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Employee Badge Recipient Card */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 shrink-0">
                {employee.photoUrl ? (
                  <img src={employee.photoUrl} alt={employee.fullName} className="w-full h-full object-cover" />
                ) : (
                  employee.fullName.charAt(0)
                )}
              </div>
              <div>
                <div className="font-bold text-slate-900 dark:text-white text-sm">{employee.fullName}</div>
                <div className="text-slate-500 text-[11px]">
                  {employee.positionTitle || 'Staff'} • {employee.departmentName || 'Corporate'}
                </div>
              </div>
            </div>

            <div className="text-right">
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                employee.cardStatus === 'PRINTED' || (employee.cardStatus as string) === 'ISSUED'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
              }`}>
                {employee.cardStatus === 'PRINTED' || (employee.cardStatus as string) === 'ISSUED' ? 'ISSUED (PRINTED)' : 'READY TO ISSUE'}
              </span>
              <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                {employee.branchName || 'Headquarters'}
              </div>
            </div>
          </div>

          {/* Real-time Hardware Telemetry Bar */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                <HardDrive className="w-4 h-4 text-slate-500" />
                <span>Printer Hardware Connection</span>
              </div>
              <button
                type="button"
                onClick={probeHardware}
                disabled={isCheckingHardware || isPrinting}
                className="text-[11px] font-semibold text-red-600 dark:text-red-400 hover:underline flex items-center gap-1 disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isCheckingHardware ? 'animate-spin' : ''}`} />
                Check Hardware
              </button>
            </div>

            {hardwareStatus?.isOnline ? (
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-semibold text-emerald-900 dark:text-emerald-200">
                    {hardwareStatus.printerModel}
                  </span>
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-mono">
                    ({hardwareStatus.printerStatus})
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-emerald-800 dark:text-emerald-300 font-medium">
                  <span>Ribbon: <strong>{hardwareStatus.ribbonLevelPct}%</strong> ({hardwareStatus.ribbonType})</span>
                  <span>Agent v{hardwareStatus.agentVersion}</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="font-semibold">Local Hardware Agent Not Detected</span>
                </div>
                <span className="text-[11px] text-slate-500">
                  Runs on localhost:7125 • Browser Print available
                </span>
              </div>
            )}
          </div>

          {/* Real-time Print Progress State */}
          {isPrinting && printProgress && (
            <div className="p-4 rounded-xl border border-red-200 dark:border-red-900 bg-red-50/70 dark:bg-red-950/40 space-y-2.5 shadow-sm">
              <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
                <span className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  {printProgress.message}
                </span>
                <span className="font-mono text-xs text-red-600 dark:text-red-400">
                  {printProgress.percent}%
                </span>
              </div>
              <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  style={{ width: `${printProgress.percent}%` }}
                  className="h-full bg-red-600 rounded-full transition-all duration-300 ease-out"
                />
              </div>
            </div>
          )}

          {/* Visual Card Preview Tabs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                High-Resolution CR80 Preview (300 DPI)
              </div>
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveTab('front')}
                  className={`px-3 py-1 rounded-md transition ${
                    activeTab === 'front'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-bold'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  Front Side
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('back')}
                  className={`px-3 py-1 rounded-md transition ${
                    activeTab === 'back'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-bold'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  Back Side
                </button>
              </div>
            </div>

            <div className="relative aspect-[1012/638] w-full max-w-md mx-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 overflow-hidden shadow-md flex items-center justify-center">
              {isRenderingPreview ? (
                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                  Rendering 300 DPI card geometry...
                </div>
              ) : activeTab === 'front' && frontPreviewUrl ? (
                <img src={frontPreviewUrl} alt="Card Front" className="w-full h-full object-contain" />
              ) : activeTab === 'back' && backPreviewUrl ? (
                <img src={backPreviewUrl} alt="Card Back" className="w-full h-full object-contain" />
              ) : (
                <div className="text-xs text-slate-400">Card preview ready</div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isPrinting}
            className="w-full sm:w-auto px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-50"
          >
            Cancel
          </button>

          <div className="w-full sm:w-auto flex items-center gap-2">
            {/* Browser print fallback button */}
            <button
              type="button"
              onClick={handleBrowserPrint}
              disabled={isPrinting || isRenderingPreview}
              className="w-full sm:w-auto px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Browser Driver Print
            </button>

            {/* Direct Hardware Print Button */}
            <button
              type="button"
              onClick={handleHardwarePrint}
              disabled={isPrinting || isRenderingPreview || !hardwareStatus?.isOnline}
              title={
                !hardwareStatus?.isOnline
                  ? 'Hardware agent is offline. Start the KioskAgent or use Browser Driver Print.'
                  : `Send print job directly to ${hardwareStatus.printerModel}`
              }
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md shadow-red-600/30 transition flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer className="w-4 h-4" />
              {isPrinting ? 'Printing...' : 'Direct Hardware Print'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

