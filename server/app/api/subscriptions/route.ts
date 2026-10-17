import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { getCurrentUser } from '../../../lib/auth';

interface DetectedSubscription {
  id: string;
  name: string;
  amount: number;
  frequency: 'MONTHLY' | 'YEARLY' | 'WEEKLY';
  category: string;
  accountName: string;
  lastBilled: string;
  nextBillingDate: string;
  daysRemaining: number;
  status: 'ACTIVE' | 'DUE_SOON' | 'OVERDUE';
  totalPaidYear: number;
  occurrences: number;
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch transactions from the last 180 days for the user
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setDate(sixMonthsAgo.getDate() - 180);

    const transactions = await prisma.transaction.findMany({
      where: {
        account: { userId: user.id },
        type: 'EXPENSE',
        date: { gte: sixMonthsAgo },
      },
      include: {
        category: true,
        account: true,
      },
      orderBy: { date: 'desc' },
    });

    // Known common subscription keywords
    const KNOWN_SUBSCRIPTIONS = [
      { pattern: /netflix/i, name: 'Netflix', category: 'Entertainment', defaultAmt: 499 },
      { pattern: /spotify/i, name: 'Spotify Premium', category: 'Entertainment', defaultAmt: 119 },
      { pattern: /(prime|amazon\s*prime)/i, name: 'Amazon Prime', category: 'Entertainment', defaultAmt: 299 },
      { pattern: /(hotstar|disney)/i, name: 'Disney+ Hotstar', category: 'Entertainment', defaultAmt: 299 },
      { pattern: /youtube/i, name: 'YouTube Premium', category: 'Entertainment', defaultAmt: 149 },
      { pattern: /(gym|fitness|cult)/i, name: 'Fitness & Gym', category: 'Health & Fitness', defaultAmt: 2000 },
      { pattern: /(wifi|broadband|airtel|jio|act\s*fiber)/i, name: 'Broadband Internet', category: 'Utilities', defaultAmt: 999 },
      { pattern: /(electric|power|bescom|tata\s*power)/i, name: 'Electricity Bill', category: 'Utilities', defaultAmt: 1800 },
      { pattern: /(rent|society|maintenance)/i, name: 'Monthly Rent', category: 'Housing', defaultAmt: 15000 },
      { pattern: /(cloud|aws|github|digitalocean|vercel|google\s*one)/i, name: 'Cloud & Developer Services', category: 'Software', defaultAmt: 800 },
    ];

    // Group transactions by normalized name/description
    const groups: Record<string, typeof transactions> = {};

    transactions.forEach(t => {
      const desc = (t.description || '').trim();
      if (!desc) return;

      // Check if matches known subscription pattern
      const known = KNOWN_SUBSCRIPTIONS.find(k => k.pattern.test(desc));
      const key = known ? known.name : desc.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();

      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });

    const now = new Date();
    const detected: DetectedSubscription[] = [];

    // Analyze groups
    for (const [key, txns] of Object.entries(groups)) {
      if (txns.length >= 1) {
        // Sort newest first
        txns.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const latest = txns[0];
        const amounts = txns.map(t => Number(t.amount));
        const avgAmount = Math.round(amounts.reduce((a, b) => a + b, 0) / amounts.length);

        // Determine frequency
        let frequency: 'MONTHLY' | 'YEARLY' | 'WEEKLY' = 'MONTHLY';
        if (txns.length >= 2) {
          const diffDays = Math.round(
            (new Date(txns[0].date).getTime() - new Date(txns[1].date).getTime()) / (1000 * 60 * 60 * 24)
          );
          if (diffDays >= 5 && diffDays <= 10) frequency = 'WEEKLY';
          else if (diffDays >= 300) frequency = 'YEARLY';
          else frequency = 'MONTHLY';
        }

        // Calculate next billing date
        const lastBilledDate = new Date(latest.date);
        const nextDate = new Date(lastBilledDate);
        if (frequency === 'WEEKLY') {
          nextDate.setDate(nextDate.getDate() + 7);
        } else if (frequency === 'YEARLY') {
          nextDate.setFullYear(nextDate.getFullYear() + 1);
        } else {
          nextDate.setMonth(nextDate.getMonth() + 1);
        }

        // Days remaining
        const diffMs = nextDate.getTime() - now.getTime();
        const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        let status: 'ACTIVE' | 'DUE_SOON' | 'OVERDUE' = 'ACTIVE';
        if (daysRemaining < 0) status = 'OVERDUE';
        else if (daysRemaining <= 5) status = 'DUE_SOON';

        // Display name
        const displayName = key
          .split(' ')
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');

        // Total paid in year
        const totalPaidYear = amounts.reduce((a, b) => a + b, 0);

        // Only include if either matches known subscription keywords OR occurred 2+ times
        const isKnown = KNOWN_SUBSCRIPTIONS.some(k => k.name.toLowerCase() === key.toLowerCase() || k.pattern.test(key));
        if (isKnown || txns.length >= 2) {
          detected.push({
            id: `sub-${latest.id}`,
            name: displayName,
            amount: avgAmount,
            frequency,
            category: latest.category?.name || 'Subscription',
            accountName: latest.account?.name || 'Primary Account',
            lastBilled: lastBilledDate.toISOString(),
            nextBillingDate: nextDate.toISOString(),
            daysRemaining,
            status,
            totalPaidYear,
            occurrences: txns.length,
          });
        }
      }
    }

    // Sort by soonest billing date
    detected.sort((a, b) => a.daysRemaining - b.daysRemaining);

    // Calculate summary statistics
    const totalMonthlyCommitment = detected.reduce((sum, sub) => {
      if (sub.frequency === 'WEEKLY') return sum + sub.amount * 4;
      if (sub.frequency === 'YEARLY') return sum + Math.round(sub.amount / 12);
      return sum + sub.amount;
    }, 0);

    const activeCount = detected.length;
    const dueSoonCount = detected.filter(s => s.status === 'DUE_SOON' || s.status === 'OVERDUE').length;
    const nextUpcoming = detected.find(s => s.daysRemaining >= 0) || detected[0] || null;

    return NextResponse.json({
      subscriptions: detected,
      metrics: {
        totalMonthlyCommitment,
        activeCount,
        dueSoonCount,
        yearlyProjected: totalMonthlyCommitment * 12,
        nextUpcoming,
      },
    });
  } catch (error) {
    console.error('Subscriptions API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
