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
export declare function buildResolutionDictionary(employee: EmployeeResolutionContext, baseUrl?: string): Record<string, string>;
/**
 * Resolves template strings containing `{{placeholder}}` using whitelisted bindings.
 * Does NOT execute any JavaScript, guaranteeing absolute injection safety.
 */
export declare function resolveDataBinding(templateString: string, employee: EmployeeResolutionContext, baseUrl?: string): string;
