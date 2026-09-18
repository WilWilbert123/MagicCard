import { NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth/require-auth';

export async function GET() {
  const auth = await requireAuth();
  if (!auth.authenticated) return auth.response;

  try {
    const admin = createAdminSupabaseClient();
    
    // Fetch system roles directly from public.roles table in Supabase
    const { data: dbRoles, error } = await admin
      .from('roles')
      .select('id, name, description, is_system')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching roles from Supabase:', error.message);
      return NextResponse.json({ error: error.message, data: [] }, { status: 500 });
    }

    return NextResponse.json({ data: dbRoles || [] });
  } catch (err: any) {
    console.error('GET /api/roles error:', err);
    return NextResponse.json({ error: err.message, data: [] }, { status: 500 });
  }
}
