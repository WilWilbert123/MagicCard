import { CardTemplateJSON } from '../schema';
export interface ValidationError {
    field: string;
    message: string;
    severity: 'error' | 'warning';
    elementId?: string;
}
export interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
    warnings: ValidationError[];
}
/**
 * Validates a card template against enterprise printing and layout rules
 */
export declare function validateCardTemplate(template: CardTemplateJSON): ValidationResult;
