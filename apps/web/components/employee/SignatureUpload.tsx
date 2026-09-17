'use client';

import React, { useRef, useState } from 'react';
import { Upload, X, PenTool, CheckCircle } from 'lucide-react';
import { toast } from '@/components/ui/Toast';

interface SignatureUploadProps {
  label: string;
  signatureUrl?: string;
  onChange: (url: string) => void;
}

export default function SignatureUpload({
  label,
  signatureUrl,
  onChange,
}: SignatureUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a valid image file (PNG, JPG, WEBP).');
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.url) {
        throw new Error(json.error || 'Failed to upload signature');
      }

      onChange(json.url);
      toast.success(`${label} uploaded successfully!`);
    } catch (err: any) {
      // Fallback to local Data URL
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          onChange(reader.result as string);
          toast.success(`${label} loaded from local image.`);
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    onChange('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-1.5">
      <label className="block text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <PenTool className="w-3.5 h-3.5 text-red-500" />
          {label}
        </span>
        {signatureUrl && (
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> Ready
          </span>
        )}
      </label>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        onChange={handleFileChange}
        className="hidden"
      />

      {signatureUrl ? (
        <div className="relative group border border-slate-200 dark:border-slate-700 rounded-xl p-2 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between gap-2">
          <div className="h-12 w-full bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 p-1 flex items-center justify-center overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={signatureUrl}
              alt={label}
              className="max-h-full max-w-full object-contain filter drop-shadow-xs"
            />
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="p-1.5 rounded-lg bg-red-100 hover:bg-red-200 dark:bg-red-950/60 dark:hover:bg-red-900 text-red-600 dark:text-red-400 transition"
            title="Remove signature"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="w-full h-14 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-red-500 dark:hover:border-red-500 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 gap-1 text-[11px]"
        >
          {isUploading ? (
            <div className="flex items-center gap-1.5 text-red-500 font-medium">
              <div className="w-3.5 h-3.5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
              Uploading signature...
            </div>
          ) : (
            <>
              <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                <Upload className="w-3.5 h-3.5 text-red-500" />
                Upload {label}
              </div>
              <span className="text-[10px] text-slate-400">PNG / JPG (Transparent PNG recommended)</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
