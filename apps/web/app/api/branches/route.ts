import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth/require-auth';
import { recordAuditLog } from '@/lib/audit/logger';

export async function GET() {
  const auth = await requireAuth();
  if (!auth.authenticated) return auth.response;

  try {
    const supabase = await createServerSupabaseClient();
    let { data, error } = await supabase
      .from('branches')
      .select('*')
      .order('name', { ascending: true });

    if (error || !data || data.length === 0) {
      const admin = createAdminSupabaseClient();
      const adminRes = await admin
        .from('branches')
        .select('*')
        .order('name', { ascending: true });
      if (!adminRes.error && adminRes.data) {
        data = adminRes.data;
      }
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (!auth.authenticated) return auth.response;

  try {
    const body = await request.json();
    if (!body.name || !body.code) {
      return NextResponse.json({ error: 'name and code are required' }, { status: 400 });
    }

    const admin = createAdminSupabaseClient();
    let companyId = body.companyId;
    if (!companyId) {
      const { data: company } = await admin
        .from('companies')
        .select('id')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      companyId = company?.id;
    }

    if (!companyId) {
      return NextResponse.json(
        { error: 'No company is configured. Create a company record before adding a branch.' },
        { status: 400 }
      );
    }

    const name = body.name.trim();
    const code = body.code.trim().toUpperCase();
    const address = body.address ?? '';
    const contactNumber = body.contactNumber ?? '';

    const { data, error } = await admin
      .from('branches')
      .insert([{
        company_id: companyId,
        name,
        code,
        address,
        contact_number: contactNumber,
        is_active: true,
      }])
      .select()
      .single();

    if (error) throw error;

    await recordAuditLog({
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: 'CREATE_BRANCH',
      entityType: 'Branch',
      entityId: data.id,
      entityName: `${name} (${code})`,
      details: `Added new corporate branch location "${name}" (${code}) at address "${address}".`,
    });

    return NextResponse.json({ data }, { status: 201 });
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
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const admin = createAdminSupabaseClient();
    const { data: existing } = await admin.from('branches').select('name, code').eq('id', id).maybeSingle();

    const { error } = await admin.from('branches').delete().eq('id', id);
    if (error) throw error;

    await recordAuditLog({
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: 'DELETE_BRANCH',
      entityType: 'Branch',
      entityId: id,
      entityName: existing ? `${existing.name} (${existing.code})` : 'Branch',
      details: existing
        ? `Removed branch location "${existing.name}" (${existing.code}).`
        : `Removed branch location.`,
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
    if (!body.id || !body.name || !body.code) {
      return NextResponse.json({ error: 'id, name, and code are required' }, { status: 400 });
    }

    const admin = createAdminSupabaseClient();
    const name = body.name.trim();
    const code = body.code.trim().toUpperCase();

    const { data: oldBranch } = await admin.from('branches').select('name, code').eq('id', body.id).maybeSingle();

    const updateRecord: any = {
      name,
      code,
      address: body.address !== undefined ? body.address.trim() : '',
      contact_number: body.contactNumber !== undefined ? body.contactNumber.trim() : '',
      updated_at: new Date().toISOString(),
    };
    if (typeof body.isActive === 'boolean') {
      updateRecord.is_active = body.isActive;
    }

    const { data, error } = await admin
      .from('branches')
      .update(updateRecord)
      .eq('id', body.id)
      .select()
      .single();

    if (error) throw error;

    const changeMsg = oldBranch
      ? `Updated branch location from "${oldBranch.name}" (${oldBranch.code}) to "${name}" (${code}).`
      : `Updated branch location details for "${name}" (${code}).`;

    await recordAuditLog({
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: 'UPDATE_BRANCH',
      entityType: 'Branch',
      entityId: body.id,
      entityName: `${name} (${code})`,
      details: changeMsg,
    });

    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

