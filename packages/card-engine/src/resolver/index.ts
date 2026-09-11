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
    'system.verificationUrl': `${baseUrl}/verify/${employee.employeeNumber}`,
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
  if (!templateString || !templateString.includes('{{')) {
    return templateString;
  }

  const dict = buildResolutionDictionary(employee, baseUrl);

  return templateString.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (match, key) => {
    // Only resolve keys present in our whitelist
    if (ALLOWED_DATA_BINDINGS.includes(key as AllowedDataBinding) && key in dict) {
      return dict[key];
    }
    // Return unchanged if key is unrecognized/disallowed
    return match;
  });
}
