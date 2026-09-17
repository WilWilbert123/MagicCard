'use client';

import React, { useRef, useEffect, useState } from 'react';
import { CardTemplateJSON, renderCardToCanvas } from '@workspace/card-engine';
import { enterpriseStore, createFallbackEmployee } from '@/lib/data/enterpriseStore';

interface Card2DViewerProps {
  template: CardTemplateJSON;
  side: 'front' | 'back';
  employeeData?: any;
  employeeNumber?: string;
  baseUrl?: string;
  className?: string;
}

export default function Card2DViewer({
  template,
  side,
  employeeData,
  employeeNumber,
  baseUrl,
  className = '',
}: Card2DViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    if (!employeeData && !employeeNumber) {
      fetch('/api/settings', { cache: 'no-store' })
        .then((r) => r.json())
        .then((json) => {
          if (json.data) setSettings(json.data);
        })
        .catch(() => {});
    }
  }, [employeeData, employeeNumber]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const controller = new AbortController();

    const fallback = createFallbackEmployee(settings);

    const employee =
      employeeData ||
      (employeeNumber ? enterpriseStore.findEmployeeByNumber(employeeNumber) : null) ||
      fallback;

    renderCardToCanvas(canvas, template, side, employee, {
      scale: 2,
      baseUrl: baseUrl || settings?.verificationBaseUrl || 'https://magic-card-trust-id.vercel.app',
      signal: controller.signal,
    }).catch((err) => {
      if (err?.name !== 'AbortError') {
        console.warn(`Card2DViewer error rendering ${side}:`, err);
      }
    });

    return () => {
      controller.abort();
    };
  }, [template, side, employeeData, employeeNumber, settings]);

  const isVertical =
    template?.card?.orientation === 'vertical' ||
    (template?.card?.height > template?.card?.width);

  return (
    <div className={`relative flex items-center justify-center p-2 ${className}`}>
      <canvas
        ref={canvasRef}
        className={`rounded-[18px] shadow-[0_20px_50px_-10px_rgba(0,0,0,0.6)] border border-slate-700/80 block object-contain ${
          isVertical ? 'max-h-[350px] max-w-[230px]' : 'max-h-[260px] max-w-[420px]'
        }`}
      />
    </div>
  );
}
