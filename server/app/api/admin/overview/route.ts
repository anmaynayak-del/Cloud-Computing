import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { getCurrentUser } from '../../../../lib/auth';
import { calculateTotalBalance } from '../../../../lib/balance';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const [
      totalUsers,
      totalAccounts,
      totalTransactions,
      totalBudgets,
      totalGoals,
      allAccounts,
      recentUsers,
      recentAuditLogs,
      aiStats,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.account.count(),
      prisma.transaction.count(),
      prisma.budget.count(),
      prisma.goal.count(),
      prisma.account.findMany(),
      prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          _count: {
            select: {
              accounts: true,
              budgets: true,
              goals: true,
            },
          },
        },
      }),
      prisma.auditLog.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { name: true, email: true },
          },
        },
      }),
      prisma.aiUsageLog.aggregate({
        _count: { id: true },
        _sum: { totalTokens: true },
        _avg: { latencyMs: true },
      }),
    ]);

    // System-wide net balance across all accounts
    const totalPlatformBalance = calculateTotalBalance(allAccounts);

    return NextResponse.json({
      metrics: {
        totalUsers,
        totalAccounts,
        totalTransactions,
        totalBudgets,
        totalGoals,
        totalPlatformBalance,
        totalAiQueries: aiStats._count.id || 0,
        totalAiTokens: aiStats._sum.totalTokens || 0,
        averageAiLatencyMs: Math.round(aiStats._avg.latencyMs || 0),
      },
      recentUsers,
      recentAuditLogs,
    });
  } catch (error) {
    console.error('Admin overview error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
