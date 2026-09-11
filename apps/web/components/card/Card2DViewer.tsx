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

    const employee =
      employeeData ||
      (employeeNumber ? enterpriseStore.findEmployeeByNumber(employeeNumber) : null) ||
      fallbackEmployee;

    renderCardToCanvas(canvas, template, side, employee, { scale: 2 }).catch((err) =>
      console.warn(`Card2DViewer error rendering ${side}:`, err)
    );
  }, [template, side, employeeData, employeeNumber]);

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-auto max-w-[520px] rounded-[20px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] border border-slate-700/80 block"
      />
    </div>
  );
}
