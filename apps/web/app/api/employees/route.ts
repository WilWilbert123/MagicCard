import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth/require-auth';
import { recordAuditLog } from '@/lib/audit/logger';


export async function GET(request: Request) {
  const auth = await requireAuth();
  if (!auth.authenticated) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');
    const deptId = searchParams.get('departmentId');
    const query = searchParams.get('q');
    const employeeNumber = searchParams.get('employeeNumber');

    const admin = createAdminSupabaseClient();
    const supabase = await createServerSupabaseClient();

    let queryBuilder = supabase
      .from('employees')
      .select('*')
      .order('created_at', { ascending: false });

    if (employeeNumber) {
      queryBuilder = queryBuilder.ilike('employee_number', employeeNumber.trim());
    } else if (query) {
      const q = query.trim();
      queryBuilder = queryBuilder.or(
        `employee_number.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%`
      );
    }

    if (branchId && branchId !== 'ALL') {
      queryBuilder = queryBuilder.eq('branch_id', branchId);
    }
    if (deptId && deptId !== 'ALL') {
      queryBuilder = queryBuilder.eq('department_id', deptId);
    }

    let { data: employees, error: empError } = await queryBuilder;
    if (empError || !employees || employees.length === 0) {
      let adminBuilder = admin
        .from('employees')
        .select('*')
        .order('created_at', { ascending: false });

      if (employeeNumber) {
        adminBuilder = adminBuilder.ilike('employee_number', employeeNumber.trim());
      } else if (query) {
        const q = query.trim();
        adminBuilder = adminBuilder.or(
          `employee_number.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%`
        );
      }
      if (branchId && branchId !== 'ALL') adminBuilder = adminBuilder.eq('branch_id', branchId);
      if (deptId && deptId !== 'ALL') adminBuilder = adminBuilder.eq('department_id', deptId);

      const adminRes = await adminBuilder;
      if (!adminRes.error && adminRes.data) {
        employees = adminRes.data;
      }
    }

    // Fetch branches and departments using admin client to guarantee lookup mapping
    const [{ data: branches }, { data: departments }] = await Promise.all([
      admin.from('branches').select('id, name, code'),
      admin.from('departments').select('id, name, code'),
    ]);

    const branchMap = new Map((branches || []).map((b) => [b.id, b.name]));
    const deptMap = new Map((departments || []).map((d) => [d.id, d.name]));

    const mapped = (employees || []).map((e: any) => ({
      id: e.id,
      employeeNumber: e.employee_number,
      firstName: e.first_name,
      middleName: e.middle_name || '',
      lastName: e.last_name,
      suffix: e.suffix || '',
      fullName: `${e.first_name || ''} ${e.last_name || ''}`.trim(),
      branchId: e.branch_id || '',
      branchName: branchMap.get(e.branch_id) || 'Unassigned',
      departmentId: e.department_id || '',
      departmentName: deptMap.get(e.department_id) || 'General',
      positionId: e.position_id || '',
      positionTitle: e.metadata?.positionTitle || 'Staff',
      email: e.email || '',
      contactNumber: e.contact_number || '',
      photoUrl: e.photo_url || '',
      employmentStatus: e.employment_status || 'ACTIVE',
      cardStatus: e.card_status || 'NOT_ISSUED',
      dateHired: e.date_hired || '',
      createdAt: e.created_at || '',
    }));

    return NextResponse.json({
      data: mapped,
      total: mapped.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, data: [], total: 0 }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (!auth.authenticated) return auth.response;

  try {
    const body = await request.json();
    if (!body.employeeNumber || !body.firstName || !body.lastName) {
      return NextResponse.json({ error: 'Missing required employee fields: employeeNumber, firstName, lastName' }, { status: 400 });
    }

    const admin = createAdminSupabaseClient();

    // Get default company_id if not provided
    let companyId = body.companyId;
    if (!companyId) {
      const { data: comp } = await admin.from('companies').select('id').limit(1).single();
      companyId = comp?.id;
    }

    const empNum = body.employeeNumber.trim().toUpperCase();
    const fName = body.firstName.trim();
    const lName = body.lastName.trim();

    const newRecord: any = {
      employee_number: empNum,
      first_name: fName,
      last_name: lName,
      middle_name: body.middleName?.trim() || null,
      suffix: body.suffix?.trim() || null,
      email: body.email?.trim() || null,
      contact_number: body.contactNumber?.trim() || null,
      photo_url: body.photoUrl || null,
      employment_status: body.employmentStatus || 'ACTIVE',
      card_status: body.cardStatus || 'NOT_ISSUED',
      date_hired: body.dateHired || new Date().toISOString().split('T')[0],
      branch_id: body.branchId || null,
      department_id: body.departmentId || null,
      position_id: body.positionId || null,
      metadata: { positionTitle: body.positionTitle || 'Staff' },
    };

    if (companyId) {
      newRecord.company_id = companyId;
    }

    const { data, error } = await admin
      .from('employees')
      .insert([newRecord])
      .select()
      .single();

    if (error) throw error;

    await recordAuditLog({
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: 'CREATE_EMPLOYEE',
      entityType: 'Employee',
      entityId: data.id,
      entityName: `${fName} ${lName} (${empNum})`,
      details: `Added new corporate employee record for "${fName} ${lName}" (Employee ID: ${empNum}).`,
    });

    return NextResponse.json({
      data: {
        id: data.id,
        employeeNumber: data.employee_number,
        firstName: data.first_name,
        lastName: data.last_name,
        fullName: `${data.first_name} ${data.last_name}`.trim(),
        branchId: data.branch_id,
        departmentId: data.department_id,
        email: data.email,
        contactNumber: data.contact_number,
        photoUrl: data.photo_url,
        employmentStatus: data.employment_status,
        cardStatus: data.card_status,
        dateHired: data.date_hired,
        createdAt: data.created_at,
      },
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAuth();
  if (!auth.authenticated) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id parameter is required' }, { status: 400 });

    const admin = createAdminSupabaseClient();
    const { data: existing } = await admin
      .from('employees')
      .select('first_name, last_name, employee_number')
      .eq('id', id)
      .maybeSingle();

    const { error } = await admin.from('employees').delete().eq('id', id);

    if (error) throw error;

    await recordAuditLog({
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: 'DELETE_EMPLOYEE',
      entityType: 'Employee',
      entityId: id,
      entityName: existing ? `${existing.first_name} ${existing.last_name} (${existing.employee_number})` : 'Employee',
      details: existing
        ? `Removed employee record for "${existing.first_name} ${existing.last_name}" (ID: ${existing.employee_number}).`
        : `Removed employee record.`,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const auth = await requireAuth();
  if (!auth.authenticated) return auth.response;

  try {
    const body = await request.json();
    const { id, ...updateFields } = body;
    if (!id) {
      return NextResponse.json({ error: 'Employee id parameter is required' }, { status: 400 });
    }

    const admin = createAdminSupabaseClient();

    const updateRecord: any = {};
    if (updateFields.employeeNumber !== undefined) updateRecord.employee_number = updateFields.employeeNumber.trim().toUpperCase();
    if (updateFields.firstName !== undefined) updateRecord.first_name = updateFields.firstName.trim();
    if (updateFields.lastName !== undefined) updateRecord.last_name = updateFields.lastName.trim();
    if (updateFields.middleName !== undefined) updateRecord.middle_name = updateFields.middleName?.trim() || null;
    if (updateFields.suffix !== undefined) updateRecord.suffix = updateFields.suffix?.trim() || null;
    if (updateFields.email !== undefined) updateRecord.email = updateFields.email?.trim() || null;
    if (updateFields.contactNumber !== undefined) updateRecord.contact_number = updateFields.contactNumber?.trim() || null;
    if (updateFields.photoUrl !== undefined) updateRecord.photo_url = updateFields.photoUrl || null;
    if (updateFields.employmentStatus !== undefined) updateRecord.employment_status = updateFields.employmentStatus;
    if (updateFields.cardStatus !== undefined) updateRecord.card_status = updateFields.cardStatus;
    if (updateFields.dateHired !== undefined) updateRecord.date_hired = updateFields.dateHired;
    if (updateFields.branchId !== undefined) updateRecord.branch_id = updateFields.branchId || null;
    if (updateFields.departmentId !== undefined) updateRecord.department_id = updateFields.departmentId || null;
    if (updateFields.positionId !== undefined) updateRecord.position_id = updateFields.positionId || null;
    if (updateFields.positionTitle !== undefined) {
      updateRecord.metadata = { positionTitle: updateFields.positionTitle || 'Staff' };
    }

    const { data, error } = await admin
      .from('employees')
      .update(updateRecord)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    const empName = `${data.first_name} ${data.last_name}`.trim();
    await recordAuditLog({
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: 'UPDATE_EMPLOYEE',
      entityType: 'Employee',
      entityId: id,
      entityName: `${empName} (${data.employee_number})`,
      details: `Updated corporate employee profile details for "${empName}" (ID: ${data.employee_number}).`,
    });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

