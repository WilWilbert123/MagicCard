import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

// ---------------------------------------------------------------------------
// Security response headers applied to EVERY response (defense-in-depth)
// ---------------------------------------------------------------------------
const SECURITY_HEADERS: Record<string, string> = {
  // Prevent clickjacking
  'X-Frame-Options': 'DENY',
  // Prevent MIME-type sniffing
  'X-Content-Type-Options': 'nosniff',
  // Minimal referrer information
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  // Disable browser features not used by this app
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  // Force HTTPS for 2 years (only effective in prod over HTTPS)
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  // Basic XSS protection for older browsers
  'X-XSS-Protection': '1; mode=block',
};

function applySecurityHeaders(response: NextResponse): NextResponse {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

// ---------------------------------------------------------------------------
// Protected API routes — callers must present a valid Supabase session
// ---------------------------------------------------------------------------
const PROTECTED_API_PREFIXES = [
  '/api/employees',
  '/api/kiosks',
  '/api/print-jobs',
  '/api/branches',
  '/api/departments',
  '/api/settings',
  '/api/auth/profile',   // profile requires auth
  '/api/auth/users',     // user management requires auth
  '/api/auth/logout',    // logout requires auth (prevents CSRF-logout)
];

function isProtectedApi(pathname: string): boolean {
  return PROTECTED_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

// ---------------------------------------------------------------------------
// Main middleware
// ---------------------------------------------------------------------------
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // updateSession refreshes the Supabase cookie AND validates the JWT
  // cryptographically via supabase.auth.getUser(). This is the only correct
  // way to verify a session server-side — NOT a cookie-name presence check.
  const { response, user } = await updateSession(request);
  const isAuthenticated = user !== null;

  // ------------------------------------------------------------------
  // Guard: HR admin pages  (/hr/* except /hr/login)
  // ------------------------------------------------------------------
  if (pathname.startsWith('/hr') && pathname !== '/hr/login') {
    if (!isAuthenticated) {
      const loginUrl = new URL('/hr/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return applySecurityHeaders(NextResponse.redirect(loginUrl));
    }
  }

  // ------------------------------------------------------------------
  // Guard: already logged-in users visiting the login page
  // ------------------------------------------------------------------
  if (pathname === '/hr/login' && isAuthenticated) {
    return applySecurityHeaders(
      NextResponse.redirect(new URL('/hr/dashboard', request.url))
    );
  }

  // ------------------------------------------------------------------
  // Guard: protected API routes — return 401 JSON, not a redirect
  // ------------------------------------------------------------------
  if (isProtectedApi(pathname) && !isAuthenticated) {
    return applySecurityHeaders(
      NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'A valid session is required to access this resource.' },
        { status: 401 }
      )
    );
  }

  // ------------------------------------------------------------------
  // Pass through — apply security headers to all other responses
  // ------------------------------------------------------------------
  return applySecurityHeaders(response);
}

export const config = {
  matcher: [
    /*
     * Match all paths EXCEPT Next.js internals and static assets:
     *   - _next/static  (bundled JS/CSS)
     *   - _next/image   (image optimization)
     *   - favicon.ico, robots.txt, sitemap.xml, and similar static files
     *
     * This ensures the middleware runs on ALL page and API routes,
     * giving us server-side auth enforcement everywhere.
     */
    '/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|otf)).*)',
  ],
};
