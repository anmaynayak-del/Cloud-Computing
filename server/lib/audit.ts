import { prisma } from './prisma';

export async function logAuditEvent(params: {
  userId?: string | null;
  action: string;
  details?: string | Record<string, any>;
  targetUserId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  try {
    const detailsStr = typeof params.details === 'object' ? JSON.stringify(params.details) : params.details;
    await prisma.auditLog.create({
      data: {
        userId: params.userId || null,
        action: params.action,
        details: detailsStr || null,
        targetUserId: params.targetUserId || null,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
      },
    });
  } catch (err) {
    console.warn('Failed to record audit log:', err);
  }
}
