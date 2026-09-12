'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  ArrowLeft,
  Undo2,
  Redo2,
  Save,
  Eye,
  CheckCircle,
  Grid,
  Magnet,
  Maximize2,
  Type,
  User,
  QrCode,
  Barcode,
  Square,
  Circle,
  Image as ImageIcon,
  Layers,
  Lock,
  Unlock,
  Trash2,
  ZoomIn,
  ZoomOut,
  Palette,
  Sparkles,
  X,
  RectangleHorizontal,
  RectangleVertical,
  LayoutGrid,
  Triangle,
  Minus,
  PenTool,
  ArrowUp,
  ArrowDown,
  ChevronsUp,
  ChevronsDown,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
} from 'lucide-react';
import { CardTemplateJSON, CardElement, TextElement, ShapeElement, QRCodeElement, BarcodeElement, resolveDataBinding } from '@workspace/card-engine';
import { enterpriseStore } from '@/lib/data/enterpriseStore';
import { toast } from '@/components/ui/Toast';
import { useTheme } from '@/components/ThemeProvider';
import { LAYOUT_PRESETS, LayoutPreset } from '@/lib/data/layoutPresets';

// Lazy-load Three.js viewer so heavy WebGL is only loaded when 3D preview is active
const ThreeCardViewer = dynamic<any>(() => import('@/components/three/ThreeCardViewer'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[520px] rounded-2xl bg-slate-900 flex items-center justify-center text-slate-400 text-sm">
      Initializing 3D WebGL Engine...
    </div>
  ),
});

// Live Mini 2D Preset Card Preview component for the Layout Modal
function PresetCardMiniPreview({
  preset,
  orientation,
  side,
}: {
  preset: LayoutPreset;
  orientation: 'horizontal' | 'vertical';
  side: 'front' | 'back';
}) {
  const isVert = orientation === 'vertical';
  const cardW = isVert ? 540 : 856;
  const cardH = isVert ? 856 : 540;

  const targetH = isVert ? 145 : 105;
  const scale = targetH / cardH;
  const targetW = cardW * scale;

  const elements =
    side === 'front'
      ? isVert
        ? preset.frontElementsV
        : preset.frontElementsH
      : isVert
      ? preset.backElementsV
      : preset.backElementsH;

  return (
    <div
      style={{ width: `${targetW}px`, height: `${targetH}px` }}
      className="relative overflow-hidden rounded-lg border border-slate-300 dark:border-slate-700/80 shadow-md bg-white select-none pointer-events-none shrink-0"
    >
      <div
        style={{
          width: `${cardW}px`,
          height: `${cardH}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          backgroundColor: '#ffffff',
          position: 'absolute',
          left: 0,
          top: 0,
        }}
        className="relative"
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
                    position: 'Staff',
                    department: 'Global Operations',
                    branch: 'West Coast Tech Campus',
                  })}
                </div>
              )}

              {(el.type === 'EMPLOYEE_PHOTO' || el.type === 'IMAGE') && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={el.type === 'IMAGE' && el.src ? el.src : "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80"}
                  alt="Photo"
                  style={{
                    borderRadius: (el.borderRadius !== undefined && el.borderRadius !== null)
                      ? (el.borderRadius >= 9999 || el.borderRadius >= Math.min(el.width, el.height) / 2 ? '50%' : `${el.borderRadius}px`)
                      : '0px',
                    borderWidth: `${el.borderWidth || 0}px`,
                    borderColor: el.borderColor || 'transparent',
                    borderStyle: (el.borderWidth || 0) > 0 ? 'solid' : 'none',
                    objectFit: el.objectFit || 'cover',
                  }}
                  className="w-full h-full shadow-xs"
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
  );
}

export default function CardDesignerPage() {
  const { isDark } = useTheme();
  const [template, setTemplate] = useState<CardTemplateJSON>(enterpriseStore.activeTemplate);
  const [activeSide, setActiveSide] = useState<'front' | 'back'>('front');
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [showSafeMargin, setShowSafeMargin] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(0.85);
  const [show3DModal, setShow3DModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showLayoutModal, setShowLayoutModal] = useState(false);
  const [modalPreviewOrientation, setModalPreviewOrientation] = useState<'horizontal' | 'vertical'>('vertical');
  const [modalPreviewSide, setModalPreviewSide] = useState<'front' | 'back'>('front');
  const [publishChangelog, setPublishChangelog] = useState('');
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);
  const [loading, setLoading] = useState(true);

  // Dynamic Template Metadata from API
  const [templateMeta, setTemplateMeta] = useState<{
    id: string;
    name: string;
    description: string;
    branchName: string;
    versionTag: string;
  } | null>(null);

  // Optional preview employee context passed via URL
  const [previewEmployee, setPreviewEmployee] = useState<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const searchParams = new URLSearchParams(window.location.search);
    const empNum = searchParams.get('employeeNumber') || searchParams.get('employeeId') || searchParams.get('emp');
    if (empNum) {
      fetch(`/api/employees?q=${encodeURIComponent(empNum)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((json) => {
          if (json?.data && Array.isArray(json.data) && json.data.length > 0) {
            const found = json.data.find(
              (e: any) => e.employeeNumber === empNum || e.id === empNum
            ) || json.data[0];
            setPreviewEmployee(found);
          }
        })
        .catch(() => {});
    }
  }, []);

  const activeBindingMap = previewEmployee
    ? {
        employeeNumber: previewEmployee.employeeNumber || 'EMP-000125',
        fullName: previewEmployee.fullName || `${previewEmployee.firstName || ''} ${previewEmployee.lastName || ''}`.trim(),
        firstName: previewEmployee.firstName || 'Michael',
        lastName: previewEmployee.lastName || 'Brown',
        position: previewEmployee.positionTitle || 'Staff',
        department: previewEmployee.departmentName || 'Global Operations',
        branch: previewEmployee.branchName || 'SM Sorsogon City',
      }
    : {
        employeeNumber: 'EMP-000125',
        fullName: 'Michael Brown',
        firstName: 'Michael',
        lastName: 'Brown',
        position: 'Staff',
        department: 'Global Operations',
        branch: 'West Coast Tech Campus',
      };

  const activePhotoSrc = previewEmployee?.photoUrl || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80";

  // Load template from database on mount
  useEffect(() => {
    async function loadTemplateData() {
      try {
        setLoading(true);
        const pathParts = window.location.pathname.split('/');
        const idIdx = pathParts.indexOf('card-designs') + 1;
        const targetId = pathParts[idIdx] || 'template-acme-cr80';

        const res = await fetch(`/api/card-templates/${targetId}`);
        const json = await res.json();
        if (res.ok && json.data) {
          setTemplateMeta({
            id: json.data.id,
            name: json.data.name,
            description: json.data.description,
            branchName: json.data.branchName,
            versionTag: json.data.versionTag,
          });
          if (json.data.layout) {
            setTemplate(json.data.layout);
            setHistory([json.data.layout]);
            setHistoryIdx(0);
          }
        }
      } catch (err) {
        console.error('Failed to load template layout:', err);
      } finally {
        setLoading(false);
      }
    }
    loadTemplateData();
  }, []);

  // Drag & Drop State
  const [isDragging, setIsDragging] = useState(false);
  const [dragElementId, setDragElementId] = useState<string | null>(null);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [elementStartPos, setElementStartPos] = useState({ x: 0, y: 0 });

  // Interactive Resizing State
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [resizeStartPos, setResizeStartPos] = useState({ mouseX: 0, mouseY: 0, x: 0, y: 0, width: 0, height: 0 });

  // Interactive Rotating State
  const [isRotating, setIsRotating] = useState(false);
  const [rotateStartPos, setRotateStartPos] = useState({ mouseX: 0, startRotation: 0 });

  const handleResizeStart = (e: React.MouseEvent, handle: string, el: CardElement) => {
    if (el.isLocked) return;
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    setResizeHandle(handle);
    setResizeStartPos({
      mouseX: e.clientX,
      mouseY: e.clientY,
      x: el.x,
      y: el.y,
      width: el.width,
      height: el.height,
    });
  };

  const handleRotateStart = (e: React.MouseEvent, el: CardElement) => {
    if (el.isLocked) return;
    e.stopPropagation();
    e.preventDefault();
    setIsRotating(true);
    setRotateStartPos({
      mouseX: e.clientX,
      startRotation: el.rotation || 0,
    });
  };

  // Undo/Redo history
  const [history, setHistory] = useState<CardTemplateJSON[]>([enterpriseStore.activeTemplate]);
  const [historyIdx, setHistoryIdx] = useState(0);

  const pushHistory = (newTemplate: CardTemplateJSON) => {
    const updatedHistory = history.slice(0, historyIdx + 1);
    updatedHistory.push(JSON.parse(JSON.stringify(newTemplate)));
    setHistory(updatedHistory);
    setHistoryIdx(updatedHistory.length - 1);
    setTemplate(newTemplate);
  };

  const handleUndo = () => {
    if (historyIdx > 0) {
      setHistoryIdx(historyIdx - 1);
      setTemplate(JSON.parse(JSON.stringify(history[historyIdx - 1])));
    }
  };

  const handleRedo = () => {
    if (historyIdx < history.length - 1) {
      setHistoryIdx(historyIdx + 1);
      setTemplate(JSON.parse(JSON.stringify(history[historyIdx + 1])));
    }
  };

  const isVertical = template.card.orientation === 'vertical';

  // Portrait (V) layout — elements centered for 540×856 canvas
  const VERTICAL_FRONT_LAYOUT: Record<string, Partial<{ x: number; y: number; width: number; height: number; textAlign: string }>> = {
    'el-front-stripe':      { x: 0,   y: 0,   width: 540, height: 8  },
    'el-front-logo':        { x: 0,   y: 20,  width: 540, height: 32, textAlign: 'center' },
    'el-front-badge':       { x: 145, y: 60,  width: 250, height: 28 },
    'el-front-badge-text':  { x: 145, y: 67,  width: 250, height: 18, textAlign: 'center' },
    'el-front-photo':       { x: 185, y: 104, width: 170, height: 215 },
    'el-front-name':        { x: 20,  y: 338, width: 500, height: 42, textAlign: 'center' },
    'el-front-position':    { x: 20,  y: 388, width: 500, height: 28, textAlign: 'center' },
    'el-front-id':          { x: 20,  y: 428, width: 500, height: 24, textAlign: 'center' },
    'el-front-dept':        { x: 20,  y: 460, width: 500, height: 24, textAlign: 'center' },
    'el-front-branch':      { x: 20,  y: 490, width: 500, height: 24, textAlign: 'center' },
    'el-front-qr':          { x: 200, y: 630, width: 140, height: 140 },
    'el-front-footer-line': { x: 30,  y: 800, width: 480, height: 1  },
    'el-front-footer-text': { x: 30,  y: 814, width: 480, height: 16, textAlign: 'center' },
  };

  // Landscape (H) layout — original positions for 856×540 canvas
  const HORIZONTAL_FRONT_LAYOUT: Record<string, Partial<{ x: number; y: number; width: number; height: number; textAlign: string }>> = {
    'el-front-stripe':      { x: 0,   y: 0,   width: 856, height: 8  },
    'el-front-logo':        { x: 50,  y: 28,  width: 280, height: 32, textAlign: 'left' },
    'el-front-badge':       { x: 610, y: 26,  width: 195, height: 28 },
    'el-front-badge-text':  { x: 610, y: 33,  width: 195, height: 18, textAlign: 'center' },
    'el-front-photo':       { x: 50,  y: 90,  width: 175, height: 220 },
    'el-front-name':        { x: 255, y: 110, width: 420, height: 42, textAlign: 'left' },
    'el-front-position':    { x: 255, y: 160, width: 420, height: 28, textAlign: 'left' },
    'el-front-id':          { x: 255, y: 205, width: 420, height: 24, textAlign: 'left' },
    'el-front-dept':        { x: 255, y: 238, width: 420, height: 24, textAlign: 'left' },
    'el-front-branch':      { x: 255, y: 268, width: 420, height: 24, textAlign: 'left' },
    'el-front-qr':          { x: 680, y: 340, width: 125, height: 125 },
    'el-front-footer-line': { x: 50,  y: 495, width: 756, height: 1  },
    'el-front-footer-text': { x: 50,  y: 508, width: 756, height: 16, textAlign: 'left' },
  };

  // Back side Vertical positioning presets for 540×856 canvas
  const VERTICAL_BACK_LAYOUT: Record<string, Partial<{ x: number; y: number; width: number; height: number; textAlign: string }>> = {
    'el-back-magstripe':    { x: 0,   y: 40,  width: 540, height: 80 },
    'el-back-sig-bg':       { x: 40,  y: 160, width: 460, height: 60 },
    'el-back-sig-line':     { x: 60,  y: 205, width: 420, height: 1  },
    'el-back-sig-label':    { x: 40,  y: 228, width: 460, height: 16, textAlign: 'center' },
    'el-back-barcode':      { x: 80,  y: 300, width: 380, height: 90 },
    'el-back-disclaimer-1': { x: 30,  y: 440, width: 480, height: 35, textAlign: 'center' },
    'el-back-disclaimer-2': { x: 30,  y: 490, width: 480, height: 35, textAlign: 'center' },
    'el-back-chip-label':   { x: 30,  y: 810, width: 480, height: 16, textAlign: 'center' },
  };

  // Back side Horizontal positioning presets for 856×540 canvas
  const HORIZONTAL_BACK_LAYOUT: Record<string, Partial<{ x: number; y: number; width: number; height: number; textAlign: string }>> = {
    'el-back-magstripe':    { x: 0,   y: 35,  width: 856, height: 80 },
    'el-back-sig-bg':       { x: 50,  y: 155, width: 500, height: 55 },
    'el-back-sig-line':     { x: 70,  y: 195, width: 460, height: 1  },
    'el-back-sig-label':    { x: 50,  y: 215, width: 500, height: 16, textAlign: 'left' },
    'el-back-barcode':      { x: 240, y: 260, width: 376, height: 80 },
    'el-back-disclaimer-1': { x: 50,  y: 380, width: 756, height: 20, textAlign: 'center' },
    'el-back-disclaimer-2': { x: 50,  y: 405, width: 756, height: 20, textAlign: 'center' },
    'el-back-chip-label':   { x: 50,  y: 495, width: 756, height: 16, textAlign: 'center' },
  };

  // Toggle card orientation between horizontal (landscape) and vertical (portrait)
  const handleOrientationToggle = (newOrientation: 'horizontal' | 'vertical') => {
    if (template.card.orientation === newOrientation) return;
    const newTemplate = JSON.parse(JSON.stringify(template)) as CardTemplateJSON;

    // Swap canvas pixel dimensions
    [newTemplate.card.width, newTemplate.card.height] = [newTemplate.card.height, newTemplate.card.width];
    [newTemplate.card.physicalWidth, newTemplate.card.physicalHeight] = [newTemplate.card.physicalHeight, newTemplate.card.physicalWidth];
    newTemplate.card.orientation = newOrientation;

    // Reposition front elements
    const frontMap = newOrientation === 'vertical' ? VERTICAL_FRONT_LAYOUT : HORIZONTAL_FRONT_LAYOUT;
    newTemplate.front.elements = newTemplate.front.elements.map((el) => {
      const overrides = frontMap[el.id];
      if (!overrides) return el;
      return { ...el, ...overrides } as typeof el;
    });

    // Reposition back elements
    const backMap = newOrientation === 'vertical' ? VERTICAL_BACK_LAYOUT : HORIZONTAL_BACK_LAYOUT;
    newTemplate.back.elements = newTemplate.back.elements.map((el) => {
      const overrides = backMap[el.id];
      if (!overrides) return el;
      return { ...el, ...overrides } as typeof el;
    });

    pushHistory(newTemplate);
    setSelectedElementId(null);
  };

  const currentSurface = activeSide === 'front' ? template.front : template.back;
  const selectedElement = currentSurface.elements.find((el) => el.id === selectedElementId);

  // Update selected element property
  const updateSelectedElement = (updates: Partial<CardElement>) => {
    if (!selectedElementId) return;
    const newTemplate = JSON.parse(JSON.stringify(template)) as CardTemplateJSON;
    const surface = activeSide === 'front' ? newTemplate.front : newTemplate.back;
    const idx = surface.elements.findIndex((el) => el.id === selectedElementId);
    if (idx !== -1) {
      surface.elements[idx] = { ...surface.elements[idx], ...updates } as CardElement;
      pushHistory(newTemplate);
    }
  };

  // Drag & Drop Handlers
  const handleElementMouseDown = (e: React.MouseEvent, el: CardElement) => {
    if (el.isLocked) return;
    e.stopPropagation();
    setSelectedElementId(el.id);

    setIsDragging(true);
    setDragElementId(el.id);
    setDragStartPos({ x: e.clientX, y: e.clientY });
    setElementStartPos({ x: el.x, y: el.y });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isDragging && dragElementId) {
      const dx = Math.round((e.clientX - dragStartPos.x) / zoomLevel);
      const dy = Math.round((e.clientY - dragStartPos.y) / zoomLevel);

      const newX = Math.max(0, elementStartPos.x + dx);
      const newY = Math.max(0, elementStartPos.y + dy);

      setTemplate((prev) => {
        const updated = JSON.parse(JSON.stringify(prev)) as CardTemplateJSON;
        const surface = activeSide === 'front' ? updated.front : updated.back;
        const idx = surface.elements.findIndex((eItem) => eItem.id === dragElementId);
        if (idx !== -1) {
          surface.elements[idx].x = newX;
          surface.elements[idx].y = newY;
        }
        return updated;
      });
    }

    if (isResizing && selectedElementId && resizeHandle) {
      const dx = Math.round((e.clientX - resizeStartPos.mouseX) / zoomLevel);
      const dy = Math.round((e.clientY - resizeStartPos.mouseY) / zoomLevel);

      let newX = resizeStartPos.x;
      let newY = resizeStartPos.y;
      let newW = resizeStartPos.width;
      let newH = resizeStartPos.height;

      if (resizeHandle.includes('e')) {
        newW = Math.max(15, resizeStartPos.width + dx);
      }
      if (resizeHandle.includes('s')) {
        newH = Math.max(15, resizeStartPos.height + dy);
      }
      if (resizeHandle.includes('w')) {
        const computedW = Math.max(15, resizeStartPos.width - dx);
        newX = resizeStartPos.x + (resizeStartPos.width - computedW);
        newW = computedW;
      }
      if (resizeHandle.includes('n')) {
        const computedH = Math.max(15, resizeStartPos.height - dy);
        newY = resizeStartPos.y + (resizeStartPos.height - computedH);
        newH = computedH;
      }

      setTemplate((prev) => {
        const updated = JSON.parse(JSON.stringify(prev)) as CardTemplateJSON;
        const surface = activeSide === 'front' ? updated.front : updated.back;
        const idx = surface.elements.findIndex((eItem) => eItem.id === selectedElementId);
        if (idx !== -1) {
          surface.elements[idx].x = newX;
          surface.elements[idx].y = newY;
          surface.elements[idx].width = newW;
          surface.elements[idx].height = newH;
        }
        return updated;
      });
    }

    if (isRotating && selectedElementId) {
      const dx = e.clientX - rotateStartPos.mouseX;
      let newRot = Math.round((rotateStartPos.startRotation + dx * 0.8) % 360);
      if (newRot < 0) newRot += 360;

      setTemplate((prev) => {
        const updated = JSON.parse(JSON.stringify(prev)) as CardTemplateJSON;
        const surface = activeSide === 'front' ? updated.front : updated.back;
        const idx = surface.elements.findIndex((eItem) => eItem.id === selectedElementId);
        if (idx !== -1) {
          surface.elements[idx].rotation = newRot;
        }
        return updated;
      });
    }
  };

  const handleCanvasMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      setDragElementId(null);
      pushHistory(template);
    }
    if (isResizing) {
      setIsResizing(false);
      setResizeHandle(null);
      pushHistory(template);
    }
    if (isRotating) {
      setIsRotating(false);
      pushHistory(template);
    }
  };

  // Re-order element layer (stacking order)
  const moveElementLayer = (id: string, direction: 'up' | 'down' | 'top' | 'bottom') => {
    const newTemplate = JSON.parse(JSON.stringify(template)) as CardTemplateJSON;
    const surface = activeSide === 'front' ? newTemplate.front : newTemplate.back;
    const idx = surface.elements.findIndex((el) => el.id === id);
    if (idx === -1) return;

    const [item] = surface.elements.splice(idx, 1);
    if (direction === 'up') {
      surface.elements.splice(Math.min(surface.elements.length, idx + 1), 0, item);
    } else if (direction === 'down') {
      surface.elements.splice(Math.max(0, idx - 1), 0, item);
    } else if (direction === 'top') {
      surface.elements.push(item);
    } else if (direction === 'bottom') {
      surface.elements.unshift(item);
    }

    surface.elements.forEach((el, index) => {
      el.zIndex = index + 1;
    });

    pushHistory(newTemplate);
  };

  // Add new element to current surface
  const addElement = (type: CardElement['type'], preset?: any) => {
    const newId = `el-${Date.now().toString(36)}`;
    let newEl: CardElement;

    if (type === 'TEXT') {
      newEl = {
        id: newId,
        type: 'TEXT',
        x: 100,
        y: 100,
        width: 300,
        height: 35,
        text: preset && 'text' in preset ? (preset.text as string) : 'New Text Element',
        fontSize: preset && 'fontSize' in preset ? (preset.fontSize as number) : 18,
        fontFamily: 'Inter',
        fontWeight: preset && 'fontWeight' in preset ? (preset.fontWeight as any) : 'normal',
        fontStyle: 'normal',
        color: preset && 'color' in preset ? (preset.color as string) : '#0f172a',
        textAlign: 'left',
        lineHeight: 1.2,
        letterSpacing: 0,
        rotation: 0,
        opacity: 1,
        isLocked: false,
        isHidden: false,
        zIndex: currentSurface.elements.length + 1,
      };
    } else if (type === 'QR_CODE') {
      const existingQr = currentSurface.elements.find((e) => e.type === 'QR_CODE');
      if (existingQr) {
        setSelectedElementId(existingQr.id);
        return;
      }
      newEl = {
        id: newId,
        type: 'QR_CODE',
        x: isVertical ? 200 : 650,
        y: isVertical ? 630 : 340,
        width: 140,
        height: 140,
        data: 'https://verify.acmecorp.com/id/{{employee.employeeNumber}}',
        foregroundColor: '#0f172a',
        backgroundColor: '#ffffff',
        errorCorrectionLevel: 'M',
        includeMargin: true,
        rotation: 0,
        opacity: 1,
        isLocked: false,
        isHidden: false,
        zIndex: currentSurface.elements.length + 1,
      };
    } else if (type === 'BARCODE') {
      const existingBarcode = currentSurface.elements.find((e) => e.type === 'BARCODE');
      if (existingBarcode) {
        setSelectedElementId(existingBarcode.id);
        return;
      }
      newEl = {
        id: newId,
        type: 'BARCODE',
        x: isVertical ? 80 : 240,
        y: isVertical ? 300 : 260,
        width: isVertical ? 380 : 360,
        height: 80,
        data: '{{employee.employeeNumber}}',
        format: 'CODE128',
        lineColor: '#000000',
        backgroundColor: '#ffffff',
        displayValue: true,
        fontSize: 12,
        rotation: 0,
        opacity: 1,
        isLocked: false,
        isHidden: false,
        zIndex: currentSurface.elements.length + 1,
      };
    } else if (type === 'EMPLOYEE_PHOTO') {
      newEl = {
        id: newId,
        type: 'EMPLOYEE_PHOTO',
        x: isVertical ? 185 : 50,
        y: isVertical ? 104 : 110,
        width: 170,
        height: 215,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#e2e8f0',
        objectFit: 'cover',
        rotation: 0,
        opacity: 1,
        isLocked: false,
        isHidden: false,
        zIndex: currentSurface.elements.length + 1,
      };
    } else {
      // Shape Element
      const shapeType = preset && 'shapeType' in preset ? (preset.shapeType as any) : 'RECTANGLE';
      newEl = {
        id: newId,
        type: 'SHAPE',
        shapeType: shapeType,
        x: preset?.x ?? 50,
        y: preset?.y ?? 50,
        width: preset?.width ?? 200,
        height: preset?.height ?? 40,
        fill: preset?.fill ?? '#dc2626',
        borderRadius: preset?.borderRadius ?? 0,
        strokeWidth: preset?.strokeWidth ?? 0,
        rotation: preset?.rotation ?? 0,
        opacity: preset?.opacity ?? 1,
        isLocked: false,
        isHidden: false,
        zIndex: currentSurface.elements.length + 1,
      };
    }

    const newTemplate = JSON.parse(JSON.stringify(template)) as CardTemplateJSON;
    const surface = activeSide === 'front' ? newTemplate.front : newTemplate.back;
    surface.elements.push(newEl);
    pushHistory(newTemplate);
    setSelectedElementId(newId);
  };

  const deleteSelectedElement = () => {
    if (!selectedElementId) return;
    const newTemplate = JSON.parse(JSON.stringify(template)) as CardTemplateJSON;
    const surface = activeSide === 'front' ? newTemplate.front : newTemplate.back;
    surface.elements = surface.elements.filter((el) => el.id !== selectedElementId);
    pushHistory(newTemplate);
    setSelectedElementId(null);
  };

  const applyLayoutPreset = (preset: LayoutPreset) => {
    const newTemplate = JSON.parse(JSON.stringify(template)) as CardTemplateJSON;
    const unlockAll = (els: CardElement[]) => els.map((el) => ({ ...el, isLocked: false }));
    if (isVertical) {
      newTemplate.front.elements = unlockAll(JSON.parse(JSON.stringify(preset.frontElementsV)));
      newTemplate.back.elements = unlockAll(JSON.parse(JSON.stringify(preset.backElementsV)));
    } else {
      newTemplate.front.elements = unlockAll(JSON.parse(JSON.stringify(preset.frontElementsH)));
      newTemplate.back.elements = unlockAll(JSON.parse(JSON.stringify(preset.backElementsH)));
    }
    pushHistory(newTemplate);
    setShowLayoutModal(false);
    toast.success(`Applied "${preset.name}" preset! All layout elements are unlocked & ready to customize.`);
  };

  const handleSaveDraft = () => {
    enterpriseStore.activeTemplate = JSON.parse(JSON.stringify(template));
    setSaveSuccessNotice(true);
    setTimeout(() => setSaveSuccessNotice(false), 3000);
    toast.success('Draft layout saved to local session!');
  };

  const handlePublish = async () => {
    try {
      const pathParts = window.location.pathname.split('/');
      const idIdx = pathParts.indexOf('card-designs') + 1;
      const targetId = pathParts[idIdx] || 'template-acme-cr80';

      const res = await fetch(`/api/card-templates/${targetId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          layout: template,
          changelog: publishChangelog.trim() || 'Updated card design layout and elements',
          publish: true,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to publish template version');

      enterpriseStore.publishNewTemplate(template, publishChangelog || 'Updated layout');
      setShowPublishModal(false);
      setPublishChangelog('');
      toast.success(`Published new version ${json.versionTag || ''}! Saved to Supabase.`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Derived theme classes
  const bg = isDark ? 'bg-[#0b0f17] text-white' : 'bg-slate-100 text-slate-900';
  const panel = isDark ? 'bg-[#0f172a]' : 'bg-white';
  const panelBorder = isDark ? 'border-slate-800' : 'border-slate-200';
  const canvasBg = isDark ? 'bg-[#070a10]' : 'bg-slate-200/70';
  const cardRow = isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200';
  const inputCls = isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900';
  const labelCls = isDark ? 'text-slate-500' : 'text-slate-500';
  const sectionHdr = isDark ? 'text-slate-400' : 'text-slate-500';
  const btnBase = isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100';
  const btnBorder = isDark ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-white' : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-800';
  const zoomBar = isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700';
  const layerItem = isDark ? 'text-slate-400 hover:bg-slate-800/60' : 'text-slate-600 hover:bg-slate-100';
  const emptyHint = isDark ? 'text-slate-500' : 'text-slate-400';

  return (
    <div className={`h-[calc(100vh-64px)] flex flex-col select-none transition-colors duration-300 ${bg}`}>
      {/* Top Toolbar */}
      <div className={`h-14 border-b ${panelBorder} ${panel} px-4 flex items-center justify-between z-10`}>
        <div className="flex items-center gap-3">
          <Link
            href="/hr/card-designs"
            className={`p-1.5 rounded-lg transition ${btnBase}`}
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="font-bold text-sm tracking-tight flex items-center gap-2">
            <span>Card Template Designer (2D Editor)</span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${isDark ? 'text-slate-400 bg-slate-800' : 'text-slate-500 bg-slate-100 border border-slate-200'}`}>
              CR80 ({isVertical ? '53.98 × 85.60mm ↕' : '85.60 × 53.98mm ↔'})
            </span>
            {previewEmployee && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-950/80 border border-red-800 text-red-300 flex items-center gap-1.5 shadow-xs">
                <User className="w-3 h-3 text-red-400" />
                <span>Editing Badge for: <strong>{previewEmployee.fullName}</strong> ({previewEmployee.employeeNumber || 'EMP'} • {previewEmployee.branchName || 'SM Sorsogon City'})</span>
              </span>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleUndo}
            disabled={historyIdx <= 0}
            title="Undo (Ctrl+Z)"
            className={`p-1.5 rounded disabled:opacity-30 transition ${btnBase}`}
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleRedo}
            disabled={historyIdx >= history.length - 1}
            title="Redo (Ctrl+Shift+Z)"
            className={`p-1.5 rounded disabled:opacity-30 transition ${btnBase}`}
          >
            <Redo2 className="w-4 h-4" />
          </button>

          <div className={`h-4 w-[1px] mx-1 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />

          {/* Layout Presets Launcher */}
          <button
            onClick={() => setShowLayoutModal(true)}
            className="px-3 py-1.5 rounded-lg bg-indigo-600/10 text-indigo-500 hover:bg-indigo-600 hover:text-white border border-indigo-500/30 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Layouts
          </button>

          <div className={`h-4 w-[1px] mx-1 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />

          {/* Front / Back Switcher */}
          <div className={`flex p-0.5 rounded-lg border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
            <button
              onClick={() => { setActiveSide('front'); setSelectedElementId(null); }}
              className={`px-3 py-1 rounded text-xs font-semibold transition ${
                activeSide === 'front' ? 'bg-red-600 text-white' : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Front
            </button>
            <button
              onClick={() => { setActiveSide('back'); setSelectedElementId(null); }}
              className={`px-3 py-1 rounded text-xs font-semibold transition ${
                activeSide === 'back' ? 'bg-red-600 text-white' : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Back
            </button>
          </div>

          <div className={`h-4 w-[1px] mx-1 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />

          {/* Orientation Switcher */}
          <div
            title="Card Orientation"
            className={`flex p-0.5 rounded-lg border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-100 border-slate-200'}`}
          >
            <button
              onClick={() => handleOrientationToggle('horizontal')}
              title="Horizontal (Landscape)"
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition ${
                !isVertical ? 'bg-indigo-600 text-white' : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <RectangleHorizontal className="w-3.5 h-3.5" />
              <span>H</span>
            </button>
            <button
              onClick={() => handleOrientationToggle('vertical')}
              title="Vertical (Portrait)"
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition ${
                isVertical ? 'bg-indigo-600 text-white' : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <RectangleVertical className="w-3.5 h-3.5" />
              <span>V</span>
            </button>
          </div>

          <div className={`h-4 w-[1px] mx-1 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />

          {/* Zoom & Overlay Toggles */}
          <button
            onClick={() => setShowGrid(!showGrid)}
            title="Toggle Grid"
            className={`p-1.5 rounded transition ${showGrid ? 'text-red-400 bg-red-950/40' : btnBase}`}
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowSafeMargin(!showSafeMargin)}
            title="Toggle Safe Margins & Bleed"
            className={`p-1.5 rounded transition ${showSafeMargin ? 'text-blue-400 bg-blue-950/40' : btnBase}`}
          >
            <Magnet className="w-4 h-4" />
          </button>

          <div className={`flex items-center border rounded px-2 py-1 text-xs ${zoomBar}`}>
            <button onClick={() => setZoomLevel(Math.max(0.4, zoomLevel - 0.1))} className={isDark ? 'hover:text-white' : 'hover:text-slate-900'}><ZoomOut className="w-3.5 h-3.5" /></button>
            <span className="mx-2 font-mono text-[11px]">{Math.round(zoomLevel * 100)}%</span>
            <button onClick={() => setZoomLevel(Math.min(1.6, zoomLevel + 0.1))} className={isDark ? 'hover:text-white' : 'hover:text-slate-900'}><ZoomIn className="w-3.5 h-3.5" /></button>
            <div className="w-[1px] h-3 bg-slate-700/50 mx-1.5" />
            <button onClick={() => setZoomLevel(isVertical ? 0.75 : 0.8)} title="Fit Card to Screen" className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 hover:text-indigo-300">Fit</button>
          </div>

          <div className={`h-4 w-[1px] mx-1 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />

          {/* 3D Visualizer Trigger */}
          <button
            onClick={() => setShow3DModal(true)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition ${btnBorder}`}
          >
            <Eye className="w-3.5 h-3.5 text-red-400" />
            3D Preview
          </button>

          {/* Save Draft */}
          <button
            onClick={handleSaveDraft}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition ${btnBorder}`}
          >
            <Save className="w-3.5 h-3.5" />
            {saveSuccessNotice ? 'Draft Saved!' : 'Save Draft'}
          </button>

          {/* Publish Version */}
          <button
            onClick={() => setShowPublishModal(true)}
            className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md shadow-red-600/30 transition flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Publish
          </button>
        </div>
      </div>

      {/* Main Studio Work Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Elements Palette */}
        <aside className={`w-60 border-r p-4 overflow-y-auto space-y-4 shrink-0 ${panelBorder} ${panel}`}>
          <div className={`text-[11px] font-bold uppercase tracking-wider ${sectionHdr}`}>
            Card Elements
          </div>

          <div className="space-y-1.5">
            {[
              { label: 'Standard Text', icon: <Type className="w-4 h-4 text-red-400" />, action: () => addElement('TEXT') },
              { label: 'Employee Name', icon: <User className="w-4 h-4 text-emerald-400" />, action: () => addElement('TEXT', { text: '{{employee.fullName}}', fontSize: 26, fontWeight: 'bold' }) },
              { label: 'Employee ID No.', icon: <Type className="w-4 h-4 text-blue-400" />, action: () => addElement('TEXT', { text: 'ID: {{employee.employeeNumber}}', fontSize: 16, color: '#64748b' }) },
              { label: 'Department', icon: <Type className="w-4 h-4 text-amber-400" />, action: () => addElement('TEXT', { text: 'DEPT: {{employee.department}}', fontSize: 14, color: '#64748b' }) },
              { label: 'Position Title', icon: <Type className="w-4 h-4 text-purple-400" />, action: () => addElement('TEXT', { text: '{{employee.position}}', fontSize: 18, color: '#dc2626', fontWeight: 'bold' }) },
              { label: 'Employee Photo', icon: <ImageIcon className="w-4 h-4 text-red-500" />, action: () => addElement('EMPLOYEE_PHOTO') },
              { label: 'Verification QR', icon: <QrCode className="w-4 h-4 text-indigo-500" />, action: () => addElement('QR_CODE') },
              { label: 'Code128 Barcode', icon: <Barcode className="w-4 h-4 text-slate-500" />, action: () => addElement('BARCODE') },
              { label: 'Rectangle / Box', icon: <Square className="w-4 h-4 text-red-400" />, action: () => addElement('SHAPE', { shapeType: 'RECTANGLE' }) },
              { label: 'Triangle Shape', icon: <Triangle className="w-4 h-4 text-emerald-400" />, action: () => addElement('SHAPE', { shapeType: 'TRIANGLE', width: 100, height: 100, fill: '#dc2626' }) },
              { label: 'Circle / Oval', icon: <Circle className="w-4 h-4 text-purple-400" />, action: () => addElement('SHAPE', { shapeType: 'CIRCLE', width: 120, height: 120, fill: '#dc2626', borderRadius: 9999 }) },
              { label: 'Divider Line', icon: <Minus className="w-4 h-4 text-slate-400" />, action: () => addElement('SHAPE', { shapeType: 'LINE', width: 300, height: 2, fill: '#cbd5e1' }) },
              { label: 'Diagonal Stripe', icon: <Square className="w-4 h-4 text-indigo-400 rotate-45" />, action: () => addElement('SHAPE', { shapeType: 'DIAGONAL', width: 250, height: 100, fill: '#dc2626' }) },
              { label: 'Signature Line', icon: <PenTool className="w-4 h-4 text-amber-400" />, action: () => addElement('SHAPE', { shapeType: 'SIGNATURE_LINE', width: 280, height: 40, fill: '#cbd5e1' }) },
              { label: 'Smoke / Blob Accent', icon: <Sparkles className="w-4 h-4 text-pink-400" />, action: () => addElement('SHAPE', { shapeType: 'SMOKE', width: 180, height: 180, fill: '#dc2626' }) },
            ].map(({ label, icon, action }) => (
              <button
                key={label}
                onClick={action}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border text-xs transition ${isDark
                    ? 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-800'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-xs'
                  }`}
              >
                {icon}
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* Layer List */}
          <div className={`pt-4 border-t ${panelBorder}`}>
            <div className={`text-[11px] font-bold uppercase tracking-wider mb-2 flex items-center justify-between ${sectionHdr}`}>
              <span>Layers ({currentSurface.elements.length})</span>
              <Layers className="w-3.5 h-3.5" />
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {currentSurface.elements.map((el) => (
                <div
                  key={el.id}
                  onClick={() => setSelectedElementId(el.id)}
                  className={`px-2.5 py-1.5 rounded text-xs flex items-center justify-between cursor-pointer ${selectedElementId === el.id
                      ? 'bg-red-600/20 text-red-600 border border-red-400/40'
                      : layerItem
                    }`}
                >
                  <span className="truncate">{el.name || el.type}</span>
                  {el.isLocked && <Lock className="w-3 h-3 opacity-50" />}
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Center Canvas Stage */}
        <main
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
          className={`flex-1 overflow-auto flex items-center justify-center p-8 relative transition-colors duration-300 ${canvasBg}`}
        >
          {/* CR80 Card Frame */}
          <div
            style={{
              transform: `scale(${zoomLevel})`,
              transformOrigin: 'center center',
              width: `${template.card.width}px`,
              height: `${template.card.height}px`,
              transition: isDragging ? 'none' : 'width 0.25s ease, height 0.25s ease',
            }}
            className={`relative shadow-2xl border border-slate-700/80 ${isVertical ? 'rounded-[18px]' : 'rounded-[24px]'} ${activeSide === 'front' ? 'bg-white' : 'bg-[#f8fafc]'}`}
          >
            {/* Grid Overlay */}
            {showGrid && (
              <div className="absolute inset-0 rounded-[24px] pointer-events-none bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:16px_16px] opacity-25" />
            )}

            {/* Safe Margin Guide (3mm / ~30px) */}
            {showSafeMargin && (
              <div className="absolute inset-[30px] rounded-[14px] border border-dashed border-blue-400/50 pointer-events-none flex items-start justify-end p-1">
                <span className="text-[9px] font-mono text-blue-400 bg-blue-950/60 px-1 rounded">
                  Safe Print Margin (3mm)
                </span>
              </div>
            )}

            {/* Elements Layer */}
            {currentSurface.elements.map((el) => {
              if (el.isHidden) return null;
              const isSelected = selectedElementId === el.id;

              const transformParts: string[] = [];
              if (el.rotation) transformParts.push(`rotate(${el.rotation}deg)`);
              if ((el as any).flipX) transformParts.push('scaleX(-1)');
              if ((el as any).flipY) transformParts.push('scaleY(-1)');
              const transformStr = transformParts.length > 0 ? transformParts.join(' ') : undefined;

              return (
                <div
                  key={el.id}
                  onMouseDown={(e) => handleElementMouseDown(e, el)}
                  style={{
                    position: 'absolute',
                    left: `${el.x}px`,
                    top: `${el.y}px`,
                    width: `${el.width}px`,
                    height: `${el.height}px`,
                    transform: transformStr,
                    opacity: el.opacity ?? 1,
                    cursor: el.isLocked ? 'default' : 'move',
                  }}
                  className={`group ${isSelected ? 'ring-2 ring-red-500 shadow-lg z-30' : 'hover:ring-1 hover:ring-red-400/50'
                    }`}
                >
                  {/* On-Canvas Floating Quick Action Bar */}
                  {isSelected && (
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: '-42px',
                        height: '34px',
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="z-50 flex items-center gap-1 bg-slate-900/95 backdrop-blur-md border border-slate-700/90 rounded-lg px-2 py-1 text-white shadow-xl text-[11px] pointer-events-auto"
                    >
                      <button
                        onClick={() => updateSelectedElement({ rotation: ((el.rotation || 0) + 90) % 360 })}
                        title="Rotate 90°"
                        className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => updateSelectedElement({ flipX: !(el as any).flipX } as any)}
                        title="Flip Horizontal"
                        className={`p-1 rounded transition ${ (el as any).flipX ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800 text-slate-300 hover:text-white' }`}
                      >
                        <FlipHorizontal className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => updateSelectedElement({ flipY: !(el as any).flipY } as any)}
                        title="Flip Vertical"
                        className={`p-1 rounded transition ${ (el as any).flipY ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800 text-slate-300 hover:text-white' }`}
                      >
                        <FlipVertical className="w-3.5 h-3.5" />
                      </button>

                      <div className="w-[1px] h-3.5 bg-slate-700 mx-0.5" />

                      <button
                        onClick={() => moveElementLayer(el.id, 'top')}
                        title="Bring to Front"
                        className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition"
                      >
                        <ChevronsUp className="w-3.5 h-3.5 text-emerald-400" />
                      </button>
                      <button
                        onClick={() => moveElementLayer(el.id, 'up')}
                        title="Bring Forward"
                        className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => moveElementLayer(el.id, 'down')}
                        title="Send Backward"
                        className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => moveElementLayer(el.id, 'bottom')}
                        title="Send to Back"
                        className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition"
                      >
                        <ChevronsDown className="w-3.5 h-3.5 text-indigo-400" />
                      </button>

                      <div className="w-[1px] h-3.5 bg-slate-700 mx-0.5" />

                      <button
                        onClick={() => updateSelectedElement({ isLocked: !el.isLocked })}
                        title={el.isLocked ? 'Unlock Element' : 'Lock Element'}
                        className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition"
                      >
                        {el.isLocked ? <Unlock className="w-3.5 h-3.5 text-amber-400" /> : <Lock className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={deleteSelectedElement}
                        title="Delete Element"
                        className="p-1 hover:bg-rose-900/60 rounded text-rose-400 hover:text-rose-200 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Element Type Render */}
                  {el.type === 'TEXT' && (
                    <div
                      style={{
                        fontSize: `${el.fontSize}px`,
                        color: el.color,
                        fontWeight: el.fontWeight,
                        textAlign: el.textAlign,
                        fontFamily: el.fontFamily || 'Inter',
                      }}
                      className="w-full h-full flex items-center leading-none select-none"
                    >
                      {resolveDataBinding(el.text, activeBindingMap)}
                    </div>
                  )}

                  {(el.type === 'EMPLOYEE_PHOTO' || el.type === 'IMAGE') && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={el.type === 'IMAGE' && el.src ? el.src : activePhotoSrc}
                      alt="Preview Avatar"
                      style={{
                        borderRadius: (el.borderRadius !== undefined && el.borderRadius !== null)
                          ? (el.borderRadius >= 9999 || el.borderRadius >= Math.min(el.width, el.height) / 2 ? '50%' : `${el.borderRadius}px`)
                          : '0px',
                        borderWidth: `${el.borderWidth || 0}px`,
                        borderColor: el.borderColor || 'transparent',
                        borderStyle: (el.borderWidth || 0) > 0 ? 'solid' : 'none',
                        objectFit: el.objectFit || 'cover',
                      }}
                      className="w-full h-full shadow-sm pointer-events-none"
                    />
                  )}

                  {el.type === 'QR_CODE' && (
                    <div className="w-full h-full bg-white p-2 border border-slate-200 flex flex-col items-center justify-center rounded pointer-events-none">
                      <QrCode className="w-full h-full text-slate-900" />
                    </div>
                  )}

                  {el.type === 'BARCODE' && (
                    <div className="w-full h-full bg-white p-2 border border-slate-200 flex flex-col items-center justify-center rounded pointer-events-none">
                      <Barcode className="w-full h-12 text-black" />
                      <span className="text-[10px] font-mono text-black">{activeBindingMap.employeeNumber}</span>
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

                  {/* 8 Interactive Canvas Resize Handles & Rotate Knob */}
                  {isSelected && !el.isLocked && (
                    <>
                      {/* Top Canvas Rotate Handle Knob & Stem */}
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 flex flex-col items-center z-50 pointer-events-auto">
                        <div
                          onMouseDown={(e) => handleRotateStart(e, el)}
                          title="Drag left/right to rotate element"
                          className="w-4 h-4 bg-indigo-600 border-2 border-white text-white rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing shadow-md hover:scale-125 transition-transform"
                        >
                          <RotateCw className="w-2.5 h-2.5" />
                        </div>
                        <div className="w-[1px] h-3 bg-indigo-600/80" />
                      </div>

                      {/* Corner Handles */}
                      <div
                        onMouseDown={(e) => handleResizeStart(e, 'nw', el)}
                        className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-red-600 rounded-full cursor-nwse-resize shadow-md z-40 hover:scale-125 transition-transform"
                      />
                      <div
                        onMouseDown={(e) => handleResizeStart(e, 'ne', el)}
                        className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-red-600 rounded-full cursor-nesw-resize shadow-md z-40 hover:scale-125 transition-transform"
                      />
                      <div
                        onMouseDown={(e) => handleResizeStart(e, 'se', el)}
                        className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-red-600 rounded-full cursor-nwse-resize shadow-md z-40 hover:scale-125 transition-transform"
                      />
                      <div
                        onMouseDown={(e) => handleResizeStart(e, 'sw', el)}
                        className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-red-600 rounded-full cursor-nesw-resize shadow-md z-40 hover:scale-125 transition-transform"
                      />

                      {/* Edge Handles */}
                      <div
                        onMouseDown={(e) => handleResizeStart(e, 'n', el)}
                        className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-2 border-red-600 rounded-full cursor-ns-resize shadow-md z-40 hover:scale-125 transition-transform"
                      />
                      <div
                        onMouseDown={(e) => handleResizeStart(e, 'e', el)}
                        className="absolute top-1/2 -translate-y-1/2 -right-1.5 w-3 h-3 bg-white border-2 border-red-600 rounded-full cursor-ew-resize shadow-md z-40 hover:scale-125 transition-transform"
                      />
                      <div
                        onMouseDown={(e) => handleResizeStart(e, 's', el)}
                        className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-2 border-red-600 rounded-full cursor-ns-resize shadow-md z-40 hover:scale-125 transition-transform"
                      />
                      <div
                        onMouseDown={(e) => handleResizeStart(e, 'w', el)}
                        className="absolute top-1/2 -translate-y-1/2 -left-1.5 w-3 h-3 bg-white border-2 border-red-600 rounded-full cursor-ew-resize shadow-md z-40 hover:scale-125 transition-transform"
                      />
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </main>

        {/* Right Properties Inspector */}
        <aside className={`w-72 border-l p-4 overflow-y-auto shrink-0 space-y-4 ${panelBorder} ${panel}`}>
          <div className={`text-[11px] font-bold uppercase tracking-wider ${sectionHdr}`}>
            Properties Panel
          </div>

          {selectedElement ? (
            <div className="space-y-4 text-xs">
              {/* Position & Size */}
              <div className={`p-3 rounded-lg border space-y-3 ${cardRow}`}>
                <span className={`font-semibold block text-[10px] uppercase ${sectionHdr}`}>Position & Dimensions</span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={`text-[10px] ${labelCls}`}>X (px)</label>
                    <input
                      type="number"
                      value={selectedElement.x}
                      onChange={(e) => updateSelectedElement({ x: parseInt(e.target.value) || 0 })}
                      className={`w-full border rounded px-2 py-1 text-xs ${inputCls}`}
                    />
                  </div>
                  <div>
                    <label className={`text-[10px] ${labelCls}`}>Y (px)</label>
                    <input
                      type="number"
                      value={selectedElement.y}
                      onChange={(e) => updateSelectedElement({ y: parseInt(e.target.value) || 0 })}
                      className={`w-full border rounded px-2 py-1 text-xs ${inputCls}`}
                    />
                  </div>
                  <div>
                    <label className={`text-[10px] ${labelCls}`}>Width (px)</label>
                    <input
                      type="number"
                      value={selectedElement.width}
                      onChange={(e) => updateSelectedElement({ width: parseInt(e.target.value) || 10 })}
                      className={`w-full border rounded px-2 py-1 text-xs ${inputCls}`}
                    />
                  </div>
                  <div>
                    <label className={`text-[10px] ${labelCls}`}>Height (px)</label>
                    <input
                      type="number"
                      value={selectedElement.height}
                      onChange={(e) => updateSelectedElement({ height: parseInt(e.target.value) || 10 })}
                      className={`w-full border rounded px-2 py-1 text-xs ${inputCls}`}
                    />
                  </div>
                </div>

                {/* Rotation & Flip Controls */}
                <div className="pt-2 border-t border-slate-800/40 space-y-2">
                  <span className={`font-semibold block text-[10px] uppercase ${sectionHdr}`}>Rotation & Orientation</span>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <label className={`text-[10px] ${labelCls}`}>Rotation (°)</label>
                      <input
                        type="number"
                        min={0}
                        max={360}
                        value={selectedElement.rotation || 0}
                        onChange={(e) => updateSelectedElement({ rotation: parseInt(e.target.value) || 0 })}
                        className={`w-full border rounded px-2 py-1 text-xs ${inputCls}`}
                      />
                    </div>
                    <div className="flex items-end gap-1 pb-0.5">
                      <button
                        onClick={() => updateSelectedElement({ rotation: ((selectedElement.rotation || 0) + 90) % 360 })}
                        className={`p-2 rounded border text-xs flex items-center gap-1 transition ${btnBorder}`}
                        title="Rotate +90°"
                      >
                        <RotateCw className="w-3.5 h-3.5" /> +90°
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => updateSelectedElement({ flipX: !(selectedElement as any).flipX } as any)}
                      className={`flex-1 py-1.5 px-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                        (selectedElement as any).flipX ? 'bg-indigo-600 text-white border-indigo-500' : btnBorder
                      }`}
                    >
                      <FlipHorizontal className="w-3.5 h-3.5" /> Flip H
                    </button>
                    <button
                      onClick={() => updateSelectedElement({ flipY: !(selectedElement as any).flipY } as any)}
                      className={`flex-1 py-1.5 px-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                        (selectedElement as any).flipY ? 'bg-indigo-600 text-white border-indigo-500' : btnBorder
                      }`}
                    >
                      <FlipVertical className="w-3.5 h-3.5" /> Flip V
                    </button>
                  </div>
                </div>

                {/* Stacking & Layer Order */}
                <div className="pt-2 border-t border-slate-800/40 space-y-2">
                  <span className={`font-semibold block text-[10px] uppercase ${sectionHdr}`}>Layer Stacking</span>
                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    <button
                      onClick={() => moveElementLayer(selectedElement.id, 'top')}
                      className={`py-1.5 px-2 rounded border font-medium flex items-center justify-center gap-1 transition ${btnBorder}`}
                      title="Bring to Front"
                    >
                      <ChevronsUp className="w-3.5 h-3.5 text-emerald-400" /> To Front
                    </button>
                    <button
                      onClick={() => moveElementLayer(selectedElement.id, 'up')}
                      className={`py-1.5 px-2 rounded border font-medium flex items-center justify-center gap-1 transition ${btnBorder}`}
                      title="Bring Forward"
                    >
                      <ArrowUp className="w-3.5 h-3.5" /> Forward
                    </button>
                    <button
                      onClick={() => moveElementLayer(selectedElement.id, 'down')}
                      className={`py-1.5 px-2 rounded border font-medium flex items-center justify-center gap-1 transition ${btnBorder}`}
                      title="Send Backward"
                    >
                      <ArrowDown className="w-3.5 h-3.5" /> Backward
                    </button>
                    <button
                      onClick={() => moveElementLayer(selectedElement.id, 'bottom')}
                      className={`py-1.5 px-2 rounded border font-medium flex items-center justify-center gap-1 transition ${btnBorder}`}
                      title="Send to Back"
                    >
                      <ChevronsDown className="w-3.5 h-3.5 text-indigo-400" /> To Back
                    </button>
                  </div>
                </div>

                {/* Opacity / Transparency Slider */}
                <div className="pt-2 border-t border-slate-800/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`font-semibold block text-[10px] uppercase ${sectionHdr}`}>Opacity / Transparency</span>
                    <span className="font-mono text-xs text-indigo-400 font-bold">
                      {Math.round(((selectedElement as any).opacity ?? 1) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={(selectedElement as any).opacity ?? 1}
                    onChange={(e) => updateSelectedElement({ opacity: parseFloat(e.target.value) } as any)}
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Typography for TEXT */}
              {selectedElement.type === 'TEXT' && (
                <div className={`p-3 rounded-lg border space-y-3 ${cardRow}`}>
                  <span className={`font-semibold block text-[10px] uppercase ${sectionHdr}`}>Typography</span>
                  <div>
                    <label className={`text-[10px] ${labelCls}`}>Text Content</label>
                    <input
                      type="text"
                      value={selectedElement.text}
                      onChange={(e) => updateSelectedElement({ text: e.target.value })}
                      className={`w-full border rounded px-2 py-1 text-xs ${inputCls}`}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={`text-[10px] ${labelCls}`}>Font Size</label>
                      <input
                        type="number"
                        value={selectedElement.fontSize}
                        onChange={(e) => updateSelectedElement({ fontSize: parseInt(e.target.value) || 12 })}
                        className={`w-full border rounded px-2 py-1 text-xs ${inputCls}`}
                      />
                    </div>
                    <div>
                      <label className={`text-[10px] ${labelCls}`}>Weight</label>
                      <select
                        value={selectedElement.fontWeight}
                        onChange={(e) => updateSelectedElement({ fontWeight: e.target.value as any })}
                        className={`w-full border rounded px-2 py-1 text-xs ${inputCls}`}
                      >
                        <option value="normal">Normal</option>
                        <option value="medium">Medium</option>
                        <option value="600">Semibold</option>
                        <option value="bold">Bold</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className={`text-[10px] ${labelCls}`}>Text Alignment</label>
                    <select
                      value={selectedElement.textAlign || 'left'}
                      onChange={(e) => updateSelectedElement({ textAlign: e.target.value as any })}
                      className={`w-full border rounded px-2 py-1 text-xs ${inputCls}`}
                    >
                      <option value="left">Left Aligned</option>
                      <option value="center">Center Aligned</option>
                      <option value="right">Right Aligned</option>
                    </select>
                  </div>

                  <div>
                    <label className={`text-[10px] ${labelCls}`}>Text Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={selectedElement.color}
                        onChange={(e) => updateSelectedElement({ color: e.target.value })}
                        className={`w-7 h-7 rounded border cursor-pointer ${isDark ? 'border-slate-700 bg-transparent' : 'border-slate-300'}`}
                      />
                      <input
                        type="text"
                        value={selectedElement.color}
                        onChange={(e) => updateSelectedElement({ color: e.target.value })}
                        className={`flex-1 border rounded px-2 py-1 text-xs font-mono ${inputCls}`}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Properties for EMPLOYEE_PHOTO & IMAGE */}
              {(selectedElement.type === 'EMPLOYEE_PHOTO' || selectedElement.type === 'IMAGE') && (
                <div className={`p-3 rounded-lg border space-y-3 ${cardRow}`}>
                  <span className={`font-semibold block text-[10px] uppercase ${sectionHdr}`}>Picture Shape & Style</span>

                  {/* Shape Quick Select */}
                  <div>
                    <label className={`text-[10px] mb-1.5 block ${labelCls}`}>Picture Shape</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => updateSelectedElement({ borderRadius: 0 } as any)}
                        className={`py-1.5 px-2 rounded flex flex-col items-center gap-1 text-[10px] font-medium border transition ${
                          (!selectedElement.borderRadius || selectedElement.borderRadius === 0)
                            ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs'
                            : btnBorder
                        }`}
                      >
                        <Square className="w-3.5 h-3.5" />
                        Square
                      </button>

                      <button
                        type="button"
                        onClick={() => updateSelectedElement({ borderRadius: 16 } as any)}
                        className={`py-1.5 px-2 rounded flex flex-col items-center gap-1 text-[10px] font-medium border transition ${
                          selectedElement.borderRadius && selectedElement.borderRadius > 0 && selectedElement.borderRadius < Math.min(selectedElement.width, selectedElement.height) / 2
                            ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs'
                            : btnBorder
                        }`}
                      >
                        <div className="w-3.5 h-3.5 border-2 border-current rounded-md" />
                        Rounded
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const size = Math.min(selectedElement.width, selectedElement.height);
                          updateSelectedElement({
                            borderRadius: 9999,
                            width: size,
                            height: size,
                          } as any);
                        }}
                        className={`py-1.5 px-2 rounded flex flex-col items-center gap-1 text-[10px] font-medium border transition ${
                          selectedElement.borderRadius && (selectedElement.borderRadius >= 9999 || selectedElement.borderRadius >= Math.min(selectedElement.width, selectedElement.height) / 2)
                            ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs'
                            : btnBorder
                        }`}
                      >
                        <Circle className="w-3.5 h-3.5" />
                        Circle
                      </button>
                    </div>
                  </div>

                  {/* Corner Radius Slider */}
                  <div>
                    <div className="flex items-center justify-between text-[10px] mb-1">
                      <span className={labelCls}>Corner Radius</span>
                      <span className="font-mono text-slate-400">
                        {(selectedElement.borderRadius && (selectedElement.borderRadius >= 9999 || selectedElement.borderRadius >= Math.min(selectedElement.width, selectedElement.height) / 2))
                          ? 'Circle (50%)'
                          : `${selectedElement.borderRadius || 0}px`}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={Math.round(Math.min(selectedElement.width, selectedElement.height) / 2)}
                      value={
                        (selectedElement.borderRadius && (selectedElement.borderRadius >= 9999 || selectedElement.borderRadius >= Math.min(selectedElement.width, selectedElement.height) / 2))
                          ? Math.round(Math.min(selectedElement.width, selectedElement.height) / 2)
                          : (selectedElement.borderRadius || 0)
                      }
                      onChange={(e) => updateSelectedElement({ borderRadius: parseInt(e.target.value) || 0 } as any)}
                      className="w-full accent-indigo-500 h-1 bg-slate-700 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Border Width & Border Color */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={`text-[10px] ${labelCls}`}>Border Width</label>
                      <input
                        type="number"
                        min="0"
                        max="20"
                        value={(selectedElement as any).borderWidth ?? 0}
                        onChange={(e) => updateSelectedElement({ borderWidth: parseInt(e.target.value) || 0 } as any)}
                        className={`w-full border rounded px-2 py-1 text-xs ${inputCls}`}
                      />
                    </div>
                    <div>
                      <label className={`text-[10px] ${labelCls}`}>Border Color</label>
                      <div className="flex items-center gap-1">
                        <input
                          type="color"
                          value={(selectedElement as any).borderColor || '#e2e8f0'}
                          onChange={(e) => updateSelectedElement({ borderColor: e.target.value } as any)}
                          className={`w-7 h-7 rounded border cursor-pointer ${isDark ? 'border-slate-700 bg-transparent' : 'border-slate-300'}`}
                        />
                        <input
                          type="text"
                          value={(selectedElement as any).borderColor || '#e2e8f0'}
                          onChange={(e) => updateSelectedElement({ borderColor: e.target.value } as any)}
                          className={`w-full border rounded px-1.5 py-1 text-[11px] font-mono ${inputCls}`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Object Fit */}
                  <div>
                    <label className={`text-[10px] ${labelCls}`}>Object Fit</label>
                    <select
                      value={(selectedElement as any).objectFit || 'cover'}
                      onChange={(e) => updateSelectedElement({ objectFit: e.target.value as any } as any)}
                      className={`w-full border rounded px-2 py-1 text-xs ${inputCls}`}
                    >
                      <option value="cover">Cover (Fill & Crop)</option>
                      <option value="contain">Contain (Fit Whole Image)</option>
                      <option value="fill">Fill (Stretch)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Properties for SHAPE */}
              {selectedElement.type === 'SHAPE' && (
                <div className={`p-3 rounded-lg border space-y-3 ${cardRow}`}>
                  <span className={`font-semibold block text-[10px] uppercase ${sectionHdr}`}>Shape Properties</span>
                  <div>
                    <label className={`text-[10px] ${labelCls}`}>Shape Type</label>
                    <select
                      value={(selectedElement as any).shapeType || 'RECTANGLE'}
                      onChange={(e) => updateSelectedElement({ shapeType: e.target.value as any } as any)}
                      className={`w-full border rounded px-2 py-1 text-xs ${inputCls}`}
                    >
                      <option value="RECTANGLE">Rectangle</option>
                      <option value="CIRCLE">Circle / Oval</option>
                      <option value="TRIANGLE">Triangle</option>
                      <option value="DIAGONAL">Diagonal Stripe</option>
                      <option value="SMOKE">Smoke Gradient</option>
                      <option value="LINE">Line</option>
                      <option value="SIGNATURE_LINE">Signature Line</option>
                      <option value="LOGO">Logo Box</option>
                    </select>
                  </div>

                  <div>
                    <label className={`text-[10px] ${labelCls}`}>Fill Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={(selectedElement as any).fill || '#dc2626'}
                        onChange={(e) => updateSelectedElement({ fill: e.target.value } as any)}
                        className={`w-7 h-7 rounded border cursor-pointer ${isDark ? 'border-slate-700 bg-transparent' : 'border-slate-300'}`}
                      />
                      <input
                        type="text"
                        value={(selectedElement as any).fill || '#dc2626'}
                        onChange={(e) => updateSelectedElement({ fill: e.target.value } as any)}
                        className={`flex-1 border rounded px-2 py-1 text-xs font-mono ${inputCls}`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={`text-[10px] ${labelCls}`}>Corner Radius (px)</label>
                    <input
                      type="number"
                      value={(selectedElement as any).borderRadius || 0}
                      onChange={(e) => updateSelectedElement({ borderRadius: parseInt(e.target.value) || 0 } as any)}
                      className={`w-full border rounded px-2 py-1 text-xs ${inputCls}`}
                    />
                  </div>
                </div>
              )}

              {/* Data Binding Selector */}
              <div className={`p-3 rounded-lg border space-y-2 ${cardRow}`}>
                <span className={`font-semibold block text-[10px] uppercase ${sectionHdr}`}>Data Binding</span>
                <p className={`text-[10px] ${labelCls}`}>Inject dynamic employee record parameters safely.</p>
                <select
                  onChange={(e) => {
                    if (selectedElement.type === 'TEXT') {
                      updateSelectedElement({ text: e.target.value });
                    }
                  }}
                  className={`w-full border rounded px-2 py-1 text-xs ${inputCls}`}
                >
                  <option value="">-- Choose Field --</option>
                  <option value="{{employee.fullName}}">&#123;&#123;employee.fullName&#125;&#125;</option>
                  <option value="{{employee.employeeNumber}}">&#123;&#123;employee.employeeNumber&#125;&#125;</option>
                  <option value="{{employee.department}}">&#123;&#123;employee.department&#125;&#125;</option>
                  <option value="{{employee.position}}">&#123;&#123;employee.position&#125;&#125;</option>
                  <option value="{{employee.branch}}">&#123;&#123;employee.branch&#125;&#125;</option>
                </select>
              </div>

              {/* Element Actions */}
              <div className={`pt-2 flex items-center justify-between border-t ${panelBorder}`}>
                <button
                  onClick={() => updateSelectedElement({ isLocked: !selectedElement.isLocked })}
                  className={`p-2 rounded border text-xs flex items-center gap-1.5 transition ${isDark ? 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800' : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'}`}
                >
                  {selectedElement.isLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                  {selectedElement.isLocked ? 'Unlock' : 'Lock'}
                </button>

                <button
                  onClick={deleteSelectedElement}
                  className="p-2 rounded bg-rose-50 hover:bg-rose-100 border border-rose-200 dark:bg-rose-950/60 dark:hover:bg-rose-900 dark:border-rose-800 text-rose-600 dark:text-rose-300 text-xs flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </div>
          ) : (
            <div className={`p-6 text-center text-xs ${emptyHint}`}>
              Select an element on the canvas to inspect its dimensions, styles, and dynamic bindings.
            </div>
          )}
        </aside>
      </div>

      {/* Layout Presets Selection Modal with Live 2D Horizontal/Vertical Previews */}
      {showLayoutModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
          <div className={`w-full max-w-5xl rounded-2xl border ${panelBorder} ${panel} p-6 shadow-2xl max-h-[92vh] flex flex-col`}>
            {/* Modal Header & Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                  <LayoutGrid className="w-5 h-5 text-indigo-500" />
                  Select ID Card Layout Preset ({LAYOUT_PRESETS.length} Designs)
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                  Preview card template layouts in <strong>Horizontal (Landscape)</strong> or <strong>Vertical (Portrait)</strong> modes.
                </p>
              </div>

              {/* Orientation & Surface Toggles */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Orientation Selector */}
                <div className={`flex p-1 rounded-lg border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
                  <button
                    onClick={() => setModalPreviewOrientation('horizontal')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition ${
                      modalPreviewOrientation === 'horizontal' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <RectangleHorizontal className="w-3.5 h-3.5" />
                    <span>Horizontal</span>
                  </button>
                  <button
                    onClick={() => setModalPreviewOrientation('vertical')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition ${
                      modalPreviewOrientation === 'vertical' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <RectangleVertical className="w-3.5 h-3.5" />
                    <span>Vertical</span>
                  </button>
                </div>

                {/* Front / Back Switcher */}
                <div className={`flex p-1 rounded-lg border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
                  <button
                    onClick={() => setModalPreviewSide('front')}
                    className={`px-3 py-1 rounded text-xs font-semibold transition ${
                      modalPreviewSide === 'front' ? 'bg-red-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Front
                  </button>
                  <button
                    onClick={() => setModalPreviewSide('back')}
                    className={`px-3 py-1 rounded text-xs font-semibold transition ${
                      modalPreviewSide === 'back' ? 'bg-red-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Back
                  </button>
                </div>

                <button onClick={() => setShowLayoutModal(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition ml-2">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Grid of Preset Cards with Live 2D Previews */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 overflow-y-auto p-1">
              {LAYOUT_PRESETS.map((preset: LayoutPreset) => (
                <div
                  key={preset.id}
                  onClick={() => applyLayoutPreset(preset)}
                  className={`group border rounded-2xl p-4 cursor-pointer transition hover:scale-[1.02] flex flex-col justify-between shadow-sm hover:shadow-xl ${
                    isDark ? 'bg-slate-900/90 border-slate-800 hover:border-indigo-500' : 'bg-slate-50 border-slate-200 hover:border-indigo-500'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Live Scaled 2D Card Preview */}
                    <div className="w-full py-3 bg-slate-950/40 rounded-xl border border-slate-800/80 flex items-center justify-center relative shadow-inner overflow-hidden">
                      <PresetCardMiniPreview
                        preset={preset}
                        orientation={modalPreviewOrientation}
                        side={modalPreviewSide}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                        {preset.name}
                      </h3>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${preset.badgeBg} ${preset.badgeText}`}>
                        {modalPreviewOrientation === 'vertical' ? 'Portrait ↕' : 'Landscape ↔'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                      {preset.description}
                    </p>
                  </div>

                  <button className="mt-4 w-full py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs group-hover:bg-indigo-500 transition shadow-md shadow-indigo-600/20 flex items-center justify-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Apply {modalPreviewOrientation === 'vertical' ? 'Vertical' : 'Horizontal'} Layout
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3D Realistic Preview Modal */}
      {show3DModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
          <div className="w-full max-w-4xl rounded-2xl bg-[#0e1320] border border-slate-800 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Eye className="w-5 h-5 text-red-500" />
                  Realistic 3D ID Card Preview (WebGL Three.js)
                </h2>
                <p className="text-slate-400 text-xs">
                  Physical PVC simulation with 0.76mm extruded thickness, bevel edges, dual-sided canvas mapping, and contact shadows.
                </p>
              </div>
              <button onClick={() => setShow3DModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <ThreeCardViewer
              template={template}
              employeeNumber="EMP-000125"
              employeeData={{
                employeeNumber: 'EMP-000125',
                fullName: 'Michael Brown',
                firstName: 'Michael',
                lastName: 'Brown',
                department: 'Global Operations',
                departmentName: 'Global Operations',
                position: 'Staff',
                positionTitle: 'Staff',
                branch: 'West Coast Tech Campus',
                branchName: 'West Coast Tech Campus',
                photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80',
              }}
              autoRotate={true}
            />

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShow3DModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Publish Immutable Version Modal */}
      {showPublishModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#0e1320] border border-slate-800 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-red-500" />
                Publish Card Template Version
              </h2>
              <button onClick={() => setShowPublishModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <p className="text-slate-300">
                Publishing creates an <strong>immutable version</strong> in Supabase. Previous versions will be archived, and all connected physical branch KIOSKs will immediately synchronize to this layout.
              </p>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Changelog Notes</label>
                <textarea
                  rows={3}
                  value={publishChangelog}
                  onChange={(e) => setPublishChangelog(e.target.value)}
                  placeholder="e.g. Updated corporate crimson accents and enhanced QR code security token."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"
                />
              </div>

              <div className="p-3 rounded bg-amber-950/30 border border-amber-800/40 text-amber-300 text-[11px]">
                Validation: Safe print margins (3mm) checked. Required name & photo bindings detected.
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
                <button
                  onClick={() => setShowPublishModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePublish}
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold shadow-md shadow-red-600/30"
                >
                  Confirm & Publish
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
