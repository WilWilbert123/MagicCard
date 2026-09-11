import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { User } from '@supabase/supabase-js';

export type AuthResult =
  | { authenticated: true; user: User }
  | { authenticated: false; response: NextResponse };

/**
 * Server-side API route auth guard.
 *
 * Usage:
 * ```ts
 * const auth = await requireAuth();
 * if (!auth.authenticated) return auth.response; // 401
 * const { user } = auth;
 * ```
 *
 * This calls supabase.auth.getUser() which performs a real JWT verification
 * against Supabase's auth server — NOT a cookie-name or localStorage check.
 */
export async function requireAuth(): Promise<AuthResult> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return {
        authenticated: false,
        response: NextResponse.json(
          {
            error: 'UNAUTHORIZED',
            message: 'A valid session is required to access this resource.',
          },
          { status: 401 }
        ),
      };
    }

    return { authenticated: true, user };
  } catch {
    return {
      authenticated: false,
      response: NextResponse.json(
        { error: 'AUTH_ERROR', message: 'Authentication check failed.' },
        { status: 401 }
      ),
    };
  }
}
