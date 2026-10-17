import { useState, useRef, useEffect } from 'react';
import { fetchApi } from '../lib/api';
import { Send, Bot, User, Sparkles, AlertCircle, RefreshCw, HelpCircle } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
}

const INITIAL_QUESTIONS = [
  '💡 Recommend a monthly budget for me',
  '📊 How should I allocate my 50/30/20 budget?',
  '📱 Can I afford a ₹20,000 phone?',
  '📉 How can I cut expenses by 15% this month?',
  '🎯 Am I on track with my savings goals?',
];

const cleanText = (text: string) => {
  if (!text) return '';
  return text.replace(/\*\*/g, '').replace(/\*/g, '');
};

const generateContextualFollowUps = (question: string): string[] => {
  const lower = question.toLowerCase();
  if (lower.includes('budget') || lower.includes('50/30/20') || lower.includes('allocate')) {
    return [
      'How can I lower my Essential Needs expenses?',
      'What is the best way to track my discretionary spending?',
      'How should I divide my savings between emergency fund and investments?',
    ];
  }
  if (lower.includes('cut') || lower.includes('reduce') || lower.includes('save') || lower.includes('expense') || lower.includes('spend')) {
    return [
      'Which specific category should I trim first to save faster?',
      'Can you suggest a daily spending limit for me?',
      'How will these reductions impact my net monthly savings?',
    ];
  }
  if (lower.includes('afford') || lower.includes('buy') || lower.includes('phone') || lower.includes('laptop') || lower.includes('cost')) {
    return [
      'What if I split this cost over 3 months?',
      'How many months of surplus would I need to save up?',
      'Will this purchase compromise any of my active savings goals?',
    ];
  }
  if (lower.includes('goal') || lower.includes('target') || lower.includes('invest') || lower.includes('zerodha')) {
    return [
      'How can I accelerate reaching my savings goals?',
      'Should I prioritize debt payoff or investing in my goals?',
      'What percentage of my monthly income should go into investments?',
    ];
  }
  return [
    'How does this impact my overall monthly cash flow?',
    'What step can I take this week to improve this?',
    'Can you give me a category-by-category breakdown?',
  ];
};

export const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      content: 'Hello! I am your FinSense AI Financial Adviser. I am strictly dedicated to your personal finance: evaluating purchases, generating automated budget recommendations (50/30/20 rule), and analyzing your cash flow.\n\nAsk me any financial question below or select a prompt chip to get started!\n\nThis is not professional financial advice.',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>(INITIAL_QUESTIONS);
  const [hasAskedQuestion, setHasAskedQuestion] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (questionText?: string) => {
    const q = (questionText || input).trim();
    if (!q || loading) return;

    setError(null);
    setInput('');

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: cleanText(q),
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      // Send the last 5 messages as context (excluding welcome message)
      const contextHistory = updatedMessages
        .filter(m => m.id !== 'welcome')
        .slice(-5)
        .map(m => ({
          role: m.role,
          content: m.content,
        }));

      const res = await fetchApi('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          history: contextHistory,
        }),
      });

      if (res.answer) {
        setMessages(prev => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'model',
            content: cleanText(res.answer),
            timestamp: new Date(),
          },
        ]);

        // Update suggested follow-up questions dynamically based on what was asked
        if (res.followUps && Array.isArray(res.followUps) && res.followUps.length > 0) {
          setSuggestedQuestions(res.followUps.map(cleanText));
        } else {
          setSuggestedQuestions(generateContextualFollowUps(q));
        }
        setHasAskedQuestion(true);
      } else {
        throw new Error(res.error || 'No answer received from adviser');
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      setError(err.message || 'Failed to get a response from the AI adviser');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col h-[calc(100dvh-7.5rem)] sm:h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 sm:pb-4 border-b dark:border-gray-700 flex-shrink-0">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="p-2 sm:p-2.5 bg-blue-100 dark:bg-blue-900/50 rounded-xl text-blue-600 dark:text-blue-400 shrink-0">
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">
              AI Financial Adviser
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              Personalized guidance based on your live balances, cash flow, and budgets
            </p>
          </div>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto py-3 sm:py-4 space-y-4 pr-1 min-h-0">
        {messages.map((m) => {
          const isUser = m.role === 'user';
          return (
            <div
              key={m.id}
              className={`flex items-start space-x-2.5 sm:space-x-3 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}
            >
              {/* Avatar */}
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${
                  isUser
                    ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 text-white'
                    : 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white'
                }`}
              >
                {isUser ? <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[88%] sm:max-w-[85%] rounded-2xl p-3 sm:p-4 shadow-sm text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words ${
                  isUser
                    ? 'bg-blue-600 text-white rounded-tr-none'
                    : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-gray-700/60 rounded-tl-none'
                }`}
              >
                {cleanText(m.content)}
                <div
                  className={`text-[10px] mt-1.5 sm:mt-2 font-medium ${
                    isUser ? 'text-blue-100 text-right' : 'text-gray-400 dark:text-gray-500'
                  }`}
                >
                  {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {loading && (
          <div className="flex items-start space-x-2.5 sm:space-x-3">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center flex-shrink-0 shadow-md">
              <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-pulse" />
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/60 rounded-2xl rounded-tl-none p-3.5 sm:p-4 shadow-sm flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce"></div>
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.3s]"></div>
              <span className="text-xs text-gray-500 dark:text-gray-400 pl-2">Adviser is reasoning through your finances...</span>
            </div>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center justify-between text-xs text-red-700 dark:text-red-300">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => handleSend()}
              className="flex items-center space-x-1 font-semibold hover:underline text-red-800 dark:text-red-200"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Dynamic Recommended Follow-up Question Buttons */}
        {!loading && suggestedQuestions.length > 0 && (
          <div className="pt-2 pb-1">
            <div className="flex items-center space-x-1.5 text-xs text-gray-500 dark:text-gray-400 mb-2">
              {hasAskedQuestion ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    Suggested follow-up questions:
                  </span>
                </>
              ) : (
                <>
                  <HelpCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Try asking:</span>
                </>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestedQuestions.map((q) => (
                <button
                  key={q}
                  onClick={() => handleSend(q)}
                  disabled={loading}
                  className={`text-xs px-3.5 py-1.5 rounded-xl sm:rounded-full border transition disabled:opacity-50 text-left shadow-sm cursor-pointer ${
                    hasAskedQuestion
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-700/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/40 hover:border-emerald-500'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/20'
                  }`}
                >
                  "{cleanText(q)}"
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="pt-2 flex-shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-end space-x-2 bg-white dark:bg-gray-800 p-2 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask your financial question... (e.g. Can I afford a 20,000 phone?)"
            className="flex-1 max-h-32 min-h-[44px] p-2.5 bg-transparent resize-none border-0 focus:ring-0 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none"
            rows={1}
            disabled={loading}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="p-2.5 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        <p className="text-[10px] text-center text-gray-400 dark:text-gray-500 mt-2">
          FinSense Adviser uses summarized figures. This is not professional financial advice.
        </p>
      </div>
    </div>
  );
};
