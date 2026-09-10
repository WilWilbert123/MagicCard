import { z } from 'zod';

// Standard ISO/IEC 7810 ID-1 CR80 dimensions
export const CR80_DIMENSIONS = {
  physicalWidthMm: 85.60,
  physicalHeightMm: 53.98,
  thicknessMm: 0.76,
  cornerRoundMm: 3.18,
  bleedMm: 1.5,
  safeMarginMm: 3.0,
  defaultCanvasWidthPx: 856,
  defaultCanvasHeightPx: 540,
  printDpi: 300,
  printWidthPx: 1011, // 85.6mm at 300 DPI
  printHeightPx: 638, // 53.98mm at 300 DPI
};

// Whitelisted employee interpolation keys
export const ALLOWED_DATA_BINDINGS = [
  'employee.fullName',
  'employee.firstName',
  'employee.lastName',
  'employee.employeeNumber',
  'employee.department',
  'employee.position',
  'employee.branch',
  'employee.email',
  'employee.contactNumber',
  'employee.dateHired',
  'employee.photoUrl',
  'system.currentDate',
  'system.verificationUrl',
] as const;

export type AllowedDataBinding = typeof ALLOWED_DATA_BINDINGS[number];

export const BaseElementSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  rotation: z.number().default(0).optional(),
  opacity: z.number().min(0).max(1).default(1).optional(),
  isLocked: z.boolean().default(false).optional(),
  isHidden: z.boolean().default(false).optional(),
  zIndex: z.number().default(0).optional(),
});

export const TextElementSchema = BaseElementSchema.extend({
  type: z.literal('TEXT'),
  text: z.string(),
  fontSize: z.number().default(16).optional(),
  fontFamily: z.string().default('Inter').optional(),
  fontWeight: z.enum(['normal', 'medium', '600', 'bold', '800']).default('normal').optional(),
  fontStyle: z.enum(['normal', 'italic']).default('normal').optional(),
  color: z.string().default('#000000').optional(),
  textAlign: z.enum(['left', 'center', 'right', 'justify']).default('left').optional(),
  lineHeight: z.number().default(1.2).optional(),
  letterSpacing: z.number().default(0).optional(),
  dataBinding: z.string().optional(),
});

export const EmployeePhotoElementSchema = BaseElementSchema.extend({
  type: z.literal('EMPLOYEE_PHOTO'),
  fallbackSrc: z.string().optional(),
  borderRadius: z.number().default(0).optional(),
  borderWidth: z.number().default(0).optional(),
  borderColor: z.string().default('#000000').optional(),
  objectFit: z.enum(['cover', 'contain', 'fill']).default('cover').optional(),
});

export const ImageElementSchema = BaseElementSchema.extend({
  type: z.literal('IMAGE'),
  src: z.string(),
  borderRadius: z.number().default(0).optional(),
  borderWidth: z.number().default(0).optional(),
  borderColor: z.string().default('transparent').optional(),
  objectFit: z.enum(['cover', 'contain', 'fill']).default('contain').optional(),
});

export const QRCodeElementSchema = BaseElementSchema.extend({
  type: z.literal('QR_CODE'),
  data: z.string(), // May contain binding like https://verify.acmecorp.com/{{employee.employeeNumber}}
  foregroundColor: z.string().default('#000000').optional(),
  backgroundColor: z.string().default('#ffffff').optional(),
  errorCorrectionLevel: z.enum(['L', 'M', 'Q', 'H']).default('M').optional(),
  includeMargin: z.boolean().default(true).optional(),
});

export const BarcodeElementSchema = BaseElementSchema.extend({
  type: z.literal('BARCODE'),
  data: z.string(),
  format: z.enum(['CODE128', 'EAN13', 'UPC', 'CODE39']).default('CODE128').optional(),
  lineColor: z.string().default('#000000').optional(),
  backgroundColor: z.string().default('#ffffff').optional(),
  displayValue: z.boolean().default(true).optional(),
  fontSize: z.number().default(12).optional(),
});

export const ShapeElementSchema = BaseElementSchema.extend({
  type: z.literal('SHAPE'),
  shapeType: z.enum(['RECTANGLE', 'CIRCLE', 'LINE']),
  fill: z.string().default('#dc2626').optional(),
  stroke: z.string().optional(),
  strokeWidth: z.number().default(0).optional(),
  borderRadius: z.number().default(0).optional(),
});

export const CardElementSchema = z.discriminatedUnion('type', [
  TextElementSchema,
  EmployeePhotoElementSchema,
  ImageElementSchema,
  QRCodeElementSchema,
  BarcodeElementSchema,
  ShapeElementSchema,
]);

export type CardElement = z.infer<typeof CardElementSchema>;
export type TextElement = z.infer<typeof TextElementSchema>;
export type EmployeePhotoElement = z.infer<typeof EmployeePhotoElementSchema>;
export type ImageElement = z.infer<typeof ImageElementSchema>;
export type QRCodeElement = z.infer<typeof QRCodeElementSchema>;
export type BarcodeElement = z.infer<typeof BarcodeElementSchema>;
export type ShapeElement = z.infer<typeof ShapeElementSchema>;

export const CardSurfaceSchema = z.object({
  background: z.object({
    color: z.string().default('#ffffff'),
    gradient: z.object({
      type: z.enum(['linear', 'radial']),
      stops: z.array(z.object({ offset: z.number(), color: z.string() })),
      angle: z.number().optional(),
    }).optional(),
    image: z.string().optional(),
  }),
  elements: z.array(CardElementSchema),
});

export type CardSurface = z.infer<typeof CardSurfaceSchema>;

export const CardTemplateDimensionsSchema = z.object({
  width: z.number().default(CR80_DIMENSIONS.defaultCanvasWidthPx),
  height: z.number().default(CR80_DIMENSIONS.defaultCanvasHeightPx),
  unit: z.enum(['px', 'mm']).default('px'),
  physicalWidth: z.number().default(CR80_DIMENSIONS.physicalWidthMm),
  physicalHeight: z.number().default(CR80_DIMENSIONS.physicalHeightMm),
  physicalUnit: z.enum(['mm', 'in']).default('mm'),
  thickness: z.number().default(CR80_DIMENSIONS.thicknessMm),
  cornerRound: z.number().default(CR80_DIMENSIONS.cornerRoundMm),
  bleedMm: z.number().default(CR80_DIMENSIONS.bleedMm),
  safeMarginMm: z.number().default(CR80_DIMENSIONS.safeMarginMm),
});

export const CardTemplateJSONSchema = z.object({
  version: z.literal(1).default(1),
  id: z.string().optional(),
  name: z.string(),
  description: z.string().optional(),
  card: CardTemplateDimensionsSchema,
  front: CardSurfaceSchema,
  back: CardSurfaceSchema,
});

export type CardTemplateJSON = z.infer<typeof CardTemplateJSONSchema>;
