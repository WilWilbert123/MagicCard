import QRCode from 'qrcode';

export async function generateQRCodeDataUrl(text, options = {}) {
    let lightColor = options.color?.light || '#ffffff';
    if (lightColor === 'transparent' || lightColor === 'none') {
        lightColor = '#00000000';
    }
    return QRCode.toDataURL(text, {
        width: options.width || 256,
        margin: options.margin !== undefined ? options.margin : 1,
        color: {
            dark: options.color?.dark || '#000000',
            light: lightColor,
        },
        errorCorrectionLevel: options.errorCorrectionLevel || 'M',
    });
}

export function generateBarcodeSvg(text, options = {}) {
    const barcodeValue = text.trim() || 'EMP-000000';
    const lineColor = options.lineColor || '#000000';
    const rawBgColor = options.backgroundColor;
    const bgColor = (rawBgColor && rawBgColor !== 'transparent' && rawBgColor !== 'none') ? rawBgColor : null;
    const height = options.height || 60;
    const width = options.width || 200;
    const pattern = generateCode128BitPattern(barcodeValue);
    const barWidth = width / pattern.length;
    let rects = '';
    for (let i = 0; i < pattern.length; i++) {
        if (pattern[i] === '1') {
            rects += `<rect x="${(i * barWidth).toFixed(2)}" y="0" width="${barWidth.toFixed(2)}" height="${height - (options.displayValue ? 16 : 0)}" fill="${lineColor}" />`;
        }
    }
    const shouldDisplay = options.displayValue !== false;
    const textElement = shouldDisplay
        ? `<text x="${(width / 2).toFixed(1)}" y="${height}" text-anchor="middle" font-family="monospace" font-size="${options.fontSize || 12}" fill="${lineColor}">${escapeXml(barcodeValue)}</text>`
        : '';
    const backgroundRect = bgColor ? `<rect width="100%" height="100%" fill="${bgColor}"/>` : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
    ${backgroundRect}
    ${rects}
    ${textElement}
  </svg>`;
}

function escapeXml(unsafe) {
    return unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
            default: return c;
        }
    });
}

function generateCode128BitPattern(text) {
    let pattern = '11010010000';
    for (let i = 0; i < text.length; i++) {
        const charCode = text.charCodeAt(i);
        const bits = (charCode * 2654435761 >>> 0).toString(2).padStart(11, '10101010101').slice(-11);
        pattern += bits;
    }
    pattern += '1100011101011';
    return pattern;
}
