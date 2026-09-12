import { NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth/require-auth';
import { recordAuditLog } from '@/lib/audit/logger';

export async function GET() {
  const auth = await requireAuth();
  if (!auth.authenticated) return auth.response;

  try {
    const admin = createAdminSupabaseClient();

    // 1. Fetch profiles
    const { data: profiles } = await admin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    // 2. Fetch Auth users
    const { data: authUsers, error: authErr } = await admin.auth.admin.listUsers();
    if (authErr) throw authErr;

    const authMap = new Map((authUsers?.users || []).map((u) => [u.id, u]));

    // Map profiles combined with Auth info
    const list: any[] = (profiles || []).map((p: any) => {
      const authUser = authMap.get(p.id);
      return {
        id: p.id,
        email: p.email || authUser?.email || '',
        displayName: p.full_name || authUser?.user_metadata?.full_name || 'HR Admin',
        isActive: p.is_active ?? true,
        createdAt: p.created_at || authUser?.created_at || new Date().toISOString(),
        lastSignInAt: authUser?.last_sign_in_at || null,
        isCurrent: p.id === auth.user.id,
      };
    });

    // If any auth users don't have a profile yet, include them
    (authUsers?.users || []).forEach((u) => {
      if (!list.some((item) => item.id === u.id)) {
        list.push({
          id: u.id,
          email: u.email || '',
          displayName: u.user_metadata?.full_name || u.email?.split('@')[0] || 'HR Admin',
          isActive: true,
          createdAt: u.created_at || new Date().toISOString(),
          lastSignInAt: u.last_sign_in_at || null,
          isCurrent: u.id === auth.user.id,
        });
      }
    });

    return NextResponse.json({ data: list });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, data: [] }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (!auth.authenticated) return auth.response;

  try {
    const body = await request.json();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const displayName = String(body.displayName || '').trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email address is required.' }, { status: 400 });
    }
    if (!password || password.length < 12) {
      return NextResponse.json({ error: 'Password must be at least 12 characters long.' }, { status: 400 });
    }
    if (!displayName) {
      return NextResponse.json({ error: 'Display name / Full name is required.' }, { status: 400 });
    }

    const admin = createAdminSupabaseClient();

    // 1. Fetch current auth users to check for email duplication
    const { data: authUsers, error: listErr } = await admin.auth.admin.listUsers();
    if (listErr) {
      console.error('Failed to list auth users:', listErr);
    }

    const existingAuthUser = authUsers?.users?.find(
      (u) => u.email?.toLowerCase() === email
    );

    if (existingAuthUser) {
      return NextResponse.json(
        { error: `An account with the email address "${email}" already exists.` },
        { status: 400 }
      );
    }

    // 2. Check profiles for any orphan profiles with the same email and clean them up
    const { data: orphanProfiles } = await admin
      .from('profiles')
      .select('id')
      .eq('email', email);

    if (orphanProfiles && orphanProfiles.length > 0) {
      const authUserIds = new Set(authUsers?.users?.map((u) => u.id) || []);
      for (const p of orphanProfiles) {
        if (!authUserIds.has(p.id)) {
          await admin.from('profiles').delete().eq('id', p.id);
        } else {
          return NextResponse.json(
            { error: `An account with the email address "${email}" already exists.` },
            { status: 400 }
          );
        }
      }
    }

    // 3. Get default company_id
    const { data: company } = await admin
      .from('companies')
      .select('id')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    const companyId = company?.id;

    // 4. Create user in Supabase Auth
    let userId: string | null = null;
    let createdAt = new Date().toISOString();

    const { data: createdAuth, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: displayName },
    });

    if (createError || !createdAuth?.user) {
      console.error('Supabase Auth createUser error:', createError);
      return NextResponse.json(
        { error: createError?.message || 'Failed to create user login credentials in Auth system. Passwords must be at least 6 characters.' },
        { status: 400 }
      );
    }

    userId = createdAuth.user.id;
    createdAt = createdAuth.user.created_at || createdAt;

    // 5. Upsert into profiles table
    const { error: profileErr } = await admin.from('profiles').upsert({
      id: userId,
      company_id: companyId || null,
      email,
      full_name: displayName,
      is_active: true,
      created_at: createdAt,
      updated_at: new Date().toISOString(),
    });

    if (profileErr) {
      console.error('Profile creation error:', profileErr);
      return NextResponse.json(
        { error: profileErr.message || 'Failed to create profile record.' },
        { status: 500 }
      );
    }

    await recordAuditLog({
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: 'CREATE_USER',
      entityType: 'User',
      entityId: userId,
      entityName: `${displayName} (${email})`,
      details: `Created new HR Admin account for "${displayName}" (${email}).`,
    });

    return NextResponse.json(
      {
        data: {
          id: userId,
          email,
          displayName,
          createdAt,
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('POST /api/auth/users error:', err);
    return NextResponse.json(
      { error: err.message || 'An unexpected error occurred while creating user.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAuth();
  if (!auth.authenticated) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'User ID is required' }, { status: 400 });

    if (auth.user.id === id) {
      return NextResponse.json({ error: 'You cannot delete your own currently logged-in account.' }, { status: 400 });
    }

    const admin = createAdminSupabaseClient();
    const { data: targetProfile } = await admin.from('profiles').select('email, full_name').eq('id', id).maybeSingle();

    // Delete from auth.users
    const { error: authErr } = await admin.auth.admin.deleteUser(id);
    if (authErr) throw authErr;

    // Delete from profiles
    await admin.from('profiles').delete().eq('id', id);

    await recordAuditLog({
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: 'DELETE_USER',
      entityType: 'User',
      entityId: id,
      entityName: targetProfile ? `${targetProfile.full_name} (${targetProfile.email})` : 'User Account',
      details: targetProfile
        ? `Deleted HR Admin user account "${targetProfile.full_name}" (${targetProfile.email}).`
        : `Deleted HR Admin user account ID "${id}".`,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
