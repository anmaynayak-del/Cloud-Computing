import { useState, useEffect } from 'react';
import { 
  CalendarClock, 
  RotateCw, 
  AlertCircle, 
  CheckCircle2, 
  Search, 
  Tv, 
  Wifi, 
  Home, 
  Dumbbell, 
  Sparkles,
  TrendingUp,
  CreditCard,
  Calendar,
  ExternalLink
} from 'lucide-react';
import { fetchApi } from '../lib/api';
import { formatINR } from '../lib/currency';
import toast from 'react-hot-toast';

interface SubscriptionItem {
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

interface SubscriptionMetrics {
  totalMonthlyCommitment: number;
  activeCount: number;
  dueSoonCount: number;
  yearlyProjected: number;
  nextUpcoming: SubscriptionItem | null;
}

export const Subscriptions = () => {
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [metrics, setMetrics] = useState<SubscriptionMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      const res = await fetchApi('/api/subscriptions');
      if (res && Array.isArray(res.subscriptions)) {
        setSubscriptions(res.subscriptions);
        setMetrics(res.metrics || null);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to detect subscriptions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const getCategoryIcon = (category: string) => {
    const c = category.toLowerCase();
    if (c.includes('entertain') || c.includes('stream') || c.includes('media')) return Tv;
    if (c.includes('utilit') || c.includes('wifi') || c.includes('broadband')) return Wifi;
    if (c.includes('rent') || c.includes('house') || c.includes('housing')) return Home;
    if (c.includes('health') || c.includes('fitness') || c.includes('gym')) return Dumbbell;
    return CreditCard;
  };

  const filteredSubs = subscriptions.filter(sub => {
    const matchesSearch = sub.name.toLowerCase().includes(search.toLowerCase()) ||
                          sub.category.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || sub.category.toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  const uniqueCategories = Array.from(new Set(subscriptions.map(s => s.category)));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
              Subscriptions & Recurring Bills
            </h1>
            <span className="p-1 px-2.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
              AI Detected
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Automatically identified repeating commitments, renewals, and projected payment dates
          </p>
        </div>

        <button
          onClick={loadSubscriptions}
          disabled={loading}
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-xs transition cursor-pointer self-start sm:self-auto"
        >
          <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Rescan Bills</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Monthly Recurring Commitments</span>
            <CreditCard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-gray-900 dark:text-gray-100">
            {metrics ? formatINR(metrics.totalMonthlyCommitment) : '—'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Total committed across all active subscriptions
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Active Services</span>
            <CalendarClock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-2xl font-black text-gray-900 dark:text-gray-100">
            {metrics ? metrics.activeCount : '0'} Services
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {metrics && metrics.dueSoonCount > 0 
              ? `${metrics.dueSoonCount} renewal(s) due within 5 days` 
              : 'All bills on regular schedule'}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Next Upcoming Bill</span>
            <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">
            {metrics?.nextUpcoming ? metrics.nextUpcoming.name : 'None Scheduled'}
          </p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
            {metrics?.nextUpcoming 
              ? `${formatINR(metrics.nextUpcoming.amount)} • in ${Math.max(0, metrics.nextUpcoming.daysRemaining)} days` 
              : 'No upcoming renewals found'}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Projected Annual Spend</span>
            <TrendingUp className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="text-2xl font-black text-gray-900 dark:text-gray-100">
            {metrics ? formatINR(metrics.yearlyProjected) : '—'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Based on current monthly subscription volume
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search subscriptions, streaming, internet, gym..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
              selectedCategory === 'ALL'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            All Categories ({subscriptions.length})
          </button>
          {uniqueCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Subscriptions Grid */}
      {loading ? (
        <div className="p-12 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
          <RotateCw className="w-8 h-8 mx-auto animate-spin text-emerald-600 mb-3" />
          <p className="font-semibold text-base">Analyzing transaction history for recurring bills...</p>
        </div>
      ) : filteredSubs.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {subscriptions.length === 0 ? 'No Recurring Subscriptions Detected' : 'No Subscriptions Matching Filter'}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            {subscriptions.length === 0
              ? 'As you record monthly recurring payments for streaming, rent, gym, or broadband, FinSense will automatically recognize and project your renewals here.'
              : 'Try clearing your search query or choosing another category filter above.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSubs.map((sub) => {
            const IconComponent = getCategoryIcon(sub.category);
            const isDueSoon = sub.daysRemaining <= 5 && sub.daysRemaining >= 0;
            const isOverdue = sub.daysRemaining < 0;

            return (
              <div
                key={sub.id}
                className="p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-xs hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-base text-gray-900 dark:text-gray-100">
                          {sub.name}
                        </h4>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {sub.category} • {sub.frequency}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        isOverdue
                          ? 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400'
                          : isDueSoon
                          ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                          : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                      }`}
                    >
                      {isOverdue ? 'Overdue' : isDueSoon ? `Due in ${sub.daysRemaining}d` : `In ${sub.daysRemaining} days`}
                    </span>
                  </div>

                  <div className="my-4">
                    <div className="flex items-baseline space-x-1">
                      <span className="text-2xl font-black text-gray-900 dark:text-gray-100">
                        {formatINR(sub.amount)}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                        / {sub.frequency.toLowerCase()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Debited from: <span className="font-semibold text-gray-700 dark:text-gray-300">{sub.accountName}</span>
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>Last: {new Date(sub.lastBilled).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                  <span>Total paid: {formatINR(sub.totalPaidYear)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Smart Advice Banner */}
      <div className="p-5 rounded-2xl bg-linear-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 flex items-start space-x-3.5">
        <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100">
            Subscription Audit Tip
          </h4>
          <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
            Over 30% of recurring digital subscriptions go underutilized. Check your streaming and software services periodically to cancel unused memberships and instantly boost your monthly savings rate.
          </p>
        </div>
      </div>
    </div>
  );
};
