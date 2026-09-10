'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Palette, 
  Plus, 
  ExternalLink, 
  CheckCircle2, 
  History, 
  Layers, 
  ArrowUpRight,
  MoreVertical,
  Box
} from 'lucide-react';
import { enterpriseStore } from '@/lib/data/enterpriseStore';

export default function HrCardDesignsPage() {
  const [template] = useState(enterpriseStore.activeTemplate);
  const [versions] = useState(enterpriseStore.templateVersions);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Card Designs & Templates</h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs">
            Design enterprise ID credentials, manage immutable versions, and synchronize fleet KIOSKs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/hr/card-designs/template-acme-cr80/designer"
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-md shadow-red-600/20 transition flex items-center gap-1.5"
          >
            <Palette className="w-4 h-4" /> Open 2D Canvas Designer
          </Link>
        </div>
      </div>

      {/* Main Template Overview Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Template Details Card */}
        <div className="lg:col-span-2 rounded-xl bg-white dark:bg-[#111827]/90 border border-slate-200/80 dark:border-slate-800 p-6 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800">
                  CR80 Standard (85.60 x 53.98 mm)
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Published & Active
                </span>
              </div>
              <span className="text-xs text-slate-500 font-mono">ID: template-acme-cr80</span>
            </div>

            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{template.name}</h2>
            <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed mb-6">
              {template.description}
            </p>

            {/* Dimensional Specifications */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-6">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-semibold">Dimensions</span>
                <span className="font-semibold text-slate-900 dark:text-white">85.60 × 53.98 mm</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-semibold">Thickness</span>
                <span className="font-semibold text-slate-900 dark:text-white">0.76 mm PVC</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-semibold">Print Bleed</span>
                <span className="font-semibold text-slate-900 dark:text-white">1.5 mm</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-semibold">Safe Margin</span>
                <span className="font-semibold text-slate-900 dark:text-white">3.0 mm</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Elements: <strong className="text-slate-900 dark:text-white">{template.front.elements.length}</strong> (Front) • <strong className="text-slate-900 dark:text-white">{template.back.elements.length}</strong> (Back)
            </span>
            <div className="flex items-center gap-2">
              <Link
                href="/hr/card-designs/template-acme-cr80/designer"
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white text-xs font-semibold flex items-center gap-1 transition"
              >
                Launch Editor <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Template Versions List */}
        <div className="rounded-xl bg-white dark:bg-[#111827]/90 border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <History className="w-4 h-4 text-red-500" /> Version History
            </h3>
            <span className="text-[10px] text-slate-500">Immutable Records</span>
          </div>

          <div className="space-y-3">
            {versions.map((ver) => (
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
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        Current
                      </span>
                    )}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 capitalize">{ver.status.toLowerCase()}</span>
                </div>
                <div className="text-slate-600 dark:text-slate-400 text-[11px] mb-2">{ver.changelog}</div>
                <div className="text-[10px] text-slate-500">
                  Published: {new Date(ver.publishedAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
