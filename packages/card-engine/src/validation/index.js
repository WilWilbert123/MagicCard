/**
 * Validates a card template against enterprise printing and layout rules
 */
export function validateCardTemplate(template) {
    const errors = [];
    const warnings = [];
    // 1. Dimensions check
    if (template.card.width <= 0 || template.card.height <= 0) {
        errors.push({ field: 'card', message: 'Card dimensions must be greater than zero.', severity: 'error' });
    }
    // Calculate safe margin in pixels
    const pxPerMm = template.card.width / template.card.physicalWidth;
    const safeMarginPx = template.card.safeMarginMm * pxPerMm;
    // 2. Validate Front Surface
    validateSurface(template.front, 'front', template.card.width, template.card.height, safeMarginPx, errors, warnings);
    // 3. Validate Back Surface
    validateSurface(template.back, 'back', template.card.width, template.card.height, safeMarginPx, errors, warnings);
    // 4. Must contain at least one Employee Name or Photo on front
    const frontHasPhoto = template.front.elements.some((el) => el.type === 'EMPLOYEE_PHOTO');
    const frontHasName = template.front.elements.some((el) => el.type === 'TEXT' && (el.text.includes('{{employee.fullName}}') || el.text.includes('{{employee.firstName}}')));
    if (!frontHasPhoto) {
        warnings.push({
            field: 'front.elements',
            message: 'Card front has no Employee Photo element.',
            severity: 'warning',
        });
    }
    if (!frontHasName) {
        warnings.push({
            field: 'front.elements',
            message: 'Card front has no dynamic Employee Name element.',
            severity: 'warning',
        });
    }
    return {
        isValid: errors.length === 0,
        errors,
        warnings,
    };
}
function validateSurface(surface, surfaceName, canvasWidth, canvasHeight, safeMarginPx, errors, warnings) {
    for (const el of surface.elements) {
        // Check if element is completely off-canvas
        if (el.x + el.width < 0 || el.y + el.height < 0 || el.x > canvasWidth || el.y > canvasHeight) {
            warnings.push({
                field: `${surfaceName}.${el.id}`,
                message: `Element '${el.name || el.id}' (${el.type}) is positioned outside the card boundaries.`,
                severity: 'warning',
                elementId: el.id,
            });
        }
        // Check if critical element violates safe margin
        if (el.type === 'QR_CODE' || el.type === 'BARCODE' || el.type === 'TEXT') {
            const violatesSafeMargin = el.x < safeMarginPx ||
                el.y < safeMarginPx ||
                el.x + el.width > canvasWidth - safeMarginPx ||
                el.y + el.height > canvasHeight - safeMarginPx;
            if (violatesSafeMargin) {
                warnings.push({
                    field: `${surfaceName}.${el.id}`,
                    message: `Element '${el.name || el.id}' enters the physical print margin (${(safeMarginPx / (canvasWidth / 85.6)).toFixed(1)}mm) and may be trimmed.`,
                    severity: 'warning',
                    elementId: el.id,
                });
            }
        }
    }
}
