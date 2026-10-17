import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { getCurrentUser } from '../../../lib/auth';
import { calculateTotalBalance } from '../../../lib/balance';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const startOfMonth = new Date(Date.UTC(currentYear, currentMonth - 1, 1, 0, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(currentYear, currentMonth, 0, 23, 59, 59, 999));

    const [accounts, thisMonthTransactions, budgets] = await Promise.all([
      prisma.account.findMany({ where: { userId: user.id } }),
      prisma.transaction.findMany({
        where: {
          account: { userId: user.id },
          date: { gte: startOfMonth, lte: endOfMonth },
        },
      }),
      prisma.budget.findMany({
        where: { userId: user.id, month: currentMonth, year: currentYear },
        include: { category: true },
      }),
    ]);

    const totalBalance = calculateTotalBalance(accounts);
    const thisMonthIncome = thisMonthTransactions
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const thisMonthExpenses = thisMonthTransactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    // 1. Savings Rate Pillar (35 pts)
    let savingsRateScore = 0;
    const savingsRatio = thisMonthIncome > 0 ? (thisMonthIncome - thisMonthExpenses) / thisMonthIncome : 0;
    if (savingsRatio >= 0.20) {
      savingsRateScore = 35;
    } else if (savingsRatio > 0) {
      savingsRateScore = Math.round((savingsRatio / 0.20) * 35);
    } else {
      savingsRateScore = 5; // Minimal baseline if active
    }

    // 2. Budget Adherence Pillar (35 pts)
    let budgetScore = 25; // Default if no budgets yet
    let budgetsOnTrack = 0;
    if (budgets.length > 0) {
      budgets.forEach(b => {
        const spent = thisMonthTransactions
          .filter(t => t.type === 'EXPENSE' && t.categoryId === b.categoryId)
          .reduce((sum, t) => sum + Number(t.amount), 0);
        if (spent <= Number(b.amount)) {
          budgetsOnTrack++;
        }
      });
      budgetScore = Math.round((budgetsOnTrack / budgets.length) * 35);
    }

    // 3. Emergency Fund Runway Pillar (30 pts)
    let emergencyScore = 0;
    const monthlyBurn = thisMonthExpenses > 0 ? thisMonthExpenses : 30000;
    const runwayMonths = totalBalance > 0 ? totalBalance / monthlyBurn : 0;
    if (runwayMonths >= 6) emergencyScore = 30;
    else if (runwayMonths >= 3) emergencyScore = 25;
    else if (runwayMonths >= 1) emergencyScore = 15;
    else emergencyScore = Math.min(Math.round(runwayMonths * 15), 10);

    const totalScore = Math.min(Math.max(savingsRateScore + budgetScore + emergencyScore, 10), 100);

    let rating = 'Needs Attention';
    let color = 'red';
    if (totalScore >= 80) {
      rating = 'Excellent';
      color = 'emerald';
    } else if (totalScore >= 60) {
      rating = 'Good';
      color = 'blue';
    } else if (totalScore >= 40) {
      rating = 'Fair';
      color = 'amber';
    }

    // Actionable personalized tip
    let tip = 'Keep tracking your daily expenses to maintain accurate insights.';
    if (runwayMonths < 3) {
      tip = `Build your emergency runway to at least 3 months (target ₹${Math.round(monthlyBurn * 3).toLocaleString('en-IN')}) for stronger security.`;
    } else if (budgets.length === 0) {
      tip = 'Set up monthly category budgets to keep discretionary spending disciplined.';
    } else if (savingsRatio < 0.2) {
      tip = 'Aim to save at least 20% of your monthly inflows into high-yield accounts or goals.';
    } else {
      tip = 'Outstanding financial discipline! Consider allocating surplus savings into long-term investments.';
    }

    return NextResponse.json({
      score: totalScore,
      rating,
      color,
      tip,
      pillars: [
        {
          name: 'Savings Rate',
          score: savingsRateScore,
          max: 35,
          value: `${Math.round(savingsRatio * 100)}% saved`,
          status: savingsRatio >= 0.2 ? 'OPTIMAL' : 'ROOM_TO_IMPROVE',
        },
        {
          name: 'Budget Adherence',
          score: budgetScore,
          max: 35,
          value: budgets.length > 0 ? `${budgetsOnTrack}/${budgets.length} on track` : 'No limits set',
          status: budgetScore >= 28 ? 'OPTIMAL' : 'ROOM_TO_IMPROVE',
        },
        {
          name: 'Emergency Runway',
          score: emergencyScore,
          max: 30,
          value: `${runwayMonths.toFixed(1)} months buffer`,
          status: runwayMonths >= 3 ? 'OPTIMAL' : 'NEEDS_BOOST',
        },
      ],
    });
  } catch (error) {
    console.error('Health score error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
