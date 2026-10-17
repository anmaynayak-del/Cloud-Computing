import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { getCurrentUser } from '../../../../lib/auth';
import { getGeminiApiKeys } from '../../../../lib/gemini';

export async function GET() {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const [aggregate, recentLogs, errorCount] = await Promise.all([
      prisma.aiUsageLog.aggregate({
        _count: { id: true },
        _sum: {
          promptTokens: true,
          completionTokens: true,
          totalTokens: true,
        },
        _avg: { latencyMs: true },
        _max: { latencyMs: true },
      }),
      prisma.aiUsageLog.findMany({
        take: 30,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.aiUsageLog.count({
        where: { status: 'ERROR' },
      }),
    ]);

    const totalQueries = aggregate._count.id || 0;
    const successCount = totalQueries - errorCount;
    const successRate = totalQueries > 0 ? Math.round((successCount / totalQueries) * 100) : 100;
    const activeKeysCount = getGeminiApiKeys().length;

    return NextResponse.json({
      summary: {
        totalQueries,
        totalTokens: aggregate._sum.totalTokens || 0,
        promptTokens: aggregate._sum.promptTokens || 0,
        completionTokens: aggregate._sum.completionTokens || 0,
        averageLatencyMs: Math.round(aggregate._avg.latencyMs || 0),
        maxLatencyMs: aggregate._max.latencyMs || 0,
        errorCount,
        successRate,
        activeKeysCount,
      },
      recentLogs,
    });
  } catch (error) {
    console.error('Admin AI usage error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
