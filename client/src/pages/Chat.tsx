import { useState, useRef, useEffect } from 'react';
import { fetchApi } from '../lib/api';
import { Send, Bot, User, Sparkles, AlertCircle, RefreshCw, HelpCircle, Mic, MicOff, Languages } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
}

const INITIAL_QUESTIONS_EN = [
  '💡 Recommend a monthly budget for me',
  '📊 How should I allocate my 50/30/20 budget?',
  '📱 Can I afford a ₹20,000 phone?',
  '📉 How can I cut expenses by 15% this month?',
  '🎯 Am I on track with my savings goals?',
];

const INITIAL_QUESTIONS_HI = [
  '💡 Mere liye ek monthly budget recommend karein',
  '📊 50/30/20 budget guideline kaise follow karun?',
  '📱 Kya main ₹20,000 ka phone afford kar sakta hoon?',
  '📉 Is mahine 15% kharcha kaise kam karun?',
  '🎯 Kya mere savings goals sahi track par hain?',
];

const cleanText = (text: string) => {
  if (!text) return '';
  return text.replace(/\*\*/g, '').replace(/\*/g, '');
};

const isHindiQuestion = (text: string): boolean => {
  if (!text) return false;
  if (/[\u0900-\u097F]/.test(text)) return true;
  const hindiWords = /\b(kya|kyu|kyun|kaise|kitna|kitni|kitne|mera|meri|mere|mujhe|humko|aap|aapka|aapki|aapke|batao|bataiye|chahiye|kharcha|kharch|bachat|paise|paisa|khareed|khareedu|kharidna|le|sakta|sakti|sakte|hoon|hai|hain|tha|thi|the|nahi|nhi|matlab|rupaye|kamai|tankha|vetan|bachega|kam|jyada|zyada|karu|karun|karein|leni|lena|bata|batao|karna|hoga|hogi|hoge|bachana|bachao)\b/i;
  return hindiWords.test(text);
};

const generateContextualFollowUps = (question: string, isHindiMode: boolean = false): string[] => {
  const isHi = isHindiMode || isHindiQuestion(question);
  const lower = question.toLowerCase();

  if (isHi) {
    if (lower.includes('budget') || lower.includes('50/30/20') || lower.includes('allocate') || lower.includes('kharch')) {
      return [
        'Zaroori kharcho (Needs) mein se kaise bachat badhaun?',
        'Discretionary spending track karne ka tareeka kya hai?',
        'Emergency fund aur investments mein paise kaise divide karun?',
      ];
    }
    if (lower.includes('cut') || lower.includes('kam') || lower.includes('bachat') || lower.includes('save') || lower.includes('paisa')) {
      return [
        'Konsi category mein kharcha sabse pehle kam karun?',
        'Kya aap mere liye daily spending limit suggest kar sakte hain?',
        'In bachat se mera monthly buffer kitna badhega?',
      ];
    }
    if (lower.includes('afford') || lower.includes('buy') || lower.includes('kharid') || lower.includes('le') || lower.includes('phone') || lower.includes('laptop')) {
      return [
        'Kya main is kharche ko 3 mahine ki EMI mein baant sakta hoon?',
        'Ise bina debt ke khareedne ke liye kitne mahine lag sakte hain?',
        'Kya is purchase se mere savings goals par koi asar padega?',
      ];
    }
    if (lower.includes('goal') || lower.includes('target') || lower.includes('invest') || lower.includes('lakshya')) {
      return [
        'Apne savings goals ko jaldi reach karne ke liye kya karun?',
        'Pehle debt clear karun ya investment shuru karun?',
        'Monthly income ka kitna percent invest karna sahi hoga?',
      ];
    }
    return [
      'Isse mere overall monthly cash flow par kya asar padega?',
      'Is hafte finances improve karne ke liye kya step lu?',
      'Kya aap category-wise detailed breakdown de sakte hain?',
    ];
  }

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
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>(INITIAL_QUESTIONS_EN);
  const [hasAskedQuestion, setHasAskedQuestion] = useState(false);
  const [speechLanguage, setSpeechLanguage] = useState<'en-IN' | 'hi-IN'>('en-IN');
  const [isListening, setIsListening] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const inputBaseRef = useRef<string>('');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Clean up speech recognition on component unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (_) {}
      }
    };
  }, []);

  const handleLanguageToggle = () => {
    const nextLang = speechLanguage === 'en-IN' ? 'hi-IN' : 'en-IN';
    setSpeechLanguage(nextLang);
    if (!hasAskedQuestion) {
      setSuggestedQuestions(nextLang === 'hi-IN' ? INITIAL_QUESTIONS_HI : INITIAL_QUESTIONS_EN);
    }
    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (_) {}
      setIsListening(false);
      setVoiceNotice(null);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_) {}
      }
      setIsListening(false);
      setVoiceNotice(null);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError(
        'Voice-to-text is not supported by your current browser. Please try Google Chrome, Microsoft Edge, or Safari.'
      );
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = speechLanguage;
      recognition.maxAlternatives = 1;

      inputBaseRef.current = input ? input.trim() + ' ' : '';

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
        setVoiceNotice(
          speechLanguage === 'hi-IN'
            ? '🎙️ Listening in Hindi... Speak into your mic (Aap Hindi mein bol sakte hain)'
            : '🎙️ Listening in English... Speak into your microphone'
        );
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          setInput(inputBaseRef.current + transcript);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        setVoiceNotice(null);
        if (event.error === 'not-allowed') {
          setError(
            'Microphone access was denied. Please allow microphone permissions in your browser address bar.'
          );
        } else if (event.error !== 'no-speech') {
          setError(`Voice input note: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        setVoiceNotice(null);
      };

      recognition.start();
    } catch (err: any) {
      console.error('Failed to start speech recognition:', err);
      setIsListening(false);
      setVoiceNotice(null);
      setError('Could not access microphone. Please check your browser audio settings.');
    }
  };

  const handleSend = async (questionText?: string) => {
    const q = (questionText || input).trim();
    if (!q || loading) return;

    // Stop listening if user hits send while active
    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (_) {}
      setIsListening(false);
      setVoiceNotice(null);
    }

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

    const isHi = isHindiQuestion(q) || speechLanguage === 'hi-IN';
    const langParam = isHi ? 'hi' : 'en';

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
          language: langParam,
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
          setSuggestedQuestions(generateContextualFollowUps(q, isHi));
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
        {/* Active Voice Listening Banner */}
        {voiceNotice && (
          <div className="mb-2 px-3.5 py-2 bg-gradient-to-r from-red-500/10 via-amber-500/10 to-red-500/10 border border-red-300 dark:border-red-800 rounded-xl flex items-center justify-between text-xs text-red-600 dark:text-red-400 animate-pulse">
            <div className="flex items-center space-x-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
              </span>
              <span className="font-medium">{voiceNotice}</span>
            </div>
            <button
              type="button"
              onClick={toggleListening}
              className="px-2 py-0.5 rounded-md bg-red-600 hover:bg-red-700 text-white font-semibold text-[11px] cursor-pointer shadow-sm transition"
            >
              Stop
            </button>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-end space-x-1.5 sm:space-x-2 bg-white dark:bg-gray-800 p-2 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition"
        >
          {/* Language Selector Toggle */}
          <button
            type="button"
            onClick={handleLanguageToggle}
            title={
              speechLanguage === 'hi-IN'
                ? 'Voice & Chat Language: Hindi (Output will be in Hinglish with English letters). Click to switch to English.'
                : 'Voice & Chat Language: English. Click to switch to Hindi.'
            }
            className={`p-2 sm:px-2.5 sm:py-2 rounded-xl text-xs font-semibold flex items-center space-x-1 border transition flex-shrink-0 cursor-pointer ${
              speechLanguage === 'hi-IN'
                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/40'
                : 'bg-gray-50 dark:bg-gray-700/60 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Languages className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span className="text-[11px] font-bold">
              {speechLanguage === 'hi-IN' ? '🇮🇳 Hindi' : '🇬🇧 EN'}
            </span>
          </button>

          {/* Voice-to-Text Button */}
          <button
            type="button"
            onClick={toggleListening}
            disabled={loading}
            title={
              isListening
                ? 'Stop recording'
                : `Click to speak in ${speechLanguage === 'hi-IN' ? 'Hindi (Output in Hinglish)' : 'English'}`
            }
            className={`p-2.5 rounded-xl border transition shadow-sm flex-shrink-0 cursor-pointer ${
              isListening
                ? 'bg-red-600 border-red-600 text-white animate-pulse ring-2 ring-red-400'
                : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/60 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400'
            }`}
          >
            {isListening ? (
              <MicOff className="w-4 h-4 animate-bounce" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </button>

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              speechLanguage === 'hi-IN'
                ? 'Poochiye apna financial sawal... (e.g. Kya main ₹20,000 ka phone le sakta hoon?)'
                : 'Ask your financial question... (e.g. Can I afford a 20,000 phone?)'
            }
            className="flex-1 max-h-32 min-h-[44px] p-2 sm:p-2.5 bg-transparent resize-none border-0 focus:ring-0 text-xs sm:text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none"
            rows={1}
            disabled={loading}
          />

          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="p-2.5 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition flex-shrink-0 cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        <div className="flex flex-col sm:flex-row items-center justify-between text-[10px] text-gray-400 dark:text-gray-500 mt-2 px-1 gap-1">
          <span className="flex items-center space-x-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>
              {speechLanguage === 'hi-IN'
                ? 'Hindi voice active → Output will be in Hinglish (English alphabet)'
                : 'English voice active → Output in English'}
            </span>
          </span>
          <span>FinSense Adviser uses summarized figures. Not professional financial advice.</span>
        </div>
      </div>
    </div>
  );
};
