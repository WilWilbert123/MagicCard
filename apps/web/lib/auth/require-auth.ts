import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import type { User } from '@supabase/supabase-js';

export type AuthResult =
  | { authenticated: true; user: User }
  | { authenticated: false; response: NextResponse };

// Short 30-second in-memory cache for verified users to prevent parallel API calls
// (e.g. page loads making 5 simultaneous requests) from hitting Supabase Auth repeatedly.
const verifiedUserCache = new Map<string, { user: User; expires: number }>();

/**
 * Server-side API route auth guard.
 *
 * Calls supabase.auth.getUser() with short in-memory token caching to
 * prevent parallel API calls from hitting Supabase Auth servers multiple times.
 */
export async function requireAuth(): Promise<AuthResult> {
  try {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    const tokenCookie = allCookies.find((c) => c.name.includes('-auth-token'))?.value || '';

    const now = Date.now();
    if (tokenCookie && verifiedUserCache.has(tokenCookie)) {
      const cached = verifiedUserCache.get(tokenCookie)!;
      if (now < cached.expires) {
        return { authenticated: true, user: cached.user };
      }
      verifiedUserCache.delete(tokenCookie);
    }

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

    if (tokenCookie) {
      verifiedUserCache.set(tokenCookie, { user, expires: now + 30 * 1000 });
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
