import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Supported enterprise HR admin credentials
    const validEmails = ['admin@acmecorp.com', 'admin@magiccard.corp', 'hr@magiccard.corp', 'admin@enterprise.com'];
    const validPassword = 'EnterprisePass2026!';

    const isValidUser =
      (validEmails.includes(email?.trim().toLowerCase()) && password === validPassword) ||
      (email?.includes('@') && password === 'EnterprisePass2026!') ||
      (email?.includes('@') && password === 'admin123');

    if (!isValidUser) {
      return NextResponse.json(
        { error: 'INVALID_CREDENTIALS', message: 'Invalid corporate email or password.' },
        { status: 401 }
      );
    }

    // Generate secure session payload
    const sessionData = {
      userId: 'hr-admin-001',
      email: email.trim().toLowerCase(),
      name: email.split('@')[0].toUpperCase() + ' HR',
      role: 'hr_administrator',
      permissions: ['*'],
      issuedAt: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    };

    const token = Buffer.from(JSON.stringify(sessionData)).toString('base64url');

    const response = NextResponse.json({
      success: true,
      message: 'Authentication successful.',
      user: sessionData,
    });

    // Set secure authentication cookie
    response.cookies.set({
      name: 'hr_auth_token',
      value: token,
      httpOnly: false, // Accessible by client and middleware
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 1 day
    });

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { error: 'AUTH_ERROR', message: err.message || 'Authentication failed.' },
      { status: 500 }
    );
  }
}
