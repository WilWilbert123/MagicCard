import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server';

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
      return NextResponse.json(
        { error: 'INVALID_CREDENTIALS', message: 'Invalid corporate email or password.' },
        { status: 401 }
      );
    }

    // Auto-provision profile & roles via admin client if missing
    try {
      const admin = createAdminSupabaseClient();
      const { data: profile } = await admin
        .from('profiles')
        .select('id')
        .eq('id', data.user.id)
        .maybeSingle();

      if (!profile) {
        const { data: comp } = await admin.from('companies').select('id').limit(1).maybeSingle();
        const { data: br } = await admin.from('branches').select('id').limit(1).maybeSingle();

        await admin.from('profiles').upsert({
          id: data.user.id,
          company_id: comp?.id,
          branch_id: br?.id,
          email: data.user.email,
          full_name: data.user.user_metadata?.full_name || email.split('@')[0],
          is_active: true,
        }, { onConflict: 'id' });
      }

      // Ensure user has Super Admin role
      const { data: role } = await admin.from('roles').select('id').eq('name', 'Super Admin').maybeSingle();
      if (role) {
        await admin.from('user_roles').upsert({
          user_id: data.user.id,
          role_id: role.id,
        }, { onConflict: 'user_id,role_id' });
      }
    } catch {
      // Ignore background sync errors if table doesn't exist yet
    }

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
