'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Palette,
  Plus,
  CheckCircle2,
  History,
  ArrowUpRight,
  Building2,
  Globe,
  Copy,
  Trash2,
  RefreshCw,
  Edit3,
  Check,
  Sparkles,
  QrCode,
  Barcode,
  Eye,
} from 'lucide-react';
import { toast } from '@/components/ui/Toast';
import { resolveDataBinding } from '@workspace/card-engine';

interface BranchOption {
  id: string;
  name: string;
  code: string;
}

interface TemplateVersionItem {
  id: string;
  versionNumber: number;
  versionTag: string;
  status: string;
  changelog: string;
  publishedAt: string;
}

interface CardTemplateItem {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  branchId: string | null;
  branchName: string;
  branchCode: string | null;
  currentVersionNumber: number;
  versionTag: string;
  publishedAt: string;
  frontElementCount: number;
  backElementCount: number;
  layout?: any;
  versions: TemplateVersionItem[];
}

function MiniCard2DPreview({ layout }: { layout?: any }) {
  const [activeSide, setActiveSide] = useState<'front' | 'back'>('front');

  if (!layout) {
    return (
      <div className="w-56 h-36 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-400 text-xs font-mono">
        Standard CR80 2D Layout
      </div>
    );
  }

  const isVertical = layout.card?.orientation === 'vertical' || (layout.card?.height > layout.card?.width);
  const cardW = layout.card?.width || (isVertical ? 540 : 856);
  const cardH = layout.card?.height || (isVertical ? 856 : 540);

  // Target preview container dimensions
  const targetW = isVertical ? 150 : 250;
  const targetH = isVertical ? 238 : 158;
  const scale = targetW / cardW;

  const surface = activeSide === 'front' ? layout.front : layout.back;
  const elements = surface?.elements || [];
  const bgColor = surface?.background?.color || (activeSide === 'front' ? '#ffffff' : '#f8fafc');

  const frontCount = layout.front?.elements?.length || 0;
  const backCount = layout.back?.elements?.length || 0;

  return (
    <div className="flex flex-col items-center shrink-0" onClick={(e) => e.stopPropagation()}>
      {/* Front / Back surface switcher pill */}
      <div className="flex items-center gap-1 mb-2 bg-slate-100 dark:bg-slate-900/90 p-1 rounded-lg border border-slate-200 dark:border-slate-800 text-[10px]">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setActiveSide('front');
          }}
          className={`px-2 py-0.5 rounded font-semibold transition ${
            activeSide === 'front'
              ? 'bg-red-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Front ({frontCount})
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setActiveSide('back');
          }}
          className={`px-2 py-0.5 rounded font-semibold transition ${
            activeSide === 'back'
              ? 'bg-red-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Back ({backCount})
        </button>
      </div>

      {/* Mini Scaled Card Stage */}
      <div
        style={{ width: `${targetW}px`, height: `${targetH}px` }}
        className="relative overflow-hidden rounded-xl border border-slate-300 dark:border-slate-700/80 shadow-md bg-slate-900"
      >
        <div
          style={{
            width: `${cardW}px`,
            height: `${cardH}px`,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            backgroundColor: bgColor,
            position: 'absolute',
            left: 0,
            top: 0,
          }}
          className={`relative select-none pointer-events-none ${isVertical ? 'rounded-[18px]' : 'rounded-[24px]'}`}
        >
          {elements.map((el: any) => {
            if (el.isHidden) return null;

            const transformStr = [
              el.rotation ? `rotate(${el.rotation}deg)` : '',
              el.flipX ? 'scaleX(-1)' : '',
              el.flipY ? 'scaleY(-1)' : '',
            ].filter(Boolean).join(' ');

            return (
              <div
                key={el.id}
                style={{
                  position: 'absolute',
                  left: `${el.x}px`,
                  top: `${el.y}px`,
                  width: `${el.width}px`,
                  height: `${el.height}px`,
                  transform: transformStr || undefined,
                  opacity: el.opacity ?? 1,
                }}
              >
                {el.type === 'TEXT' && (
                  <div
                    style={{
                      fontSize: `${el.fontSize}px`,
                      color: el.color,
                      fontWeight: el.fontWeight,
                      textAlign: el.textAlign,
                      fontFamily: el.fontFamily || 'Inter',
                    }}
                    className="w-full h-full flex items-center leading-none truncate"
                  >
                    {resolveDataBinding(el.text, {
                      employeeNumber: 'EMP-000125',
                      fullName: 'Michael Brown',
                      firstName: 'Michael',
                      lastName: 'Brown',
                      department: 'Global Operations',
                      position: 'Staff',
                      branch: 'West Coast Tech Campus',
                    })}
                  </div>
                )}

                {el.type === 'EMPLOYEE_PHOTO' && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80"
                    alt="Photo"
                    style={{
                      borderRadius: `${el.borderRadius || 10}px`,
                      borderWidth: `${el.borderWidth || 2}px`,
                      borderColor: el.borderColor || '#e2e8f0',
                    }}
                    className="w-full h-full object-cover shadow-xs"
                  />
                )}

                {el.type === 'IMAGE' && el.src && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={el.src}
                    alt="Image"
                    style={{
                      borderRadius: el.borderRadius ? `${el.borderRadius}px` : undefined,
                      borderWidth: el.borderWidth ? `${el.borderWidth}px` : undefined,
                      borderColor: el.borderColor,
                    }}
                    className="w-full h-full object-cover"
                  />
                )}

                {el.type === 'QR_CODE' && (
                  <div className="w-full h-full bg-white p-1 border border-slate-200 flex items-center justify-center rounded">
                    <QrCode className="w-full h-full text-slate-900" />
                  </div>
                )}

                {el.type === 'BARCODE' && (
                  <div className="w-full h-full bg-white p-1 border border-slate-200 flex flex-col items-center justify-center rounded">
                    <Barcode className="w-full h-3/4 text-black" />
                    <span className="text-[9px] font-mono text-black">EMP-000125</span>
                  </div>
                )}

                {el.type === 'SHAPE' && (
                  <>
                    {el.shapeType === 'TRIANGLE' && (
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          backgroundColor: el.fill || '#dc2626',
                          clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
                        }}
                      />
                    )}
                    {el.shapeType === 'CIRCLE' && (
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          backgroundColor: el.fill || '#dc2626',
                          borderRadius: '9999px',
                        }}
                      />
                    )}
                    {el.shapeType === 'DIAGONAL' && (
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          backgroundColor: el.fill || '#dc2626',
                          clipPath: 'polygon(0 0, 100% 0, 80% 100%, 0% 100%)',
                        }}
                      />
                    )}
                    {el.shapeType === 'SMOKE' && (
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          background: `radial-gradient(circle, ${el.fill || '#dc2626'} 0%, rgba(255,255,255,0) 70%)`,
                          borderRadius: '50%',
                        }}
                      />
                    )}
                    {el.shapeType === 'SIGNATURE_LINE' && (
                      <div className="w-full h-full flex flex-col justify-end">
                        <div className="w-full h-[1px] bg-slate-400" />
                        <span className="text-[9px] font-mono text-slate-400 text-center mt-1">SIGNATURE</span>
                      </div>
                    )}
                    {el.shapeType === 'LOGO' && (
                      <div className="w-full h-full border-2 border-dashed border-slate-400 rounded flex items-center justify-center bg-slate-100/50">
                        <span className="text-xs font-bold tracking-widest text-slate-500">LOGO</span>
                      </div>
                    )}
                    {(!el.shapeType || el.shapeType === 'RECTANGLE' || el.shapeType === 'LINE') && (
                      <div
                        style={{
                          backgroundColor: el.fill || '#dc2626',
                          borderRadius: el.borderRadius ? `${el.borderRadius}px` : undefined,
                        }}
                        className="w-full h-full"
                      />
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function HrCardDesignsPage() {
  const [templates, setTemplates] = useState<CardTemplateItem[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);

  // Modal State for New / Duplicate Template
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDesc, setNewTemplateDesc] = useState('');
  const [newTemplateBranchId, setNewTemplateBranchId] = useState('ALL');
  const [cloneFromId, setCloneFromId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/card-templates');
      const json = await res.json();
      if (res.ok && Array.isArray(json.data)) {
        setTemplates(json.data);
        if (json.data.length > 0 && !activeTemplateId) {
          setActiveTemplateId(json.data[0].id);
        }
      }
      if (Array.isArray(json.branches)) {
        setBranches(json.branches);
      }
    } catch (err) {
      toast.error('Failed to load card templates from database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleBranchChange = async (templateId: string, newBranchId: string) => {
    try {
      const isDefault = newBranchId === 'ALL';
      const res = await fetch('/api/card-templates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: templateId,
          branchId: newBranchId,
          isDefault: isDefault,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update branch assignment');

      toast.success('Template branch assignment updated successfully.');
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateName.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/card-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTemplateName.trim(),
          description: newTemplateDesc.trim(),
          branchId: newTemplateBranchId,
          isDefault: newTemplateBranchId === 'ALL',
          cloneFromTemplateId: cloneFromId || null,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create template');

      toast.success(`New template "${newTemplateName}" created!`);
      setShowCreateModal(false);
      setNewTemplateName('');
      setNewTemplateDesc('');
      setCloneFromId('');
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTemplate = async (template: CardTemplateItem) => {
    if (template.isDefault) {
      toast.error('The Global Default template cannot be deleted.');
      return;
    }

    if (!confirm(`Are you sure you want to delete template "${template.name}"?`)) return;

    try {
      const res = await fetch(`/api/card-templates?id=${template.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to delete template');

      toast.success(`Template "${template.name}" deleted.`);
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const activeTemplate = templates.find((t) => t.id === activeTemplateId) || templates[0];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Palette className="w-6 h-6 text-red-600 dark:text-red-500" />
            Card Designs & Multi-Branch Templates
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
            Design enterprise ID credentials, assign custom layouts per branch or all branches, and publish versions across fleet KIOSKs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            title="Refresh Templates"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-md shadow-red-600/20 transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Create Branch Template
          </button>
        </div>
      </div>

      {/* Main Template Content */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-[#111827]/90 shadow-sm">
          <div className="w-5 h-5 border-2 border-slate-400 border-t-red-500 rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs">Loading card templates from database...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Templates List & Branch Assignment Column */}
          <div className="lg:col-span-2 space-y-4">
            {templates.map((tpl) => {
              const isSelected = tpl.id === activeTemplateId;

              return (
                <div
                  key={tpl.id}
                  onClick={() => setActiveTemplateId(tpl.id)}
                  className={`rounded-xl bg-white dark:bg-[#111827]/90 border transition p-6 cursor-pointer shadow-sm hover:shadow-md ${
                    isSelected
                      ? 'border-red-500/80 ring-1 ring-red-500/50'
                      : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {/* Top Bar Badges */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-800 border border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800">
                        CR80 Standard (85.60 x 53.98 mm)
                      </span>

                      {/* Branch Scope Badge */}
                      {tpl.isDefault ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200 dark:bg-sky-950/80 dark:text-sky-300 dark:border-sky-800 flex items-center gap-1">
                          <Globe className="w-3 h-3 text-sky-500" />
                          All Branches (Global Default)
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200 dark:bg-purple-950/80 dark:text-purple-300 dark:border-purple-800 flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-purple-500" />
                          Branch: {tpl.branchName}
                        </span>
                      )}

                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Published ({tpl.versionTag})
                      </span>
                    </div>

                    <span className="text-[11px] text-slate-400 font-mono">ID: {tpl.id.substring(0, 18)}</span>
                  </div>

                  {/* Template Info & 2D Mini Preview */}
                  <div className="flex flex-col md:flex-row gap-4 items-start justify-between mb-4">
                    <div className="flex-1 space-y-3">
                      <div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                          {tpl.name}
                          {tpl.isDefault && (
                            <span className="text-[10px] font-normal text-amber-500 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 px-2 py-0.5 rounded">
                              Fallback Template
                            </span>
                          )}
                        </h2>
                        <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
                          {tpl.description || 'Custom ID badge template for corporate personnel credentials.'}
                        </p>
                      </div>

                      {/* Specifications Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                          <span className="text-slate-500 dark:text-slate-400 block text-[9px] uppercase font-semibold">Dimensions</span>
                          <span className="font-semibold text-slate-900 dark:text-white text-[11px]">85.60 × 53.98 mm</span>
                        </div>
                        <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                          <span className="text-slate-500 dark:text-slate-400 block text-[9px] uppercase font-semibold">Thickness</span>
                          <span className="font-semibold text-slate-900 dark:text-white text-[11px]">0.76 mm PVC</span>
                        </div>
                        <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                          <span className="text-slate-500 dark:text-slate-400 block text-[9px] uppercase font-semibold">Print Bleed</span>
                          <span className="font-semibold text-slate-900 dark:text-white text-[11px]">1.5 mm</span>
                        </div>
                        <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                          <span className="text-slate-500 dark:text-slate-400 block text-[9px] uppercase font-semibold">Safe Margin</span>
                          <span className="font-semibold text-slate-900 dark:text-white text-[11px]">3.0 mm</span>
                        </div>
                      </div>
                    </div>

                    {/* 2D Mini Card Preview */}
                    <MiniCard2DPreview layout={tpl.layout} />
                  </div>

                  {/* Branch Assignment Selector & Action Buttons */}
                  <div className="pt-3.5 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    {/* Branch Assignment Selector */}
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <span className="text-slate-500 font-semibold text-[11px] flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        Assigned Branch:
                      </span>
                      <select
                        value={tpl.branchId || 'ALL'}
                        onChange={(e) => handleBranchChange(tpl.id, e.target.value)}
                        className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-lg px-2.5 py-1 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-red-500"
                      >
                        <option value="ALL">All Branches (Global Default)</option>
                        {branches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name} ({b.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => {
                          setCloneFromId(tpl.id);
                          setNewTemplateName(`${tpl.name} (Copy)`);
                          setNewTemplateDesc(tpl.description);
                          setShowCreateModal(true);
                        }}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-[11px] flex items-center gap-1 transition"
                        title="Duplicate this template for another branch"
                      >
                        <Copy className="w-3.5 h-3.5" /> Duplicate
                      </button>

                      {!tpl.isDefault && (
                        <button
                          onClick={() => handleDeleteTemplate(tpl)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                          title="Delete Template"
                        >
                          <Trash2 className="w-4 h-4 text-rose-500" />
                        </button>
                      )}

                      <Link
                        href={`/hr/card-designs/${tpl.id}/designer`}
                        className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold flex items-center gap-1 transition shadow-sm"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Launch Designer <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Active Template Version History */}
          <div className="rounded-xl bg-white dark:bg-[#111827]/90 border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm h-fit">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <History className="w-4 h-4 text-red-500" /> Version History
              </h3>
              <span className="text-[10px] text-slate-500">Immutable Records</span>
            </div>

            {activeTemplate ? (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 mb-2 text-xs">
                  <div className="font-bold text-slate-900 dark:text-white">{activeTemplate.name}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-slate-400" />
                    {activeTemplate.branchName}
                  </div>
                </div>

                {activeTemplate.versions && activeTemplate.versions.length > 0 ? (
                  activeTemplate.versions.map((ver) => (
                    <div
                      key={ver.id}
                      className={`p-3.5 rounded-lg border text-xs transition ${
                        ver.status === 'PUBLISHED'
                          ? 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800/80'
                          : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          {ver.versionTag}
                          {ver.status === 'PUBLISHED' && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-bold">
                              Current
                            </span>
                          )}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 capitalize">{ver.status.toLowerCase()}</span>
                      </div>
                      <div className="text-slate-600 dark:text-slate-400 text-[11px] mb-2">{ver.changelog || 'Updated template layout'}</div>
                      <div className="text-[10px] text-slate-500">
                        Published: {new Date(ver.publishedAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-slate-500 text-xs">No version history records found.</div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-500 text-xs">Select a template to view version history.</div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Create or Duplicate Branch Template */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-red-500" />
                {cloneFromId ? 'Duplicate Template for Branch' : 'Create Branch ID Template'}
              </h2>
            </div>

            <form onSubmit={handleCreateTemplate} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">Template Name</label>
                <input
                  type="text"
                  required
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder="e.g. Sorsogon Branch Security Badge"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">Description</label>
                <input
                  type="text"
                  value={newTemplateDesc}
                  onChange={(e) => setNewTemplateDesc(e.target.value)}
                  placeholder="e.g. Customized front Maroon stripe with branch QR verification"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">Assigned Branch</label>
                <select
                  value={newTemplateBranchId}
                  onChange={(e) => setNewTemplateBranchId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-red-500"
                >
                  <option value="ALL">All Branches (Global Default)</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold shadow flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Confirm & Create Template'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
