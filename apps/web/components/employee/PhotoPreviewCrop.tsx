'use client';

import React, { useState, useRef } from 'react';
import { Image as ImageIcon, ZoomIn, ZoomOut, RefreshCw, Check, AlertCircle, User } from 'lucide-react';

interface PhotoPreviewCropProps {
  photoUrl: string;
  onChange: (url: string) => void;
}

export default function PhotoPreviewCrop({ photoUrl, onChange }: PhotoPreviewCropProps) {
  const [zoom, setZoom] = useState(1);
  const [focusX, setFocusX] = useState(50); // percentage 0-100
  const [focusY, setFocusY] = useState(50); // percentage 0-100
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, initX: 50, initY: 50 });
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [showGuide, setShowGuide] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!photoUrl || imgError) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      initX: focusX,
      initY: focusY,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    // Sensible scaling: 130px container width maps to focal percentage
    const sensitivity = 80 / zoom;
    const newFocusX = Math.max(0, Math.min(100, dragStart.initX - (dx / 130) * sensitivity));
    const newFocusY = Math.max(0, Math.min(100, dragStart.initY - (dy / 165) * sensitivity));
    setFocusX(newFocusX);
    setFocusY(newFocusY);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleReset = () => {
    setZoom(1);
    setFocusX(50);
    setFocusY(50);
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold text-xs flex items-center justify-between">
          <span>Photo URL (Optional)</span>
          {photoUrl && imgLoaded && !imgError && (
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
              <Check className="w-3 h-3" /> Valid Image
            </span>
          )}
        </label>
        <div className="relative">
          <input
            type="text"
            placeholder="https://images.unsplash.com/..."
            value={photoUrl}
            onChange={(e) => {
              setImgError(false);
              setImgLoaded(false);
              onChange(e.target.value);
            }}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition text-[11px] pr-8"
          />
          {photoUrl && (
            <button
              type="button"
              onClick={() => {
                onChange('');
                setImgError(false);
                setImgLoaded(false);
                handleReset();
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 text-xs transition"
              title="Clear Photo URL"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Interactive Crop & Preview Canvas Container */}
      <div className="bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row items-center gap-4">
        {/* Preview Frame Box (CR80 ID Ratio 3:4) */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className={`relative w-[130px] h-[165px] rounded-xl overflow-hidden bg-slate-900 border-2 ${
            isDragging ? 'border-red-500 cursor-grabbing shadow-lg' : 'border-slate-300 dark:border-slate-700 cursor-grab hover:border-red-400'
          } flex items-center justify-center select-none shrink-0 transition-colors shadow-md`}
        >
          {photoUrl && !imgError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrl}
              alt="Employee Preview"
              onLoad={() => {
                setImgLoaded(true);
                setImgError(false);
              }}
              onError={() => {
                setImgError(true);
                setImgLoaded(false);
              }}
              style={{
                objectFit: 'cover',
                objectPosition: `${focusX}% ${focusY}%`,
                transform: `scale(${zoom})`,
                transformOrigin: `${focusX}% ${focusY}%`,
                transition: isDragging ? 'none' : 'transform 0.15s ease-out, object-position 0.15s ease-out',
              }}
              className="w-full h-full pointer-events-none"
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-2 text-center text-slate-400 dark:text-slate-500">
              {imgError ? (
                <>
                  <AlertCircle className="w-6 h-6 text-red-400 mb-1" />
                  <span className="text-[10px] text-red-400 font-medium">Invalid Image</span>
                </>
              ) : (
                <>
                  <User className="w-8 h-8 mb-1 opacity-60" />
                  <span className="text-[10px] font-medium">No Photo</span>
                </>
              )}
            </div>
          )}

          {/* Facial Alignment Overlay Guide */}
          {photoUrl && imgLoaded && !imgError && showGuide && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center border border-red-500/20">
              <div className="w-[70%] h-[60%] rounded-full border border-dashed border-red-400/50 shadow-[0_0_10px_rgba(239,68,68,0.2)]" />
              <div className="absolute top-[38%] w-full border-t border-dotted border-red-400/40" />
            </div>
          )}
        </div>

        {/* Adjustments & Controls */}
        <div className="flex-1 space-y-2.5 w-full text-xs">
          <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
            <span className="font-semibold text-[11px] flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-red-500" /> Photo Framing & Focus
            </span>
            {photoUrl && (
              <button
                type="button"
                onClick={handleReset}
                className="text-[10px] text-slate-500 hover:text-red-500 dark:text-slate-400 flex items-center gap-1 transition font-medium"
              >
                <RefreshCw className="w-2.5 h-2.5" /> Reset Focus
              </button>
            )}
          </div>

          {/* Zoom Level Slider */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-medium">
              <span className="flex items-center gap-1"><ZoomOut className="w-3 h-3 text-red-400" /> Zoom Level</span>
              <span>{zoom.toFixed(1)}x</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.5, z - 0.2))}
                disabled={!photoUrl || imgError}
                className="p-1 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-300 dark:hover:bg-slate-700 transition"
              >
                <ZoomOut className="w-3 h-3" />
              </button>
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.1"
                value={zoom}
                disabled={!photoUrl || imgError}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full accent-red-600 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
              />
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
                disabled={!photoUrl || imgError}
                className="p-1 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-300 dark:hover:bg-slate-700 transition"
              >
                <ZoomIn className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Focal Pan Sliders */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200 dark:border-slate-800/80">
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                <span>Pan Vertical</span>
                <span>{Math.round(focusY)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={focusY}
                disabled={!photoUrl || imgError}
                onChange={(e) => setFocusY(parseFloat(e.target.value))}
                className="w-full accent-red-600 h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                <span>Pan Horizontal</span>
                <span>{Math.round(focusX)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={focusX}
                disabled={!photoUrl || imgError}
                onChange={(e) => setFocusX(parseFloat(e.target.value))}
                className="w-full accent-red-600 h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          {/* Toggle Alignment Guide */}
          <div className="flex items-center justify-between pt-1">
            <label className="text-[10px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={showGuide}
                onChange={(e) => setShowGuide(e.target.checked)}
                className="rounded text-red-600 focus:ring-red-500 h-3 w-3 border-slate-300 dark:border-slate-700"
              />
              Show Face Alignment Oval Guide
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
