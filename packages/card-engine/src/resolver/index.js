import { ALLOWED_DATA_BINDINGS } from '../schema';
/**
 * Builds the canonical lookup dictionary from an employee record.
 */
export function buildResolutionDictionary(employee, baseUrl = 'https://verify.acmecorp.com') {
    const constructedFullName = employee.fullName ||
        [employee.firstName, employee.middleName, employee.lastName, employee.suffix]
            .filter(Boolean)
            .join(' ');
    return {
        'employee.fullName': constructedFullName,
        'employee.firstName': employee.firstName || '',
        'employee.lastName': employee.lastName || '',
        'employee.employeeNumber': employee.employeeNumber || '',
        'employee.department': employee.department || 'N/A',
        'employee.position': employee.position || 'Employee',
        'employee.branch': employee.branch || 'Headquarters',
        'employee.email': employee.email || '',
        'employee.contactNumber': employee.contactNumber || '',
        'employee.dateHired': employee.dateHired || new Date().toISOString().split('T')[0],
        'employee.photoUrl': employee.photoUrl || '',
        'system.currentDate': new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
        'system.verificationUrl': `${baseUrl}/verify/${employee.employeeNumber}`,
    };
}
/**
 * Resolves template strings containing `{{placeholder}}` using whitelisted bindings.
 * Does NOT execute any JavaScript, guaranteeing absolute injection safety.
 */
export function resolveDataBinding(templateString, employee, baseUrl) {
    if (!templateString || !templateString.includes('{{')) {
        return templateString;
    }
    const dict = buildResolutionDictionary(employee, baseUrl);
    return templateString.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (match, key) => {
        // Only resolve keys present in our whitelist
        if (ALLOWED_DATA_BINDINGS.includes(key) && key in dict) {
            return dict[key];
        }
        // Return unchanged if key is unrecognized/disallowed
        return match;
    });
}
