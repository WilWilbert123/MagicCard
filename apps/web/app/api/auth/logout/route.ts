import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();

  const response = NextResponse.json({
    success: true,
    message: 'Logged out successfully.',
  });

  // Supabase may use a chunked auth cookie, so expire every auth cookie variant.
  const requestCookies = await cookies();
  requestCookies.getAll()
    .filter(({ name }) => name.startsWith('sb-') || name === 'hr_auth_token')
    .forEach(({ name }) => {
      response.cookies.set({
        name,
        value: '',
        path: '/',
        expires: new Date(0),
        maxAge: 0,
      });
    });

  return response;
}
