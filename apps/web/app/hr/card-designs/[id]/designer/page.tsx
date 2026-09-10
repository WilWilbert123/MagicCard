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
} from 'lucide-react';
import { CardTemplateJSON, CardElement, TextElement, ShapeElement, QRCodeElement, BarcodeElement } from '@workspace/card-engine';
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
  const [publishChangelog, setPublishChangelog] = useState('');
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);

  // Drag & Drop State
  const [isDragging, setIsDragging] = useState(false);
  const [dragElementId, setDragElementId] = useState<string | null>(null);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [elementStartPos, setElementStartPos] = useState({ x: 0, y: 0 });

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
    if (!isDragging || !dragElementId) return;

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
  };

  const handleCanvasMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      setDragElementId(null);
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
    if (isVertical) {
      newTemplate.front.elements = JSON.parse(JSON.stringify(preset.frontElementsV));
      newTemplate.back.elements = JSON.parse(JSON.stringify(preset.backElementsV));
    } else {
      newTemplate.front.elements = JSON.parse(JSON.stringify(preset.frontElementsH));
      newTemplate.back.elements = JSON.parse(JSON.stringify(preset.backElementsH));
    }
    pushHistory(newTemplate);
    setShowLayoutModal(false);
    toast.success(`Applied "${preset.name}" layout preset!`);
  };

  const handleSaveDraft = () => {
    enterpriseStore.activeTemplate = JSON.parse(JSON.stringify(template));
    setSaveSuccessNotice(true);
    setTimeout(() => setSaveSuccessNotice(false), 3000);
    toast.success('Card design draft saved successfully.');
  };

  const handlePublish = () => {
    enterpriseStore.publishNewTemplate(template, publishChangelog || 'Updated CR80 visual card layout and security bindings');
    setShowPublishModal(false);
    toast.success('Template successfully published as immutable version! All fleet KIOSKs notified.');
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
              className={`px-3 py-1 rounded text-xs font-semibold transition ${activeSide === 'front' ? 'bg-red-600 text-white' : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
                }`}
            >
              Front
            </button>
            <button
              onClick={() => { setActiveSide('back'); setSelectedElementId(null); }}
              className={`px-3 py-1 rounded text-xs font-semibold transition ${activeSide === 'back' ? 'bg-red-600 text-white' : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
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
                    transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
                    opacity: el.opacity ?? 1,
                    cursor: el.isLocked ? 'default' : 'move',
                  }}
                  className={`group transition-shadow ${isSelected ? 'ring-2 ring-red-500 shadow-lg z-30' : 'hover:ring-1 hover:ring-red-400/50'
                    }`}
                >
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
                      className="w-full h-full flex items-center leading-none"
                    >
                      {el.text}
                    </div>
                  )}

                  {el.type === 'EMPLOYEE_PHOTO' && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80"
                      alt="Preview Avatar"
                      style={{
                        borderRadius: `${el.borderRadius || 10}px`,
                        borderWidth: `${el.borderWidth || 2}px`,
                        borderColor: el.borderColor || '#e2e8f0',
                      }}
                      className="w-full h-full object-cover shadow-sm pointer-events-none"
                    />
                  )}

                  {el.type === 'QR_CODE' && (
                    <div className="w-full h-full bg-white p-2 border border-slate-200 flex flex-col items-center justify-center rounded">
                      <QrCode className="w-full h-full text-slate-900" />
                    </div>
                  )}

                  {el.type === 'BARCODE' && (
                    <div className="w-full h-full bg-white p-2 border border-slate-200 flex flex-col items-center justify-center rounded">
                      <Barcode className="w-full h-12 text-black" />
                      <span className="text-[10px] font-mono text-black">EMP-000123</span>
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

                  {/* Resizing handles for selected item */}
                  {isSelected && !el.isLocked && (
                    <>
                      <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-red-600 rounded-full" />
                      <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-600 rounded-full" />
                      <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-red-600 rounded-full" />
                      <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-red-600 rounded-full" />
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
              {/* Position & Bounds */}
              <div className={`p-3 rounded-lg border space-y-3 ${cardRow}`}>
                <span className={`font-semibold block text-[10px] uppercase ${sectionHdr}`}>Position & Size</span>
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

      {/* Layout Presets Selection Modal */}
      {showLayoutModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
          <div className={`w-full max-w-4xl rounded-2xl border ${panelBorder} ${panel} p-6 shadow-2xl max-h-[90vh] flex flex-col`}>
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-base font-bold flex items-center gap-2">
                  <LayoutGrid className="w-5 h-5 text-indigo-500" />
                  Select ID Card Layout Preset ({isVertical ? 'Vertical Portrait' : 'Horizontal Landscape'})
                </h2>
                <p className="text-slate-400 text-xs mt-1">
                  Selecting a layout will replace current elements with a professionally designed pre-built template.
                </p>
              </div>
              <button onClick={() => setShowLayoutModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 overflow-y-auto p-1">
              {LAYOUT_PRESETS.map((preset: LayoutPreset) => (
                <div
                  key={preset.id}
                  onClick={() => applyLayoutPreset(preset)}
                  className={`group border rounded-xl p-4 cursor-pointer transition hover:scale-[1.02] flex flex-col justify-between ${
                    isDark ? 'bg-slate-900 border-slate-800 hover:border-indigo-500' : 'bg-slate-50 border-slate-200 hover:border-indigo-500 shadow-sm'
                  }`}
                >
                  <div>
                    {/* Thumbnail preview bar */}
                    <div
                      style={{ backgroundColor: preset.themeColor }}
                      className="w-full h-24 rounded-lg mb-3 flex items-center justify-center relative overflow-hidden shadow-inner"
                    >
                      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:10px_10px]" />
                      <span className={`px-2.5 py-1 rounded text-[11px] font-bold ${preset.badgeBg} ${preset.badgeText} shadow-md`}>
                        {preset.name}
                      </span>
                    </div>

                    <h3 className="font-bold text-sm mb-1">{preset.name}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">{preset.description}</p>
                  </div>

                  <button className="mt-4 w-full py-1.5 rounded-lg bg-indigo-600 text-white font-semibold text-xs group-hover:bg-indigo-500 transition shadow-sm">
                    Apply Layout
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

            <ThreeCardViewer template={template} autoRotate={true} />

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
