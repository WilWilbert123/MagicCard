import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server';
import { recordAuditLog } from '@/lib/audit/logger';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');

    if (!email || !password) {
      return NextResponse.json(
        { error: 'INVALID_CREDENTIALS', message: 'Invalid corporate email or password.' },
        { status: 401 }
      );
    }

    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
      // Record failed login audit log
      await recordAuditLog({
        actorType: 'USER',
        actorName: email,
        actorEmail: email,
        action: 'FAILED_LOGIN',
        entityType: 'Authentication',
        entityId: 'SYS-EVENT',
        entityName: email,
        details: `Failed authentication attempt for corporate email "${email}".`,
        ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
      });

      return NextResponse.json(
        { error: 'INVALID_CREDENTIALS', message: 'Invalid corporate email or password.' },
        { status: 401 }
      );
    }

    // Auto-provision profile & roles via admin client if missing
    let userFullName = data.user.user_metadata?.full_name || email.split('@')[0];
    let userBranchId: string | null = null;
    let userBranchName: string | null = null;

    try {
      const admin = createAdminSupabaseClient();
      const { data: profile } = await admin
        .from('profiles')
        .select('id, full_name, branch_id, branches(id, name), company_id')
        .eq('id', data.user.id)
        .maybeSingle();

      if (!profile) {
        const { data: comp } = await admin.from('companies').select('id').limit(1).maybeSingle();
        const { data: br } = await admin.from('branches').select('id, name').limit(1).maybeSingle();

        await admin.from('profiles').upsert({
          id: data.user.id,
          company_id: comp?.id,
          branch_id: br?.id,
          email: data.user.email,
          full_name: userFullName,
          is_active: true,
        }, { onConflict: 'id' });

        if (br) {
          userBranchId = br.id;
          userBranchName = br.name;
        }
      } else {
        if (profile.full_name) userFullName = profile.full_name;
        if (profile.branch_id) userBranchId = profile.branch_id;
        if ((profile as any).branches?.name) userBranchName = (profile as any).branches.name;
      }

      // Ensure user has Super Admin role
      const { data: role } = await admin.from('roles').select('id').eq('name', 'Super Admin').maybeSingle();
      if (role) {
        await admin.from('user_roles').upsert({
          user_id: data.user.id,
          role_id: role.id,
        }, { onConflict: 'user_id,role_id' });
      }
    } catch (profileErr) {
      console.warn('Profile sync notice during login:', profileErr);
    }

    // Record successful login audit log
    await recordAuditLog({
      actorId: data.user.id,
      actorType: 'USER',
      actorName: `${userFullName} (${data.user.email})`,
      actorEmail: data.user.email,
      action: 'USER_LOGIN',
      entityType: 'Authentication',
      entityId: data.user.id,
      entityName: userFullName,
      details: `User "${userFullName}" (${data.user.email}) successfully logged into HR Portal.`,
      branchId: userBranchId,
      metadata: {
        branchName: userBranchName || 'SM Sorsogon City',
      },
      ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return NextResponse.json({
      success: true,
      message: 'Authentication successful.',
      user: data.user,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'AUTH_ERROR', message: err.message || 'Authentication failed.' },
      { status: 500 }
    );
  }
}
