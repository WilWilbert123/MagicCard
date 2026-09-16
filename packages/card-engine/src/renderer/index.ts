import { CardTemplateJSON, CardElement, CardSurface } from '../schema';
import { EmployeeResolutionContext, resolveDataBinding } from '../resolver';
import { generateQRCodeDataUrl, generateBarcodeSvg } from '../barcode';

export interface RenderCardOptions {
  scale?: number;             // e.g. 1 for screen preview, 2 or 3 for 300 DPI printing / WebGL texture
  pixelRatio?: number;
  showGuides?: boolean;
  showBleed?: boolean;
  showSafeMargin?: boolean;
  baseUrl?: string;
  signal?: AbortSignal;
}

/**
 * Pure 2D Canvas Renderer for Card Templates.
 * Can be used in browser HTMLCanvasElement or Three.js CanvasTexture.
 */
export async function renderCardToCanvas(
  canvas: HTMLCanvasElement,
  template: CardTemplateJSON,
  side: 'front' | 'back',
  employee: EmployeeResolutionContext,
  options: RenderCardOptions = {}
): Promise<HTMLCanvasElement> {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to acquire 2D canvas context');
  }

  const scale = options.scale || 1;
  const baseWidth = template.card.width;
  const baseHeight = template.card.height;

  canvas.width = Math.round(baseWidth * scale);
  canvas.height = Math.round(baseHeight * scale);

  ctx.save();
  ctx.scale(scale, scale);

  const surface = side === 'front' ? template.front : template.back;

  // 1. Clip card surface to rounded bounds & draw Background
  const cardRadius = (template.card as any).borderRadius ?? (baseHeight > baseWidth ? 18 : 24);
  drawRoundedRect(ctx, 0, 0, baseWidth, baseHeight, cardRadius);
  ctx.clip();

  const bgColor = surface?.background?.color || '#ffffff';
  if (bgColor !== 'transparent' && bgColor !== 'none') {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, baseWidth, baseHeight);
  }

  // 2. Draw Elements in order of z-index / array sequence
  let hasRenderedQR = false;
  let hasRenderedBarcode = false;
  for (const el of surface.elements) {
    if (options.signal?.aborted) {
      ctx.restore();
      return canvas;
    }
    if (el.isHidden) continue;

    ctx.save();
    ctx.globalAlpha = el.opacity ?? 1;

    // Apply rotation & flips around element center
    if ((el.rotation && el.rotation !== 0) || el.flipX || el.flipY) {
      const centerX = el.x + el.width / 2;
      const centerY = el.y + el.height / 2;
      ctx.translate(centerX, centerY);
      if (el.rotation && el.rotation !== 0) {
        ctx.rotate((el.rotation * Math.PI) / 180);
      }
      if (el.flipX || el.flipY) {
        ctx.scale(el.flipX ? -1 : 1, el.flipY ? -1 : 1);
      }
      ctx.translate(-centerX, -centerY);
    }

    try {
      switch (el.type) {
        case 'SHAPE':
          drawShape(ctx, el);
          break;
        case 'TEXT':
          drawText(ctx, el, employee, options.baseUrl);
          break;
        case 'EMPLOYEE_PHOTO':
          await drawPhoto(ctx, el, employee, options.signal);
          break;
        case 'IMAGE':
          await drawImage(ctx, el, employee, options.baseUrl, options.signal);
          break;
        case 'QR_CODE':
          if (!hasRenderedQR) {
            await drawQRCode(ctx, el, employee, options.baseUrl, options.signal);
            hasRenderedQR = true;
          }
          break;
        case 'BARCODE':
          if (!hasRenderedBarcode) {
            await drawBarcode(ctx, el, employee, options.signal);
            hasRenderedBarcode = true;
          }
          break;
      }
    } catch (err) {
      console.warn(`Error rendering element ${el.id} (${el.type}):`, err);
    }

    ctx.restore();
  }

  // 3. Optional print-safe guides
  if (options.showSafeMargin) {
    const pxPerMm = baseWidth / template.card.physicalWidth;
    const margin = template.card.safeMarginMm * pxPerMm;
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(margin, margin, baseWidth - margin * 2, baseHeight - margin * 2);
  }

  ctx.restore();
  return canvas;
}

function drawShape(ctx: CanvasRenderingContext2D, el: Extract<CardElement, { type: 'SHAPE' }>) {
  ctx.fillStyle = el.fill || '#dc2626';
  const shapeType = el.shapeType || 'RECTANGLE';

  if (shapeType === 'RECTANGLE') {
    if (el.borderRadius && el.borderRadius > 0) {
      drawRoundedRect(ctx, el.x, el.y, el.width, el.height, el.borderRadius);
      ctx.fill();
      if (el.stroke && el.strokeWidth) {
        ctx.strokeStyle = el.stroke;
        ctx.lineWidth = el.strokeWidth;
        ctx.stroke();
      }
    } else {
      ctx.fillRect(el.x, el.y, el.width, el.height);
      if (el.stroke && el.strokeWidth) {
        ctx.strokeStyle = el.stroke;
        ctx.lineWidth = el.strokeWidth;
        ctx.strokeRect(el.x, el.y, el.width, el.height);
      }
    }
  } else if (shapeType === 'CIRCLE') {
    ctx.beginPath();
    ctx.arc(el.x + el.width / 2, el.y + el.height / 2, Math.min(el.width, el.height) / 2, 0, Math.PI * 2);
    ctx.fill();
    if (el.stroke && el.strokeWidth) {
      ctx.strokeStyle = el.stroke;
      ctx.lineWidth = el.strokeWidth;
      ctx.stroke();
    }
  } else if (shapeType === 'LINE') {
    ctx.beginPath();
    ctx.moveTo(el.x, el.y);
    ctx.lineTo(el.x + el.width, el.y + el.height);
    ctx.strokeStyle = el.fill || '#000000';
    ctx.lineWidth = el.strokeWidth || 2;
    ctx.stroke();
  } else if (shapeType === 'TRIANGLE') {
    ctx.beginPath();
    ctx.moveTo(el.x + el.width / 2, el.y);
    ctx.lineTo(el.x, el.y + el.height);
    ctx.lineTo(el.x + el.width, el.y + el.height);
    ctx.closePath();
    ctx.fill();
    if (el.stroke && el.strokeWidth) {
      ctx.strokeStyle = el.stroke;
      ctx.lineWidth = el.strokeWidth;
      ctx.stroke();
    }
  } else if (shapeType === 'DIAGONAL') {
    ctx.beginPath();
    ctx.moveTo(el.x, el.y);
    ctx.lineTo(el.x + el.width, el.y);
    ctx.lineTo(el.x + el.width * 0.8, el.y + el.height);
    ctx.lineTo(el.x, el.y + el.height);
    ctx.closePath();
    ctx.fill();
  } else if (shapeType === 'WAVE_HORIZONTAL' || (shapeType as string) === 'HORIZONTAL_WAVE') {
    ctx.beginPath();
    ctx.moveTo(el.x, el.y + el.height * 0.35);
    ctx.bezierCurveTo(
      el.x + el.width * 0.20, el.y + el.height * 0.05,
      el.x + el.width * 0.40, el.y + el.height * 0.85,
      el.x + el.width * 0.65, el.y + el.height * 0.45
    );
    ctx.bezierCurveTo(
      el.x + el.width * 0.80, el.y + el.height * 0.20,
      el.x + el.width * 0.92, el.y + el.height * 0.10,
      el.x + el.width, el.y + el.height * 0.25
    );
    ctx.lineTo(el.x + el.width, el.y + el.height);
    ctx.lineTo(el.x, el.y + el.height);
    ctx.closePath();
    ctx.fillStyle = el.fill || '#dc2626';
    ctx.fill();
    if (el.stroke && el.strokeWidth) {
      ctx.strokeStyle = el.stroke;
      ctx.lineWidth = el.strokeWidth;
      ctx.stroke();
    }
  } else if (shapeType === 'WAVE_VERTICAL' || (shapeType as string) === 'VERTICAL_WAVE') {
    ctx.beginPath();
    ctx.moveTo(el.x + el.width * 0.35, el.y);
    ctx.bezierCurveTo(
      el.x + el.width * 0.05, el.y + el.height * 0.20,
      el.x + el.width * 0.85, el.y + el.height * 0.40,
      el.x + el.width * 0.45, el.y + el.height * 0.65
    );
    ctx.bezierCurveTo(
      el.x + el.width * 0.20, el.y + el.height * 0.80,
      el.x + el.width * 0.10, el.y + el.height * 0.92,
      el.x + el.width * 0.25, el.y + el.height
    );
    ctx.lineTo(el.x + el.width, el.y + el.height);
    ctx.lineTo(el.x + el.width, el.y);
    ctx.closePath();
    ctx.fillStyle = el.fill || '#dc2626';
    ctx.fill();
    if (el.stroke && el.strokeWidth) {
      ctx.strokeStyle = el.stroke;
      ctx.lineWidth = el.strokeWidth;
      ctx.stroke();
    }
  } else if (shapeType === 'SMOKE') {
    const cx = el.x + el.width / 2;
    const cy = el.y + el.height / 2;
    const r = Math.max(el.width, el.height) / 2;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    const fillColor = el.fill || '#dc2626';
    grad.addColorStop(0, colorToRgba(fillColor, 1));
    grad.addColorStop(0.45, colorToRgba(fillColor, 0.5));
    grad.addColorStop(0.7, colorToRgba(fillColor, 0));
    grad.addColorStop(1, colorToRgba(fillColor, 0));
    ctx.fillStyle = grad;
    ctx.fillRect(el.x, el.y, el.width, el.height);
  } else if (shapeType === 'SIGNATURE_LINE') {
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(el.x, el.y, el.width, el.height);
    ctx.strokeStyle = el.stroke || '#cbd5e1';
    ctx.lineWidth = el.strokeWidth || 1;
    ctx.strokeRect(el.x, el.y, el.width, el.height);

    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(el.x + 10, el.y + el.height - 10);
    ctx.lineTo(el.x + el.width - 10, el.y + el.height - 10);
    ctx.stroke();
  } else if (shapeType === 'LOGO') {
    ctx.fillStyle = el.fill || '#f8fafc';
    ctx.fillRect(el.x, el.y, el.width, el.height);
    ctx.strokeStyle = el.stroke || '#dc2626';
    ctx.lineWidth = el.strokeWidth || 2;
    ctx.strokeRect(el.x, el.y, el.width, el.height);
    ctx.fillStyle = el.stroke || '#dc2626';
    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('LOGO', el.x + el.width / 2, el.y + el.height / 2);
  }
}


function drawText(
  ctx: CanvasRenderingContext2D,
  el: Extract<CardElement, { type: 'TEXT' }>,
  employee: EmployeeResolutionContext,
  baseUrl?: string
) {
  const resolved = resolveDataBinding(el.text, employee, baseUrl);
  const fontSize = el.fontSize || 16;
  const fontWeight = el.fontWeight || 'normal';
  const fontFamily = el.fontFamily || 'Inter, sans-serif';

  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  ctx.fillStyle = el.color || '#000000';

  let drawX = el.x;
  if (el.textAlign === 'center') {
    ctx.textAlign = 'center';
    drawX = el.x + el.width / 2;
  } else if (el.textAlign === 'right') {
    ctx.textAlign = 'right';
    drawX = el.x + el.width;
  } else {
    ctx.textAlign = 'left';
    drawX = el.x;
  }

  // Handle multi-line wrapping with flex items-center vertical centering
  const words = resolved.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  const lineHeight = fontSize * (el.lineHeight || 1.2);

  for (let n = 0; n < words.length; n++) {
    const testLine = currentLine ? currentLine + ' ' + words[n] : words[n];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > el.width && n > 0) {
      lines.push(currentLine);
      currentLine = words[n];
    } else {
      currentLine = testLine;
    }
  }
  lines.push(currentLine);

  const totalHeight = lines.length * lineHeight;
  const startY = el.y + (el.height - totalHeight) / 2 + lineHeight / 2;
  ctx.textBaseline = 'middle';

  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], drawX, startY + i * lineHeight);
  }
}

async function drawPhoto(
  ctx: CanvasRenderingContext2D,
  el: Extract<CardElement, { type: 'EMPLOYEE_PHOTO' }>,
  employee: EmployeeResolutionContext,
  signal?: AbortSignal
) {
  const photoUrl = employee.photoUrl || el.fallbackSrc;
  if (!photoUrl) {
    // Render placeholder avatar silhouette
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(el.x, el.y, el.width, el.height);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PHOTO', el.x + el.width / 2, el.y + el.height / 2);
    return;
  }

  await drawImageFromUrl(ctx, photoUrl, el.x, el.y, el.width, el.height, el.borderRadius, el.borderWidth, el.borderColor, signal);
}

async function drawImage(
  ctx: CanvasRenderingContext2D,
  el: Extract<CardElement, { type: 'IMAGE' }>,
  employee: EmployeeResolutionContext,
  baseUrl?: string,
  signal?: AbortSignal
) {
  if (!el.src) return;
  const resolvedSrc = resolveDataBinding(el.src, employee, baseUrl);
  await drawImageFromUrl(
    ctx,
    resolvedSrc || el.src,
    el.x,
    el.y,
    el.width,
    el.height,
    el.borderRadius,
    el.borderWidth,
    el.borderColor,
    signal,
    el.objectFit,
    el.tintColor
  );
}

async function drawQRCode(
  ctx: CanvasRenderingContext2D,
  el: Extract<CardElement, { type: 'QR_CODE' }>,
  employee: EmployeeResolutionContext,
  baseUrl?: string,
  signal?: AbortSignal
) {
  const resolvedData = resolveDataBinding(el.data, employee, baseUrl);
  let lightColor = el.backgroundColor || '#ffffff';
  if (lightColor === 'transparent' || lightColor === 'none') {
    lightColor = '#00000000';
  }

  const dataUrl = await generateQRCodeDataUrl(resolvedData, {
    width: el.width,
    color: {
      dark: el.foregroundColor || '#000000',
      light: lightColor,
    },
    errorCorrectionLevel: el.errorCorrectionLevel || 'M',
  });

  await drawImageFromUrl(ctx, dataUrl, el.x, el.y, el.width, el.height, 0, 0, 'transparent', signal);
}

async function drawBarcode(
  ctx: CanvasRenderingContext2D,
  el: Extract<CardElement, { type: 'BARCODE' }>,
  employee: EmployeeResolutionContext,
  signal?: AbortSignal
) {
  const resolvedValue = resolveDataBinding(el.data, employee);
  const svg = generateBarcodeSvg(resolvedValue, {
    format: el.format || 'CODE128',
    lineColor: el.lineColor || '#000000',
    backgroundColor: el.backgroundColor || 'transparent',
    displayValue: el.displayValue !== false,
    fontSize: el.fontSize || 12,
    width: el.width,
    height: el.height,
  });

  const svgDataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  await drawImageFromUrl(ctx, svgDataUrl, el.x, el.y, el.width, el.height, 0, 0, 'transparent', signal);
}

function drawImageFromUrl(
  ctx: CanvasRenderingContext2D,
  src: string,
  x: number,
  y: number,
  width: number,
  height: number,
  borderRadius = 0,
  borderWidth = 0,
  borderColor = 'transparent',
  signal?: AbortSignal,
  objectFit: 'cover' | 'contain' | 'fill' = 'cover',
  tintColor?: string
): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted || !src) {
      resolve();
      return;
    }

    let isResolved = false;
    const safeResolve = () => {
      if (!isResolved) {
        isResolved = true;
        resolve();
      }
    };

    const timeoutId = setTimeout(() => {
      safeResolve();
    }, 2000);

    // If running in browser environment
    if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
      const tryRenderImage = (useCrossOrigin: boolean) => {
        const img = new Image();
        if (useCrossOrigin) {
          img.crossOrigin = 'anonymous';
        }
        img.onload = () => {
          clearTimeout(timeoutId);
          if (signal?.aborted) {
            safeResolve();
            return;
          }
          ctx.save();
          if (borderRadius > 0) {
            drawRoundedRect(ctx, x, y, width, height, borderRadius);
            ctx.clip();
          }

          let renderW = width;
          let renderH = height;
          let renderX = x;
          let renderY = y;

          if (objectFit === 'contain' && img.naturalWidth && img.naturalHeight) {
            const imgRatio = img.naturalWidth / img.naturalHeight;
            const boxRatio = width / height;
            if (imgRatio > boxRatio) {
              renderH = width / imgRatio;
              renderY = y + (height - renderH) / 2;
            } else {
              renderW = height * imgRatio;
              renderX = x + (width - renderW) / 2;
            }
          }

          if (tintColor && tintColor !== 'none' && tintColor !== 'transparent') {
            const lowerTint = tintColor.toLowerCase();
            const targetColor = lowerTint === 'white' ? '#ffffff' : lowerTint === 'black' ? '#000000' : tintColor;
            try {
              const offCanvas = document.createElement('canvas');
              offCanvas.width = Math.max(1, Math.round(renderW));
              offCanvas.height = Math.max(1, Math.round(renderH));
              const offCtx = offCanvas.getContext('2d');
              if (offCtx) {
                offCtx.drawImage(img, 0, 0, offCanvas.width, offCanvas.height);
                offCtx.globalCompositeOperation = 'source-in';
                offCtx.fillStyle = targetColor;
                offCtx.fillRect(0, 0, offCanvas.width, offCanvas.height);
                ctx.drawImage(offCanvas, renderX, renderY);
              } else {
                ctx.drawImage(img, renderX, renderY, renderW, renderH);
              }
            } catch (e) {
              ctx.drawImage(img, renderX, renderY, renderW, renderH);
            }
          } else {
            ctx.drawImage(img, renderX, renderY, renderW, renderH);
          }

          ctx.restore();

          if (borderWidth > 0 && borderColor && borderColor !== 'transparent') {
            ctx.save();
            ctx.strokeStyle = borderColor;
            ctx.lineWidth = borderWidth;
            if (borderRadius > 0) {
              drawRoundedRect(ctx, x, y, width, height, borderRadius);
              ctx.stroke();
            } else {
              ctx.strokeRect(x, y, width, height);
            }
            ctx.restore();
          }
          safeResolve();
        };

        img.onerror = () => {
          if (useCrossOrigin) {
            tryRenderImage(false);
          } else {
            clearTimeout(timeoutId);
            safeResolve();
          }
        };

        img.src = src;
      };

      tryRenderImage(true);
    } else {
      clearTimeout(timeoutId);
      safeResolve();
    }
  });
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const maxR = Math.min(width, height) / 2;
  if (radius >= maxR && Math.abs(width - height) < 1) {
    ctx.beginPath();
    ctx.arc(x + width / 2, y + height / 2, maxR, 0, Math.PI * 2);
    ctx.closePath();
    return;
  }
  const r = Math.min(radius, maxR);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
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
