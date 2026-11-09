import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth/require-auth';
import { recordAuditLog } from '@/lib/audit/logger';

let departmentsCache: { data: any[]; timestamp: number } | null = null;
const CACHE_TTL_MS = 60 * 1000;

export async function GET() {
  const auth = await requireAuth();
  if (!auth.authenticated) return auth.response;

  try {
    const now = Date.now();
    if (departmentsCache && (now - departmentsCache.timestamp < CACHE_TTL_MS)) {
      return NextResponse.json({ data: departmentsCache.data });
    }

    const admin = createAdminSupabaseClient();
    const adminRes = await admin
      .from('departments')
      .select('*')
      .order('name', { ascending: true });

    const data = adminRes.data ?? [];
    departmentsCache = { data, timestamp: now };

    return NextResponse.json({ data });
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
        { error: 'No company is configured. Create a company record before adding a department.' },
        { status: 400 }
      );
    }

    const name = body.name.trim();
    const code = body.code.trim().toUpperCase();

    const { data, error } = await admin
      .from('departments')
      .insert([{ company_id: companyId, name, code }])
      .select()
      .single();

    if (error) throw error;

    departmentsCache = null; // Invalidate cache

    await recordAuditLog({
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: 'CREATE_DEPARTMENT',
      entityType: 'Department',
      entityId: data.id,
      entityName: `${name} (${code})`,
      details: `Created new corporate department "${name}" with code "${code}".`,
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
    const { data: existing } = await admin.from('departments').select('name, code').eq('id', id).maybeSingle();

    const { error } = await admin.from('departments').delete().eq('id', id);
    if (error) throw error;

    departmentsCache = null; // Invalidate cache

    await recordAuditLog({
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: 'DELETE_DEPARTMENT',
      entityType: 'Department',
      entityId: id,
      entityName: existing ? `${existing.name} (${existing.code})` : 'Department',
      details: existing
        ? `Removed department "${existing.name}" (${existing.code}).`
        : `Removed department record.`,
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

    const { data: oldDept } = await admin.from('departments').select('name, code').eq('id', body.id).maybeSingle();

    const updateRecord = {
      name,
      code,
    };

    const { data, error } = await admin
      .from('departments')
      .update(updateRecord)
      .eq('id', body.id)
      .select()
      .single();

    if (error) throw error;

    departmentsCache = null; // Invalidate cache

    const changeMsg = oldDept
      ? `Updated department from "${oldDept.name}" (${oldDept.code}) to "${name}" (${code}).`
      : `Updated department details for "${name}" (${code}).`;

    await recordAuditLog({
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: 'UPDATE_DEPARTMENT',
      entityType: 'Department',
      entityId: body.id,
      entityName: `${name} (${code})`,
      details: changeMsg,
    });

    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
