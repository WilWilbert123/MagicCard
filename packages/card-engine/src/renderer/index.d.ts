import { CardTemplateJSON } from '../schema';
import { EmployeeResolutionContext } from '../resolver';
export interface RenderCardOptions {
    scale?: number;
    pixelRatio?: number;
    showGuides?: boolean;
    showBleed?: boolean;
    showSafeMargin?: boolean;
    baseUrl?: string;
}
/**
 * Pure 2D Canvas Renderer for Card Templates.
 * Can be used in browser HTMLCanvasElement or Three.js CanvasTexture.
 */
export declare function renderCardToCanvas(canvas: HTMLCanvasElement, template: CardTemplateJSON, side: 'front' | 'back', employee: EmployeeResolutionContext, options?: RenderCardOptions): Promise<HTMLCanvasElement>;
