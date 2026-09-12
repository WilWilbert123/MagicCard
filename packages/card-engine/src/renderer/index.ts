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

  // 1. Draw Background
  if (surface.background.color) {
    ctx.fillStyle = surface.background.color;
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
        await drawImage(ctx, el, options.signal);
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
  } else if (shapeType === 'SMOKE') {
    const cx = el.x + el.width / 2;
    const cy = el.y + el.height / 2;
    const r = Math.max(el.width, el.height) / 2;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, el.fill || '#dc2626');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
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
  signal?: AbortSignal
) {
  if (!el.src) return;
  await drawImageFromUrl(ctx, el.src, el.x, el.y, el.width, el.height, el.borderRadius, el.borderWidth, el.borderColor, signal);
}

async function drawQRCode(
  ctx: CanvasRenderingContext2D,
  el: Extract<CardElement, { type: 'QR_CODE' }>,
  employee: EmployeeResolutionContext,
  baseUrl?: string,
  signal?: AbortSignal
) {
  const resolvedData = resolveDataBinding(el.data, employee, baseUrl);
  const dataUrl = await generateQRCodeDataUrl(resolvedData, {
    width: el.width,
    color: {
      dark: el.foregroundColor || '#000000',
      light: el.backgroundColor || '#ffffff',
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
    backgroundColor: el.backgroundColor || '#ffffff',
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
  signal?: AbortSignal
): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve();
      return;
    }
    // If running in browser environment
    if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        if (signal?.aborted) {
          resolve();
          return;
        }
        ctx.save();
        if (borderRadius > 0) {
          drawRoundedRect(ctx, x, y, width, height, borderRadius);
          ctx.clip();
        }
        ctx.drawImage(img, x, y, width, height);
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
        resolve();
      };
      img.onerror = () => {
        if (!signal?.aborted) {
          ctx.fillStyle = '#fee2e2';
          ctx.fillRect(x, y, width, height);
        }
        resolve();
      };
      img.src = src;
    } else {
      resolve();
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
