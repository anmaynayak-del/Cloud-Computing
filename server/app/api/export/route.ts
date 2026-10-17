import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { getCurrentUser } from '../../../lib/auth';
import { calculateTotalBalance } from '../../../lib/balance';
import { logAuditEvent } from '../../../lib/audit';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv';

    // Fetch user complete financial records
    const [accounts, transactions, budgets, goals] = await Promise.all([
      prisma.account.findMany({
        where: { userId: user.id },
      }),
      prisma.transaction.findMany({
        where: { account: { userId: user.id } },
        include: {
          category: true,
          account: true,
        },
        orderBy: { date: 'desc' },
      }),
      prisma.budget.findMany({
        where: { userId: user.id },
        include: { category: true },
      }),
      prisma.goal.findMany({
        where: { userId: user.id },
      }),
    ]);

    // Log the data export event for audit compliance
    const ip = request.headers.get('x-forwarded-for') || 'global';
    await logAuditEvent({
      userId: user.id,
      action: 'EXPORT_DATA',
      details: { format, transactionCount: transactions.length },
      ipAddress: ip,
      userAgent: request.headers.get('user-agent'),
    });

    if (format === 'json') {
      const netBalance = calculateTotalBalance(accounts);
      return NextResponse.json({
        exportDate: new Date().toISOString(),
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        summary: {
          netBalance,
          accountsCount: accounts.length,
          transactionsCount: transactions.length,
          budgetsCount: budgets.length,
          goalsCount: goals.length,
        },
        accounts,
        transactions,
        budgets,
        goals,
      });
    }

    // Default to CSV export format
    const csvRows = [
      ['Date', 'Type', 'Amount (INR)', 'Category', 'Account', 'Description'].join(','),
    ];

    transactions.forEach(t => {
      const dateStr = new Date(t.date).toISOString().split('T')[0];
      const desc = `"${(t.description || '').replace(/"/g, '""')}"`;
      const cat = `"${(t.category?.name || 'Uncategorized').replace(/"/g, '""')}"`;
      const acc = `"${(t.account?.name || 'Account').replace(/"/g, '""')}"`;
      const amt = Number(t.amount).toFixed(2);
      csvRows.push([dateStr, t.type, amt, cat, acc, desc].join(','));
    });

    const csvContent = csvRows.join('\n');
    const filename = `FinSense-Financial-Export-${new Date().toISOString().split('T')[0]}.csv`;

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Export API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
