import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieStore = await cookies();
  cookieStore.set('token', '', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
    maxAge: 0,
  });
  return NextResponse.json({ success: true });
}
