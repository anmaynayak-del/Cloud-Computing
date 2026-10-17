import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { getCurrentUser } from '../../../../lib/auth';
import { getGeminiApiKey, generateGeminiContent } from '../../../../lib/gemini';
import { rateLimit } from '../../../../lib/rate-limit';
import { ChatRequestSchema } from '../../../../schemas/ai';
import { calculateTotalBalance } from '../../../../lib/balance';
import { logAiUsage } from '../../../../lib/ai-logger';

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

    const { question, history, language } = parseResult.data;

    // Helper to detect Hindi/Hinglish in text or via language preference
    const isHindiOrHinglish = (text: string, requestedLang?: string): boolean => {
      if (requestedLang === 'hi') return true;
      if (requestedLang === 'en') return false;
      // 1. Devanagari Unicode characters (Hindi script)
      if (/[\u0900-\u097F]/.test(text)) return true;
      // 2. Common Hindi/Hinglish keywords written in English alphabet
      const hindiKeywords = /\b(kya|kyu|kyun|kaise|kitna|kitni|kitne|mera|meri|mere|mujhe|humko|aap|aapka|aapki|aapke|batao|bataiye|chahiye|kharcha|kharch|bachat|paise|paisa|khareed|khareedu|kharidna|le|sakta|sakti|sakte|hoon|hai|hain|tha|thi|the|nahi|nhi|matlab|rupaye|kamai|tankha|vetan|bachega|kam|jyada|zyada|karu|karun|karein|leni|lena|bata|batao|karna|hoga|hogi|hoge|aaj|kal|mahina|mahine|mahino|saal|bachana|bachao|daal|kholu|bhi|aur|par|se|mein|me|ko|ne|ki|ke|ka)\b/i;
      return hindiKeywords.test(text);
    };

    const isHindi = isHindiOrHinglish(question, language);

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

    const languageInstruction = isHindi
      ? `CRITICAL LANGUAGE & SCRIPT INSTRUCTION (HINGLISH):
The user communicated in HINDI (or selected Hindi voice/text).
You MUST reply strictly in conversational HINGLISH (conversational Hindi vocabulary and grammar written EXCLUSIVELY in the standard ENGLISH / LATIN alphabet).
- SCRIPT REQUIREMENT: English/Latin alphabet ONLY. Absolutely DO NOT output Devanagari script (no हिन्दी अक्षर).
- STYLE & TONE: Fluent, natural, professional everyday conversational Hinglish that an Indian user easily understands.
- EXAMPLE STYLE: "Aapka total liquid balance ₹2,52,500 hai aur is mahine ki income ₹85,000 hai. Agar aap ₹20,000 ka phone lete hain, toh yeh aapke emergency fund aur monthly savings buffer ko thoda kam karega. Meri salah yeh hai ki..."
- All monetary amounts must use the ₹ symbol (e.g. ₹20,000, ₹2,50,000).
- RECOMMENDED_FOLLOW_UPS MUST ALSO BE IN HINGLISH using the English alphabet. For example:
  RECOMMENDED_FOLLOW_UPS:
  - Kya main is kharche ko 3 mahine ki EMI mein baant sakta hoon?
  - Har mahine bachat badhane ke liye kaunsa kharcha kam karun?
  - Emergency fund mein kitna balance maintain karna chahiye?
- The disclaimer at the end should be:
  Yeh koi professional financial advice nahi hai. (This is not professional financial advice.)`
      : `LANGUAGE & SCRIPT INSTRUCTION (ENGLISH):
The user asked in ENGLISH. Reply strictly in clean, professional English.
- The disclaimer at the end should be:
  This is not professional financial advice.`;

    const prompt = `You are an expert personal financial adviser for FinSense.
The user is asking: "${question}"

STRICT DOMAIN GUARDRAIL:
You are exclusively a personal finance, spending, saving, budgeting, and investment adviser.
- If the user's question is NOT related to personal finance, money, budgeting, expenses, savings, investments, cash flow, debt, or financial planning (e.g. general knowledge, programming, recipes, politics, entertainment, casual chatting), YOU MUST POLITELY AND FIRMLY DECLINE.
- If user asked in Hindi/Hinglish, decline in Hinglish: "Main FinSense AI hoon, aapka personal finance adviser. Main sirf personal finance, budget, kharche aur savings se jude sawalon mein madad kar sakta hoon. Aaj main aapki finances mein kaise help kar sakta hoon?\n\nYeh koi professional financial advice nahi hai."
- If user asked in English, decline in English: "I am FinSense AI, your dedicated personal finance adviser. I can only assist with personal finance, budgeting, spending, and money management questions. How can I help you with your finances today?\n\nThis is not professional financial advice."
- Never answer non-financial questions under any circumstance.

${languageInstruction}

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
3. If asking for a BUDGET RECOMMENDATION (e.g. "Recommend a monthly budget for me", "Mera monthly budget kaisa hona chahiye"):
   - Recommend a tailored 50/30/20 allocation based on their monthly income of ₹${thisMonthIncome.toLocaleString('en-IN')}: 50% Needs (~₹${Math.round(thisMonthIncome * 0.5).toLocaleString('en-IN')}), 30% Wants (~₹${Math.round(thisMonthIncome * 0.3).toLocaleString('en-IN')}), and 20% Savings (~₹${Math.round(thisMonthIncome * 0.2).toLocaleString('en-IN')}).
   - Provide concrete suggested category targets based on their existing categories (${Object.keys(categoryTotalsMap).join(', ')}).

4. If asking about an affordability purchase (e.g. "Can I afford a ₹20,000 phone?" / "Kya main ₹20,000 ka phone le sakta hoon?"), compare the price against their total balance, net monthly cash flow, deficit/surplus, and upcoming budgets/goals to give balanced reasoning.
4b. WHAT-IF FINANCIAL SCENARIO SIMULATION:
If the user asks a hypothetical 'what if' question (e.g. "What if I cut dining out by 20%?", "Agar main dining out 20% kam karun toh?"):
- Isolate the simulated change (income increase, expense cut, or new monthly commitment).
- Show the exact simulated cash flow: current monthly net savings (₹${netSavings.toLocaleString('en-IN')}) versus simulated new net savings.
- Calculate concrete timeline impact: how many months faster they will hit their active goals, or how much their annual buffer will grow.
- Provide clear trade-offs and safety buffer recommendations.
5. Always format all monetary numbers using the Indian Rupee symbol '₹' and standard comma notation (e.g. ₹20,000, ₹2,34,700). Never use $, USD, or INR.
6. Do NOT reveal, mention, or invent any personal names, email addresses, specific account titles, or individual transaction details.
7. End your main answer with:
${isHindi ? 'Yeh koi professional financial advice nahi hai. (This is not professional financial advice.)' : 'This is not professional financial advice.'}

8. AFTER THE DISCLAIMER, generate exactly 3 contextual follow-up questions tailored specifically to what the user just asked in the matching language (${isHindi ? 'Hinglish with English alphabet' : 'English'}). Format them as:
RECOMMENDED_FOLLOW_UPS:
- [Follow-up question 1]
- [Follow-up question 2]
- [Follow-up question 3]`;

    let answer = '';
    let followUps: string[] = [];
    const startTime = Date.now();
    const promptTokens = Math.round(prompt.length / 4);

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
      const expectedDisclaimer = isHindi
        ? 'Yeh koi professional financial advice nahi hai.'
        : 'This is not professional financial advice.';
      if (!answer.includes('professional financial advice') && !answer.includes('financial advice nahi hai')) {
        answer += `\n\n${expectedDisclaimer}`;
      }

      // Log AI Usage
      const completionTokens = Math.round(answer.length / 4);
      await logAiUsage({
        userId: user.id,
        endpoint: '/api/ai/chat',
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        latencyMs: Date.now() - startTime,
        model: 'gemini-flash-lite',
        status: 'SUCCESS',
      });
    } catch (e: any) {
      console.warn('Gemini chat fallback used:', e.message);

      // Financial guardrail check for fallback
      const isFinanceQuery = /(money|finance|financial|budget|spend|spending|expense|income|saving|savings|afford|salary|rupee|invest|investment|debt|loan|bill|cost|price|balance|account|goal|stock|cash|fund|card|emi|sip|tax|bank|paisa|paise|bachat|kharcha|kharch|kamai|tankha|vetan|kharid|khareed)/i.test(question);
      if (!isFinanceQuery) {
        if (isHindi) {
          answer = `Main FinSense AI hoon, aapka dedicated personal finance adviser. Main sirf personal finance, budgeting, kharche aur money management ke sawalon mein madad kar sakta hoon. Aaj main aapki finances mein kya help kar sakta hoon?\n\nYeh koi professional financial advice nahi hai.`;
          followUps = [
            'Is mahine 15% kharcha kaise kam karun?',
            'Mere liye ek monthly budget suggest karein',
            'Kya mere savings goals on track hain?'
          ];
        } else {
          answer = `I am FinSense AI, your dedicated personal finance adviser. I can only assist with personal finance, budgeting, spending, and money management questions. How can I help you with your finances today?\n\nThis is not professional financial advice.`;
          followUps = [
            'How can I cut expenses by 15% this month?',
            'Recommend a monthly budget for me',
            'Am I on track with my savings goals?'
          ];
        }
      } else {
        const formattedBalance = `₹${totalBalance.toLocaleString('en-IN')}`;
        const formattedExpenses = `₹${thisMonthExpenses.toLocaleString('en-IN')}`;
        const formattedIncome = `₹${thisMonthIncome.toLocaleString('en-IN')}`;

        // Check if question asks for budget recommendations
        const isBudgetRecQuery = /(recommend|suggest|create|allocate|plan|advice|optimize).*(budget|spending|allocation)/i.test(question) || /(budget).*(recommend|suggest|plan|advice)/i.test(question) || /(budget|kharcha|bachat).*(batao|suggest|chahiye|bana)/i.test(question);
        if (isBudgetRecQuery) {
          const effectiveBase = thisMonthIncome > 0 ? thisMonthIncome : Math.max(thisMonthExpenses * 1.2, 50000);
          const needsCap = Math.round(effectiveBase * 0.5);
          const wantsCap = Math.round(effectiveBase * 0.3);
          const savingsCap = Math.round(effectiveBase * 0.2);

          if (isHindi) {
            answer = `Aapke monthly cash flow profile ke mutabik, 50/30/20 financial guideline par based ek smart budget recommendation:\n\n` +
              `1. Zaroori Kharch (Needs - 50% ~ ₹${needsCap.toLocaleString('en-IN')}):\n` +
              `   - Rent, Bills aur Utilities: Target ₹${Math.round(needsCap * 0.6).toLocaleString('en-IN')}\n` +
              `   - Groceries aur Healthcare: Target ₹${Math.round(needsCap * 0.4).toLocaleString('en-IN')}\n\n` +
              `2. Lifestyle aur Wants (30% ~ ₹${wantsCap.toLocaleString('en-IN')}):\n` +
              `   - Dining aur Cafes: Cap at ₹${Math.round(wantsCap * 0.5).toLocaleString('en-IN')}\n` +
              `   - Shopping aur Leisure: Cap at ₹${Math.round(wantsCap * 0.5).toLocaleString('en-IN')}\n\n` +
              `3. Savings aur Wealth Goals (20% ~ ₹${savingsCap.toLocaleString('en-IN')}):\n` +
              `   - Emergency Fund aur Goal Contributions: Har mahine ki shuruat mein ₹${savingsCap.toLocaleString('en-IN')} allocate karein\n\n` +
              `Filhal aapki monthly income ${formattedIncome} hai aur recorded expenses ${formattedExpenses} hain (Net Savings: ₹${netSavings.toLocaleString('en-IN')}).\n\nYeh koi professional financial advice nahi hai.`;
            followUps = [
              'Zaroori kharcho mein se kaise bachat badhaun?',
              'Discretionary spending ko track karne ka best tareeka kya hai?',
              'Emergency fund aur investments mein paise kaise divide karun?'
            ];
          } else {
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
          }
        } else {
          // Check if question asks about affordability of an amount
          const amountMatch = question.match(/(?:₹|rs\.?|inr)?\s*([\d,]+)/i);
          const itemAmount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : null;

          if (itemAmount) {
            const canAffordCash = totalBalance >= itemAmount;
            const formattedItem = `₹${itemAmount.toLocaleString('en-IN')}`;
            if (canAffordCash && netSavings >= 0) {
              if (isHindi) {
                answer = `Aapke liquid balance (${formattedBalance}) ke hisab se, technically aapke paas ${formattedItem} purchase karne ke funds hain. Lekin is mahine income ${formattedIncome} aur kharcha ${formattedExpenses} hone se, yeh lene ke baad aapka balance ₹${(totalBalance - itemAmount).toLocaleString('en-IN')} reh jayega. Agar yeh urgent nahi hai, toh aane wale mahino ki savings se khareedna behtar rahega.\n\nYeh koi professional financial advice nahi hai.`;
              } else {
                answer = `Based on your liquid balance of ${formattedBalance}, you technically have sufficient funds to cover the ${formattedItem} purchase. However, with this month's income at ${formattedIncome} and expenses at ${formattedExpenses}, purchasing this now would leave your balance at ₹${(totalBalance - itemAmount).toLocaleString('en-IN')}. If this is non-essential, consider saving for it across future monthly surpluses.\n\nThis is not professional financial advice.`;
              }
            } else if (canAffordCash && netSavings < 0) {
              if (isHindi) {
                answer = `Halanki aapka balance ${formattedBalance} hai, lekin is mahine aapka cash flow deficit mein chal raha hai (₹${Math.abs(netSavings).toLocaleString('en-IN')} ka gap, kharch ${formattedExpenses} vs income ${formattedIncome}). ${formattedItem} ka kharcha aapke balance ko aur kam kar dega.\n\nYeh koi professional financial advice nahi hai.`;
              } else {
                answer = `While your account balance of ${formattedBalance} could physically cover the ${formattedItem} cost, your cash flow is currently running a deficit of ₹${Math.abs(netSavings).toLocaleString('en-IN')} this month (expenses of ${formattedExpenses} vs income of ${formattedIncome}). Adding another ${formattedItem} expense would further widen your deficit and draw down your reserves.\n\nThis is not professional financial advice.`;
              }
            } else {
              if (isHindi) {
                answer = `Aapka total balance abhi ${formattedBalance} hai, jo ${formattedItem} ke kharche se kam hai. Sath hi is mahine aapke expenses ${formattedExpenses} hain. Abhi yeh purchase karna advisable nahi hai kyonki isse loan ya debt ki zaroorat pad sakti hai.\n\nYeh koi professional financial advice nahi hai.`;
              } else {
                answer = `Your total account balance is currently ${formattedBalance}, which is below the requested ${formattedItem} expense. Furthermore, your current month expenses stand at ${formattedExpenses} against income of ${formattedIncome}. Making this purchase right now is not advisable as it would require debt or overdraft.\n\nThis is not professional financial advice.`;
              }
            }
            followUps = isHindi
              ? [
                  `Kya main is ${formattedItem} ko 3 mahine ki EMI par baant sakta hoon?`,
                  'Ise aasaani se khareedne ke liye kitne mahine lag sakte hain?',
                  'Is kharche ke liye kaunsi category mein bachat karun?'
                ]
              : [
                  `What if I split ${formattedItem} over a 3-month EMI?`,
                  'How long will it take to save for this comfortably?',
                  'Which category can I cut to fund this purchase?'
                ];
          } else {
            if (isHindi) {
              answer = `Aapka financial snapshot: total balance ${formattedBalance} hai, is mahine ki income ${formattedIncome} aur kharch ${formattedExpenses} hai (net savings: ₹${netSavings.toLocaleString('en-IN')}). Aapke paas ${budgets.length} active budget(s) aur ${goals.length} savings goal(s) hain. Financial health improve karne ke liye discretionary kharche control karein.\n\nYeh koi professional financial advice nahi hai.`;
              followUps = [
                'Mujhe kaunsi category mein kharcha sabse pehle kam karna chahiye?',
                'Monthly savings rate kaise badhaun?',
                'Kya mere savings goals sahi track par hain?'
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
    }

    // Double check answer is cleaned of asterisks
    answer = answer.replace(/\*\*/g, '').replace(/\*/g, '');

    // Log fallback if main Gemini attempt didn't log
    const totalDuration = Date.now() - startTime;
    await logAiUsage({
      userId: user.id,
      endpoint: '/api/ai/chat',
      promptTokens,
      completionTokens: Math.round(answer.length / 4),
      totalTokens: promptTokens + Math.round(answer.length / 4),
      latencyMs: totalDuration,
      model: answer.includes('smart budget recommendation') ? 'rule-engine-fallback' : 'gemini-fallback',
      status: 'SUCCESS',
    }).catch(() => {});

    return NextResponse.json({ answer, followUps });
  } catch (error: any) {
    console.error('Chat adviser error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process chat adviser request' },
      { status: 500 }
    );
  }
}
