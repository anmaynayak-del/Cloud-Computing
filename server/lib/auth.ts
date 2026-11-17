import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { prisma } from './prisma';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is required');
  return secret;
}

export function sessionCookieOptions(maxAge = 60 * 60 * 24 * 7) {
  const production = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: production,
    sameSite: production && process.env.FINSENSE_SAME_ORIGIN !== 'true' ? 'none' as const : 'lax' as const,
    path: '/',
    maxAge,
  };
}

export const signToken = (userId: string) => {
  return jwt.sign({ userId }, getJwtSecret(), { expiresIn: '7d', algorithm: 'HS256' });
};

export const verifyToken = (token: string) => {
  try {
    return jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] }) as { userId: string };
  } catch {
    return null;
  }
};

export const getCurrentUser = async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  
  if (!token) return null;
  
  const decoded = verifyToken(token);
  if (!decoded) return null;
  
  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
  });
  
  if (!user) return null;
  
  // Return user without passwordHash
  const { passwordHash, ...userWithoutPassword } = user;
  return userWithoutPassword;
};
