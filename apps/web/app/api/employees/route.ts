import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth/require-auth';


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

    const newRecord: any = {
      employee_number: body.employeeNumber.trim().toUpperCase(),
      first_name: body.firstName.trim(),
      last_name: body.lastName.trim(),
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
    const { error } = await admin.from('employees').delete().eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
