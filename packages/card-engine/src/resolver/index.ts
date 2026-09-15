import { ALLOWED_DATA_BINDINGS, AllowedDataBinding } from '../schema';

export interface EmployeeResolutionContext {
  id?: string;
  employeeNumber: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  suffix?: string | null;
  fullName?: string;
  department?: string;
  position?: string;
  branch?: string;
  email?: string;
  contactNumber?: string;
  dateHired?: string;
  photoUrl?: string;
  verificationToken?: string;
}

/**
 * Builds the canonical lookup dictionary from an employee record.
 */
export function buildResolutionDictionary(
  employee: EmployeeResolutionContext,
  baseUrl = 'https://verify.acmecorp.com'
): Record<string, string> {
  const constructedFullName = employee.fullName || 
    [employee.firstName, employee.middleName, employee.lastName, employee.suffix]
      .filter(Boolean)
      .join(' ');

  const empAny = employee as any;
  const cleanBase = (baseUrl || 'https://verify.acmecorp.com').trim().replace(/\/+$/, '');
  let verificationUrl = '';

  if (cleanBase.includes('.php') || cleanBase.includes('.html') || cleanBase.includes('?')) {
    const sep = cleanBase.includes('?') ? '&' : '?';
    verificationUrl = `${cleanBase}${sep}emp=${encodeURIComponent(employee.employeeNumber || '')}`;
  } else if (cleanBase.endsWith('/verify')) {
    verificationUrl = `${cleanBase}/${encodeURIComponent(employee.employeeNumber || '')}`;
  } else {
    verificationUrl = `${cleanBase}/verify/${encodeURIComponent(employee.employeeNumber || '')}`;
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
    'system.currentDate': new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
    'system.verificationUrl': verificationUrl,
  };
}

/**
 * Resolves template strings containing `{{placeholder}}` using whitelisted bindings.
 * Does NOT execute any JavaScript, guaranteeing absolute injection safety.
 */
export function resolveDataBinding(
  templateString: string,
  employee: EmployeeResolutionContext,
  baseUrl?: string
): string {
  if (!templateString) {
    return '';
  }

  const dict = buildResolutionDictionary(employee, baseUrl);
  let result = templateString;

  // If a custom verification baseUrl is provided, dynamically replace legacy hardcoded verification domains
  if (baseUrl) {
    const customUrl = dict['system.verificationUrl'];
    if (
      result.includes('verify.acmecorp.com') ||
      result.includes('verify.magiccard.corp') ||
      result.includes('verify.corp.com')
    ) {
      return customUrl;
    }
  }

  if (!result.includes('{{')) {
    return result;
  }

  return result.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (match, key) => {
    // Only resolve keys present in our whitelist
    if (ALLOWED_DATA_BINDINGS.includes(key as AllowedDataBinding) && key in dict) {
      return dict[key];
    }
    // Return unchanged if key is unrecognized/disallowed
    return match;
  });
}
