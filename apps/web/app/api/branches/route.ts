import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth/require-auth';

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

    const { data, error } = await admin
      .from('branches')
      .insert([{
        company_id: companyId,
        name: body.name,
        code: body.code,
        address: body.address ?? '',
        contact_number: body.contactNumber ?? '',
        is_active: true,
      }])
      .select()
      .single();

    if (error) throw error;

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

    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.from('branches').delete().eq('id', id);

    if (error) throw error;

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
    const updateRecord: any = {
      name: body.name.trim(),
      code: body.code.trim().toUpperCase(),
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

    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

