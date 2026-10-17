import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getApiUrl, fetchApi } from '../lib/api';
import { formatINR } from '../lib/currency';
import { 
  User, 
  Mail, 
  Calendar, 
  ShieldCheck, 
  Wallet, 
  PieChart, 
  Target, 
  LogOut, 
  Check, 
  Edit3, 
  X,
  CreditCard,
  Shield
} from 'lucide-react';
import toast from 'react-hot-toast';
import { DataExporter } from '../components/DataExporter';

export const Profile = () => {
  const { user, setUser } = useAuth();
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);

  // Financial summary stats
  const [stats, setStats] = useState({
    accountsCount: 0,
    totalBalance: 0,
    budgetsCount: 0,
    goalsCount: 0,
    loading: true,
  });

  useEffect(() => {
    setNameInput(user?.name || '');
  }, [user]);

  useEffect(() => {
    Promise.all([
      fetchApi('/api/accounts').catch(() => []),
      fetchApi('/api/dashboard').catch(() => ({ totalBalance: 0 })),
      fetchApi('/api/budgets/summary').catch(() => ({ summary: [] })),
      fetchApi('/api/goals').catch(() => []),
    ]).then(([accs, dash, budg, goals]) => {
      setStats({
        accountsCount: Array.isArray(accs) ? accs.length : 0,
        totalBalance: dash?.totalBalance || 0,
        budgetsCount: Array.isArray(budg?.summary) ? budg.summary.length : 0,
        goalsCount: Array.isArray(goals) ? goals.length : 0,
        loading: false,
      });
    });
  }, []);

  const handleSaveName = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!nameInput.trim()) {
      toast.error('Name cannot be empty');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(getApiUrl('/api/auth/me'), {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update name');
      
      setUser({ ...user!, name: data.name });
      setEditingName(false);
      toast.success('Profile updated successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(getApiUrl('/api/auth/logout'), { method: 'POST', credentials: 'include' });
      setUser(null);
      toast.success('Logged out successfully');
    } catch {
      setUser(null);
    }
  };

  const userInitials = (user?.name || user?.email || 'User')
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0].toUpperCase())
    .join('') || 'U';

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : 'Active Member';

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Profile</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          Manage your personal details, account status, and financial overview
        </p>
      </div>

      {/* Main Profile Info Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/60 p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar with gradient & online badge */}
          <div className="relative shrink-0">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-bold text-2xl sm:text-3xl flex items-center justify-center shadow-lg shadow-emerald-500/20 select-none">
              {userInitials}
            </div>
            <div className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white dark:border-gray-800" title="Active Account" />
          </div>

          {/* Details & Edit Name */}
          <div className="flex-1 text-center sm:text-left min-w-0 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              {editingName ? (
                <form onSubmit={handleSaveName} className="flex items-center gap-2 max-w-sm">
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="px-3 py-1.5 text-base font-semibold border dark:border-gray-600 rounded-lg bg-transparent focus:ring-2 focus:ring-emerald-500 outline-none w-full"
                    placeholder="Enter your full name"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={saving}
                    className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition shrink-0 cursor-pointer disabled:opacity-50"
                    title="Save name"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNameInput(user?.name || '');
                      setEditingName(false);
                    }}
                    className="p-2 border dark:border-gray-600 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition shrink-0 cursor-pointer"
                    title="Cancel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">
                    {user?.name || 'FinSense User'}
                  </h2>
                  <button
                    onClick={() => setEditingName(true)}
                    className="p-1 text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded transition cursor-pointer"
                    title="Edit Name"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2 self-center sm:self-auto">
                <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  Verified Account
                </span>
                {user?.role && (
                  <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold ${
                    user.role === 'ADMIN'
                      ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    Role: {user.role}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center space-x-1.5">
                <Mail className="w-4 h-4 text-gray-400" />
                <span className="truncate">{user?.email}</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span>Joined {memberSince}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
          Financial Portfolio Summary
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/60">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">Net Balance</span>
              <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100 truncate">
              {stats.loading ? '...' : formatINR(stats.totalBalance)}
            </p>
          </div>

          <div className="p-5 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/60">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">Bank Accounts</span>
              <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {stats.loading ? '...' : `${stats.accountsCount} Connected`}
            </p>
          </div>

          <div className="p-5 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/60">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">Active Budgets</span>
              <div className="p-2 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
                <PieChart className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {stats.loading ? '...' : `${stats.budgetsCount} Categories`}
            </p>
          </div>

          <div className="p-5 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/60">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">Savings Goals</span>
              <div className="p-2 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg">
                <Target className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {stats.loading ? '...' : `${stats.goalsCount} Active`}
            </p>
          </div>
        </div>
      </div>

      {/* Account Details & Security Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/60 divide-y dark:divide-gray-700/60 overflow-hidden">
        <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">Account ID</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">{user?.id}</p>
          </div>
          <span className="text-xs text-gray-400 self-start sm:self-auto">Primary System UUID</span>
        </div>

        <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">Session Security</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Protected with encrypted HTTP-only JWT tokens</p>
          </div>
          <div className="flex items-center space-x-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            <ShieldCheck className="w-4 h-4" />
            <span>Secure & Active</span>
          </div>
        </div>

        <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">Export Financial Records</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Download your transactions, balances, and reports for reference or a second opinion</p>
          </div>
          <DataExporter />
        </div>

        <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">Session Management</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">End your current session across this device</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center space-x-2 px-4 py-2 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg text-sm font-medium transition cursor-pointer self-start sm:self-auto"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
