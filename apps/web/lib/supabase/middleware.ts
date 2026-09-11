import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { User } from '@supabase/supabase-js';

export interface UpdateSessionResult {
  response: NextResponse;
  user: User | null;
}

/**
 * Refreshes the Supabase auth session cookie and returns the validated user.
 * The user is obtained via `getUser()` which performs a cryptographic server-side
 * JWT verification — NOT just a cookie presence check.
 */
export async function updateSession(request: NextRequest): Promise<UpdateSessionResult> {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2])
        );
      },
    },
  });

  // IMPORTANT: getUser() performs a real JWT verification against Supabase's
  // auth server. This is NOT just reading from the cookie — it's cryptographic.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}
