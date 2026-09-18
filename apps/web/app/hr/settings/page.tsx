'use client';

import { useState, useEffect } from 'react';
import { toast } from '@/components/ui/Toast';
import { 
  Settings, 
  Building2, 
  Shield, 
  Printer, 
  CheckCircle2, 
  Plus, 
  Edit,
  Trash2, 
  Layers, 
  MapPin, 
  Phone, 
  X,
  Briefcase,
  User,
  Mail,
  LockKeyhole,
  UserPlus,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  Upload,
  Image as ImageIcon,
  Database,
  RefreshCw,
  AlertTriangle,
  Lock
} from 'lucide-react';
import { Branch, Department } from '@/lib/data/enterpriseStore';
import { compressImageFile } from '@/lib/utils/imageCompressor';

export default function HrSettingsPage() {
  const [activeTab, setActiveTab] = useState<'POLICIES' | 'BRANCHES' | 'DEPARTMENTS' | 'POSITIONS' | 'ACCOUNT' | 'DATABASE'>('POLICIES');
  const [saved, setSaved] = useState(false);
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountForm, setAccountForm] = useState({
    displayName: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Database Maintenance State
  const [tableMetrics, setTableMetrics] = useState<Record<string, { count: number; isProtected: boolean; label: string }>>({});
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [selectedTableToClear, setSelectedTableToClear] = useState<{ name: string; label: string; count: number } | null>(null);
  const [clearConfirmInput, setClearConfirmInput] = useState('');
  const [isClearingTable, setIsClearingTable] = useState(false);

  const loadTableMetrics = async () => {
    try {
      setLoadingMetrics(true);
      const res = await fetch('/api/admin/clean-table', { cache: 'no-store' });
      const json = await res.json();
      if (json.data) {
        setTableMetrics(json.data);
      }
    } catch {
      toast.error('Failed to load table metrics.');
    } finally {
      setLoadingMetrics(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'DATABASE') {
      loadTableMetrics();
    }
  }, [activeTab]);

  const handleConfirmClearTable = async () => {
    if (!selectedTableToClear) return;
    if (clearConfirmInput.trim() !== 'DELETE DATA') {
      toast.error('You must type exact text "DELETE DATA" to confirm.');
      return;
    }

    try {
      setIsClearingTable(true);
      const res = await fetch('/api/admin/clean-table', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableName: selectedTableToClear.name,
          confirmationText: 'DELETE DATA',
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to clear table.');

      toast.success(`Table '${selectedTableToClear.name}' cleared successfully!`);
      setSelectedTableToClear(null);
      setClearConfirmInput('');
      loadTableMetrics();
    } catch (err: any) {
      toast.error(err.message || 'Failed to clear table.');
    } finally {
      setIsClearingTable(false);
    }
  };

  // Account & Users state
  const [passwordError, setPasswordError] = useState('');
  const [showForgotPasswordHelp, setShowForgotPasswordHelp] = useState(false);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [availableRoles, setAvailableRoles] = useState<any[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [userForm, setUserForm] = useState({
    displayName: '',
    email: '',
    password: '',
    roleId: '',
  });
  const [userCreating, setUserCreating] = useState(false);

  // Policy States
  const [allowSelfServiceReprint, setAllowSelfServiceReprint] = useState(true);
  const [restrictCrossBranchPrinting, setRestrictCrossBranchPrinting] = useState(false);
  const [kioskInactivityTimeoutSeconds, setKioskInactivityTimeoutSeconds] = useState(45);
  const [defaultBleedMm, setDefaultBleedMm] = useState(1.5);
  const [defaultSafeMarginMm, setDefaultSafeMarginMm] = useState(3.0);
  const [verificationBaseUrl, setVerificationBaseUrl] = useState('https://magic-card-trust-id.vercel.app');
  const [defaultPreviewPhotoUrl, setDefaultPreviewPhotoUrl] = useState('');
  const [defaultCompanyLogoUrl, setDefaultCompanyLogoUrl] = useState('');
  const [defaultPreviewName, setDefaultPreviewName] = useState('Michael Brown');
  const [defaultPreviewEmployeeNumber, setDefaultPreviewEmployeeNumber] = useState('EMP-000125');
  const [defaultPreviewDepartment, setDefaultPreviewDepartment] = useState('Global Operations');
  const [defaultPreviewPosition, setDefaultPreviewPosition] = useState('Software Engineer');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [policiesSaving, setPoliciesSaving] = useState(false);

  // Branches States
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(true);
  const [showAddBranchModal, setShowAddBranchModal] = useState(false);
  const [showEditBranchModal, setShowEditBranchModal] = useState(false);
  const [branchForm, setBranchForm] = useState({
    name: '',
    code: '',
    address: '',
    contactNumber: '',
  });
  const [editBranchForm, setEditBranchForm] = useState({
    id: '',
    name: '',
    code: '',
    address: '',
    contactNumber: '',
    isActive: true,
  });

  // Departments States
  const [departments, setDepartments] = useState<Department[]>([]);
  const [deptsLoading, setDeptsLoading] = useState(true);
  const [showAddDeptModal, setShowAddDeptModal] = useState(false);
  const [showEditDeptModal, setShowEditDeptModal] = useState(false);
  const [deptForm, setDeptForm] = useState({
    name: '',
    code: '',
  });
  const [editDeptForm, setEditDeptForm] = useState({
    id: '',
    name: '',
    code: '',
  });

  // Positions States
  const [positions, setPositions] = useState<any[]>([]);
  const [positionsLoading, setPositionsLoading] = useState(true);
  const [showAddPosModal, setShowAddPosModal] = useState(false);
  const [posForm, setPosForm] = useState({
    title: '',
    departmentId: '',
    level: 'STANDARD',
  });

  // Load real data from Supabase on mount
  useEffect(() => {
    fetch('/api/auth/profile', { cache: 'no-store' })
      .then((r) => r.json())
      .then((json) => {
        if (json.data) {
          setAccountForm((previous) => ({
            ...previous,
            displayName: json.data.displayName,
            email: json.data.email,
          }));
        }
      })
      .catch(() => toast.error('Failed to load account details.'));

    fetch('/api/branches', { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) throw new Error('Branches API request failed.');
        return r.json();
      })
      .then((json) => {
        // Supabase columns may be snake_case — normalize to camelCase
        const rows = (json.data ?? []).map((b: any) => ({
          id: b.id,
          name: b.name,
          code: b.code,
          address: b.address ?? '',
          contactNumber: b.contact_number ?? b.contactNumber ?? '',
          isActive: b.is_active ?? b.isActive ?? true,
          kiosksCount: b.kiosks_count ?? b.kiosksCount ?? 0,
        }));
        setBranches(rows);
      })
      .catch(() => toast.error('Failed to load branches.'))
      .finally(() => setBranchesLoading(false));

    fetch('/api/departments', { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) throw new Error('Departments API request failed.');
        return r.json();
      })
      .then((json) => {
        const rows = (json.data ?? []).map((d: any) => ({
          id: d.id,
          name: d.name,
          code: d.code,
        }));
        setDepartments(rows);
      })
      .catch(() => toast.error('Failed to load departments.'))
      .finally(() => setDeptsLoading(false));

    fetch('/api/positions', { cache: 'no-store' })
      .then((r) => r.json())
      .then((json) => {
        setPositions(json.data || []);
      })
      .catch(() => {})
      .finally(() => setPositionsLoading(false));

    fetch('/api/settings', { cache: 'no-store' })
      .then((r) => r.json())
      .then((json) => {
        if (json.data) {
          setAllowSelfServiceReprint(json.data.allowSelfServiceReprint ?? true);
          setRestrictCrossBranchPrinting(json.data.restrictCrossBranchPrinting ?? false);
          setKioskInactivityTimeoutSeconds(json.data.kioskInactivityTimeoutSeconds ?? 45);
          setDefaultBleedMm(json.data.defaultBleedMm ?? 1.5);
          setDefaultSafeMarginMm(json.data.defaultSafeMarginMm ?? 3.0);
          setVerificationBaseUrl(json.data.verificationBaseUrl ?? 'https://magic-card-trust-id.vercel.app');
          setDefaultPreviewPhotoUrl(json.data.defaultPreviewPhotoUrl ?? '');
          setDefaultCompanyLogoUrl(json.data.defaultCompanyLogoUrl ?? '');
          setDefaultPreviewName(json.data.defaultPreviewName ?? 'Michael Brown');
          setDefaultPreviewEmployeeNumber(json.data.defaultPreviewEmployeeNumber ?? 'EMP-000125');
          setDefaultPreviewDepartment(json.data.defaultPreviewDepartment ?? 'Global Operations');
          setDefaultPreviewPosition(json.data.defaultPreviewPosition ?? 'Software Engineer');
        }
      })
      .catch(() => toast.error('Failed to load system settings.'));

    fetch('/api/roles', { cache: 'no-store' })
      .then((r) => r.json())
      .then((json) => {
        if (json.data && Array.isArray(json.data)) {
          setAvailableRoles(json.data);
          const hrRole = json.data.find((r: any) => r.name === 'HR Admin') || json.data[0];
          if (hrRole) {
            setUserForm((prev) => ({ ...prev, roleId: prev.roleId || hrRole.id }));
          }
        }
      })
      .catch(() => {});

    loadUsers();
  }, []);

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await fetch('/api/auth/users', { cache: 'no-store' });
      const json = await res.json();
      if (json.data) {
        setAdminUsers(json.data);
      }
      if (typeof json.isSuperAdmin === 'boolean') {
        setIsSuperAdmin(json.isSuperAdmin);
      }
    } catch {
      toast.error('Failed to load HR admin users.');
    } finally {
      setUsersLoading(false);
    }
  };

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;
    setUploadingPhoto(true);
    try {
      const file = await compressImageFile(rawFile, 800, 800, 0.82);
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to upload photo');
      setDefaultPreviewPhotoUrl(json.url);
      const oldKb = Math.round(rawFile.size / 1024);
      const newKb = Math.round(file.size / 1024);
      toast.success(
        oldKb > newKb
          ? `Preview photo compressed (${oldKb}KB ➔ ${newKb}KB) and saved!`
          : `Default preview photo uploaded to Supabase Storage!`
      );
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload image.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;
    setUploadingLogo(true);
    try {
      const file = await compressImageFile(rawFile, 1000, 1000, 0.85);
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to upload logo');
      setDefaultCompanyLogoUrl(json.url);
      const oldKb = Math.round(rawFile.size / 1024);
      const newKb = Math.round(file.size / 1024);
      toast.success(
        oldKb > newKb
          ? `Logo compressed (${oldKb}KB ➔ ${newKb}KB) and saved!`
          : `Default company logo uploaded to Supabase Storage!`
      );
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload logo.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSavePolicies = async (e: React.FormEvent) => {
    e.preventDefault();
    setPoliciesSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          allowSelfServiceReprint,
          restrictCrossBranchPrinting,
          kioskInactivityTimeoutSeconds,
          defaultBleedMm,
          defaultSafeMarginMm,
          verificationBaseUrl,
          defaultPreviewPhotoUrl,
          defaultCompanyLogoUrl,
          defaultPreviewName,
          defaultPreviewEmployeeNumber,
          defaultPreviewDepartment,
          defaultPreviewPosition,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save configuration');

      setSaved(true);
      toast.success('Configuration saved and persisted to Supabase.');
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save settings.');
    } finally {
      setPoliciesSaving(false);
    }
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (accountForm.newPassword) {
      if (!accountForm.currentPassword) {
        setPasswordError('Current password is required to save your new password.');
        toast.error('Current password is required to change password.');
        return;
      }
      if (accountForm.newPassword.length < 12) {
        setPasswordError('New password must be at least 12 characters long.');
        toast.error('New password must be at least 12 characters.');
        return;
      }
      if (accountForm.newPassword !== accountForm.confirmPassword) {
        setPasswordError('New password and confirmation password do not match.');
        toast.error('New password confirmation does not match.');
        return;
      }
    }

    setAccountSaving(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(accountForm),
      });
      const json = await res.json();
      if (!res.ok) {
        const msg = json.error || 'Failed to update account.';
        if (res.status === 403 || msg.toLowerCase().includes('current password')) {
          setPasswordError('Current password is wrong! Please retype your exact current password.');
          toast.error('Current password is wrong!');
        } else {
          setPasswordError(msg);
          toast.error(msg);
        }
        return;
      }

      setAccountForm((previous) => ({
        ...previous,
        email: json.data.email,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));
      setPasswordError('');
      window.dispatchEvent(new Event('hr-profile-updated'));
      toast.success(
        json.emailConfirmationRequired
          ? 'Profile saved. Check your new email to confirm the address.'
          : 'Account details & password updated securely.'
      );
      loadUsers();
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update account.');
      toast.error(err.message || 'Failed to update account.');
    } finally {
      setAccountSaving(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.email || !userForm.password || !userForm.displayName) return;
    if (userForm.password.length < 12) {
      toast.error('Password must be at least 12 characters long.');
      return;
    }

    setUserCreating(true);
    try {
      const res = await fetch('/api/auth/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userForm),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create user account.');

      toast.success(`New ${json.data?.role?.name || 'HR Admin'} user created!`);
      setUserForm({ displayName: '', email: '', password: '', roleId: availableRoles[0]?.id || '' });
      setShowAddUserModal(false);
      loadUsers();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUserCreating(false);
    }
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to delete HR Admin account "${userEmail}"?`)) return;

    try {
      const res = await fetch(`/api/auth/users?id=${userId}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to delete user account.');

      toast.success('HR Admin account deleted successfully.');
      loadUsers();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchForm.name.trim() || !branchForm.code.trim()) return;

    try {
      const res = await fetch('/api/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: branchForm.name.trim(),
          code: branchForm.code.trim().toUpperCase(),
          address: branchForm.address.trim(),
          contactNumber: branchForm.contactNumber.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create branch');

      const b = json.data;
      setBranches((prev) => [
        ...prev,
        {
          id: b.id,
          name: b.name,
          code: b.code,
          address: b.address ?? '',
          contactNumber: b.contact_number ?? b.contactNumber ?? '',
          isActive: b.is_active ?? true,
          kiosksCount: 0,
        },
      ]);
      setBranchForm({ name: '', code: '', address: '', contactNumber: '' });
      setShowAddBranchModal(false);
      toast.success('Branch created successfully.');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteBranch = async (id: string) => {
    try {
      const res = await fetch(`/api/branches?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to delete branch');
      setBranches((prev) => prev.filter((b) => b.id !== id));
      toast.success('Branch removed successfully.');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleOpenEditBranchModal = (branch: Branch) => {
    setEditBranchForm({
      id: branch.id,
      name: branch.name,
      code: branch.code,
      address: branch.address ?? '',
      contactNumber: branch.contactNumber ?? '',
      isActive: branch.isActive ?? true,
    });
    setShowEditBranchModal(true);
  };

  const handleUpdateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editBranchForm.name.trim() || !editBranchForm.code.trim()) return;

    try {
      const res = await fetch('/api/branches', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editBranchForm.id,
          name: editBranchForm.name.trim(),
          code: editBranchForm.code.trim().toUpperCase(),
          address: editBranchForm.address.trim(),
          contactNumber: editBranchForm.contactNumber.trim(),
          isActive: editBranchForm.isActive,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update branch');

      const updated = json.data;
      setBranches((prev) =>
        prev.map((b) =>
          b.id === updated.id
            ? {
                ...b,
                name: updated.name,
                code: updated.code,
                address: updated.address ?? '',
                contactNumber: updated.contact_number ?? updated.contactNumber ?? '',
                isActive: updated.is_active ?? true,
              }
            : b
        )
      );
      setShowEditBranchModal(false);
      toast.success('Branch updated successfully.');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptForm.name.trim() || !deptForm.code.trim()) return;

    try {
      const res = await fetch('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: deptForm.name.trim(),
          code: deptForm.code.trim().toUpperCase(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create department');

      const d = json.data;
      setDepartments((prev) => [...prev, { id: d.id, name: d.name, code: d.code }]);
      setDeptForm({ name: '', code: '' });
      setShowAddDeptModal(false);
      toast.success('Department created successfully.');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteDepartment = async (id: string) => {
    try {
      const res = await fetch(`/api/departments?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to delete department');
      setDepartments((prev) => prev.filter((d) => d.id !== id));
      toast.success('Department removed successfully.');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleOpenEditDeptModal = (dept: Department) => {
    setEditDeptForm({
      id: dept.id,
      name: dept.name,
      code: dept.code,
    });
    setShowEditDeptModal(true);
  };

  const handleUpdateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDeptForm.name.trim() || !editDeptForm.code.trim()) return;

    try {
      const res = await fetch('/api/departments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editDeptForm.id,
          name: editDeptForm.name.trim(),
          code: editDeptForm.code.trim().toUpperCase(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update department');

      const updated = json.data;
      setDepartments((prev) =>
        prev.map((d) => (d.id === updated.id ? { ...d, name: updated.name, code: updated.code } : d))
      );
      setShowEditDeptModal(false);
      toast.success('Department updated successfully.');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleCreatePosition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!posForm.title.trim()) return;

    try {
      const res = await fetch('/api/positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: posForm.title.trim(),
          departmentId: posForm.departmentId || departments[0]?.id || '',
          level: posForm.level || 'STANDARD',
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create position');

      setPositions((prev) => [...prev, json.data]);
      setPosForm({ title: '', departmentId: '', level: 'STANDARD' });
      setShowAddPosModal(false);
      toast.success('Job position created successfully.');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeletePosition = async (id: string) => {
    try {
      const res = await fetch(`/api/positions?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to delete position');
      setPositions((prev) => prev.filter((p) => p.id !== id));
      toast.success('Job position removed successfully.');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">System Settings & Organization</h1>
        <p className="text-slate-500 dark:text-slate-400 text-xs">
          Manage corporate physical branches, departments, KIOSK terminal timeouts, and CR80 hardware print policies.
        </p>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2">
        <button
          onClick={() => setActiveTab('POLICIES')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'POLICIES'
              ? 'border-red-600 text-red-600 dark:border-red-500 dark:text-red-400 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <Shield className="w-4 h-4" /> KIOSK & Print Policies
        </button>
        <button
          onClick={() => setActiveTab('BRANCHES')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'BRANCHES'
              ? 'border-red-600 text-red-600 dark:border-red-500 dark:text-red-400 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <Building2 className="w-4 h-4" /> Branches ({branches.length})
        </button>
        <button
          onClick={() => setActiveTab('DEPARTMENTS')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'DEPARTMENTS'
              ? 'border-red-600 text-red-600 dark:border-red-500 dark:text-red-400 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <Briefcase className="w-4 h-4" /> Departments ({departments.length})
        </button>
        <button
          onClick={() => setActiveTab('POSITIONS')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'POSITIONS'
              ? 'border-red-600 text-red-600 dark:border-red-500 dark:text-red-400 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" /> Job Positions ({positions.length})
        </button>
        <button
          onClick={() => setActiveTab('ACCOUNT')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'ACCOUNT'
              ? 'border-red-600 text-red-600 dark:border-red-500 dark:text-red-400 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <User className="w-4 h-4" /> Account
        </button>
        <button
          onClick={() => setActiveTab('DATABASE')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'DATABASE'
              ? 'border-red-600 text-red-600 dark:border-red-500 dark:text-red-400 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <Database className="w-4 h-4 text-red-500" /> Clear Tables (Super Admin)
        </button>
      </div>

      {/* TAB 4: ACCOUNT */}
      {activeTab === 'ACCOUNT' && (
        <div className="space-y-8 max-w-4xl">
          {/* Section 1: Personal Admin Credentials & Password */}
          <form onSubmit={handleSaveAccount} className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">My Admin Account & Credentials</h2>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                Update your personal admin profile and password. Current password is required for security verification.
              </p>
            </div>

            {/* Profile Identity Card */}
            <div className="rounded-xl bg-white dark:bg-[#111827]/90 border border-slate-200/80 dark:border-slate-800 p-6 space-y-5 shadow-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Display name</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      minLength={2}
                      maxLength={100}
                      value={accountForm.displayName}
                      onChange={(e) => setAccountForm({ ...accountForm, displayName: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Login email</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      value={accountForm.email}
                      onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Change Password Card */}
            <div className="rounded-xl bg-white dark:bg-[#111827]/90 border border-slate-200/80 dark:border-slate-800 p-6 space-y-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <LockKeyhole className="w-4 h-4 text-red-500" /> Change Password
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Use at least 12 characters. You must enter your <strong>Current Password</strong> to retype and confirm before changes are saved.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowForgotPasswordHelp(!showForgotPasswordHelp)}
                  className="text-xs text-red-600 dark:text-red-400 hover:underline flex items-center gap-1 font-medium"
                >
                  <HelpCircle className="w-3.5 h-3.5" /> Forgot current password?
                </button>
              </div>

              {showForgotPasswordHelp && (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-xs space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    Forgot Your Password?
                  </div>
                  <div>
                    If you cannot remember your current password, contact your system administrator or log out to use the password recovery link on the login page.
                  </div>
                </div>
              )}

              {passwordError && (
                <div className="p-3 rounded-lg bg-red-100 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 text-xs flex items-center gap-2 font-semibold animate-pulse">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Current Password <span className="text-red-500">* (Required to retype)</span>
                </label>
                <input
                  type="password"
                  autoComplete="current-password"
                  placeholder="Enter your current password..."
                  value={accountForm.currentPassword}
                  onChange={(e) => {
                    setAccountForm({ ...accountForm, currentPassword: e.target.value });
                    setPasswordError('');
                  }}
                  className={`w-full bg-slate-50 dark:bg-slate-900 border ${
                    passwordError ? 'border-red-500 focus:ring-red-500' : 'border-slate-200 dark:border-slate-700'
                  } rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white transition`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">New password</label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    minLength={12}
                    placeholder="At least 12 characters..."
                    value={accountForm.newPassword}
                    onChange={(e) => {
                      setAccountForm({ ...accountForm, newPassword: e.target.value });
                      setPasswordError('');
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Confirm new password</label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    minLength={12}
                    placeholder="Retype new password..."
                    value={accountForm.confirmPassword}
                    onChange={(e) => {
                      setAccountForm({ ...accountForm, confirmPassword: e.target.value });
                      setPasswordError('');
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={accountSaving}
                className="px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-md shadow-red-600/30 transition disabled:opacity-50"
              >
                {accountSaving ? 'Saving Account...' : 'Save Account Details'}
              </button>
            </div>
          </form>

          {/* Section 2: HR Admin User Accounts Directory */}
          <div className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-red-500" />
                  HR Corporate Admin Accounts (Supabase Auth)
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                  Manage backend HR administrator accounts authenticated via Supabase Auth and assign corporate RBAC roles.
                </p>
              </div>
              {isSuperAdmin && (
                <button
                  onClick={() => setShowAddUserModal(true)}
                  className="px-3.5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-md shadow-red-600/20 transition flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <UserPlus className="w-4 h-4" /> Add HR Admin Account
                </button>
              )}
            </div>

            {!isSuperAdmin && (
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2.5">
                <LockKeyhole className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>
                  <strong>Restricted Privileges:</strong> Only <strong>Super Admin</strong> account holders can add new administrator accounts or modify RBAC system roles.
                </span>
              </div>
            )}

            <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#111827]/90 overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-[10px] text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="px-5 py-3">User / Admin</th>
                    <th className="px-5 py-3">Email Address</th>
                    <th className="px-5 py-3">Assigned Role</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Created Date</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/60">
                  {usersLoading ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-slate-500 text-xs">
                        <div className="inline-flex items-center gap-2">
                          <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-400 border-t-red-500 animate-spin" />
                          Loading accounts & RBAC roles from Supabase Auth...
                        </div>
                      </td>
                    </tr>
                  ) : adminUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-slate-500 text-xs">
                        No admin accounts found. Add your first HR user above.
                      </td>
                    </tr>
                  ) : (
                    adminUsers.map((u) => {
                      const roleName = u.role?.name || 'HR Admin';
                      const isSuper = roleName === 'Super Admin';
                      return (
                        <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                          <td className="px-5 py-3 font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/60 flex items-center justify-center font-bold text-xs shrink-0">
                              {u.displayName?.[0] || 'A'}
                            </div>
                            <div>
                              <div>{u.displayName}</div>
                              {u.isCurrent && (
                                <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded px-1.5 py-0.2">
                                  (You / Logged In)
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3 text-slate-600 dark:text-slate-300 font-mono text-[11px]">{u.email}</td>
                          <td className="px-5 py-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border inline-flex items-center gap-1 ${
                                isSuper
                                  ? 'bg-red-50 text-red-700 dark:bg-red-950/80 dark:text-red-300 border-red-200 dark:border-red-800'
                                  : 'bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                              }`}
                            >
                              <Shield className="w-3 h-3" />
                              {roleName}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                              ACTIVE
                            </span>
                          </td>
                          <td className="px-5 py-3 text-slate-500 text-[11px]">
                            {new Date(u.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-5 py-3 text-right">
                            {u.isCurrent ? (
                              <span className="text-[10px] text-slate-400 italic">Current Session</span>
                            ) : isSuperAdmin ? (
                              <button
                                onClick={() => handleDeleteUser(u.id, u.email)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition"
                                title="Delete user account"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400">Protected</span>
                            )}
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
      )}

      {/* TAB 1: POLICIES */}
      {activeTab === 'POLICIES' && (
        <form onSubmit={handleSavePolicies} className="space-y-6">
          {/* KIOSK Policy Settings */}
          <div className="rounded-xl bg-white dark:bg-[#111827]/90 border border-slate-200/80 dark:border-slate-800 p-6 space-y-4 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-red-500" />
              KIOSK Terminal Security & Timeouts
            </h2>

            <div className="flex items-center justify-between py-2 border-b border-slate-200/80 dark:border-slate-800">
              <div>
                <div className="text-xs font-semibold text-slate-900 dark:text-white">Allow Self-Service Badge Re-issue</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  When enabled, employees can reprint their ID card directly at physical terminals.
                </div>
              </div>
              <input
                type="checkbox"
                checked={allowSelfServiceReprint}
                onChange={(e) => setAllowSelfServiceReprint(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-red-600 focus:ring-0"
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <div className="text-xs font-semibold text-slate-900 dark:text-white">Touchscreen Inactivity Timeout (Seconds)</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Auto-resets the KIOSK terminal to home if abandoned during search or review.
                </div>
              </div>
              <input
                type="number"
                min={15}
                max={180}
                value={kioskInactivityTimeoutSeconds}
                onChange={(e) => setKioskInactivityTimeoutSeconds(parseInt(e.target.value) || 45)}
                className="w-24 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1 text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Cross-Branch Card Printing Policy */}
          <div className="rounded-xl bg-white dark:bg-[#111827]/90 border border-slate-200/80 dark:border-slate-800 p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-red-500" />
                  Cross-Branch Card Printing Policy
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Control whether HR staff assigned to one branch can print ID cards for employees in another branch.
                </p>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                restrictCrossBranchPrinting
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
              }`}>
                {restrictCrossBranchPrinting ? 'RESTRICTED (Same Branch Only)' : 'UNRESTRICTED (Any Branch)'}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  Restrict Printing to User's Assigned Branch Only
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
                  <strong>Disabled (Off):</strong> Cross-branch printing is allowed. An HR user from Branch 1 can print cards for employees assigned to Branch 4.
                  <br />
                  <strong>Enabled (On):</strong> Restricts card printing. An HR user from Branch 1 cannot print cards for employees in Branch 4. <em>(Super Admins bypass this policy constraint)</em>.
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={restrictCrossBranchPrinting}
                  onChange={(e) => setRestrictCrossBranchPrinting(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-red-600"></div>
              </label>
            </div>
          </div>

          {/* Physical Print & Dimensions Defaults */}
          <div className="rounded-xl bg-white dark:bg-[#111827]/90 border border-slate-200/80 dark:border-slate-800 p-6 space-y-4 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Printer className="w-4 h-4 text-red-500" />
              Physical Print Margins & CR80 Defaults (Magicard 600NEO)
            </h2>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-400 mb-1 font-medium">Default Safe Margin (mm)</label>
                <input
                  type="number"
                  step="0.5"
                  value={defaultSafeMarginMm}
                  onChange={(e) => setDefaultSafeMarginMm(parseFloat(e.target.value) || 3.0)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-3 py-2 text-slate-900 dark:text-white"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">ISO standard: minimum 3.0mm edge safe margin.</span>
              </div>
              <div>
                <label className="block text-slate-700 dark:text-slate-400 mb-1 font-medium">Default Print Bleed (mm)</label>
                <input
                  type="number"
                  step="0.5"
                  value={defaultBleedMm}
                  onChange={(e) => setDefaultBleedMm(parseFloat(e.target.value) || 1.5)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-3 py-2 text-slate-900 dark:text-white"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Thermal edge-to-edge bleed allowance.</span>
              </div>
            </div>
          </div>

          {/* Digital ID Verification & QR Domain Configuration */}
          <div className="rounded-xl bg-white dark:bg-[#111827]/90 border border-slate-200/80 dark:border-slate-800 p-6 space-y-4 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-red-500" />
              Digital ID Verification & QR Code Domain (Saved to Supabase)
            </h2>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Verification Base Web URL / Domain
              </label>
              <input
                type="url"
                required
                value={verificationBaseUrl}
                onChange={(e) => setVerificationBaseUrl(e.target.value)}
                placeholder="https://magic-card-trust-id.vercel.app"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white font-mono"
              />
              <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 block">
                This domain is encoded into printed QR codes. When scanned by a phone, it redirects to your identity verification portal (e.g. <code className="text-red-500 font-mono">{verificationBaseUrl || 'https://yourdomain.com'}/verify/EMP-303943</code>).
              </span>
            </div>
          </div>

          {/* Default Badge Preview Assets & Sample Data */}
          <div className="rounded-xl bg-white dark:bg-[#111827]/90 border border-slate-200/80 dark:border-slate-800 p-6 space-y-5 shadow-sm">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-red-500" />
                Badge Preview Assets & Template Defaults (Saved to Supabase)
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Configure default photo placeholder, company logo, and preview details shown in the 2D & 3D card designers when no specific employee record is selected.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Default Preview Photo */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Default Preview Badge Photo</label>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 flex items-center justify-center">
                    {defaultPreviewPhotoUrl ? (
                      <img src={defaultPreviewPhotoUrl} alt="Preview photo default" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-[10px] text-slate-400 text-center font-medium px-1">SVG Placeholder</div>
                    )}
                  </div>
                  <div className="space-y-2 flex-1">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium cursor-pointer transition">
                      <Upload className="w-3.5 h-3.5" />
                      {uploadingPhoto ? 'Uploading...' : 'Upload Preview Photo'}
                      <input type="file" accept="image/*" onChange={handleUploadPhoto} className="hidden" disabled={uploadingPhoto} />
                    </label>
                    <input
                      type="text"
                      placeholder="Or paste photo URL..."
                      value={defaultPreviewPhotoUrl}
                      onChange={(e) => setDefaultPreviewPhotoUrl(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Default Company Logo */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Default Company Logo Asset</label>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 flex items-center justify-center p-2">
                    {defaultCompanyLogoUrl ? (
                      <img src={defaultCompanyLogoUrl} alt="Company logo default" className="max-w-full max-h-full object-contain" />
                    ) : (
                      <div className="text-[10px] text-slate-400 text-center font-medium">No Logo</div>
                    )}
                  </div>
                  <div className="space-y-2 flex-1">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium cursor-pointer transition">
                      <Upload className="w-3.5 h-3.5" />
                      {uploadingLogo ? 'Uploading...' : 'Upload Company Logo'}
                      <input type="file" accept="image/*" onChange={handleUploadLogo} className="hidden" disabled={uploadingLogo} />
                    </label>
                    <input
                      type="text"
                      placeholder="Or paste logo URL..."
                      value={defaultCompanyLogoUrl}
                      onChange={(e) => setDefaultCompanyLogoUrl(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200/80 dark:border-slate-800 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">Default Preview Full Name</label>
                <input
                  type="text"
                  value={defaultPreviewName}
                  onChange={(e) => setDefaultPreviewName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">Default Preview Employee ID</label>
                <input
                  type="text"
                  value={defaultPreviewEmployeeNumber}
                  onChange={(e) => setDefaultPreviewEmployeeNumber(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">Default Department Name</label>
                <input
                  type="text"
                  value={defaultPreviewDepartment}
                  onChange={(e) => setDefaultPreviewDepartment(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">Default Job Position / Title</label>
                <input
                  type="text"
                  value={defaultPreviewPosition}
                  onChange={(e) => setDefaultPreviewPosition(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {saved && (
            <div className="p-3 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-400 text-xs flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              System settings saved and synchronized across fleet terminals.
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={policiesSaving}
              className="px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-md shadow-red-600/30 transition disabled:opacity-50"
            >
              {policiesSaving ? 'Saving Configuration...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: BRANCHES */}
      {activeTab === 'BRANCHES' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Branch Locations</h2>
              <p className="text-slate-500 dark:text-slate-400 text-xs">
                Physical branch sites where employees belong and KIOSKs are deployed.
              </p>
            </div>
            <button
              onClick={() => setShowAddBranchModal(true)}
              className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-md shadow-red-600/20 transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Add Branch
            </button>
          </div>

          <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#111827]/90 overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-[10px] text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-5 py-3">Code</th>
                  <th className="px-5 py-3">Branch Name</th>
                  <th className="px-5 py-3">Address</th>
                  <th className="px-5 py-3">Contact</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/60">
                {branchesLoading ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-slate-500 text-xs">
                      <div className="inline-flex items-center gap-2">
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-400 border-t-red-500 animate-spin" />
                        Loading branches from Supabase...
                      </div>
                    </td>
                  </tr>
                ) : branches.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-slate-500 text-xs">
                      No branches found. Add your first branch above.
                    </td>
                  </tr>
                ) : (
                  branches.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                      <td className="px-5 py-3 font-mono font-bold text-red-600 dark:text-red-400">{b.code}</td>
                      <td className="px-5 py-3 font-semibold text-slate-900 dark:text-white">{b.name}</td>
                      <td className="px-5 py-3 text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {b.address}
                      </td>
                      <td className="px-5 py-3 text-slate-600 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          {b.contactNumber}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                          ACTIVE
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditBranchModal(b)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition"
                            title="Edit branch"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteBranch(b.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition"
                            title="Delete branch"
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
        </div>
      )}

      {/* TAB 3: DEPARTMENTS */}
      {activeTab === 'DEPARTMENTS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Departments & Divisions</h2>
              <p className="text-slate-500 dark:text-slate-400 text-xs">
                Organizational units printed on employee badges and used for card templates.
              </p>
            </div>
            <button
              onClick={() => setShowAddDeptModal(true)}
              className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-md shadow-red-600/20 transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Add Department
            </button>
          </div>

          <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#111827]/90 overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-[10px] text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-5 py-3">Department Code</th>
                  <th className="px-5 py-3">Department Name</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/60">
                {deptsLoading ? (
                  <tr>
                    <td colSpan={3} className="px-5 py-8 text-center text-slate-500 text-xs">
                      <div className="inline-flex items-center gap-2">
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-400 border-t-red-500 animate-spin" />
                        Loading departments from Supabase...
                      </div>
                    </td>
                  </tr>
                ) : departments.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-5 py-8 text-center text-slate-500 text-xs">
                      No departments found. Add your first department above.
                    </td>
                  </tr>
                ) : (
                  departments.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                    <td className="px-5 py-3 font-mono font-bold text-red-600 dark:text-red-400">{d.code}</td>
                    <td className="px-5 py-3 font-semibold text-slate-900 dark:text-white">{d.name}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEditDeptModal(d)}
                          className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition"
                          title="Edit department"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteDepartment(d.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition"
                          title="Delete department"
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
        </div>
      )}

      {/* TAB: JOB POSITIONS */}
      {activeTab === 'POSITIONS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Job Positions & Titles</h2>
              <p className="text-slate-500 dark:text-slate-400 text-xs">
                Corporate positions and titles assigned to employee badges and department roles.
              </p>
            </div>
            <button
              onClick={() => {
                setPosForm({ title: '', departmentId: departments[0]?.id || '', level: 'STANDARD' });
                setShowAddPosModal(true);
              }}
              className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-md shadow-red-600/20 transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Add Job Position
            </button>
          </div>

          <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#111827]/90 overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-[10px] text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-5 py-3">Position Title</th>
                  <th className="px-5 py-3">Department</th>
                  <th className="px-5 py-3">Access Level</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/60">
                {positionsLoading ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-slate-500 text-xs">
                      <div className="inline-flex items-center gap-2">
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-400 border-t-red-500 animate-spin" />
                        Loading job positions from Supabase...
                      </div>
                    </td>
                  </tr>
                ) : positions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-slate-500 text-xs">
                      No job positions found. Add your first position above.
                    </td>
                  </tr>
                ) : (
                  positions.map((p) => {
                    const dept = departments.find((d) => d.id === p.departmentId);
                    return (
                      <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                        <td className="px-5 py-3 font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                          <Layers className="w-4 h-4 text-red-500 shrink-0" />
                          {p.title}
                        </td>
                        <td className="px-5 py-3 text-slate-600 dark:text-slate-400">
                          {dept ? dept.name : 'All Departments / General'}
                        </td>
                        <td className="px-5 py-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {p.level || 'STANDARD'}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button
                            onClick={() => handleDeletePosition(p.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition"
                            title="Delete position"
                          >
                            <Trash2 className="w-4 h-4" />
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
      )}
      {showAddBranchModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-red-500" />
                Add Corporate Branch
              </h3>
              <button onClick={() => setShowAddBranchModal(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBranch} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">Branch Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. London Regional Office"
                  value={branchForm.name}
                  onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">Branch Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BR-LON-01"
                  value={branchForm.code}
                  onChange={(e) => setBranchForm({ ...branchForm, code: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white uppercase font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1">Physical Address</label>
                <input
                  type="text"
                  placeholder="e.g. 100 Bishopsgate, London EC2N 4AG"
                  value={branchForm.address}
                  onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1">Contact Phone</label>
                <input
                  type="text"
                  placeholder="e.g. +44 20 7946 0991"
                  value={branchForm.contactNumber}
                  onChange={(e) => setBranchForm({ ...branchForm, contactNumber: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddBranchModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold shadow-md shadow-red-600/30"
                >
                  Save Branch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT BRANCH MODAL */}
      {showEditBranchModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Edit className="w-5 h-5 text-red-500" />
                Edit Corporate Branch
              </h3>
              <button onClick={() => setShowEditBranchModal(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateBranch} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">Branch Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. London Regional Office"
                  value={editBranchForm.name}
                  onChange={(e) => setEditBranchForm({ ...editBranchForm, name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">Branch Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BR-LON-01"
                  value={editBranchForm.code}
                  onChange={(e) => setEditBranchForm({ ...editBranchForm, code: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white uppercase font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1">Physical Address</label>
                <input
                  type="text"
                  placeholder="e.g. 100 Bishopsgate, London EC2N 4AG"
                  value={editBranchForm.address}
                  onChange={(e) => setEditBranchForm({ ...editBranchForm, address: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1">Contact Phone</label>
                <input
                  type="text"
                  placeholder="e.g. +44 20 7946 0991"
                  value={editBranchForm.contactNumber}
                  onChange={(e) => setEditBranchForm({ ...editBranchForm, contactNumber: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditBranchModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold shadow-md shadow-red-600/30"
                >
                  Update Branch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD DEPARTMENT MODAL */}
      {showAddDeptModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-red-500" />
                Add Department
              </h3>
              <button onClick={() => setShowAddDeptModal(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDepartment} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">Department Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Quality Assurance & Auditing"
                  value={deptForm.name}
                  onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">Department Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. QA"
                  value={deptForm.code}
                  onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white uppercase font-mono"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddDeptModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold shadow-md shadow-red-600/30"
                >
                  Save Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT DEPARTMENT MODAL */}
      {showEditDeptModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Edit className="w-5 h-5 text-red-500" />
                Edit Department
              </h3>
              <button onClick={() => setShowEditDeptModal(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateDepartment} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">Department Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Quality Assurance & Auditing"
                  value={editDeptForm.name}
                  onChange={(e) => setEditDeptForm({ ...editDeptForm, name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">Department Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. QA"
                  value={editDeptForm.code}
                  onChange={(e) => setEditDeptForm({ ...editDeptForm, code: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white uppercase font-mono"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditDeptModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold shadow-md shadow-red-600/30"
                >
                  Update Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 6: DATABASE MAINTENANCE / TABLE CLEANUP */}
      {activeTab === 'DATABASE' && (
        <div className="space-y-6 max-w-5xl">
          {/* Header Banner */}
          <div className="flex items-start justify-between gap-4 p-6 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-extrabold text-lg">
                <Database className="w-5 h-5" />
                <span>Supabase Database Table Cleanup (Super Admin)</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-xs max-w-2xl leading-relaxed">
                Clear operational database records (Employees, Kiosks, Print Jobs, Audit Logs, Photos) directly in Supabase.
                Core security tables (<strong className="text-red-600 dark:text-red-300 font-semibold">Roles, User Roles, Permissions, Profiles, System Settings</strong>) are locked and protected from deletion.
              </p>
            </div>
            <button
              onClick={loadTableMetrics}
              disabled={loadingMetrics}
              className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-white text-xs font-semibold flex items-center gap-2 border border-slate-200 dark:border-slate-700 shadow-sm transition shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingMetrics ? 'animate-spin' : ''}`} />
              <span>Refresh Table Metrics</span>
            </button>
          </div>

          {/* Security Alert */}
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-3">
            <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold">Security Protection Policy:</strong> Protected system tables (<span className="font-mono underline text-amber-800 dark:text-amber-300">roles, user_roles, profiles, system_settings, permissions</span>) are strictly guarded and disabled. Clearing operational tables will remove data permanently. Use with caution.
            </div>
          </div>

          {/* Table Metrics & Action Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(tableMetrics).map(([tableName, info]) => {
              const isProtected = info.isProtected;
              return (
                <div
                  key={tableName}
                  className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
                    isProtected
                      ? 'bg-slate-100/90 dark:bg-slate-900/40 border-slate-300 dark:border-slate-800/80'
                      : 'bg-white dark:bg-[#111827]/90 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-mono text-sm font-bold ${isProtected ? 'text-slate-700 dark:text-slate-300' : 'text-slate-900 dark:text-white'}`}>
                          {tableName}
                        </span>
                        {isProtected ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400 border border-slate-300 dark:border-slate-700 flex items-center gap-1">
                            <Lock className="w-3 h-3 text-amber-600 dark:text-amber-400" /> Protected Core
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 font-semibold">
                            Clearable
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {info.label}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className={`text-xl font-extrabold font-mono ${isProtected ? 'text-slate-600 dark:text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                        {info.count.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                        Records
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                      {isProtected ? 'Locked by System Policy' : 'Safe to truncate'}
                    </span>

                    {isProtected ? (
                      <button
                        disabled
                        className="px-3.5 py-1.5 rounded-lg bg-slate-200/90 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-semibold cursor-not-allowed border border-slate-300 dark:border-slate-700/50 flex items-center gap-1.5"
                      >
                        <Lock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                        <span>Cannot Clear</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => setSelectedTableToClear({ name: tableName, label: info.label, count: info.count })}
                        disabled={info.count === 0}
                        className="px-3.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-600 dark:bg-red-600/10 dark:hover:bg-red-600 border border-red-200 hover:border-red-600 dark:border-red-600/30 dark:hover:border-red-500 text-red-600 hover:text-white dark:text-red-400 dark:hover:text-white text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Clear Table Data</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Safety Confirmation Modal */}
          {selectedTableToClear && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
              <div className="w-full max-w-lg bg-white dark:bg-[#0d1322] border border-slate-200 dark:border-red-900/60 rounded-3xl p-7 text-slate-900 dark:text-white shadow-2xl space-y-6 relative">
                <button
                  onClick={() => { setSelectedTableToClear(null); setClearConfirmInput(''); }}
                  className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl bg-slate-100 dark:bg-slate-800/60 transition"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 shadow-lg shadow-red-500/10">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                      Clear Table '{selectedTableToClear.name}'?
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {selectedTableToClear.label} — Supabase Table Cleanup
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-xs text-red-900 dark:text-red-200 space-y-2">
                  <p className="font-bold flex items-center gap-1.5 text-red-600 dark:text-red-400">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    WARNING: Permanent Data Deletion
                  </p>
                  <p className="leading-relaxed">
                    This will permanently delete all <strong>{selectedTableToClear.count.toLocaleString()} records</strong> from the <strong>'{selectedTableToClear.name}'</strong> table in your Supabase database. This action cannot be undone.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Type <span className="font-mono font-bold text-red-600 dark:text-red-400">DELETE DATA</span> to confirm:
                  </label>
                  <input
                    type="text"
                    value={clearConfirmInput}
                    onChange={(e) => setClearConfirmInput(e.target.value)}
                    placeholder="DELETE DATA"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-mono text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-red-500 transition"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => { setSelectedTableToClear(null); setClearConfirmInput(''); }}
                    className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={clearConfirmInput.trim() !== 'DELETE DATA' || isClearingTable}
                    onClick={handleConfirmClearTable}
                    className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-red-600/20"
                  >
                    {isClearingTable ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Deleting Records...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Confirm Clear Table</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-red-500" />
                Add HR Admin Account
              </h3>
              <button onClick={() => setShowAddUserModal(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">Full Name / Display Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sarah Jenkins"
                  value={userForm.displayName}
                  onChange={(e) => setUserForm({ ...userForm, displayName: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">Login Email *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. sarah.jenkins@magiccard.corp"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">Corporate Role & System Permissions *</label>
                <select
                  required
                  value={userForm.roleId}
                  onChange={(e) => setUserForm({ ...userForm, roleId: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white font-medium"
                >
                  {availableRoles.length === 0 ? (
                    <option value="">Loading system roles...</option>
                  ) : (
                    availableRoles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} {r.description ? `(${r.description})` : ''}
                      </option>
                    ))
                  )}
                </select>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                  Controls module privileges and permissions. Only Super Admins can add accounts and configure roles.
                </p>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">Initial Password * (min 12 chars)</label>
                <input
                  type="password"
                  required
                  minLength={12}
                  placeholder="Enter initial password..."
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={userCreating}
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold shadow-md shadow-red-600/30 transition disabled:opacity-50"
                >
                  {userCreating ? 'Creating User...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD POSITION MODAL */}
      {showAddPosModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-red-500" />
                Add Corporate Job Position
              </h3>
              <button onClick={() => setShowAddPosModal(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePosition} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">Position Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Software Engineer"
                  value={posForm.title}
                  onChange={(e) => setPosForm({ ...posForm, title: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">Department *</label>
                <select
                  value={posForm.departmentId}
                  onChange={(e) => setPosForm({ ...posForm, departmentId: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">Access Level</label>
                <select
                  value={posForm.level}
                  onChange={(e) => setPosForm({ ...posForm, level: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                >
                  <option value="STANDARD">STANDARD</option>
                  <option value="LEAD">LEAD</option>
                  <option value="MANAGER">MANAGER</option>
                  <option value="EXECUTIVE">EXECUTIVE</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddPosModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold shadow-md shadow-red-600/30"
                >
                  Save Position
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
