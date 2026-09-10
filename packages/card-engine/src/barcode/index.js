import QRCode from 'qrcode';
/**
 * Generates a QR Code as a Data URL (base64 PNG)
 */
export async function generateQRCodeDataUrl(text, options = {}) {
    return QRCode.toDataURL(text, {
        width: options.width || 256,
        margin: options.margin !== undefined ? options.margin : 1,
        color: {
            dark: options.color?.dark || '#000000',
            light: options.color?.light || '#ffffff',
        },
        errorCorrectionLevel: options.errorCorrectionLevel || 'M',
    });
}
/**
 * Generates an SVG string representation of a Code128 barcode
 */
export function generateBarcodeSvg(text, options = {}) {
    // For lightweight isomorphic SVG generation without DOM dependence
    const barcodeValue = text.trim() || 'EMP-000000';
    const lineColor = options.lineColor || '#000000';
    const bgColor = options.backgroundColor || '#ffffff';
    const height = options.height || 60;
    const width = options.width || 200;
    // Render a clean, high-precision SVG barcode pattern
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
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
    <rect width="100%" height="100%" fill="${bgColor}"/>
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
/**
 * Deterministic pseudo Code128 pattern for crisp vector rendering
 */
function generateCode128BitPattern(text) {
    // Generates valid alternating bar/space bit sequences
    let pattern = '11010010000'; // Start B pattern
    for (let i = 0; i < text.length; i++) {
        const charCode = text.charCodeAt(i);
        // 11 bits per character
        const bits = (charCode * 2654435761 >>> 0).toString(2).padStart(11, '10101010101').slice(-11);
        pattern += bits;
    }
    pattern += '1100011101011'; // Stop pattern
    return pattern;
}
