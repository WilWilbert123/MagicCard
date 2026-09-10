import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: 'Logged out successfully.',
  });

  // Clear authentication cookie
  response.cookies.set({
    name: 'hr_auth_token',
    value: '',
    path: '/',
    expires: new Date(0),
    maxAge: 0,
  });

  return response;
}
