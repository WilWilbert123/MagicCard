export interface QRCodeGenerateOptions {
    width?: number;
    margin?: number;
    color?: {
        dark?: string;
        light?: string;
    };
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
}
/**
 * Generates a QR Code as a Data URL (base64 PNG)
 */
export declare function generateQRCodeDataUrl(text: string, options?: QRCodeGenerateOptions): Promise<string>;
/**
 * Generates an SVG string representation of a Code128 barcode
 */
export declare function generateBarcodeSvg(text: string, options?: {
    format?: 'CODE128' | 'EAN13' | 'UPC' | 'CODE39';
    lineColor?: string;
    backgroundColor?: string;
    displayValue?: boolean;
    fontSize?: number;
    width?: number;
    height?: number;
}): string;
