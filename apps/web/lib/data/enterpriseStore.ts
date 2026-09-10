import { CardTemplateJSON } from '@workspace/card-engine';

export interface Branch {
  id: string;
  name: string;
  code: string;
  address: string;
  contactNumber: string;
  isActive: boolean;
  kiosksCount: number;
}

export interface Department {
  id: string;
  name: string;
  code: string;
}

export interface Position {
  id: string;
  departmentId: string;
  title: string;
  level: string;
}

export interface Employee {
  id: string;
  employeeNumber: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  suffix?: string;
  fullName: string;
  branchId: string;
  branchName: string;
  departmentId: string;
  departmentName: string;
  positionId: string;
  positionTitle: string;
  email: string;
  contactNumber: string;
  photoUrl: string;
  employmentStatus: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  cardStatus: 'NOT_ISSUED' | 'PRINTED' | 'REPRINT_REQUESTED';
  dateHired: string;
  createdAt: string;
}

export interface KioskDevice {
  id: string;
  code: string;
  name: string;
  branchId: string;
  branchName: string;
  status: 'ONLINE' | 'OFFLINE' | 'WARNING' | 'DISABLED';
  agentVersion: string;
  appVersion: string;
  ipAddress: string;
  activeTemplateVersion: string;
  printerModel: string;
  printerStatus: string;
  ribbonLevelPct: number;
  lastHeartbeat: string;
}

export interface PrintJobRecord {
  id: string;
  jobNumber: string;
  idempotencyKey: string;
  employeeNumber: string;
  employeeName: string;
  kioskCode: string;
  branchName: string;
  templateVersion: string;
  status: 'CREATED' | 'QUEUED' | 'PRINTING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  errorCode?: string;
  errorMessage?: string;
  durationMs?: number;
  createdAt: string;
}

export interface AuditLogRecord {
  id: string;
  timestamp: string;
  actor: string;
  actorType: 'USER' | 'KIOSK' | 'SYSTEM';
  action: string;
  entity: string;
  entityId: string;
  branchName: string;
  ipAddress: string;
  details: string;
}

// Initial Standard Published Card Template (Pristine White Executive Edition)
export const DEFAULT_CR80_TEMPLATE: CardTemplateJSON = {
  version: 1,
  id: 'template-acme-cr80',
  name: 'Magic Card Executive Smart Badge',
  description: 'Ultra-premium ISO/IEC 7810 ID-1 (CR80) dual-sided corporate identification badge with crisp white finish and NFC security.',
  card: {
    width: 856,
    height: 540,
    unit: 'px',
    physicalWidth: 85.60,
    physicalHeight: 53.98,
    physicalUnit: 'mm',
    thickness: 0.76,
    cornerRound: 3.18,
    bleedMm: 1.5,
    safeMarginMm: 3.0,
    orientation: 'horizontal',
  },
  front: {
    background: { color: '#ffffff' },
    elements: [
      {
        id: 'el-front-stripe',
        type: 'SHAPE',
        shapeType: 'RECTANGLE',
        x: 0,
        y: 0,
        width: 856,
        height: 8,
        fill: '#dc2626',
        rotation: 0,
        opacity: 1,
        isLocked: true,
        isHidden: false,
        zIndex: 1,
      },
      {
        id: 'el-front-logo',
        type: 'TEXT',
        x: 50,
        y: 28,
        width: 280,
        height: 32,
        text: 'MAGIC CARD',
        fontSize: 22,
        fontFamily: 'Inter',
        fontWeight: 'bold',
        color: '#dc2626',
        textAlign: 'left',
        lineHeight: 1.2,
        letterSpacing: 2,
        rotation: 0,
        opacity: 1,
        isLocked: false,
        isHidden: false,
        zIndex: 2,
      },
      {
        id: 'el-front-badge',
        type: 'SHAPE',
        shapeType: 'RECTANGLE',
        x: 610,
        y: 26,
        width: 195,
        height: 28,
        fill: '#f8fafc',
        stroke: '#e2e8f0',
        strokeWidth: 1,
        borderRadius: 14,
        rotation: 0,
        opacity: 1,
        isLocked: false,
        isHidden: false,
        zIndex: 3,
      },
      {
        id: 'el-front-badge-text',
        type: 'TEXT',
        x: 610,
        y: 33,
        width: 195,
        height: 18,
        text: 'SECURE ACCESS • NFC',
        fontSize: 10,
        fontFamily: 'Inter',
        fontWeight: 'bold',
        color: '#475569',
        textAlign: 'center',
        lineHeight: 1.2,
        letterSpacing: 1,
        rotation: 0,
        opacity: 1,
        isLocked: false,
        isHidden: false,
        zIndex: 4,
      },
      {
        id: 'el-front-photo',
        type: 'EMPLOYEE_PHOTO',
        x: 50,
        y: 90,
        width: 175,
        height: 220,
        borderRadius: 14,
        borderWidth: 2,
        borderColor: '#e2e8f0',
        objectFit: 'cover',
        rotation: 0,
        opacity: 1,
        isLocked: false,
        isHidden: false,
        zIndex: 5,
      },
      {
        id: 'el-front-name',
        type: 'TEXT',
        x: 255,
        y: 110,
        width: 420,
        height: 42,
        text: '{{employee.fullName}}',
        fontSize: 32,
        fontFamily: 'Inter',
        fontWeight: 'bold',
        color: '#0f172a',
        textAlign: 'left',
        lineHeight: 1.2,
        letterSpacing: 0,
        rotation: 0,
        opacity: 1,
        isLocked: false,
        isHidden: false,
        zIndex: 6,
      },
      {
        id: 'el-front-position',
        type: 'TEXT',
        x: 255,
        y: 160,
        width: 420,
        height: 28,
        text: '{{employee.position}}',
        fontSize: 17,
        fontFamily: 'Inter',
        fontWeight: '600',
        color: '#dc2626',
        textAlign: 'left',
        lineHeight: 1.2,
        letterSpacing: 0,
        rotation: 0,
        opacity: 1,
        isLocked: false,
        isHidden: false,
        zIndex: 7,
      },
      {
        id: 'el-front-id',
        type: 'TEXT',
        x: 255,
        y: 205,
        width: 420,
        height: 24,
        text: 'ID NO: {{employee.employeeNumber}}',
        fontSize: 14,
        fontFamily: 'Inter',
        fontWeight: '600',
        color: '#334155',
        textAlign: 'left',
        lineHeight: 1.2,
        letterSpacing: 0.5,
        rotation: 0,
        opacity: 1,
        isLocked: false,
        isHidden: false,
        zIndex: 8,
      },
      {
        id: 'el-front-dept',
        type: 'TEXT',
        x: 255,
        y: 238,
        width: 420,
        height: 24,
        text: 'DEPT: {{employee.department}}',
        fontSize: 13,
        fontFamily: 'Inter',
        fontWeight: 'normal',
        color: '#64748b',
        textAlign: 'left',
        lineHeight: 1.2,
        letterSpacing: 0,
        rotation: 0,
        opacity: 1,
        isLocked: false,
        isHidden: false,
        zIndex: 9,
      },
      {
        id: 'el-front-branch',
        type: 'TEXT',
        x: 255,
        y: 268,
        width: 420,
        height: 24,
        text: 'BRANCH: {{employee.branch}}',
        fontSize: 13,
        fontFamily: 'Inter',
        fontWeight: 'normal',
        color: '#64748b',
        textAlign: 'left',
        lineHeight: 1.2,
        letterSpacing: 0,
        rotation: 0,
        opacity: 1,
        isLocked: false,
        isHidden: false,
        zIndex: 10,
      },
      {
        id: 'el-front-qr',
        type: 'QR_CODE',
        x: 680,
        y: 340,
        width: 125,
        height: 125,
        data: 'https://verify.magiccard.corp/id/{{employee.employeeNumber}}',
        foregroundColor: '#0f172a',
        backgroundColor: '#ffffff',
        errorCorrectionLevel: 'M',
        includeMargin: true,
        rotation: 0,
        opacity: 1,
        isLocked: false,
        isHidden: false,
        zIndex: 11,
      },
      {
        id: 'el-front-footer-line',
        type: 'SHAPE',
        shapeType: 'RECTANGLE',
        x: 50,
        y: 495,
        width: 756,
        height: 1,
        fill: '#e2e8f0',
        rotation: 0,
        opacity: 1,
        isLocked: true,
        isHidden: false,
        zIndex: 12,
      },
      {
        id: 'el-front-footer-text',
        type: 'TEXT',
        x: 50,
        y: 508,
        width: 756,
        height: 16,
        text: 'MAGIC CARD OFFICIAL IDENTITY PASS • AUTHORIZED PERSONNEL ONLY',
        fontSize: 10,
        fontFamily: 'Inter',
        fontWeight: 'bold',
        color: '#94a3b8',
        textAlign: 'left',
        lineHeight: 1.2,
        letterSpacing: 1.5,
        rotation: 0,
        opacity: 1,
        isLocked: true,
        isHidden: false,
        zIndex: 13,
      }
    ],
  },
  back: {
    background: { color: '#ffffff' },
    elements: [
      {
        id: 'el-back-top',
        type: 'SHAPE',
        shapeType: 'RECTANGLE',
        x: 0,
        y: 0,
        width: 856,
        height: 8,
        fill: '#dc2626',
        rotation: 0,
        opacity: 1,
        isLocked: true,
        isHidden: false,
        zIndex: 1,
      },
      {
        id: 'el-back-magstripe',
        type: 'SHAPE',
        shapeType: 'RECTANGLE',
        x: 0,
        y: 35,
        width: 856,
        height: 60,
        fill: '#1e293b',
        rotation: 0,
        opacity: 1,
        isLocked: true,
        isHidden: false,
        zIndex: 2,
      },
      {
        id: 'el-back-sig-strip',
        type: 'SHAPE',
        shapeType: 'RECTANGLE',
        x: 50,
        y: 115,
        width: 480,
        height: 40,
        fill: '#f1f5f9',
        stroke: '#cbd5e1',
        strokeWidth: 1,
        rotation: 0,
        opacity: 1,
        isLocked: false,
        isHidden: false,
        zIndex: 3,
      },
      {
        id: 'el-back-sig-label',
        type: 'TEXT',
        x: 50,
        y: 160,
        width: 480,
        height: 16,
        text: 'AUTHORIZED SIGNATURE • NOT TRANSFERABLE',
        fontSize: 9,
        fontFamily: 'Inter',
        fontWeight: 'bold',
        color: '#94a3b8',
        textAlign: 'left',
        lineHeight: 1.2,
        letterSpacing: 0.5,
        rotation: 0,
        opacity: 1,
        isLocked: false,
        isHidden: false,
        zIndex: 4,
      },
      {
        id: 'el-back-notice',
        type: 'TEXT',
        x: 50,
        y: 195,
        width: 756,
        height: 80,
        text: 'This card is the property of the issuing corporation and must be surrendered upon request. If lost or found, please return to any Security Desk or mail to Corporate Headquarters. Dispatch: +1 (800) 555-0199.',
        fontSize: 12,
        fontFamily: 'Inter',
        fontWeight: 'normal',
        color: '#475569',
        textAlign: 'left',
        lineHeight: 1.5,
        letterSpacing: 0,
        rotation: 0,
        opacity: 1,
        isLocked: false,
        isHidden: false,
        zIndex: 5,
      },
      {
        id: 'el-back-barcode',
        type: 'BARCODE',
        x: 238,
        y: 295,
        width: 380,
        height: 85,
        data: '{{employee.employeeNumber}}',
        format: 'CODE128',
        lineColor: '#000000',
        backgroundColor: '#ffffff',
        displayValue: true,
        fontSize: 13,
        rotation: 0,
        opacity: 1,
        isLocked: false,
        isHidden: false,
        zIndex: 6,
      },
      {
        id: 'el-back-subnote',
        type: 'TEXT',
        x: 80,
        y: 430,
        width: 696,
        height: 25,
        text: 'FOR AUTHORIZED ACCESS CONTROL & KIOSK SELF-SERVICE CHECK-IN ONLY',
        fontSize: 11,
        fontFamily: 'Inter',
        fontWeight: 'bold',
        color: '#94a3b8',
        textAlign: 'center',
        lineHeight: 1.2,
        letterSpacing: 1,
        rotation: 0,
        opacity: 1,
        isLocked: false,
        isHidden: false,
        zIndex: 7,
      },
    ],
  },
};

// In-Memory Enterprise Store Ã¢â‚¬â€ No Mock Data
class EnterpriseDataStore {
  public branches: Branch[] = [];
  public departments: Department[] = [];
  public positions: Position[] = [];
  public employees: Employee[] = [];
  public kiosks: KioskDevice[] = [];
  public printJobs: PrintJobRecord[] = [];
  public auditLogs: AuditLogRecord[] = [];
  public activeTemplate: CardTemplateJSON = JSON.parse(JSON.stringify(DEFAULT_CR80_TEMPLATE));
  public templateVersions: Array<{
    id: string;
    versionNumber: number;
    versionTag: string;
    status: string;
    publishedAt: string;
    changelog: string;
  }> = [];

  // Helper Methods

  public findEmployeeByNumber(empNum: string): Employee | undefined {
    const clean = empNum.trim().toUpperCase();
    return this.employees.find(
      (e) => e.employeeNumber.toUpperCase() === clean || e.employeeNumber.replace(/\D/g, '') === clean.replace(/\D/g, '')
    );
  }

  public addEmployee(emp: Omit<Employee, 'id' | 'createdAt'>): Employee {
    const newEmp: Employee = {
      ...emp,
      id: `emp-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    this.employees.unshift(newEmp);
    this.logAction('USER', 'EMPLOYEE_CREATED', 'EMPLOYEE', newEmp.employeeNumber, `Created employee ${newEmp.fullName}`);
    return newEmp;
  }

  public updateEmployee(id: string, updates: Partial<Employee>): Employee | undefined {
    const idx = this.employees.findIndex((e) => e.id === id);
    if (idx !== -1) {
      this.employees[idx] = { ...this.employees[idx], ...updates };
      this.logAction('USER', 'EMPLOYEE_UPDATED', 'EMPLOYEE', this.employees[idx].employeeNumber, `Updated record`);
      return this.employees[idx];
    }
    return undefined;
  }

  public addBranch(branch: Omit<Branch, 'id' | 'kiosksCount'>): Branch {
    const newBranch: Branch = {
      ...branch,
      id: `branch-${Date.now()}`,
      kiosksCount: 0,
    };
    this.branches.push(newBranch);
    this.logAction('USER', 'BRANCH_CREATED', 'BRANCH', newBranch.id, `Created branch ${newBranch.name}`);
    return newBranch;
  }

  public deleteBranch(id: string): boolean {
    const idx = this.branches.findIndex((b) => b.id === id);
    if (idx !== -1) {
      const b = this.branches.splice(idx, 1)[0];
      this.logAction('USER', 'BRANCH_DELETED', 'BRANCH', id, `Deleted branch ${b.name}`);
      return true;
    }
    return false;
  }

  public addDepartment(dept: Omit<Department, 'id'>): Department {
    const newDept: Department = {
      ...dept,
      id: `dept-${Date.now()}`,
    };
    this.departments.push(newDept);
    this.logAction('USER', 'DEPARTMENT_CREATED', 'DEPARTMENT', newDept.id, `Created department ${newDept.name}`);
    return newDept;
  }

  public deleteDepartment(id: string): boolean {
    const idx = this.departments.findIndex((d) => d.id === id);
    if (idx !== -1) {
      const d = this.departments.splice(idx, 1)[0];
      this.logAction('USER', 'DEPARTMENT_DELETED', 'DEPARTMENT', id, `Deleted department ${d.name}`);
      return true;
    }
    return false;
  }

  public registerPrintJob(job: {
    employeeNumber: string;
    employeeName: string;
    kioskCode: string;
    branchName?: string;
    idempotencyKey: string;
    status: 'COMPLETED' | 'FAILED';
    durationMs?: number;
    errorCode?: string;
    errorMessage?: string;
  }): PrintJobRecord {
    const nextNum = (this.printJobs.length + 343).toString().padStart(6, '0');
    const newJob: PrintJobRecord = {
      id: `job-${Date.now()}`,
      jobNumber: `PRINT-2026-${nextNum}`,
      idempotencyKey: job.idempotencyKey,
      employeeNumber: job.employeeNumber,
      employeeName: job.employeeName,
      kioskCode: job.kioskCode,
      branchName: job.branchName || 'HQ Main Reception',
      templateVersion: 'v2.0.0',
      status: job.status,
      durationMs: job.durationMs,
      errorCode: job.errorCode,
      errorMessage: job.errorMessage,
      createdAt: new Date().toISOString(),
    };
    this.printJobs.unshift(newJob);

    // Update employee card status
    const emp = this.findEmployeeByNumber(job.employeeNumber);
    if (emp && job.status === 'COMPLETED') {
      emp.cardStatus = 'PRINTED';
    }

    this.logAction(
      'KIOSK',
      job.status === 'COMPLETED' ? 'CARD_PRINT_COMPLETED' : 'CARD_PRINT_FAILED',
      'PRINT_JOB',
      newJob.jobNumber,
      `Job ${newJob.jobNumber} for ${job.employeeNumber} status: ${job.status}`
    );

    return newJob;
  }

  public logAction(
    actorType: 'USER' | 'KIOSK' | 'SYSTEM',
    action: string,
    entity: string,
    entityId: string,
    details: string
  ) {
    this.auditLogs.unshift({
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      actor: actorType === 'USER' ? 'Admin HR (admin@acmecorp.com)' : 'KIOSK-AGENT-LOCAL',
      actorType,
      action,
      entity,
      entityId,
      branchName: 'Global Headquarters (NYC)',
      ipAddress: '127.0.0.1',
      details,
    });
  }

  public publishNewTemplate(template: CardTemplateJSON, changelog: string) {
    this.activeTemplate = JSON.parse(JSON.stringify(template));
    const nextVer = this.templateVersions.length + 1;
    // Archive previous published
    this.templateVersions.forEach((v) => {
      if (v.status === 'PUBLISHED') v.status = 'ARCHIVED';
    });
    this.templateVersions.push({
      id: `ver-${nextVer}`,
      versionNumber: nextVer,
      versionTag: `v${nextVer}.0.0`,
      status: 'PUBLISHED',
      publishedAt: new Date().toISOString(),
      changelog: changelog || 'Published new version updates',
    });

    // Notify all kiosks
    this.kiosks.forEach((k) => {
      k.activeTemplateVersion = `v${nextVer}.0.0 (Published)`;
    });

    this.logAction('USER', 'TEMPLATE_PUBLISHED', 'CARD_TEMPLATE', `v${nextVer}.0.0`, `Published new version: ${changelog}`);
  }
}

// Global Singleton for seamless dev environment state
export const enterpriseStore = new EnterpriseDataStore();
