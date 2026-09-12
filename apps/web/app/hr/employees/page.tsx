'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { 
  Users, 
  Search, 
  Upload, 
  Download, 
  Plus, 
  Edit, 
  CreditCard, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  RotateCcw,
  RefreshCw,
  Printer,
  Sparkles,
  X,
  FileSpreadsheet,
  User,
  HelpCircle,
  FileDown,
  Check,
  Eye,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { Employee, Branch, Department, DEFAULT_CR80_TEMPLATE } from '@/lib/data/enterpriseStore';
import { toast } from '@/components/ui/Toast';
import Card2DViewer from '@/components/card/Card2DViewer';

const ThreeCardViewer = dynamic(() => import('@/components/three/ThreeCardViewer'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[400px] rounded-2xl bg-slate-900 flex items-center justify-center text-slate-400 text-sm font-semibold">
      Rendering 3D Card Geometry...
    </div>
  ),
});

export default function HrEmployeesPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('ALL');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedCardStatus, setSelectedCardStatus] = useState('ALL');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importResult, setImportResult] = useState<{ total: number; valid: number; imported: number } | null>(null);
  const [parsedPreview, setParsedPreview] = useState<any[]>([]);
  const [parseError, setParseError] = useState('');
  const [showFormatGuide, setShowFormatGuide] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 3D Card Preview Modal state
  const [cardTemplates, setCardTemplates] = useState<any[]>([]);
  const [show3dPreviewModal, setShow3dPreviewModal] = useState(false);
  const [previewEmployee, setPreviewEmployee] = useState<Employee | null>(null);
  const [previewMode, setPreviewMode] = useState<'3D' | '2D'>('3D');
  const [previewCardSide, setPreviewCardSide] = useState<'front' | 'back'>('front');
  const [previewTemplate, setPreviewTemplate] = useState<any>(DEFAULT_CR80_TEMPLATE);

  const getAssignedTemplateId = (emp: Employee) => {
    if (cardTemplates && cardTemplates.length > 0) {
      const matchingBranchTpl = cardTemplates.find(
        (t: any) =>
          (t.branchId && t.branchId === emp.branchId) ||
          (emp.branchName && (
            t.branchName?.toLowerCase() === emp.branchName?.toLowerCase() ||
            (emp.branchName.toLowerCase().includes('sorsogon') && t.branchName?.toLowerCase().includes('sorsogon'))
          )) ||
          ((emp as any).branchCode && t.branchCode === (emp as any).branchCode)
      );
      const defaultTpl = cardTemplates.find((t: any) => t.isDefault) || cardTemplates[0];
      const activeTpl = matchingBranchTpl || defaultTpl;
      return activeTpl?.id || 'template-acme-cr80';
    }
    return 'template-acme-cr80';
  };

  const handleOpenPreview3dModal = async (emp: Employee) => {
    // Reset modal states to new employee immediately
    setPreviewEmployee(emp);
    setPreviewMode('3D');
    setPreviewCardSide('front');

    // Synchronously resolve template from pre-loaded cardTemplates cache if available
    let targetTpl: any = null;
    if (cardTemplates.length > 0) {
      const matchingBranchTpl = cardTemplates.find(
        (t: any) =>
          (t.branchId && (t.branchId === emp.branchId ||
          (emp.branchName && t.branchName?.toLowerCase() === emp.branchName?.toLowerCase()) ||
          ((emp as any).branchCode && t.branchCode === (emp as any).branchCode)))
      );
      targetTpl = matchingBranchTpl || cardTemplates.find((t: any) => t.isDefault) || cardTemplates[0];
    }

    if (targetTpl?.layout) {
      setPreviewTemplate(targetTpl.layout);
    } else {
      setPreviewTemplate(DEFAULT_CR80_TEMPLATE);
    }

    setShow3dPreviewModal(true);

    // Asynchronously fetch layout details if needed without blocking or leaking previous template
    try {
      const tplRes = await fetch('/api/card-templates');
      const tplJson = tplRes.ok ? await tplRes.json() : null;
      if (tplJson?.data && Array.isArray(tplJson.data)) {
        const templates = tplJson.data;
        setCardTemplates(templates);
        const matchingBranchTpl = templates.find(
          (t: any) =>
            (t.branchId && (t.branchId === emp.branchId ||
            (emp.branchName && t.branchName?.toLowerCase() === emp.branchName?.toLowerCase()) ||
            ((emp as any).branchCode && t.branchCode === (emp as any).branchCode)))
        );
        const defaultTpl = templates.find((t: any) => t.isDefault) || templates[0];
        const activeTpl = matchingBranchTpl || defaultTpl;

        if (activeTpl) {
          const detailRes = await fetch(`/api/card-templates/${activeTpl.id}`);
          const detailJson = detailRes.ok ? await detailRes.json() : null;
          if (detailJson?.data?.layout) {
            setPreviewTemplate(detailJson.data.layout);
          } else if (activeTpl.layout) {
            setPreviewTemplate(activeTpl.layout);
          }
        }
      }
    } catch {}
  };

  // New Employee Form
  const [formData, setFormData] = useState({
    employeeNumber: `EMP-${Math.floor(100000 + Math.random() * 900000)}`,
    firstName: '',
    lastName: '',
    email: '',
    contactNumber: '',
    branchId: '',
    departmentId: '',
    positionTitle: 'Software Engineer',
    photoUrl: '',
  });

  // Edit Employee Form state
  const [editFormData, setEditFormData] = useState({
    id: '',
    employeeNumber: '',
    firstName: '',
    middleName: '',
    lastName: '',
    suffix: '',
    email: '',
    contactNumber: '',
    branchId: '',
    departmentId: '',
    positionTitle: '',
    photoUrl: '',
    employmentStatus: 'ACTIVE' as 'ACTIVE' | 'INACTIVE' | 'SUSPENDED',
    cardStatus: 'NOT_ISSUED' as 'NOT_ISSUED' | 'PRINTED' | 'ISSUED' | 'REPRINT_REQUESTED',
  });

  const handleOpenEditModal = (emp: Employee) => {
    setEditFormData({
      id: emp.id,
      employeeNumber: emp.employeeNumber || '',
      firstName: emp.firstName || '',
      middleName: emp.middleName || '',
      lastName: emp.lastName || '',
      suffix: emp.suffix || '',
      email: emp.email || '',
      contactNumber: emp.contactNumber || '',
      branchId: emp.branchId || branches[0]?.id || '',
      departmentId: emp.departmentId || departments[0]?.id || '',
      positionTitle: emp.positionTitle || '',
      photoUrl: emp.photoUrl || '',
      employmentStatus: emp.employmentStatus || 'ACTIVE',
      cardStatus: emp.cardStatus || 'NOT_ISSUED',
    });
    setShowEditModal(true);
  };

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/employees', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update employee');

      toast.success('Employee updated successfully.');
      setShowEditModal(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [empRes, brRes, deptRes, tplRes] = await Promise.all([
        fetch('/api/employees', { cache: 'no-store' }).then(async (r) => {
          if (!r.ok) throw new Error('Employees API request failed.');
          return r.json();
        }),
        fetch('/api/branches', { cache: 'no-store' }).then(async (r) => {
          if (!r.ok) throw new Error('Branches API request failed.');
          return r.json();
        }),
        fetch('/api/departments', { cache: 'no-store' }).then(async (r) => {
          if (!r.ok) throw new Error('Departments API request failed.');
          return r.json();
        }),
        fetch('/api/card-templates', { cache: 'no-store' }).then(async (r) => {
          if (!r.ok) return null;
          return r.json();
        }),
      ]);

      const loadedEmployees = empRes.data ?? [];
      const loadedBranches = brRes.data ?? [];
      const loadedDepartments = deptRes.data ?? [];
      const loadedTemplates = tplRes?.data ?? [];

      setEmployees(loadedEmployees);
      setBranches(loadedBranches);
      setDepartments(loadedDepartments);
      setCardTemplates(loadedTemplates);

      if (loadedBranches.length > 0 && !formData.branchId) {
        setFormData((prev) => ({
          ...prev,
          branchId: loadedBranches[0].id,
          departmentId: loadedDepartments[0]?.id || '',
        }));
      }
    } catch {
      toast.error('Failed to load employee directory from database.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickCardStatusUpdate = async (empId: string, newStatus: 'NOT_ISSUED' | 'PRINTED' | 'REPRINT_REQUESTED') => {
    try {
      const res = await fetch('/api/employees', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: empId, cardStatus: newStatus }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update card status');

      const labelMap = { PRINTED: 'ISSUED', REPRINT_REQUESTED: 'REPRINT REQ', NOT_ISSUED: 'PENDING' };
      toast.success(`Card status updated to ${labelMap[newStatus]}.`);
      
      // Update local state immediately
      setEmployees((prev) =>
        prev.map((e) => (e.id === empId ? { ...e, cardStatus: newStatus } : e))
      );
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  useEffect(() => {
    loadData();

    // Auto-poll employee directory every 6 seconds to capture live KIOSK print job updates
    const interval = setInterval(() => {
      fetch('/api/employees', { cache: 'no-store' })
        .then((r) => r.ok ? r.json() : null)
        .then((json) => {
          if (json && Array.isArray(json.data)) {
            setEmployees(json.data);
          }
        })
        .catch(() => {});
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.employeeNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBranch = selectedBranch === 'ALL' || emp.branchId === selectedBranch;
    const matchesDept = selectedDept === 'ALL' || emp.departmentId === selectedDept;
    const matchesStatus = selectedStatus === 'ALL' || emp.employmentStatus === selectedStatus;
    
    const statusVal = (emp.cardStatus || 'NOT_ISSUED') as string;
    const matchesCardStatus =
      selectedCardStatus === 'ALL' ||
      (selectedCardStatus === 'ISSUED' && (statusVal === 'PRINTED' || statusVal === 'ISSUED')) ||
      (selectedCardStatus === 'PENDING' && (statusVal === 'NOT_ISSUED' || statusVal === 'PENDING')) ||
      (selectedCardStatus === 'REPRINT_REQUESTED' && statusVal === 'REPRINT_REQUESTED');

    return matchesSearch && matchesBranch && matchesDept && matchesStatus && matchesCardStatus;
  });

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeNumber: formData.employeeNumber,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          contactNumber: formData.contactNumber,
          branchId: formData.branchId || branches[0]?.id,
          departmentId: formData.departmentId || departments[0]?.id,
          positionTitle: formData.positionTitle,
          photoUrl: formData.photoUrl,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create employee');

      toast.success('Employee created successfully in Supabase.');
      setShowAddModal(false);
      setFormData({
        employeeNumber: `EMP-${Math.floor(100000 + Math.random() * 900000)}`,
        firstName: '',
        lastName: '',
        email: '',
        contactNumber: '',
        branchId: branches[0]?.id || '',
        departmentId: departments[0]?.id || '',
        positionTitle: 'Specialist',
        photoUrl: '',
      });
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Generate & Download standard CSV template with exact column headers
  const downloadCsvTemplate = () => {
    const headers = [
      'employeeNumber',
      'firstName',
      'middleName',
      'lastName',
      'suffix',
      'email',
      'contactNumber',
      'departmentName',
      'branchName',
      'positionTitle',
      'photoUrl',
      'employmentStatus',
      'dateHired'
    ].join(',');

    const row1 = 'EMP-100001,John,Alexander,Smith,,john.smith@magiccard.corp,+1 (555) 123-4567,Engineering & Technology,Global Headquarters (NYC),Senior Systems Architect,,ACTIVE,2024-01-15';
    const row2 = 'EMP-100002,Maria,,Garcia,Jr,maria.garcia@magiccard.corp,+1 (555) 987-6543,Corporate Security,Global Headquarters (NYC),Security Operations Specialist,,ACTIVE,2024-02-01';
    const row3 = 'EMP-100003,David,Robert,Chen,,david.chen@magiccard.corp,+1 (555) 456-7890,Operations & Facilities,West Coast Tech Campus (SF),Operations Lead,,ACTIVE,2024-03-10';

    const csvContent = `${headers}\r\n${row1}\r\n${row2}\r\n${row3}\r\n`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'magiccard_employee_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export current employees to CSV
  const handleExportCsv = () => {
    if (employees.length === 0) {
      toast.warning('No employee records available to export.');
      return;
    }

    const headers = [
      'employeeNumber',
      'firstName',
      'lastName',
      'email',
      'contactNumber',
      'departmentName',
      'branchName',
      'positionTitle',
      'cardStatus',
      'employmentStatus',
      'dateHired'
    ].join(',');

    const rows = employees.map((e) =>
      [
        `"${e.employeeNumber}"`,
        `"${e.firstName}"`,
        `"${e.lastName}"`,
        `"${e.email}"`,
        `"${e.contactNumber}"`,
        `"${e.departmentName}"`,
        `"${e.branchName}"`,
        `"${e.positionTitle}"`,
        `"${e.cardStatus}"`,
        `"${e.employmentStatus}"`,
        `"${e.dateHired}"`
      ].join(',')
    );

    const csvContent = `${headers}\r\n${rows.join('\r\n')}\r\n`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `magiccard_employees_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Real CSV file parser
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setParseError('');
    setImportResult(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        if (!text) throw new Error('File content is empty.');

        const lines = text.split(/\r\n|\n/).filter((l) => l.trim().length > 0);
        if (lines.length < 2) {
          throw new Error('CSV must contain a header line and at least one data row.');
        }

        const rawHeaders = lines[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));
        const reqHeaders = ['employeeNumber', 'firstName', 'lastName', 'email'];
        const missing = reqHeaders.filter((req) => !rawHeaders.some((h) => h.toLowerCase() === req.toLowerCase()));

        if (missing.length > 0) {
          throw new Error(`Missing required column headers: ${missing.join(', ')}. Click "Download Template" to see the exact format.`);
        }

        const headerMap: Record<string, number> = {};
        rawHeaders.forEach((h, idx) => {
          headerMap[h.toLowerCase()] = idx;
        });

        const parsed: any[] = [];
        for (let i = 1; i < lines.length; i++) {
          const rowLine = lines[i].trim();
          if (!rowLine) continue;

          // Simple comma splitter handling basic values
          const cols = rowLine.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
          const empNum = cols[headerMap['employeenumber']] || `EMP-${Date.now() + i}`;
          const firstName = cols[headerMap['firstname']] || '';
          const middleName = headerMap['middlename'] !== undefined ? cols[headerMap['middlename']] : '';
          const lastName = cols[headerMap['lastname']] || '';
          const suffix = headerMap['suffix'] !== undefined ? cols[headerMap['suffix']] : '';
          const email = cols[headerMap['email']] || '';
          const contact = headerMap['contactnumber'] !== undefined ? cols[headerMap['contactnumber']] : '';
          const dept = headerMap['departmentname'] !== undefined ? cols[headerMap['departmentname']] : 'General';
          const branch = headerMap['branchname'] !== undefined ? cols[headerMap['branchname']] : 'Global Headquarters (NYC)';
          const position = headerMap['positiontitle'] !== undefined ? cols[headerMap['positiontitle']] : 'Staff';
          const photo = headerMap['photourl'] !== undefined ? cols[headerMap['photourl']] : '';
          const status = (headerMap['employmentstatus'] !== undefined && cols[headerMap['employmentstatus']]?.toUpperCase() === 'INACTIVE') ? 'INACTIVE' : 'ACTIVE';
          const dateHired = headerMap['datehired'] !== undefined ? cols[headerMap['datehired']] : new Date().toISOString().split('T')[0];

          if (firstName && lastName) {
            parsed.push({
              employeeNumber: empNum,
              firstName,
              middleName,
              lastName,
              suffix,
              fullName: `${firstName} ${lastName}`.trim(),
              email,
              contactNumber: contact,
              departmentName: dept,
              branchName: branch,
              branchId: 'branch-hq',
              departmentId: 'dept-eng',
              positionId: 'pos-gen',
              positionTitle: position,
              photoUrl: photo,
              employmentStatus: status,
              cardStatus: 'NOT_ISSUED',
              dateHired,
            });
          }
        }

        if (parsed.length === 0) {
          throw new Error('No valid employee rows could be parsed from the CSV file.');
        }

        setParsedPreview(parsed);
      } catch (err: any) {
        setParseError(err.message || 'Error parsing CSV file.');
      }
    };
    reader.readAsText(file);
  };

  const handleCommitParsedImport = async () => {
    if (parsedPreview.length === 0) return;

    let importedCount = 0;
    for (const emp of parsedPreview) {
      try {
        const res = await fetch('/api/employees', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(emp),
        });
        if (res.ok) importedCount++;
      } catch {}
    }

    await loadData();
    setImportResult({
      total: parsedPreview.length,
      valid: parsedPreview.length,
      imported: importedCount,
    });
    setParsedPreview([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    toast.success(`Import complete: ${importedCount} employees synced to Supabase.`);
  };

  const handleDeleteEmployee = async (id: string) => {
    try {
      const res = await fetch(`/api/employees?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to delete');
      setEmployees((prev) => prev.filter((e) => e.id !== id));
      toast.success('Employee record removed from Supabase.');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Main Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Employees</h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs">Manage your corporate employee records and credentials.</p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => { setShowImportModal(true); setParseError(''); setParsedPreview([]); }}
            className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" /> Import
          </button>
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" /> Export
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-md shadow-red-600/20 transition flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Add Employee
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-[#111827]/90 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Total Employees</span>
            <span className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5 block">{employees.length}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-[#111827]/90 border border-emerald-200/60 dark:border-emerald-900/40 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">Issued (Printed)</span>
            <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-0.5 block">
              {employees.filter((e) => e.cardStatus === 'PRINTED' || (e.cardStatus as string) === 'ISSUED').length}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200/80 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-[#111827]/90 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Pending Kiosk Print</span>
            <span className="text-2xl font-bold text-slate-700 dark:text-slate-300 mt-0.5 block">
              {employees.filter((e) => !e.cardStatus || e.cardStatus === 'NOT_ISSUED' || (e.cardStatus as string) === 'PENDING').length}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-[#111827]/90 border border-amber-200/60 dark:border-amber-900/40 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">Reprint Requests</span>
            <span className="text-2xl font-bold text-amber-700 dark:text-amber-300 mt-0.5 block">
              {employees.filter((e) => e.cardStatus === 'REPRINT_REQUESTED').length}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <RotateCcw className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-xl bg-white dark:bg-[#111827]/90 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-red-500"
            />
          </div>

          {/* Branch Filter */}
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-300 focus:outline-none focus:border-red-500 font-medium"
          >
            <option value="ALL">All Branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>

          {/* Department Filter */}
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-300 focus:outline-none focus:border-red-500 font-medium"
          >
            <option value="ALL">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>

          {/* Employment Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-300 focus:outline-none focus:border-red-500 font-medium"
          >
            <option value="ALL">All Employment</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>

          {/* Card Status Filter */}
          <select
            value={selectedCardStatus}
            onChange={(e) => setSelectedCardStatus(e.target.value)}
            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-300 focus:outline-none focus:border-red-500 font-semibold text-red-600 dark:text-red-400"
          >
            <option value="ALL">All Card Statuses</option>
            <option value="ISSUED">ISSUED (Printed at KIOSK)</option>
            <option value="PENDING">PENDING (Not Issued)</option>
            <option value="REPRINT_REQUESTED">REPRINT REQ</option>
          </select>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Showing <span className="text-slate-900 dark:text-white font-bold">{filteredEmployees.length}</span> of {employees.length} employees
        </div>
      </div>

      {/* Employees Table */}
      <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#111827]/90 overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
          <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-[10px] text-slate-500 dark:text-slate-400">
            <tr>
              <th className="px-5 py-3 w-10">
                <input type="checkbox" className="rounded border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-red-600 focus:ring-0" />
              </th>
              <th className="px-5 py-3">Photo</th>
              <th className="px-5 py-3">Employee</th>
              <th className="px-5 py-3">Employee ID</th>
              <th className="px-5 py-3">Department</th>
              <th className="px-5 py-3">Job Title</th>
              <th className="px-5 py-3">Card Status</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/60">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-slate-500">
                  <div className="inline-flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border-2 border-slate-400 border-t-red-500 animate-spin" />
                    Loading employees from Supabase...
                  </div>
                </td>
              </tr>
            ) : filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-slate-500">
                  <User className="w-8 h-8 mx-auto mb-2 text-slate-400 dark:text-slate-600" />
                  <div>No employee records found.</div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Click <strong>&quot;Import&quot;</strong> or <strong>&quot;Add Employee&quot;</strong> above to get started.
                  </div>
                </td>
              </tr>
            ) : (
              filteredEmployees.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                  <td className="px-5 py-3">
                    <input type="checkbox" className="rounded border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-red-600 focus:ring-0" />
                  </td>
                  <td className="px-5 py-3">
                    {emp.photoUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={emp.photoUrl}
                        alt={emp.fullName}
                        className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-red-100 dark:bg-red-950/60 border border-red-200 dark:border-red-800/60 flex items-center justify-center text-xs font-bold text-red-600 dark:text-red-400">
                        {emp.firstName?.[0] || 'E'}{emp.lastName?.[0] || 'M'}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <div className="font-semibold text-slate-900 dark:text-white">{emp.fullName}</div>
                    <div className="text-[10px] text-slate-500">{emp.email}</div>
                  </td>
                  <td className="px-5 py-3 font-mono text-slate-600 dark:text-slate-300">{emp.employeeNumber}</td>
                  <td className="px-5 py-3 text-slate-600 dark:text-slate-400">{emp.departmentName}</td>
                  <td className="px-5 py-3 text-slate-600 dark:text-slate-400">{emp.positionTitle}</td>
                  <td className="px-5 py-3">
                    {(() => {
                      const isIssued = emp.cardStatus === 'PRINTED' || (emp.cardStatus as string) === 'ISSUED';
                      const isReprint = emp.cardStatus === 'REPRINT_REQUESTED';
                      return (
                        <div className="inline-flex items-center gap-1 group relative">
                          <button
                            onClick={() => {
                              const nextStatus = isIssued ? 'REPRINT_REQUESTED' : isReprint ? 'NOT_ISSUED' : 'PRINTED';
                              handleQuickCardStatusUpdate(emp.id, nextStatus);
                            }}
                            title="Click to toggle status (Issued / Pending / Reprint)"
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border transition cursor-pointer shadow-xs ${
                              isIssued
                                ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border-emerald-200 dark:bg-emerald-950/80 dark:hover:bg-emerald-900 dark:text-emerald-300 dark:border-emerald-800'
                                : isReprint
                                ? 'bg-amber-100 hover:bg-amber-200 text-amber-800 border-amber-200 dark:bg-amber-950/80 dark:hover:bg-amber-900 dark:text-amber-300 dark:border-amber-800'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 dark:border-slate-700'
                            }`}
                          >
                            {isIssued ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                ISSUED
                              </>
                            ) : isReprint ? (
                              <>
                                <RotateCcw className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                REPRINT REQ
                              </>
                            ) : (
                              <>
                                <Clock className="w-3 h-3 text-amber-500" />
                                PENDING
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleOpenPreview3dModal(emp)}
                        title="View 3D ID Card Badge (Same as KIOSK)"
                        className="p-1.5 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenEditModal(emp)}
                        title="Edit Employee & Card Status"
                        className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {(() => {
                        const targetTplId = getAssignedTemplateId(emp);
                        return (
                          <Link
                            href={`/hr/card-designs/${targetTplId}/designer?employeeNumber=${encodeURIComponent(emp.employeeNumber || emp.id)}`}
                            title={`Design / Edit Card in Designer for ${emp.fullName}`}
                            className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition"
                          >
                            <CreditCard className="w-4 h-4" />
                          </Link>
                        );
                      })()}
                      <button
                        onClick={() => handleDeleteEmployee(emp.id)}
                        title="Delete record"
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-6 shadow-2xl transition-colors duration-200">
            <div className="flex items-center justify-between mb-4 border-b border-slate-200 dark:border-slate-800 pb-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-red-500" />
                Add Corporate Employee
              </h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEmployee} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">First Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">Employee ID *</label>
                  <input
                    type="text"
                    required
                    value={formData.employeeNumber}
                    onChange={(e) => setFormData({ ...formData, employeeNumber: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white font-mono placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">Corporate Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">Branch</label>
                  <select
                    value={formData.branchId}
                    onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">Department</label>
                  <select
                    value={formData.departmentId}
                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">Job Title</label>
                  <input
                    type="text"
                    required
                    value={formData.positionTitle}
                    onChange={(e) => setFormData({ ...formData, positionTitle: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">Contact Phone</label>
                  <input
                    type="text"
                    placeholder="+1 (555) 000-0000"
                    value={formData.contactNumber}
                    onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">Photo URL (Optional)</label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={formData.photoUrl}
                  onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition text-[11px]"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold shadow-md shadow-red-600/30 transition"
                >
                  Save Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-6 shadow-2xl transition-colors duration-200">
            <div className="flex items-center justify-between mb-4 border-b border-slate-200 dark:border-slate-800 pb-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Edit className="w-5 h-5 text-red-500" />
                Edit Employee Details
              </h2>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateEmployee} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">First Name *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.firstName}
                    onChange={(e) => setEditFormData({ ...editFormData, firstName: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.lastName}
                    onChange={(e) => setEditFormData({ ...editFormData, lastName: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">Employee ID *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.employeeNumber}
                    onChange={(e) => setEditFormData({ ...editFormData, employeeNumber: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white font-mono placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">Corporate Email *</label>
                  <input
                    type="email"
                    required
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">Branch</label>
                  <select
                    value={editFormData.branchId}
                    onChange={(e) => setEditFormData({ ...editFormData, branchId: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">Department</label>
                  <select
                    value={editFormData.departmentId}
                    onChange={(e) => setEditFormData({ ...editFormData, departmentId: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">Job Title</label>
                  <input
                    type="text"
                    required
                    value={editFormData.positionTitle}
                    onChange={(e) => setEditFormData({ ...editFormData, positionTitle: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">Contact Phone</label>
                  <input
                    type="text"
                    placeholder="+1 (555) 000-0000"
                    value={editFormData.contactNumber}
                    onChange={(e) => setEditFormData({ ...editFormData, contactNumber: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">Employment Status</label>
                  <select
                    value={editFormData.employmentStatus}
                    onChange={(e) => setEditFormData({ ...editFormData, employmentStatus: e.target.value as any })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
                  >
                    <option value="ACTIVE" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Active</option>
                    <option value="INACTIVE" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Inactive</option>
                    <option value="SUSPENDED" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Suspended</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">Card Status</label>
                  <select
                    value={editFormData.cardStatus}
                    onChange={(e) => setEditFormData({ ...editFormData, cardStatus: e.target.value as any })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
                  >
                    <option value="NOT_ISSUED" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Pending / Not Issued</option>
                    <option value="PRINTED" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Issued / Printed</option>
                    <option value="REPRINT_REQUESTED" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Reprint Requested</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">Photo URL (Optional)</label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={editFormData.photoUrl}
                  onChange={(e) => setEditFormData({ ...editFormData, photoUrl: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition text-[11px]"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold shadow-md shadow-red-600/30 transition"
                >
                  Update Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mass Import & Format Generator Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-6 shadow-2xl my-8 transition-colors duration-200">
            <div className="flex items-center justify-between mb-4 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-red-500" />
                  Import Employee Roster (CSV)
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Upload employee data in bulk using the standard CSV format.
                </p>
              </div>
              <button onClick={() => { setShowImportModal(false); setParsedPreview([]); setImportResult(null); }} className="text-slate-400 hover:text-slate-700 dark:hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Step 1: Download Format Template */}
              <div className="p-4 rounded-xl bg-red-50/60 dark:bg-gradient-to-r dark:from-red-950/30 dark:to-slate-900 border border-red-200 dark:border-red-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <FileDown className="w-4 h-4 text-red-500 dark:text-red-400" />
                    Step 1: Download Official CSV Template
                  </div>
                  <div className="text-slate-600 dark:text-slate-400 text-[11px] mt-0.5">
                    Pre-configured with exact column names and sample data rows.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={downloadCsvTemplate}
                  className="px-3.5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold text-xs shadow-md shadow-red-600/30 flex items-center gap-1.5 shrink-0 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  Generate CSV Template
                </button>
              </div>

              {/* Format Guide Toggle */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-3">
                <button
                  type="button"
                  onClick={() => setShowFormatGuide(!showFormatGuide)}
                  className="w-full flex items-center justify-between text-left font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                >
                  <span className="flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-slate-400" />
                    View Exact Column Headers & Format Guide
                  </span>
                  <span className="text-[11px] text-red-500 dark:text-red-400">{showFormatGuide ? 'Hide Guide ▲' : 'Show Guide ▼'}</span>
                </button>

                {showFormatGuide && (
                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 overflow-x-auto">
                    <table className="w-full text-left text-[11px] text-slate-700 dark:text-slate-300">
                      <thead className="bg-slate-100 dark:bg-slate-950 text-slate-500 dark:text-slate-400 uppercase text-[9px]">
                        <tr>
                          <th className="p-2">Column Header</th>
                          <th className="p-2">Requirement</th>
                          <th className="p-2">Example Value</th>
                          <th className="p-2">Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                        <tr>
                          <td className="p-2 text-red-600 dark:text-red-400 font-bold">employeeNumber</td>
                          <td className="p-2 text-amber-600 dark:text-amber-400">Required</td>
                          <td className="p-2 text-slate-500 dark:text-slate-400">EMP-100001</td>
                          <td className="p-2 font-sans text-slate-500 dark:text-slate-400">Unique alphanumeric badge ID</td>
                        </tr>
                        <tr>
                          <td className="p-2 text-red-600 dark:text-red-400 font-bold">firstName</td>
                          <td className="p-2 text-amber-600 dark:text-amber-400">Required</td>
                          <td className="p-2 text-slate-500 dark:text-slate-400">John</td>
                          <td className="p-2 font-sans text-slate-500 dark:text-slate-400">Employee first name</td>
                        </tr>
                        <tr>
                          <td className="p-2 text-red-600 dark:text-red-400 font-bold">lastName</td>
                          <td className="p-2 text-amber-600 dark:text-amber-400">Required</td>
                          <td className="p-2 text-slate-500 dark:text-slate-400">Smith</td>
                          <td className="p-2 font-sans text-slate-500 dark:text-slate-400">Employee last name</td>
                        </tr>
                        <tr>
                          <td className="p-2 text-red-600 dark:text-red-400 font-bold">email</td>
                          <td className="p-2 text-amber-600 dark:text-amber-400">Required</td>
                          <td className="p-2 text-slate-500 dark:text-slate-400">john@magiccard.corp</td>
                          <td className="p-2 font-sans text-slate-500 dark:text-slate-400">Corporate work email</td>
                        </tr>
                        <tr>
                          <td className="p-2 text-slate-800 dark:text-white">departmentName</td>
                          <td className="p-2 text-slate-500 dark:text-slate-400">Optional</td>
                          <td className="p-2 text-slate-500 dark:text-slate-400">Engineering & Technology</td>
                          <td className="p-2 font-sans text-slate-500 dark:text-slate-400">Department / Division name</td>
                        </tr>
                        <tr>
                          <td className="p-2 text-slate-800 dark:text-white">branchName</td>
                          <td className="p-2 text-slate-500 dark:text-slate-400">Optional</td>
                          <td className="p-2 text-slate-500 dark:text-slate-400">Global Headquarters (NYC)</td>
                          <td className="p-2 font-sans text-slate-500 dark:text-slate-400">Branch office name</td>
                        </tr>
                        <tr>
                          <td className="p-2 text-slate-800 dark:text-white">positionTitle</td>
                          <td className="p-2 text-slate-500 dark:text-slate-400">Optional</td>
                          <td className="p-2 text-slate-500 dark:text-slate-400">Software Engineer</td>
                          <td className="p-2 font-sans text-slate-500 dark:text-slate-400">Official job title</td>
                        </tr>
                        <tr>
                          <td className="p-2 text-slate-800 dark:text-white">contactNumber</td>
                          <td className="p-2 text-slate-500 dark:text-slate-400">Optional</td>
                          <td className="p-2 text-slate-500 dark:text-slate-400">+1 (555) 123-4567</td>
                          <td className="p-2 font-sans text-slate-500 dark:text-slate-400">Phone contact</td>
                        </tr>
                        <tr>
                          <td className="p-2 text-slate-800 dark:text-white">dateHired</td>
                          <td className="p-2 text-slate-500 dark:text-slate-400">Optional</td>
                          <td className="p-2 text-slate-500 dark:text-slate-400">2024-01-15</td>
                          <td className="p-2 font-sans text-slate-500 dark:text-slate-400">Date hired (YYYY-MM-DD)</td>
                        </tr>
                        <tr>
                          <td className="p-2 text-slate-800 dark:text-white">photoUrl</td>
                          <td className="p-2 text-slate-500 dark:text-slate-400">Optional</td>
                          <td className="p-2 text-slate-500 dark:text-slate-400">https://...</td>
                          <td className="p-2 font-sans text-slate-500 dark:text-slate-400">Direct image URL for photo badge</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Step 2: Upload CSV File */}
              <div>
                <div className="font-bold text-slate-900 dark:text-white mb-1.5">Step 2: Select Filled CSV File</div>
                <div className="p-6 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-red-500/60 rounded-xl bg-slate-50 dark:bg-slate-900/60 text-center transition">
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <label className="cursor-pointer">
                    <span className="text-red-600 dark:text-red-400 hover:underline font-semibold">
                      Choose CSV file from computer
                    </span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  <div className="text-slate-500 text-[11px] mt-1">Accepts standard .CSV files</div>
                </div>
              </div>

              {parseError && (
                <div className="p-3 rounded-lg bg-red-100 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-200 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span>{parseError}</span>
                </div>
              )}

              {/* Parsed Preview Table */}
              {parsedPreview.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      Ready to Import: {parsedPreview.length} employee record(s) detected
                    </span>
                  </div>

                  <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
                    <table className="w-full text-left text-[11px] text-slate-700 dark:text-slate-300">
                      <thead className="bg-slate-100 dark:bg-slate-900 sticky top-0 text-[10px] text-slate-500 dark:text-slate-400">
                        <tr>
                          <th className="p-2">ID</th>
                          <th className="p-2">Name</th>
                          <th className="p-2">Email</th>
                          <th className="p-2">Department</th>
                          <th className="p-2">Position</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {parsedPreview.map((row, i) => (
                          <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                            <td className="p-2 font-mono text-red-600 dark:text-red-400">{row.employeeNumber}</td>
                            <td className="p-2 font-semibold text-slate-900 dark:text-white">{row.fullName}</td>
                            <td className="p-2 text-slate-500 dark:text-slate-400">{row.email}</td>
                            <td className="p-2 text-slate-500 dark:text-slate-400">{row.departmentName}</td>
                            <td className="p-2 text-slate-500 dark:text-slate-400">{row.positionTitle}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {importResult && (
                <div className="p-3 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>
                    Successfully imported {importResult.imported} employee records into the system!
                  </span>
                </div>
              )}

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setShowImportModal(false); setParsedPreview([]); setImportResult(null); }}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Close
                </button>
                {parsedPreview.length > 0 && (
                  <button
                    type="button"
                    onClick={handleCommitParsedImport}
                    className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold shadow-md shadow-red-600/30 flex items-center gap-1.5 transition"
                  >
                    <Check className="w-4 h-4" />
                    Commit Import ({parsedPreview.length} Records)
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3D ID Card Preview Modal (Rendered via Portal at document.body for true 100% full screen coverage) */}
      {mounted && show3dPreviewModal && previewEmployee && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-[#0f172a] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] text-white">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0b1120]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-500">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white leading-none">{previewEmployee.fullName}</h3>
                    <span className="font-mono text-xs text-red-400 font-semibold bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                      {previewEmployee.employeeNumber}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Live 3D ID Card Geometry (Same layout as KIOSK) • {previewEmployee.departmentName} • {previewEmployee.branchName || 'Global Headquarters'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShow3dPreviewModal(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stage Body */}
            <div className="p-6 bg-gradient-to-b from-[#0a0f1d] via-[#070b14] to-[#04070e] flex flex-col items-center justify-center relative overflow-hidden flex-1 min-h-[440px]">
              <div className="w-full">
                <ThreeCardViewer
                  key={`${previewEmployee.id}-${previewTemplate?.id || 'tpl'}`}
                  template={previewTemplate}
                  employeeNumber={previewEmployee.employeeNumber}
                  employeeData={previewEmployee}
                  autoRotate={true}
                />
              </div>
            </div>

            {/* Footer Summary */}
            <div className="px-6 py-4 border-t border-slate-800 bg-[#0b1120] flex items-center justify-between text-xs">
              <div className="flex items-center gap-4 text-slate-400">
                <div>Job Title: <strong className="text-white">{previewEmployee.positionTitle || 'Staff'}</strong></div>
                <div>Card Status: <strong className="text-emerald-400">{previewEmployee.cardStatus === 'PRINTED' || (previewEmployee.cardStatus as string) === 'ISSUED' ? 'ISSUED' : 'PENDING'}</strong></div>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href="/kiosk"
                  target="_blank"
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold border border-slate-700 flex items-center gap-1.5 transition"
                >
                  <Sparkles className="w-3.5 h-3.5 text-red-400" />
                  Open in KIOSK
                </Link>
                <button
                  onClick={() => setShow3dPreviewModal(false)}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold shadow-md transition"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
