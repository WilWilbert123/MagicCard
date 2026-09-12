'use client';

import React, { useRef, useEffect } from 'react';
import { CardTemplateJSON, renderCardToCanvas } from '@workspace/card-engine';
import { enterpriseStore } from '@/lib/data/enterpriseStore';

interface Card2DViewerProps {
  template: CardTemplateJSON;
  side: 'front' | 'back';
  employeeData?: any;
  employeeNumber?: string;
  className?: string;
}

const fallbackEmployee = {
  id: 'preview-emp-125',
  employeeNumber: 'EMP-000125',
  firstName: 'Michael',
  lastName: 'Brown',
  fullName: 'Michael Brown',
  department: 'Global Operations',
  departmentName: 'Global Operations',
  position: 'Staff',
  positionTitle: 'Staff',
  branch: 'West Coast Tech Campus',
  branchName: 'West Coast Tech Campus',
  email: 'm.brown@magiccard.corp',
  photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80',
  status: 'active' as const,
};

export default function Card2DViewer({
  template,
  side,
  employeeData,
  employeeNumber,
  className = '',
}: Card2DViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const controller = new AbortController();

    const employee =
      employeeData ||
      (employeeNumber ? enterpriseStore.findEmployeeByNumber(employeeNumber) : null) ||
      fallbackEmployee;

    renderCardToCanvas(canvas, template, side, employee, {
      scale: 2,
      signal: controller.signal,
    }).catch((err) => {
      if (err?.name !== 'AbortError') {
        console.warn(`Card2DViewer error rendering ${side}:`, err);
      }
    });

    return () => {
      controller.abort();
    };
  }, [template, side, employeeData, employeeNumber]);

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
