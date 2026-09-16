import { ALLOWED_DATA_BINDINGS } from '../schema';
export function encodeVerificationToken(employeeNumber) {
    if (!employeeNumber)
        return '';
    const clean = employeeNumber.trim();
    try {
        const raw = `SEAL_2028:${clean}`;
        let base64 = '';
        if (typeof Buffer !== 'undefined') {
            base64 = Buffer.from(raw, 'utf-8').toString('base64');
        }
        else if (typeof btoa !== 'undefined') {
            base64 = btoa(raw);
        }
        else {
            return clean;
        }
        const safe = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        return `v1_${safe}`;
    }
    catch {
        return clean;
    }
}
export function decodeVerificationToken(token) {
    if (!token)
        return '';
    const clean = token.trim();
    if (clean.startsWith('v1_')) {
        try {
            let base64 = clean.slice(3).replace(/-/g, '+').replace(/_/g, '/');
            while (base64.length % 4 !== 0) {
                base64 += '=';
            }
            let decoded = '';
            if (typeof Buffer !== 'undefined') {
                decoded = Buffer.from(base64, 'base64').toString('utf-8');
            }
            else if (typeof atob !== 'undefined') {
                decoded = atob(base64);
            }
            if (decoded.startsWith('SEAL_2028:')) {
                return decoded.slice(10);
            }
        }
        catch {
            // Fallback to raw token
        }
    }
    return clean;
}
/**
 * Builds the canonical lookup dictionary from an employee record.
 */
export function buildResolutionDictionary(employee, baseUrl = 'https://magic-card-trust-id.vercel.app') {
    const constructedFullName = employee.fullName ||
        [employee.firstName, employee.middleName, employee.lastName, employee.suffix]
            .filter(Boolean)
            .join(' ');
    const empAny = employee;
    const rawBase = (baseUrl && baseUrl !== 'https://verify.acmecorp.com')
        ? baseUrl
        : 'https://magic-card-trust-id.vercel.app';
    const cleanBase = rawBase.trim().replace(/\/+$/, '');
    const token = encodeVerificationToken(employee.employeeNumber || '');
    let verificationUrl = '';
    if (cleanBase.endsWith('/verify')) {
        verificationUrl = `${cleanBase}/${encodeURIComponent(token)}`;
    }
    else if (cleanBase.includes('/verify/')) {
        verificationUrl = cleanBase.replace(/\/verify\/.*$/, `/verify/${encodeURIComponent(token)}`);
    }
    else {
        verificationUrl = `${cleanBase}/verify/${encodeURIComponent(token)}`;
    }
    return {
        'employee.fullName': constructedFullName,
        'employee.firstName': employee.firstName || '',
        'employee.lastName': employee.lastName || '',
        'employee.employeeNumber': employee.employeeNumber || '',
        'employee.department': employee.department || empAny.departmentName || 'N/A',
        'employee.position': employee.position || empAny.positionTitle || 'Employee',
        'employee.branch': employee.branch || empAny.branchName || 'Headquarters',
        'employee.email': employee.email || '',
        'employee.contactNumber': employee.contactNumber || '',
        'employee.dateHired': employee.dateHired || new Date().toISOString().split('T')[0],
        'employee.photoUrl': employee.photoUrl || '',
        'company.logoUrl': empAny.companyLogoUrl || empAny.logoUrl || '',
        'system.logoUrl': empAny.companyLogoUrl || empAny.logoUrl || '',
        'system.currentDate': new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
        'system.verificationUrl': verificationUrl,
    };
}
/**
 * Resolves template strings containing `{{placeholder}}` using whitelisted bindings.
 * Does NOT execute any JavaScript, guaranteeing absolute injection safety.
 */
export function resolveDataBinding(templateString, employee, baseUrl) {
    if (!templateString) {
        return '';
    }
    const effectiveBaseUrl = (baseUrl && baseUrl !== 'https://verify.acmecorp.com')
        ? baseUrl
        : 'https://magic-card-trust-id.vercel.app';
    const dict = buildResolutionDictionary(employee, effectiveBaseUrl);
    let result = templateString;
    // Dynamically replace legacy hardcoded domain strings with the dynamic Vercel domain setting
    if (result.includes('verify.acmecorp.com') ||
        result.includes('verify.magiccard.corp') ||
        result.includes('verify.corp.com')) {
        const customUrl = dict['system.verificationUrl'];
        // If the template string is a direct link or verification URL, substitute the target URL
        if (result.includes('/{{') || result.includes('/id') || result.endsWith('/id') || !result.includes(' ')) {
            return customUrl;
        }
        result = result
            .replace(/https?:\/\/verify\.(acmecorp\.com|magiccard\.corp|corp\.com)\/id/gi, customUrl)
            .replace(/https?:\/\/verify\.(acmecorp\.com|magiccard\.corp|corp\.com)\/\{\{\s*employee\.employeeNumber\s*\}\}/gi, customUrl)
            .replace(/https?:\/\/verify\.(acmecorp\.com|magiccard\.corp|corp\.com)/gi, effectiveBaseUrl);
    }
    if (!result.includes('{{')) {
        return result;
    }
    return result.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (match, key) => {
        // Only resolve keys present in our whitelist
        if (ALLOWED_DATA_BINDINGS.includes(key) && key in dict) {
            return dict[key];
        }
        // Return unchanged if key is unrecognized/disallowed
        return match;
    });
}
