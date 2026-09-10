import { describe, it, expect } from 'vitest';
import {
  CardTemplateJSONSchema,
  resolveDataBinding,
  validateCardTemplate,
  generateBarcodeSvg,
  CR80_DIMENSIONS,
  CardTemplateJSON
} from '../src';

describe('Card Engine Core Tests', () => {
  const sampleEmployee = {
    employeeNumber: 'EMP-000123',
    firstName: 'John',
    lastName: 'Doe',
    fullName: 'John Doe',
    department: 'Engineering',
    position: 'Software Engineer',
    branch: 'Headquarters',
    email: 'john.doe@acmecorp.com',
  };

  it('should validate standard CR80 template schema', () => {
    const validTemplate: CardTemplateJSON = {
      version: 1,
      id: 'template-test-1',
      name: 'Test Executive ID',
      card: {
        width: 856,
        height: 540,
        unit: 'px',
        physicalWidth: 85.6,
        physicalHeight: 53.98,
        physicalUnit: 'mm',
        thickness: 0.76,
        cornerRound: 3.18,
        bleedMm: 1.5,
        safeMarginMm: 3.0,
      },
      front: {
        background: { color: '#ffffff' },
        elements: [
          {
            id: 'el-1',
            type: 'TEXT',
            x: 50,
            y: 50,
            width: 300,
            height: 40,
            text: '{{employee.fullName}}',
            fontSize: 20,
            fontFamily: 'Inter',
            fontWeight: 'bold',
            color: '#000000',
            textAlign: 'left',
            lineHeight: 1.2,
            letterSpacing: 0,
            rotation: 0,
            opacity: 1,
            isLocked: false,
            isHidden: false,
            zIndex: 1,
          },
          {
            id: 'el-2',
            type: 'EMPLOYEE_PHOTO',
            x: 50,
            y: 100,
            width: 150,
            height: 180,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: '#cccccc',
            objectFit: 'cover',
            rotation: 0,
            opacity: 1,
            isLocked: false,
            isHidden: false,
            zIndex: 2,
          }
        ],
      },
      back: {
        background: { color: '#f8fafc' },
        elements: [],
      },
    };

    const parsed = CardTemplateJSONSchema.parse(validTemplate);
    expect(parsed.name).toBe('Test Executive ID');
    expect(parsed.card.physicalWidth).toBe(85.6);
  });

  it('should safely interpolate whitelisted dynamic employee fields', () => {
    const input = 'Welcome {{employee.fullName}}, ID: {{employee.employeeNumber}} [{{employee.department}}]';
    const output = resolveDataBinding(input, sampleEmployee);
    expect(output).toBe('Welcome John Doe, ID: EMP-000123 [Engineering]');
  });

  it('should NOT resolve unwhitelisted malicious or arbitrary template injections', () => {
    const malicious = 'Secret: {{process.env.SECRET}} or {{eval(1+1)}} or {{window.localStorage}}';
    const output = resolveDataBinding(malicious, sampleEmployee);
    expect(output).toBe('Secret: {{process.env.SECRET}} or {{eval(1+1)}} or {{window.localStorage}}');
  });

  it('should generate valid barcode SVG output', () => {
    const svg = generateBarcodeSvg('EMP-000123', {
      format: 'CODE128',
      width: 300,
      height: 80,
    });
    expect(svg).toContain('<svg');
    expect(svg).toContain('EMP-000123');
    expect(svg).toContain('</svg>');
  });

  it('should warn when template elements violate safe margins', () => {
    const templateWithMarginViolation: CardTemplateJSON = {
      version: 1,
      name: 'Safe Margin Test',
      card: {
        width: 856,
        height: 540,
        unit: 'px',
        physicalWidth: 85.6,
        physicalHeight: 53.98,
        physicalUnit: 'mm',
        thickness: 0.76,
        cornerRound: 3.18,
        bleedMm: 1.5,
        safeMarginMm: 3.0,
      },
      front: {
        background: { color: '#ffffff' },
        elements: [
          {
            id: 'el-danger',
            type: 'TEXT',
            x: 2, // Violates 3mm (30px) margin
            y: 2,
            width: 200,
            height: 30,
            text: 'Danger Edge',
            fontSize: 14,
            fontFamily: 'Inter',
            fontWeight: 'normal',
            color: '#000000',
            textAlign: 'left',
            lineHeight: 1.2,
            letterSpacing: 0,
            rotation: 0,
            opacity: 1,
            isLocked: false,
            isHidden: false,
            zIndex: 1,
          },
        ],
      },
      back: {
        background: { color: '#ffffff' },
        elements: [],
      },
    };

    const res = validateCardTemplate(templateWithMarginViolation);
    expect(res.isValid).toBe(true); // errors = 0
    expect(res.warnings.length).toBeGreaterThan(0);
    expect(res.warnings.some((w) => w.elementId === 'el-danger')).toBe(true);
  });
});
