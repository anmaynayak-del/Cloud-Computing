import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { sessionCookieOptions } from '../../../../lib/auth';

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.set('token', '', sessionCookieOptions(0));
  return NextResponse.json({ success: true });
}
