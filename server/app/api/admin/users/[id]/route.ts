import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { getCurrentUser } from '../../../../../lib/auth';
import { calculateTotalBalance } from '../../../../../lib/balance';
import { logAuditEvent } from '../../../../../lib/audit';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { id } = await params;

    const targetUser = await prisma.user.findUnique({
      where: { id },
      include: {
        accounts: {
          include: {
            transactions: {
              take: 20,
              orderBy: { date: 'desc' },
              include: { category: true },
            },
          },
        },
        budgets: {
          include: { category: true },
        },
        goals: true,
      },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Log the inspection in the audit trail
    const ip = request.headers.get('x-forwarded-for') || 'global';
    await logAuditEvent({
      userId: admin.id,
      action: 'INSPECT_USER',
      targetUserId: targetUser.id,
      details: {
        adminEmail: admin.email,
        targetEmail: targetUser.email,
        targetName: targetUser.name,
      },
      ipAddress: ip,
      userAgent: request.headers.get('user-agent'),
    });

    const { passwordHash: _, ...userWithoutPassword } = targetUser;
    const totalBalance = calculateTotalBalance(targetUser.accounts);

    return NextResponse.json({
      user: {
        ...userWithoutPassword,
        totalBalance,
      },
    });
  } catch (error) {
    console.error('Admin user drilldown error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
