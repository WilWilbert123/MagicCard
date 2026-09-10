import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

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
