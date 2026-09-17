import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth/require-auth';
import { recordAuditLog } from '@/lib/audit/logger';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const departmentId = searchParams.get('departmentId');

  try {
    const admin = createAdminSupabaseClient();
    let queryBuilder = admin
      .from('positions')
      .select('id, department_id, title, level, created_at')
      .order('title', { ascending: true });

    if (departmentId && departmentId !== 'ALL') {
      queryBuilder = queryBuilder.eq('department_id', departmentId);
    }

    const { data, error } = await queryBuilder;
    if (error) throw error;

    const mapped = (data || []).map((p: any) => ({
      id: p.id,
      departmentId: p.department_id,
      title: p.title,
      level: p.level || 'STANDARD',
      createdAt: p.created_at,
    }));

    return NextResponse.json({ data: mapped });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, data: [] }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (!auth.authenticated) return auth.response;

  try {
    const body = await request.json();
    if (!body.departmentId || !body.title) {
      return NextResponse.json({ error: 'departmentId and title are required' }, { status: 400 });
    }

    const admin = createAdminSupabaseClient();
    const title = body.title.trim();
    const level = body.level?.trim() || 'STANDARD';

    const { data, error } = await admin
      .from('positions')
      .insert([{ department_id: body.departmentId, title, level }])
      .select()
      .single();

    if (error) throw error;

    await recordAuditLog({
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: 'CREATE_POSITION',
      entityType: 'Position',
      entityId: data.id,
      entityName: title,
      details: `Created new position title "${title}" (Level: ${level}).`,
    });

    return NextResponse.json({
      data: {
        id: data.id,
        departmentId: data.department_id,
        title: data.title,
        level: data.level,
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
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const admin = createAdminSupabaseClient();
    const { data: existing } = await admin.from('positions').select('title').eq('id', id).maybeSingle();

    const { error } = await admin.from('positions').delete().eq('id', id);
    if (error) throw error;

    await recordAuditLog({
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: 'DELETE_POSITION',
      entityType: 'Position',
      entityId: id,
      entityName: existing ? existing.title : 'Position',
      details: existing ? `Removed position title "${existing.title}".` : 'Removed position record.',
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
