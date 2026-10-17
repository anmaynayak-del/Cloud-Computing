import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { getCurrentUser } from '../../../../lib/auth';
import { calculateTotalBalance } from '../../../../lib/balance';

export async function GET(request: Request) {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim();

    const whereClause: any = {};
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { id: { contains: search, mode: 'insensitive' } },
      ];
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        accounts: {
          select: {
            id: true,
            type: true,
            balance: true,
            currency: true,
            _count: {
              select: { transactions: true },
            },
          },
        },
        _count: {
          select: {
            accounts: true,
            budgets: true,
            goals: true,
          },
        },
      },
    });

    const userSummaries = users.map(u => ({
      id: u.id,
      email: u.email,
      name: u.name || 'Anonymous User',
      role: u.role,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      accountsCount: u._count.accounts,
      transactionsCount: u.accounts.reduce((sum, acc) => sum + (acc._count?.transactions || 0), 0),
      budgetsCount: u._count.budgets,
      goalsCount: u._count.goals,
      totalBalance: calculateTotalBalance(u.accounts),
    }));

    return NextResponse.json({ users: userSummaries, total: userSummaries.length });
  } catch (error) {
    console.error('Admin users error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
