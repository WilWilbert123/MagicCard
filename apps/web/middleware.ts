import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = await updateSession(request);
  const hasSupabaseSession = request.cookies.has('sb-access-token') ||
    Array.from(request.cookies.getAll()).some(({ name }) => name.startsWith('sb-') && name.includes('-auth-token'));

  // Protect all /hr/* routes (except /hr/login)
  if (pathname.startsWith('/hr') && pathname !== '/hr/login') {
    if (!hasSupabaseSession) {
      const loginUrl = new URL('/hr/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // If already logged in and visiting /hr/login, redirect directly to /hr/dashboard
  if (pathname === '/hr/login' && hasSupabaseSession) {
    return NextResponse.redirect(new URL('/hr/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/hr/:path*'],
};
