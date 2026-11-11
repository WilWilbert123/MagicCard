'use client';

import { useState, useEffect, useRef } from 'react';
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
  QrCode,
  Barcode,
  Eye,
  X,
  Filter,
  Download,
  Upload,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { toast } from '@/components/ui/Toast';
import { resolveDataBinding } from '@workspace/card-engine';
import { createFallbackEmployee, DEFAULT_AVATAR_PLACEHOLDER, DEFAULT_CR80_TEMPLATE } from '@/lib/data/enterpriseStore';

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

function colorToRgba(colorStr: string | undefined, alpha: number): string {
  if (!colorStr) return `rgba(220, 38, 38, ${alpha})`;
  const str = colorStr.trim().toLowerCase();

  if (str.startsWith('#')) {
    let hex = str.slice(1);
    if (hex.length === 3) {
      hex = hex.split('').map((c) => c + c).join('');
    }
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      }
    }
    if (hex.length === 8) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      const origAlpha = parseInt(hex.slice(6, 8), 16) / 255;
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
        return `rgba(${r}, ${g}, ${b}, ${origAlpha * alpha})`;
      }
    }
  }

  const rgbMatch = str.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1], 10);
    const g = parseInt(rgbMatch[2], 10);
    const b = parseInt(rgbMatch[3], 10);
    const origAlpha = rgbMatch[4] !== undefined ? parseFloat(rgbMatch[4]) : 1;
    return `rgba(${r}, ${g}, ${b}, ${origAlpha * alpha})`;
  }

  const colorMap: Record<string, [number, number, number]> = {
    red: [239, 68, 68],
    pink: [236, 72, 153],
    purple: [168, 85, 247],
    violet: [139, 92, 246],
    blue: [59, 130, 246],
    cyan: [6, 182, 212],
    teal: [20, 184, 166],
    green: [34, 197, 94],
    yellow: [234, 179, 8],
    orange: [249, 115, 22],
    white: [255, 255, 255],
    black: [0, 0, 0],
    slate: [100, 116, 139],
  };

  if (colorMap[str]) {
    const [r, g, b] = colorMap[str];
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  return alpha === 0 ? 'rgba(0,0,0,0)' : str;
}

function MiniCard2DPreview({ layout, settings }: { layout?: any; settings?: any }) {
  const [activeSide, setActiveSide] = useState<'front' | 'back'>('front');
  const fallbackEmployee = createFallbackEmployee(settings);

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

  // Target preview container dimensions for prominent view inside square card
  const targetW = isVertical ? 230 : 370;
  const targetH = isVertical ? 364 : 233;
  const scale = targetW / cardW;

  const surface = activeSide === 'front' ? layout.front : layout.back;
  const elements = surface?.elements || [];
  const bgColor = surface?.background?.color || (activeSide === 'front' ? '#ffffff' : '#f8fafc');

  const frontCount = layout.front?.elements?.length || 0;
  const backCount = layout.back?.elements?.length || 0;

  return (
    <div className="flex flex-col items-center shrink-0 my-1" onClick={(e) => e.stopPropagation()}>
      {/* Front / Back surface switcher pill */}
      <div className="flex items-center gap-1 mb-2 bg-slate-100 dark:bg-slate-900/90 p-1 rounded-lg border border-slate-200 dark:border-slate-800 text-[10px]">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setActiveSide('front');
          }}
          className={`px-2 py-0.5 rounded font-semibold transition ${activeSide === 'front'
              ? 'bg-red-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
        >
          Front ({frontCount})
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setActiveSide('back');
          }}
          className={`px-2 py-0.5 rounded font-semibold transition ${activeSide === 'back'
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
                    {resolveDataBinding(el.text, fallbackEmployee, settings?.verificationBaseUrl)}
                  </div>
                )}

                {el.type === 'EMPLOYEE_PHOTO' && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={fallbackEmployee.photoUrl || DEFAULT_AVATAR_PLACEHOLDER}
                    alt="Photo"
                    style={{
                      borderRadius: `${el.borderRadius || 10}px`,
                      borderWidth: `${el.borderWidth || 2}px`,
                      borderColor: el.borderColor || '#e2e8f0',
                    }}
                    className="w-full h-full object-cover shadow-xs"
                  />
                )}

                {el.type === 'IMAGE' && (el.src || (el as any).data) && (

                  <img
                    src={resolveDataBinding(el.src || '', fallbackEmployee, settings?.verificationBaseUrl) || fallbackEmployee.companyLogoUrl || el.src}
                    alt="Image"
                    style={{
                      filter: ((el as any).tintColor === '#ffffff' || (el as any).tintColor === 'white')
                        ? 'brightness(0) invert(1)'
                        : ((el as any).tintColor === '#000000' || (el as any).tintColor === 'black')
                          ? 'brightness(0)'
                          : undefined,
                      borderRadius: el.borderRadius ? `${el.borderRadius}px` : undefined,
                      borderWidth: el.borderWidth ? `${el.borderWidth}px` : undefined,
                      borderColor: el.borderColor,
                      objectFit: el.objectFit || 'contain',
                    }}
                    className="w-full h-full"
                  />
                )}

                {el.type === 'QR_CODE' && (
                  <div className="w-full h-full bg-white p-1 border border-slate-200 flex items-center justify-center rounded">
                    <QrCode className="w-full h-full text-slate-900" />
                  </div>
                )}

                {el.type === 'BARCODE' && (
                  <div
                    className="w-full h-full p-1 flex flex-col items-center justify-center rounded"
                    style={{
                      backgroundColor: el.backgroundColor && el.backgroundColor !== 'transparent' ? el.backgroundColor : 'transparent',
                      color: el.lineColor || '#000000',
                    }}
                  >
                    <Barcode className="w-full h-3/4" style={{ color: el.lineColor || '#000000' }} />
                    <span className="text-[9px] font-mono" style={{ color: el.lineColor || '#000000' }}>EMP-000125</span>
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
                    {el.shapeType === 'WAVE_HORIZONTAL' && (
                      <svg className="w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <path
                          d="M 0 35 C 20 5, 40 85, 65 45 C 80 20, 92 10, 100 25 L 100 100 L 0 100 Z"
                          fill={el.fill || '#dc2626'}
                          stroke={el.stroke || 'none'}
                          strokeWidth={el.strokeWidth || 0}
                        />
                      </svg>
                    )}
                    {el.shapeType === 'WAVE_VERTICAL' && (
                      <svg className="w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <path
                          d="M 35 0 C 5 20, 85 40, 45 65 C 20 80, 10 92, 25 100 L 100 100 L 100 0 Z"
                          fill={el.fill || '#dc2626'}
                          stroke={el.stroke || 'none'}
                          strokeWidth={el.strokeWidth || 0}
                        />
                      </svg>
                    )}
                    {el.shapeType === 'SMOKE' && (
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          background: `radial-gradient(circle at center, ${colorToRgba(el.fill || '#dc2626', 1)} 0%, ${colorToRgba(el.fill || '#dc2626', 0.5)} 45%, ${colorToRgba(el.fill || '#dc2626', 0)} 70%)`,
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
  const [systemSettings, setSystemSettings] = useState<any>(null);

  // Branch filter state
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('ALL');

  // Modal State for New / Duplicate Template
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDesc, setNewTemplateDesc] = useState('');
  const [newTemplateBranchId, setNewTemplateBranchId] = useState('ALL');
  const [cloneFromId, setCloneFromId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal State for Import Template
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importedLayout, setImportedLayout] = useState<any | null>(null);
  const [importTemplateName, setImportTemplateName] = useState('');
  const [importTemplateDesc, setImportTemplateDesc] = useState('');
  const [importBranchId, setImportBranchId] = useState('ALL');
  const [importIsDefault, setImportIsDefault] = useState(false);
  const [importError, setImportError] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal State for Version History
  const [historyTemplate, setHistoryTemplate] = useState<CardTemplateItem | null>(null);

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
    fetch('/api/settings', { cache: 'no-store' })
      .then((r) => r.json())
      .then((json) => {
        if (json.data) setSystemSettings(json.data);
      })
      .catch(() => {});
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
    if (templates.length <= 1) {
      toast.error('Cannot delete the only remaining card template in your fleet.');
      return;
    }

    const confirmMsg = template.isDefault
      ? `Template "${template.name}" is currently marked as default fallback. Deleting it will reassign default fallback to another template. Are you sure you want to delete it?`
      : `Are you sure you want to delete template "${template.name}"?`;

    if (!confirm(confirmMsg)) return;

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

  const handleExportTemplate = (tpl: CardTemplateItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    try {
      const exportData = {
        schema: 'magiccard-card-template',
        schemaVersion: '1.0',
        exportedAt: new Date().toISOString(),
        template: {
          name: tpl.name,
          description: tpl.description || '',
          versionTag: tpl.versionTag,
          cardDimensions: tpl.layout?.card || {
            width: 1013,
            height: 638,
            orientation: 'horizontal',
          },
          layout: tpl.layout || DEFAULT_CR80_TEMPLATE,
        },
      };

      const jsonStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const safeName = (tpl.name || 'template').toLowerCase().replace(/[^a-z0-9]+/g, '_');
      link.setAttribute('download', `magiccard_${safeName}_${tpl.versionTag || 'v1'}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Exported "${tpl.name}" successfully!`);
    } catch (err: any) {
      toast.error('Failed to export template: ' + (err.message || 'Unknown error'));
    }
  };

  const handleFileSelect = (file: File) => {
    setImportError('');
    setImportFile(file);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        if (!text) throw new Error('File content is empty.');

        const parsed = JSON.parse(text);

        let layoutToUse: any = null;
        let detectedName = file.name
          .replace(/\.[^/.]+$/, '')
          .replace(/^magiccard_/i, '')
          .replace(/_v\d+.*$/i, '')
          .replace(/_template.*$/i, '')
          .replace(/_/g, ' ');
        let detectedDesc = '';

        if (parsed?.template?.layout) {
          layoutToUse = parsed.template.layout;
          if (parsed.template.name) detectedName = parsed.template.name;
          if (parsed.template.description) detectedDesc = parsed.template.description;
        } else if (parsed?.layout) {
          layoutToUse = parsed.layout;
          if (parsed.name) detectedName = parsed.name;
          if (parsed.description) detectedDesc = parsed.description;
        } else if (parsed?.front || parsed?.back || parsed?.card) {
          layoutToUse = parsed;
        } else {
          throw new Error('Invalid template format. The JSON file must contain card, front, or back definitions.');
        }

        if (!layoutToUse.front && !layoutToUse.back) {
          throw new Error('Invalid card template: missing front or back definitions.');
        }

        if (!layoutToUse.card) {
          layoutToUse.card = {
            width: 1013,
            height: 638,
            orientation: 'horizontal',
            unit: 'px',
          };
        }
        if (!layoutToUse.front) layoutToUse.front = { elements: [] };
        if (!layoutToUse.back) layoutToUse.back = { elements: [] };

        setImportedLayout(layoutToUse);
        setImportTemplateName(detectedName.trim().charAt(0).toUpperCase() + detectedName.trim().slice(1));
        setImportTemplateDesc(detectedDesc || 'Imported enterprise ID credential template.');
      } catch (err: any) {
        setImportError(err.message || 'Failed to parse JSON template file.');
        setImportedLayout(null);
      }
    };
    reader.onerror = () => {
      setImportError('Failed to read file from disk.');
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importedLayout || !importTemplateName.trim()) return;

    setIsImporting(true);
    try {
      const res = await fetch('/api/card-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: importTemplateName.trim(),
          description: importTemplateDesc.trim(),
          branchId: importBranchId,
          isDefault: importIsDefault,
          layout: importedLayout,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to import template');

      toast.success(`Template "${importTemplateName}" imported successfully!`);
      setShowImportModal(false);
      setImportFile(null);
      setImportedLayout(null);
      setImportTemplateName('');
      setImportTemplateDesc('');
      setImportBranchId('ALL');
      setImportIsDefault(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsImporting(false);
    }
  };

  const filteredTemplates = templates.filter((tpl) => {
    if (selectedBranchFilter === 'ALL') return true;
    if (selectedBranchFilter === 'GLOBAL_ONLY') return tpl.isDefault;
    return tpl.branchId === selectedBranchFilter;
  });

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

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            title="Refresh Templates"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => {
              setShowImportModal(true);
              setImportError('');
              setImportedLayout(null);
              setImportFile(null);
              setImportTemplateName('');
              setImportTemplateDesc('');
              setImportBranchId('ALL');
              setImportIsDefault(false);
            }}
            className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-xs transition flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span>Import Template</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-md shadow-red-600/20 transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Create Branch Template
          </button>
        </div>
      </div>

      {/* Top Filter Bar for Branch Templates */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-white dark:bg-[#111827]/90 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 shrink-0">
            <Filter className="w-4 h-4 text-red-500" />
            Filter by Branch:
          </span>

          <select
            value={selectedBranchFilter}
            onChange={(e) => setSelectedBranchFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-red-500 min-w-[240px]"
          >
            <option value="ALL">All Branches & Templates ({templates.length})</option>
            <option value="GLOBAL_ONLY">Global Default Only</option>
            {branches.map((b) => {
              const count = templates.filter((t) => t.branchId === b.id).length;
              return (
                <option key={b.id} value={b.id}>
                  {b.name} ({count} {count === 1 ? 'template' : 'templates'})
                </option>
              );
            })}
          </select>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] text-slate-400 font-mono">
            Showing {filteredTemplates.length} of {templates.length} templates
          </span>
        </div>
      </div>

      {/* Main Template Content: 2-Column Square Grid Layout */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-[#111827]/90 shadow-sm">
          <div className="w-5 h-5 border-2 border-slate-400 border-t-red-500 rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs">Loading card templates from database...</p>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl bg-white dark:bg-[#111827]/60 shadow-xs">
          <Building2 className="w-10 h-10 text-slate-400 mx-auto mb-3 opacity-60" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Branch-Specific Templates Found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            There are no custom ID card templates assigned to this branch yet. You can duplicate a global default template or create a new branch layout.
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              onClick={() => setSelectedBranchFilter('ALL')}
              className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg transition"
            >
              Show All Templates
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-lg transition flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Create Branch Template
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredTemplates.map((tpl) => {
            const isSelected = tpl.id === activeTemplateId;

            return (
              <div
                key={tpl.id}
                onClick={() => setActiveTemplateId(tpl.id)}
                className={`rounded-2xl bg-white dark:bg-[#111827]/95 border transition-all duration-200 p-6 cursor-pointer shadow-sm hover:shadow-xl flex flex-col justify-between min-h-[620px] relative ${isSelected
                    ? 'border-red-500/80 ring-2 ring-red-500/30 shadow-red-500/5'
                    : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
              >
                {/* Top Section: Header Badges & Small History Button */}
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-800 border border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800">
                        CR80 Standard
                      </span>

                      {/* Branch Scope Badge */}
                      {tpl.isDefault ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200 dark:bg-sky-950/80 dark:text-sky-300 dark:border-sky-800 flex items-center gap-1">
                          <Globe className="w-3 h-3 text-sky-500" />
                          All Branches
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200 dark:bg-purple-950/80 dark:text-purple-300 dark:border-purple-800 flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-purple-500" />
                          {tpl.branchName}
                        </span>
                      )}

                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Published ({tpl.versionTag})
                      </span>
                    </div>

                    {/* Small History Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setHistoryTemplate(tpl);
                      }}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 hover:border-red-300 dark:hover:border-red-800 transition flex items-center gap-1.5 text-[11px] font-semibold shadow-xs shrink-0"
                      title="View Version History"
                    >
                      <History className="w-3.5 h-3.5 text-red-500" />
                      History
                    </button>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white mb-0.5 flex items-center gap-2">
                      {tpl.name}
                      {tpl.isDefault && (
                        <span className="text-[10px] font-normal text-amber-500 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 px-2 py-0.5 rounded">
                          Fallback
                        </span>
                      )}
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed line-clamp-2">
                      {tpl.description || 'Custom ID badge template for corporate personnel credentials.'}
                    </p>
                  </div>
                </div>

                {/* Middle Section: Centered 2D Mini Card Preview */}
                <div className="flex-1 flex flex-col items-center justify-center my-3">
                  <MiniCard2DPreview layout={tpl.layout} settings={systemSettings} />

                  {/* Compact Specifications Pills */}
                  <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3 text-[10px] text-slate-500 dark:text-slate-400">
                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 font-medium">
                      85.60 × 53.98 mm
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 font-medium">
                      0.76 mm PVC
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 font-medium">
                      Bleed 1.5mm
                    </span>
                  </div>
                </div>

                {/* Bottom Section: Branch Selector & Action Buttons */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
                  {/* Branch Selector */}
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <select
                      value={tpl.branchId || 'ALL'}
                      onChange={(e) => handleBranchChange(tpl.id, e.target.value)}
                      className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-lg px-2 py-1 text-[11px] text-slate-900 dark:text-white font-medium focus:outline-none focus:border-red-500 max-w-[160px] truncate"
                    >
                      <option value="ALL">All Branches</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => {
                        setCloneFromId(tpl.id);
                        setNewTemplateName(`${tpl.name} (Copy)`);
                        setNewTemplateDesc(tpl.description);
                        setShowCreateModal(true);
                      }}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-[11px] flex items-center gap-1 transition"
                      title="Duplicate Template"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={(e) => handleExportTemplate(tpl, e)}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-[11px] flex items-center gap-1 transition"
                      title="Export Template (JSON)"
                    >
                      <Download className="w-3.5 h-3.5 text-blue-500" />
                    </button>

                    {templates.length > 1 && (
                      <button
                        onClick={() => handleDeleteTemplate(tpl)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition"
                        title={tpl.isDefault ? "Delete Template (Will reassign default fallback)" : "Delete Template"}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                      </button>
                    )}

                    <Link
                      href={`/hr/card-designs/${tpl.id}/designer`}
                      className="px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[11px] font-semibold flex items-center gap-1 transition shadow-xs shrink-0"
                    >
                      <Edit3 className="w-3 h-3" /> Designer <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Version History */}
      {historyTemplate && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-red-500" />
                  Version History
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Immutable records for <span className="font-semibold text-slate-700 dark:text-slate-200">{historyTemplate.name}</span>
                </p>
              </div>
              <button
                onClick={() => setHistoryTemplate(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {historyTemplate.versions && historyTemplate.versions.length > 0 ? (
                historyTemplate.versions.map((ver) => (
                  <div
                    key={ver.id}
                    className={`p-3.5 rounded-xl border text-xs transition ${ver.status === 'PUBLISHED'
                        ? 'bg-red-50/60 border-red-200 dark:bg-red-950/30 dark:border-red-800/80'
                        : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'
                      }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-xs">
                        {ver.versionTag}
                        {ver.status === 'PUBLISHED' && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-bold">
                            Current
                          </span>
                        )}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded font-mono uppercase bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {ver.status}
                      </span>
                    </div>
                    <div className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed mb-2">
                      {ver.changelog || 'Updated template layout and elements'}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      Published: {new Date(ver.publishedAt).toLocaleDateString()}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-500 text-xs">No version history records found.</div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setHistoryTemplate(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create or Duplicate Branch Template */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
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

      {/* Modal: Import Card Template */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4 my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Upload className="w-4 h-4 text-red-500" />
                  Import Card Template
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Upload an exported MagicCard JSON template to add it to your fleet.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                  setImportedLayout(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Upload Area */}
            <div>
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleFileSelect(file);
                }}
                className={`p-6 border-2 border-dashed rounded-xl text-center cursor-pointer transition ${
                  importFile
                    ? 'border-emerald-400 dark:border-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/20'
                    : 'border-slate-300 dark:border-slate-700 hover:border-red-500/60 bg-slate-50 dark:bg-slate-900/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                />
                {importFile ? (
                  <div className="flex flex-col items-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-1" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{importFile.name}</span>
                    <span className="text-[10px] text-slate-500 mt-0.5">
                      {(importFile.size / 1024).toFixed(1)} KB • Click or drop another file to replace
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <Upload className="w-8 h-8 text-slate-400 mb-2" />
                    <span className="text-xs font-semibold text-red-600 dark:text-red-400 hover:underline">
                      Click to choose a JSON template or drag and drop here
                    </span>
                    <span className="text-[11px] text-slate-400 mt-1">Accepts MagicCard .json template files</span>
                  </div>
                )}
              </div>
            </div>

            {importError && (
              <div className="p-3 rounded-lg bg-red-100 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-200 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{importError}</span>
              </div>
            )}

            {/* Imported Template Preview & Details Form */}
            {importedLayout && (
              <form onSubmit={handleConfirmImport} className="space-y-4 pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left: Metadata inputs */}
                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">
                        Template Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={importTemplateName}
                        onChange={(e) => setImportTemplateName(e.target.value)}
                        placeholder="e.g. Executive Corporate Badge"
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-red-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">
                        Description
                      </label>
                      <input
                        type="text"
                        value={importTemplateDesc}
                        onChange={(e) => setImportTemplateDesc(e.target.value)}
                        placeholder="e.g. Imported template layout"
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-red-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">
                        Assign to Branch
                      </label>
                      <select
                        value={importBranchId}
                        onChange={(e) => setImportBranchId(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-red-500"
                      >
                        <option value="ALL">All Branches</option>
                        {branches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name} ({b.code})
                          </option>
                        ))}
                      </select>
                      <label className="flex items-center gap-2 cursor-pointer mt-2 text-xs text-slate-600 dark:text-slate-400 select-none">
                        <input
                          type="checkbox"
                          checked={importIsDefault}
                          onChange={(e) => setImportIsDefault(e.target.checked)}
                          className="rounded text-red-600 focus:ring-red-500 w-3.5 h-3.5"
                        />
                        <span>Set as Global Default Fallback template</span>
                      </label>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                      <div>Elements: <strong>{importedLayout.front?.elements?.length || 0} Front</strong>, <strong>{importedLayout.back?.elements?.length || 0} Back</strong></div>
                      <div>Orientation: <strong>{importedLayout.card?.orientation || 'horizontal'}</strong> ({importedLayout.card?.width || 1013} × {importedLayout.card?.height || 638}px)</div>
                    </div>
                  </div>

                  {/* Right: Live Preview */}
                  <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-100/60 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                      Live Preview
                    </span>
                    <MiniCard2DPreview layout={importedLayout} settings={systemSettings} />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowImportModal(false);
                      setImportFile(null);
                      setImportedLayout(null);
                      setImportIsDefault(false);
                    }}
                    className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isImporting || !importTemplateName.trim()}
                    className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold text-xs shadow flex items-center gap-1.5 disabled:opacity-50 transition"
                  >
                    {isImporting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Confirm & Import Template
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

