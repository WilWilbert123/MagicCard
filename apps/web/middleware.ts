import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('hr_auth_token')?.value;

  // Protect all /hr/* routes (except /hr/login)
  if (pathname.startsWith('/hr') && pathname !== '/hr/login') {
    if (!token) {
      const loginUrl = new URL('/hr/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    try {
      // Validate token structure
      const decoded = JSON.parse(Buffer.from(token, 'base64url').toString('utf-8'));
      if (!decoded.expiresAt || decoded.expiresAt < Date.now()) {
        const loginUrl = new URL('/hr/login', request.url);
        loginUrl.searchParams.set('reason', 'expired');
        const res = NextResponse.redirect(loginUrl);
        res.cookies.delete('hr_auth_token');
        return res;
      }
    } catch {
      // Malformed token - redirect to login and clear bad cookie
      const loginUrl = new URL('/hr/login', request.url);
      const res = NextResponse.redirect(loginUrl);
      res.cookies.delete('hr_auth_token');
      return res;
    }
  }

  // If already logged in and visiting /hr/login, redirect directly to /hr/dashboard
  if (pathname === '/hr/login' && token) {
    try {
      const decoded = JSON.parse(Buffer.from(token, 'base64url').toString('utf-8'));
      if (decoded.expiresAt && decoded.expiresAt > Date.now()) {
        return NextResponse.redirect(new URL('/hr/dashboard', request.url));
      }
    } catch {
      // Ignore and allow login page
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/hr/:path*'],
};
