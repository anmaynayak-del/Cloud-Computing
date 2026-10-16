import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { getCurrentUser } from '../../../../lib/auth';
import { getGeminiApiKey, generateGeminiContent } from '../../../../lib/gemini';
import { rateLimit } from '../../../../lib/rate-limit';
import { ChatRequestSchema } from '../../../../schemas/ai';
import { calculateTotalBalance } from '../../../../lib/balance';

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit per user (20 requests per minute)
    if (!rateLimit(`ai-chat-${user.id}`, 20)) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment before sending another message.' },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const parseResult = ChatRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: parseResult.error.format() },
        { status: 400 }
      );
    }

    const { question, history } = parseResult.data;

    // Date boundaries for current month
    const now = new Date();
    const targetYear = now.getFullYear();
    const targetMonth = now.getMonth() + 1;
    const startOfMonth = new Date(Date.UTC(targetYear, targetMonth - 1, 1, 0, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(targetYear, targetMonth, 0, 23, 59, 59, 999));

    // Fetch user financial records
    const [accounts, thisMonthTransactions, budgets, goals] = await Promise.all([
      prisma.account.findMany({
        where: { userId: user.id },
        include: { transactions: true },
      }),
      prisma.transaction.findMany({
        where: {
          account: { userId: user.id },
          date: { gte: startOfMonth, lte: endOfMonth },
        },
        include: { category: true },
      }),
      prisma.budget.findMany({
        where: { userId: user.id, month: targetMonth, year: targetYear },
        include: { category: true },
      }),
      prisma.goal.findMany({
        where: { userId: user.id },
      }),
    ]);

    // Compute total net balance using shared balance utility (debt subtracted)
    const totalBalance = calculateTotalBalance(accounts);

    const thisMonthIncome = thisMonthTransactions
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const thisMonthExpenses = thisMonthTransactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const netSavings = thisMonthIncome - thisMonthExpenses;

    const categoryTotalsMap: Record<string, number> = {};
    thisMonthTransactions
      .filter(t => t.type === 'EXPENSE')
      .forEach(t => {
        const catName = t.category?.name || 'Uncategorized';
        categoryTotalsMap[catName] = (categoryTotalsMap[catName] || 0) + Number(t.amount);
      });

    // Budget vs actual
    const budgetVsActual = budgets.map(b => {
      const categoryName = b.category?.name || 'General';
      const budgeted = Number(b.amount);
      const spent = categoryTotalsMap[categoryName] || 0;
      return {
        category: categoryName,
        budgeted,
        spent,
        remaining: budgeted - spent,
        percentUsed: budgeted > 0 ? Math.round((spent / budgeted) * 100) : 0,
      };
    });

    // Goals progress - strictly NO goal names
    const goalsProgress = goals.map((g, idx) => ({
      goalIndex: idx + 1,
      targetAmount: Number(g.targetAmount),
      savedAmount: Number(g.savedAmount),
      percentAchieved: Number(g.targetAmount) > 0 ? Math.round((Number(g.savedAmount) / Number(g.targetAmount)) * 100) : 0,
    }));

    // Keep the last 5 messages for context
    const recentHistory = (history || []).slice(-5);
    const contextPrompt = recentHistory
      .map(m => `${m.role === 'user' ? 'User' : 'Advisor'}: ${m.content}`)
      .join('\n');

    // Sanitized summarized payload - strictly NO user names, emails, account names, goal names, transaction descriptions
    const summarizedMetrics = {
      totalBalance,
      thisMonthIncome,
      thisMonthExpenses,
      netSavings,
      budgetVsActual,
      goalsProgress,
    };

    const prompt = `You are an expert personal financial adviser for FinSense.
The user is asking: "${question}"

STRICT DOMAIN GUARDRAIL:
You are exclusively a personal finance, spending, saving, budgeting, and investment adviser.
- If the user's question is NOT related to personal finance, money, budgeting, expenses, savings, investments, cash flow, debt, or financial planning (e.g. general knowledge, programming, recipes, politics, entertainment, casual chatting), YOU MUST POLITELY AND FIRMLY DECLINE.
- Say: "I am FinSense AI, your dedicated personal finance adviser. I can only assist with personal finance, budgeting, spending, and money management questions. How can I help you with your finances today?"
- Never answer non-financial questions under any circumstance.

User Financial Summary:
- Total Liquid/Account Balance: ₹${totalBalance.toLocaleString('en-IN')}
- This Month's Income: ₹${thisMonthIncome.toLocaleString('en-IN')}
- This Month's Expenses: ₹${thisMonthExpenses.toLocaleString('en-IN')}
- Net Savings This Month: ₹${netSavings.toLocaleString('en-IN')}
- Category Spending So Far: ${JSON.stringify(categoryTotalsMap)}
- Budgets vs Actual: ${JSON.stringify(budgetVsActual)}
- Active Goals Progress: ${JSON.stringify(goalsProgress)}

${recentHistory.length > 0 ? `Recent Conversation History (last ${recentHistory.length} messages):\n${contextPrompt}\n` : ''}
Instructions:
1. Provide a direct, helpful, and concise answer to the user's question with simple step-by-step reasoning based on their actual numbers.
2. CRITICAL FORMATTING: DO NOT use any asterisks (*) anywhere in your text. Absolutely no **bold**, no *italic*, and no * bullet points. Use clean plain text, numbers (1., 2.), or clean hyphens (-).
3. If asking for a BUDGET RECOMMENDATION (e.g. "Recommend a monthly budget for me", "How should I allocate my expenses?"):
   - Recommend a tailored 50/30/20 allocation based on their monthly income of ₹${thisMonthIncome.toLocaleString('en-IN')}: 50% Needs (~₹${Math.round(thisMonthIncome * 0.5).toLocaleString('en-IN')}), 30% Wants (~₹${Math.round(thisMonthIncome * 0.3).toLocaleString('en-IN')}), and 20% Savings (~₹${Math.round(thisMonthIncome * 0.2).toLocaleString('en-IN')}).
   - Provide concrete suggested category targets based on their existing categories (${Object.keys(categoryTotalsMap).join(', ')}).
4. If asking about an affordability purchase (e.g. "Can I afford a ₹20,000 phone?"), compare the price against their total balance, net monthly cash flow, deficit/surplus, and upcoming budgets/goals to give balanced reasoning.
5. Always format all monetary numbers using the Indian Rupee symbol '₹' and standard comma notation (e.g. ₹20,000, ₹2,34,700). Never use $, USD, or INR.
6. Do NOT reveal, mention, or invent any personal names, email addresses, specific account titles, or individual transaction details.
7. End your main answer with:
This is not professional financial advice.

8. AFTER THE DISCLAIMER, generate exactly 3 contextual follow-up questions tailored specifically to what the user just asked, so they can dive deeper into this query. Format them as:
RECOMMENDED_FOLLOW_UPS:
- [Follow-up question 1]
- [Follow-up question 2]
- [Follow-up question 3]`;

    let answer = '';
    let followUps: string[] = [];

    try {
      const responseText = await generateGeminiContent(prompt);
      answer = responseText.trim();
      
      if (answer.includes('RECOMMENDED_FOLLOW_UPS:')) {
        const parts = answer.split('RECOMMENDED_FOLLOW_UPS:');
        answer = parts[0].trim();
        followUps = parts[1]
          .split('\n')
          .map(line => line.replace(/^[-*•>\s\d.]+\s*/, '').trim())
          .filter(line => line.length > 5 && line.length < 90)
          .slice(0, 3);
      }

      // Ensure zero asterisks remain
      answer = answer.replace(/\*\*/g, '').replace(/\*/g, '');

      // Ensure the required disclaimer is present
      if (!answer.includes('This is not professional financial advice.')) {
        answer += '\n\nThis is not professional financial advice.';
      }
    } catch (e: any) {
      console.warn('Gemini chat fallback used:', e.message);

      // Financial guardrail check for fallback
      const isFinanceQuery = /(money|finance|financial|budget|spend|spending|expense|income|saving|savings|afford|salary|rupee|invest|investment|debt|loan|bill|cost|price|balance|account|goal|stock|cash|fund|card|emi|sip|tax|bank)/i.test(question);
      if (!isFinanceQuery) {
        answer = `I am FinSense AI, your dedicated personal finance adviser. I can only assist with personal finance, budgeting, spending, and money management questions. How can I help you with your finances today?\n\nThis is not professional financial advice.`;
        followUps = [
          'How can I cut expenses by 15% this month?',
          'Recommend a monthly budget for me',
          'Am I on track with my savings goals?'
        ];
      } else {
        const formattedBalance = `₹${totalBalance.toLocaleString('en-IN')}`;
        const formattedExpenses = `₹${thisMonthExpenses.toLocaleString('en-IN')}`;
        const formattedIncome = `₹${thisMonthIncome.toLocaleString('en-IN')}`;

        // Check if question asks for budget recommendations
        const isBudgetRecQuery = /(recommend|suggest|create|allocate|plan|advice|optimize).*(budget|spending|allocation)/i.test(question) || /(budget).*(recommend|suggest|plan|advice)/i.test(question);
        if (isBudgetRecQuery) {
          const effectiveBase = thisMonthIncome > 0 ? thisMonthIncome : Math.max(thisMonthExpenses * 1.2, 50000);
          const needsCap = Math.round(effectiveBase * 0.5);
          const wantsCap = Math.round(effectiveBase * 0.3);
          const savingsCap = Math.round(effectiveBase * 0.2);

          answer = `Based on your monthly cash flow profile, here is an automated smart budget recommendation using the proven 50/30/20 financial guideline:\n\n` +
            `1. Essential Needs (50% ~ ₹${needsCap.toLocaleString('en-IN')}):\n` +
            `   - Rent, Utilities & Bills: Target ₹${Math.round(needsCap * 0.6).toLocaleString('en-IN')}\n` +
            `   - Groceries & Healthcare: Target ₹${Math.round(needsCap * 0.4).toLocaleString('en-IN')}\n\n` +
            `2. Lifestyle & Discretionary (30% ~ ₹${wantsCap.toLocaleString('en-IN')}):\n` +
            `   - Dining & Cafes: Cap at ₹${Math.round(wantsCap * 0.5).toLocaleString('en-IN')}\n` +
            `   - Shopping & Leisure: Cap at ₹${Math.round(wantsCap * 0.5).toLocaleString('en-IN')}\n\n` +
            `3. Savings & Wealth Goals (20% ~ ₹${savingsCap.toLocaleString('en-IN')}):\n` +
            `   - Emergency Reserves / Goal Contributions: Allocate ₹${savingsCap.toLocaleString('en-IN')} at the start of each month\n\n` +
            `Currently, your monthly income stands at ${formattedIncome} against ${formattedExpenses} in recorded expenses (Net Savings: ₹${netSavings.toLocaleString('en-IN')}).\n\nThis is not professional financial advice.`;
          followUps = [
            'How can I lower my Essential Needs expenses?',
            'What is the best way to track my discretionary spending?',
            'How should I divide my savings between emergency fund and investments?'
          ];
        } else {
          // Check if question asks about affordability of an amount
          const amountMatch = question.match(/(?:₹|rs\.?|inr)?\s*([\d,]+)/i);
          const itemAmount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : null;

          if (itemAmount) {
            const canAffordCash = totalBalance >= itemAmount;
            const formattedItem = `₹${itemAmount.toLocaleString('en-IN')}`;
            if (canAffordCash && netSavings >= 0) {
              answer = `Based on your liquid balance of ${formattedBalance}, you technically have sufficient funds to cover the ${formattedItem} purchase. However, with this month's income at ${formattedIncome} and expenses at ${formattedExpenses}, purchasing this now would leave your balance at ₹${(totalBalance - itemAmount).toLocaleString('en-IN')}. If this is non-essential, consider saving for it across future monthly surpluses.\n\nThis is not professional financial advice.`;
            } else if (canAffordCash && netSavings < 0) {
              answer = `While your account balance of ${formattedBalance} could physically cover the ${formattedItem} cost, your cash flow is currently running a deficit of ₹${Math.abs(netSavings).toLocaleString('en-IN')} this month (expenses of ${formattedExpenses} vs income of ${formattedIncome}). Adding another ${formattedItem} expense would further widen your deficit and draw down your reserves.\n\nThis is not professional financial advice.`;
            } else {
              answer = `Your total account balance is currently ${formattedBalance}, which is below the requested ${formattedItem} expense. Furthermore, your current month expenses stand at ${formattedExpenses} against income of ${formattedIncome}. Making this purchase right now is not advisable as it would require debt or overdraft.\n\nThis is not professional financial advice.`;
            }
            followUps = [
              `What if I split ${formattedItem} over a 3-month EMI?`,
              'How long will it take to save for this comfortably?',
              'Which category can I cut to fund this purchase?'
            ];
          } else {
            answer = `Looking at your financial snapshot: your total balance is ${formattedBalance}, with this month's income at ${formattedIncome} and expenses at ${formattedExpenses} (net: ₹${netSavings.toLocaleString('en-IN')}). You have ${budgets.length} active budget(s) and ${goals.length} savings goal(s). To improve your financial standing, focus on balancing outflows against reliable inflows.\n\nThis is not professional financial advice.`;
            followUps = [
              'Which specific category should I cut first?',
              'How can I increase my monthly savings rate?',
              'Am I on track to meet my upcoming goals?'
            ];
          }
        }
      }
    }

    // Double check answer is cleaned of asterisks
    answer = answer.replace(/\*\*/g, '').replace(/\*/g, '');

    return NextResponse.json({ answer, followUps });
  } catch (error: any) {
    console.error('Chat adviser error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process chat adviser request' },
      { status: 500 }
    );
  }
}
