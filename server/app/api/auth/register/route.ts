import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { RegisterSchema } from '../../../../schemas/auth';
import { signToken } from '../../../../lib/auth';
import { rateLimit } from '../../../../lib/rate-limit';
import bcrypt from 'bcrypt';
import { cookies } from 'next/headers';

import { logAuditEvent } from '../../../../lib/audit';

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'global';
    if (!rateLimit(`register-${ip}`, 5)) {
      return NextResponse.json({ error: 'Too many registration attempts. Please try again later.' }, { status: 429 });
    }

    const body = await request.json();
    const parsed = RegisterSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const { email, name, password } = parsed.data;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, name, passwordHash, role: 'USER' },
    });

    await logAuditEvent({
      userId: user.id,
      action: 'USER_REGISTER',
      details: { email: user.email, name: user.name, role: 'USER' },
      ipAddress: ip,
      userAgent: request.headers.get('user-agent'),
    });

    const isProduction = process.env.NODE_ENV === 'production';
    const token = signToken(user.id);
    const cookieStore = await cookies();
    cookieStore.set('token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    const { passwordHash: _, ...userWithoutPassword } = user;
    return NextResponse.json(userWithoutPassword, { status: 201 });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
