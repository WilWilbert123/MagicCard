import { NextResponse } from 'next/server';
import { enterpriseStore } from '@/lib/data/enterpriseStore';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ employeeNumber: string }> }
) {
  const { employeeNumber } = await params;
  const employee = enterpriseStore.findEmployeeByNumber(employeeNumber);

  if (!employee) {
    return NextResponse.json(
      { error: 'EMPLOYEE_NOT_FOUND', message: `Employee with number ${employeeNumber} not found.` },
      { status: 404 }
    );
  }

  // Return sanitized employee details for KIOSK display
  return NextResponse.json({
    data: {
      id: employee.id,
      employeeNumber: employee.employeeNumber,
      fullName: employee.fullName,
      department: employee.departmentName,
      position: employee.positionTitle,
      branch: employee.branchName,
      photoUrl: employee.photoUrl,
      employmentStatus: employee.employmentStatus,
      cardStatus: employee.cardStatus,
    },
  });
}
