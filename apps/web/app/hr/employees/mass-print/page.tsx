'use client';

import { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Printer,
  Users,
  CheckCircle2,
  Clock,
  RotateCcw,
  Sparkles,
  Filter,
  Download,
  RefreshCw,
  Search,
  Eye,
  ArrowLeft,
  Check,
  X,
  CreditCard,
  Building2,
  Briefcase,
  AlertTriangle,
  SlidersHorizontal,
  ChevronDown,
  Layers,
  FileCheck2,
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Employee, Branch, Department, DEFAULT_CR80_TEMPLATE } from '@/lib/data/enterpriseStore';
import { toast } from '@/components/ui/Toast';
import { renderCardToCanvas } from '@workspace/card-engine';
import Card2DViewer from '@/components/card/Card2DViewer';

function MassPrintContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialIdsParam = searchParams.get('ids') || '';

  const [mounted, setMounted] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [cardTemplates, setCardTemplates] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Selection states
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('ALL');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedCardStatus, setSelectedCardStatus] = useState('ALL');
  const [selectedEmploymentStatus, setSelectedEmploymentStatus] = useState('ALL');

  // Print Configuration states
  const [printSide, setPrintSide] = useState<'both' | 'front' | 'back'>('front');
  const [printLayout, setPrintLayout] = useState<'single' | 'sheet'>('single');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('AUTO');

  // Preview / Inspection Modal
  const [inspectEmployee, setInspectEmployee] = useState<Employee | null>(null);

  // Batch Execution states
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchProgress, setDispatchProgress] = useState<{ current: number; total: number; currentName: string; completed: boolean } | null>(null);

  // Browser Print Sheet state
  const [isPreparingPrintSheet, setIsPreparingPrintSheet] = useState(false);
  const [printSheetImages, setPrintSheetImages] = useState<Array<{ employee: Employee; frontUrl: string; backUrl?: string }>>([]);
  const [showPrintModal, setShowPrintModal] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 1. Fetch initial data
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [empRes, brRes, deptRes, tplRes, setRes] = await Promise.all([
        fetch('/api/employees', { cache: 'no-store' }),
        fetch('/api/branches', { cache: 'no-store' }),
        fetch('/api/departments', { cache: 'no-store' }),
        fetch('/api/card-templates', { cache: 'no-store' }),
        fetch('/api/settings', { cache: 'no-store' }),
      ]);

      const [empJson, brJson, deptJson, tplJson, setJson] = await Promise.all([
        empRes.ok ? empRes.json() : { data: [] },
        brRes.ok ? brRes.json() : { data: [] },
        deptRes.ok ? deptRes.json() : { data: [] },
        tplRes.ok ? tplRes.json() : { data: [] },
        setRes.ok ? setRes.json() : { data: null },
      ]);

      const loadedEmployees: Employee[] = empJson.data || [];
      setEmployees(loadedEmployees);
      setBranches(brJson.data || []);
      setDepartments(deptJson.data || []);
      setCardTemplates(tplJson.data || []);
      if (setJson.data) setSettings(setJson.data);

      // Pre-select IDs passed in query parameters
      if (initialIdsParam) {
        const queryIdList = initialIdsParam.split(',').map((id) => id.trim()).filter(Boolean);
        const validIds = queryIdList.filter((qid) => loadedEmployees.some((e) => e.id === qid));
        if (validIds.length > 0) {
          setSelectedIds(new Set(validIds));
        }
      }
    } catch (err: any) {
      toast.error('Failed to load employee batch data: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Helper: Find template for employee
  const resolveTemplateForEmployee = (emp: Employee) => {
    if (selectedTemplateId !== 'AUTO') {
      const chosen = cardTemplates.find((t) => t.id === selectedTemplateId);
      if (chosen?.layout) return chosen.layout;
    }

    if (cardTemplates.length > 0) {
      const matchingBranchTpl = cardTemplates.find(
        (t: any) =>
          (t.branchId && t.branchId === emp.branchId) ||
          (emp.branchName && (
            t.branchName?.toLowerCase() === emp.branchName?.toLowerCase() ||
            (emp.branchName.toLowerCase().includes('sorsogon') && t.branchName?.toLowerCase().includes('sorsogon'))
          ))
      );
      const defaultTpl = cardTemplates.find((t: any) => t.isDefault) || cardTemplates[0];
      return (matchingBranchTpl || defaultTpl)?.layout || DEFAULT_CR80_TEMPLATE;
    }

    return DEFAULT_CR80_TEMPLATE;
  };

  // 2. Filter employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesName = (emp.fullName || '').toLowerCase().includes(q);
        const matchesNum = (emp.employeeNumber || '').toLowerCase().includes(q);
        const matchesTitle = (emp.positionTitle || '').toLowerCase().includes(q);
        const matchesDept = (emp.departmentName || '').toLowerCase().includes(q);
        if (!matchesName && !matchesNum && !matchesTitle && !matchesDept) return false;
      }

      // Branch
      if (selectedBranch !== 'ALL' && emp.branchId !== selectedBranch) {
        return false;
      }

      // Department
      if (selectedDept !== 'ALL' && emp.departmentId !== selectedDept) {
        return false;
      }

      // Card Status
      if (selectedCardStatus !== 'ALL') {
        if (selectedCardStatus === 'ISSUED') {
          if (emp.cardStatus !== 'PRINTED' && (emp.cardStatus as string) !== 'ISSUED') return false;
        } else if (selectedCardStatus === 'PENDING') {
          if (emp.cardStatus && emp.cardStatus !== 'NOT_ISSUED' && (emp.cardStatus as string) !== 'PENDING') return false;
        } else if (selectedCardStatus === 'REPRINT_REQUESTED') {
          if (emp.cardStatus !== 'REPRINT_REQUESTED') return false;
        }
      }

      // Employment Status
      if (selectedEmploymentStatus !== 'ALL' && emp.employmentStatus !== selectedEmploymentStatus) {
        return false;
      }

      return true;
    });
  }, [employees, searchQuery, selectedBranch, selectedDept, selectedCardStatus, selectedEmploymentStatus]);

  // Selected employees list
  const selectedEmployees = useMemo(() => {
    return employees.filter((e) => selectedIds.has(e.id));
  }, [employees, selectedIds]);

  // Quick Selection Helpers
  const handleSelectFirst20 = () => {
    const target20 = filteredEmployees.slice(0, 20).map((e) => e.id);
    setSelectedIds(new Set(target20));
    toast.success(`Selected 20 employees for mass print.`);
  };

  const handleSelectFirst50 = () => {
    const target50 = filteredEmployees.slice(0, 50).map((e) => e.id);
    setSelectedIds(new Set(target50));
    toast.success(`Selected 50 employees for mass print.`);
  };

  const handleSelectAllFiltered = () => {
    const allFiltered = filteredEmployees.map((e) => e.id);
    setSelectedIds(new Set(allFiltered));
    toast.success(`Selected all ${allFiltered.length} filtered employees.`);
  };

  const handleSelectAllPending = () => {
    const allPending = filteredEmployees
      .filter((e) => !e.cardStatus || e.cardStatus === 'NOT_ISSUED' || (e.cardStatus as string) === 'PENDING' || e.cardStatus === 'REPRINT_REQUESTED')
      .map((e) => e.id);
    setSelectedIds(new Set(allPending));
    toast.success(`Selected ${allPending.length} pending / reprint-requested employees.`);
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
    toast.info('Cleared selection.');
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // 3. Batch Dispatch to Print Queue / Kiosk Fleet
  const handleBatchDispatchToQueue = async () => {
    if (selectedEmployees.length === 0) {
      toast.error('Please select at least 1 employee to print.');
      return;
    }

    setIsDispatching(true);
    setDispatchProgress({
      current: 0,
      total: selectedEmployees.length,
      currentName: selectedEmployees[0]?.fullName || 'Starting...',
      completed: false,
    });

    const payloadJobs = selectedEmployees.map((emp) => ({
      employeeId: emp.id,
      employeeNumber: emp.employeeNumber,
      employeeName: emp.fullName,
      branchId: emp.branchId,
      branchName: emp.branchName,
      departmentId: emp.departmentId,
      departmentName: emp.departmentName,
      status: 'COMPLETED',
    }));

    try {
      // Send as batch payload
      const res = await fetch('/api/print-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobs: payloadJobs }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to dispatch batch print jobs.');

      // Update progress to 100%
      setDispatchProgress({
        current: selectedEmployees.length,
        total: selectedEmployees.length,
        currentName: 'All jobs processed successfully!',
        completed: true,
      });

      // Update local state to PRINTED
      setEmployees((prev) =>
        prev.map((e) => (selectedIds.has(e.id) ? { ...e, cardStatus: 'PRINTED' } : e))
      );

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });

      toast.success(`Successfully dispatched ${selectedEmployees.length} ID card print jobs!`);
    } catch (err: any) {
      toast.error(err.message || 'Batch print dispatch failed.');
    } finally {
      setIsDispatching(false);
    }
  };

  // 4. Generate High-Res Browser Print Sheets
  const handlePrepareBrowserPrint = async () => {
    if (selectedEmployees.length === 0) {
      toast.error('Please select at least 1 employee to print.');
      return;
    }

    setIsPreparingPrintSheet(true);
    toast.info(`Rendering ${selectedEmployees.length} badges for physical printing...`);

    try {
      const renderedList: Array<{ employee: Employee; frontUrl: string; backUrl?: string }> = [];

      for (const emp of selectedEmployees) {
        const tpl = resolveTemplateForEmployee(emp);

        // Render Front
        const canvasFront = document.createElement('canvas');
        await renderCardToCanvas(canvasFront, tpl, 'front', emp, {
          scale: 3, // 300 DPI high-res crisp print
          baseUrl: settings?.verificationBaseUrl || window.location.origin,
        });
        const frontUrl = canvasFront.toDataURL('image/png');

        // Render Back if requested
        let backUrl: string | undefined = undefined;
        if (printSide === 'both' || printSide === 'back') {
          const canvasBack = document.createElement('canvas');
          await renderCardToCanvas(canvasBack, tpl, 'back', emp, {
            scale: 3,
            baseUrl: settings?.verificationBaseUrl || window.location.origin,
          });
          backUrl = canvasBack.toDataURL('image/png');
        }

        renderedList.push({ employee: emp, frontUrl, backUrl });
      }

      setPrintSheetImages(renderedList);
      setShowPrintModal(true);
      toast.success(`Badges rendered. Ready for printer.`);
    } catch (err: any) {
      toast.error('Failed to render badges: ' + err.message);
    } finally {
      setIsPreparingPrintSheet(false);
    }
  };

  const triggerSystemPrint = () => {
    window.print();
  };

  // 5. Download Badges as PNG
  const handleDownloadAllPng = async () => {
    if (selectedEmployees.length === 0) {
      toast.error('Please select employees to download badges.');
      return;
    }

    toast.info(`Preparing image downloads for ${selectedEmployees.length} employees...`);
    try {
      for (const emp of selectedEmployees) {
        const tpl = resolveTemplateForEmployee(emp);

        // Download front
        const canvasFront = document.createElement('canvas');
        await renderCardToCanvas(canvasFront, tpl, 'front', emp, { scale: 3 });
        const linkF = document.createElement('a');
        linkF.download = `${emp.employeeNumber || emp.id}_ID_Front.png`;
        linkF.href = canvasFront.toDataURL('image/png');
        linkF.click();

        if (printSide === 'both') {
          const canvasBack = document.createElement('canvas');
          await renderCardToCanvas(canvasBack, tpl, 'back', emp, { scale: 3 });
          const linkB = document.createElement('a');
          linkB.download = `${emp.employeeNumber || emp.id}_ID_Back.png`;
          linkB.href = canvasBack.toDataURL('image/png');
          linkB.click();
        }
      }
      toast.success(`Downloaded badges for ${selectedEmployees.length} employees.`);
    } catch (err: any) {
      toast.error('Download error: ' + err.message);
    }
  };

  if (!mounted) return null;

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Printable Area (Only visible during @media print) */}
      <div id="print-area" className="hidden print:block print:p-0">
        <style jsx global>{`
          @media print {
            body * {
              visibility: hidden;
            }
            #print-area, #print-area * {
              visibility: visible;
            }
            #print-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              background: white;
            }
            @page {
              size: auto;
              margin: 10mm;
            }
          }
        `}</style>
        <div className={printLayout === 'single' ? 'space-y-8' : 'grid grid-cols-2 gap-6'}>
          {printSheetImages.map((item, idx) => (
            <div
              key={item.employee.id + idx}
              className={`flex flex-col items-center justify-center p-4 break-inside-avoid ${
                printLayout === 'single' ? 'page-break-after-always' : ''
              }`}
            >
              <div className="text-[10px] text-gray-500 font-mono mb-1 text-center">
                {item.employee.fullName} • {item.employee.employeeNumber} • {item.employee.departmentName}
              </div>
              <div className="flex gap-4 items-center justify-center">
                {(printSide === 'front' || printSide === 'both') && (
                  <img
                    src={item.frontUrl}
                    alt="Badge Front"
                    className="w-[85.6mm] h-[54mm] object-contain rounded-[3mm] border border-gray-300 shadow-sm"
                  />
                )}
                {(printSide === 'back' || printSide === 'both') && item.backUrl && (
                  <img
                    src={item.backUrl}
                    alt="Badge Back"
                    className="w-[85.6mm] h-[54mm] object-contain rounded-[3mm] border border-gray-300 shadow-sm"
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Screen Header & Navigation */}
      <div className="flex flex-col gap-4">
        {/* Breadcrumb & Navigation */}
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Link href="/hr/employees" className="hover:text-red-600 dark:hover:text-red-400 flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Employees</span>
          </Link>
          <span>/</span>
          <span className="text-slate-800 dark:text-slate-200 font-semibold">Mass Print ID (Group Badge Dispatch)</span>
        </div>

        {/* Hero Title & Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Mass Print ID Badges
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-950/80 dark:text-red-400 border border-red-300 dark:border-red-800">
                Group Badge System
              </span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
              Select 20+ employees or group by department and branch to print badges in bulk, export printable sheets, or dispatch to KIOSK queues.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/hr/employees"
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition flex items-center gap-1.5"
            >
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span>Directory View</span>
            </Link>

            <button
              onClick={handlePrepareBrowserPrint}
              disabled={selectedIds.size === 0 || isPreparingPrintSheet}
              className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-semibold shadow-sm transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-700"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>Print Badge Sheet ({selectedIds.size})</span>
            </button>

            <button
              onClick={handleBatchDispatchToQueue}
              disabled={selectedIds.size === 0 || isDispatching}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-md shadow-red-600/30 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-4 h-4" />
              <span>Dispatch to KIOSKs ({selectedIds.size})</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#111827]/90 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Total Staff</span>
            <span className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5 block">{employees.length}</span>
            <span className="text-[10px] text-slate-400">in corporate directory</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#111827]/90 border border-red-200/60 dark:border-red-900/40 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-red-600 dark:text-red-400 block">Selected for Print</span>
            <span className="text-2xl font-bold text-red-600 dark:text-red-400 mt-0.5 block">{selectedIds.size}</span>
            <span className="text-[10px] text-red-500/80">ready to dispatch</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/80 border border-red-200/80 dark:border-red-900/60 flex items-center justify-center text-red-600 dark:text-red-400">
            <FileCheck2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#111827]/90 border border-amber-200/60 dark:border-amber-900/40 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">Pending Print</span>
            <span className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-0.5 block">
              {employees.filter((e) => !e.cardStatus || e.cardStatus === 'NOT_ISSUED' || (e.cardStatus as string) === 'PENDING').length}
            </span>
            <span className="text-[10px] text-amber-500/80">not yet issued</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/80 border border-amber-200/80 dark:border-amber-900/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#111827]/90 border border-emerald-200/60 dark:border-emerald-900/40 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">Already Issued</span>
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block">
              {employees.filter((e) => e.cardStatus === 'PRINTED' || (e.cardStatus as string) === 'ISSUED').length}
            </span>
            <span className="text-[10px] text-emerald-500/80">badges active</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200/80 dark:border-emerald-900/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="space-y-4">
        {/* Filter and Selection Header */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#111827]/90 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Quick Selection Buttons (Specifically requested: 20 employees selection) */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mr-1">
                <SlidersHorizontal className="w-3.5 h-3.5" /> Quick Select:
              </span>

              <button
                type="button"
                onClick={handleSelectFirst20}
                className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-950/50 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 font-bold text-xs border border-red-200 dark:border-red-900/60 transition flex items-center gap-1.5 shadow-2xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-red-500" />
                <span>Select 20 Employees</span>
              </button>

              <button
                type="button"
                onClick={handleSelectFirst50}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition"
              >
                Select 50
              </button>

              <button
                type="button"
                onClick={handleSelectAllPending}
                className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300 font-semibold text-xs border border-amber-200 dark:border-amber-900/60 transition"
              >
                Select All Pending
              </button>

              <button
                type="button"
                onClick={handleSelectAllFiltered}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition"
              >
                Select All Filtered ({filteredEmployees.length})
              </button>

              {selectedIds.size > 0 && (
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="px-3 py-1.5 rounded-lg text-slate-500 hover:text-red-600 dark:hover:text-red-400 font-medium text-xs transition flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Clear ({selectedIds.size})</span>
                </button>
              )}
            </div>

            {/* Print Configuration Controls */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Card Side Toggle */}
              <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-0.5 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setPrintSide('front')}
                  className={`px-2.5 py-1 rounded-md transition ${
                    printSide === 'front'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Front Only
                </button>
                <button
                  type="button"
                  onClick={() => setPrintSide('both')}
                  className={`px-2.5 py-1 rounded-md transition ${
                    printSide === 'both'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Front & Back
                </button>
              </div>

              {/* Template Override */}
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-red-500 font-medium"
              >
                <option value="AUTO">Template: Auto (Per Branch)</option>
                {cardTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Group Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search employee or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-red-500"
              />
            </div>

            {/* Department Filter */}
            <div>
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-300 focus:outline-none focus:border-red-500 font-medium"
              >
                <option value="ALL">🏢 All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            {/* Branch Filter */}
            <div>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-300 focus:outline-none focus:border-red-500 font-medium"
              >
                <option value="ALL">📍 All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            {/* Card Status Filter */}
            <div>
              <select
                value={selectedCardStatus}
                onChange={(e) => setSelectedCardStatus(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-300 focus:outline-none focus:border-red-500 font-medium"
              >
                <option value="ALL">💳 All Card Statuses</option>
                <option value="PENDING">PENDING (Not Issued)</option>
                <option value="REPRINT_REQUESTED">REPRINT REQ</option>
                <option value="ISSUED">ISSUED (Printed)</option>
              </select>
            </div>

            {/* Employment Status Filter */}
            <div>
              <select
                value={selectedEmploymentStatus}
                onChange={(e) => setSelectedEmploymentStatus(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-300 focus:outline-none focus:border-red-500 font-medium"
              >
                <option value="ALL">👤 All Employment Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </div>
          </div>
        </div>

        {/* Employees Batch Selection Table */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#111827]/90 overflow-hidden shadow-sm">
          <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-slate-900 dark:text-white">
                Filtered Staff ({filteredEmployees.length})
              </span>
              <span className="text-slate-400 text-xs">•</span>
              <span className="text-xs text-red-600 dark:text-red-400 font-bold">
                {selectedIds.size} Selected
              </span>
            </div>

            <div className="text-xs text-slate-500">
              Showing {filteredEmployees.length} of {employees.length} records
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-[10px] text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-5 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={filteredEmployees.length > 0 && filteredEmployees.every((e) => selectedIds.has(e.id))}
                      onChange={(e) => {
                        if (e.target.checked) {
                          handleSelectAllFiltered();
                        } else {
                          handleClearSelection();
                        }
                      }}
                      className="rounded border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-red-600 focus:ring-0 cursor-pointer"
                    />
                  </th>
                  <th className="px-5 py-3">Photo</th>
                  <th className="px-5 py-3">Employee</th>
                  <th className="px-5 py-3">Employee ID</th>
                  <th className="px-5 py-3">Department</th>
                  <th className="px-5 py-3">Branch</th>
                  <th className="px-5 py-3">Job Title</th>
                  <th className="px-5 py-3">Card Status</th>
                  <th className="px-5 py-3 text-right">Preview</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/60">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-slate-500">
                      <div className="inline-flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full border-2 border-slate-400 border-t-red-500 animate-spin" />
                        Loading corporate directory...
                      </div>
                    </td>
                  </tr>
                ) : filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-slate-500">
                      <Users className="w-8 h-8 mx-auto mb-2 text-slate-400 dark:text-slate-600" />
                      <div>No employee records matching current filters.</div>
                      <div className="text-[11px] text-slate-400 mt-1">Try resetting your department or status filters.</div>
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp) => {
                    const isSelected = selectedIds.has(emp.id);
                    const isIssued = emp.cardStatus === 'PRINTED' || (emp.cardStatus as string) === 'ISSUED';
                    const isReprint = emp.cardStatus === 'REPRINT_REQUESTED';

                    return (
                      <tr
                        key={emp.id}
                        onClick={() => toggleSelectOne(emp.id)}
                        className={`transition cursor-pointer ${
                          isSelected
                            ? 'bg-red-50/70 dark:bg-red-950/30 hover:bg-red-100/60 dark:hover:bg-red-950/40'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
                        }`}
                      >
                        <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectOne(emp.id)}
                            className="rounded border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-red-600 focus:ring-0 cursor-pointer"
                          />
                        </td>
                        <td className="px-5 py-3">
                          {emp.photoUrl ? (
                            <img
                              src={emp.photoUrl}
                              alt={emp.fullName}
                              className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-950/60 border border-red-200 dark:border-red-800/60 flex items-center justify-center text-xs font-bold text-red-600 dark:text-red-400">
                              {emp.firstName?.[0] || 'E'}{emp.lastName?.[0] || 'M'}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <div className="font-semibold text-slate-900 dark:text-white">{emp.fullName}</div>
                          <div className="text-[11px] text-slate-400">{emp.email || 'No corporate email'}</div>
                        </td>
                        <td className="px-5 py-3 font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          {emp.employeeNumber}
                        </td>
                        <td className="px-5 py-3">
                          <span className="inline-flex items-center gap-1 font-medium text-slate-800 dark:text-slate-200">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            {emp.departmentName || 'General'}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-slate-600 dark:text-slate-400">
                          {emp.branchName || 'Global HQ'}
                        </td>
                        <td className="px-5 py-3 text-slate-600 dark:text-slate-400">
                          {emp.positionTitle || 'Staff'}
                        </td>
                        <td className="px-5 py-3">
                          {isIssued ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                              <CheckCircle2 className="w-3 h-3" />
                              ISSUED
                            </span>
                          ) : isReprint ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                              <RotateCcw className="w-3 h-3" />
                              REPRINT REQ
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
                              <Clock className="w-3 h-3 text-slate-400" />
                              PENDING
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => setInspectEmployee(emp)}
                            title="Preview Badge"
                            className="p-1.5 text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Floating Action Dock for Selected Employees */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#0e1424]/95 text-white backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl px-6 py-3.5 flex flex-wrap items-center gap-4 transition-all">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-600 flex items-center justify-center font-bold text-sm shadow-md shadow-red-600/30">
              {selectedIds.size}
            </div>
            <div>
              <div className="text-xs font-bold leading-tight">
                {selectedIds.size} Employee{selectedIds.size === 1 ? '' : 's'} Selected
              </div>
              <div className="text-[10px] text-slate-400">
                Ready for mass ID card badge printing
              </div>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-700/80 mx-1 hidden sm:block" />

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrepareBrowserPrint}
              disabled={isPreparingPrintSheet}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold border border-slate-600 flex items-center gap-1.5 transition"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-400" />
              <span>Print Badge Sheet</span>
            </button>

            <button
              onClick={handleDownloadAllPng}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-600 flex items-center gap-1.5 transition"
              title="Download all badges as PNG images"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Images</span>
            </button>

            <button
              onClick={handleBatchDispatchToQueue}
              disabled={isDispatching}
              className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md shadow-red-600/30 flex items-center gap-1.5 transition"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Dispatch Batch</span>
            </button>

            <button
              onClick={handleClearSelection}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
              title="Clear selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Progress / Dispatching Modal */}
      {dispatchProgress && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0f172a] border border-slate-800 rounded-2xl p-6 text-white shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  dispatchProgress.completed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-500 animate-pulse'
                }`}>
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight">
                    {dispatchProgress.completed ? 'Batch Dispatched!' : 'Printing Badges in Batch...'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {dispatchProgress.current} of {dispatchProgress.total} cards processed
                  </p>
                </div>
              </div>

              {dispatchProgress.completed && (
                <button
                  onClick={() => setDispatchProgress(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-red-600 to-emerald-500 transition-all duration-300 rounded-full"
                  style={{ width: `${(dispatchProgress.current / dispatchProgress.total) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>{dispatchProgress.currentName}</span>
                <span>{Math.round((dispatchProgress.current / dispatchProgress.total) * 100)}%</span>
              </div>
            </div>

            {dispatchProgress.completed && (
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <Link
                  href="/hr/print-history"
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition"
                >
                  View Print History
                </Link>
                <button
                  onClick={() => setDispatchProgress(null)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition shadow-md"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Browser Print Sheet Modal Preview */}
      {showPrintModal && (
        <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-5xl bg-[#0f172a] border border-slate-800 rounded-2xl flex flex-col max-h-[90vh] text-white overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0b1120]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-600/20 text-red-500 flex items-center justify-center">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight">Print Badge Sheet ({printSheetImages.length} Cards)</h3>
                  <p className="text-xs text-slate-400">Formatted for Standard CR80 ID Cards (85.6mm × 54mm)</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={triggerSystemPrint}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-md transition"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Badges Now (Ctrl + P)</span>
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Print Sheet Options & Grid */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-slate-950">
              <div className="flex items-center justify-between p-3.5 bg-slate-900/80 rounded-xl border border-slate-800 text-xs">
                <span className="text-slate-400">
                  Tip: In your browser print dialog, choose &quot;None&quot; for margins and enable &quot;Background graphics&quot; for best color accuracy.
                </span>
                <span className="font-mono text-emerald-400 font-bold">300 DPI High Resolution</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {printSheetImages.map((card, idx) => (
                  <div
                    key={card.employee.id + idx}
                    className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center space-y-3"
                  >
                    <div className="text-xs font-semibold text-slate-300 text-center">
                      {card.employee.fullName}
                      <span className="block text-[10px] text-slate-500 font-mono">{card.employee.employeeNumber}</span>
                    </div>

                    <img
                      src={card.frontUrl}
                      alt="Front Badge"
                      className="w-full max-w-[280px] h-auto object-contain rounded-xl border border-slate-700 shadow-md"
                    />

                    {card.backUrl && (
                      <img
                        src={card.backUrl}
                        alt="Back Badge"
                        className="w-full max-w-[280px] h-auto object-contain rounded-xl border border-slate-700 shadow-md"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inspect Single Employee Badge Modal */}
      {inspectEmployee && (
        <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#0f172a] border border-slate-800 rounded-2xl p-6 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg leading-tight">{inspectEmployee.fullName}</h3>
                <p className="text-xs text-slate-400">{inspectEmployee.employeeNumber} • {inspectEmployee.departmentName}</p>
              </div>
              <button
                onClick={() => setInspectEmployee(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 flex flex-col items-center justify-center">
              <Card2DViewer
                template={resolveTemplateForEmployee(inspectEmployee)}
                side="front"
                employeeData={inspectEmployee}
                baseUrl={settings?.verificationBaseUrl || ''}
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  toggleSelectOne(inspectEmployee.id);
                  setInspectEmployee(null);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
                  selectedIds.has(inspectEmployee.id)
                    ? 'bg-red-950 text-red-400 border border-red-800'
                    : 'bg-red-600 hover:bg-red-500 text-white'
                }`}
              >
                {selectedIds.has(inspectEmployee.id) ? 'Deselect Employee' : 'Select for Batch Print'}
              </button>

              <button
                onClick={() => setInspectEmployee(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MassPrintPage() {
  return (
    <Suspense fallback={
      <div className="p-8 text-center text-slate-500 text-sm">
        <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        Loading Mass Print ID suite...
      </div>
    }>
      <MassPrintContent />
    </Suspense>
  );
}
