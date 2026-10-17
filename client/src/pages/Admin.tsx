import { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Users, 
  Cpu, 
  History, 
  Search, 
  ExternalLink, 
  Eye, 
  CheckCircle, 
  AlertTriangle, 
  RotateCw,
  Wallet,
  Receipt,
  Sparkles,
  TrendingUp,
  Clock,
  X,
  Shield,
  Layers,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { fetchApi } from '../lib/api';
import { formatINR } from '../lib/currency';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

interface UserSummary {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  updatedAt: string;
  accountsCount: number;
  transactionsCount: number;
  budgetsCount: number;
  goalsCount: number;
  totalBalance: number;
}

interface OverviewMetrics {
  totalUsers: number;
  totalAccounts: number;
  totalTransactions: number;
  totalBudgets: number;
  totalGoals: number;
  totalPlatformBalance: number;
  totalAiQueries: number;
  totalAiTokens: number;
  averageAiLatencyMs: number;
}

interface AiUsageSummary {
  totalQueries: number;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  averageLatencyMs: number;
  maxLatencyMs: number;
  errorCount: number;
  successRate: number;
  activeKeysCount: number;
}

interface AuditLogItem {
  id: string;
  userId: string | null;
  action: string;
  details: string | null;
  targetUserId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    role: string;
  } | null;
}

export const Admin = () => {
  const { user, setImpersonatedUser } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'ai' | 'audit'>('overview');
  const [loading, setLoading] = useState(true);

  // Overview State
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);

  // Users Directory State
  const [usersList, setUsersList] = useState<UserSummary[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [inspectingUser, setInspectingUser] = useState<any | null>(null);
  const [inspectLoading, setInspectLoading] = useState(false);

  // AI Usage State
  const [aiSummary, setAiSummary] = useState<AiUsageSummary | null>(null);
  const [aiLogs, setAiLogs] = useState<any[]>([]);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [auditActionFilter, setAuditActionFilter] = useState('ALL');

  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      toast.error('Access restricted to administrators');
      navigate('/');
    }
  }, [user, navigate]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'overview') {
        const res = await fetchApi('/api/admin/overview');
        if (res) {
          setMetrics(res.metrics || null);
          setRecentUsers(res.recentUsers || []);
        }
      } else if (activeTab === 'users') {
        const res = await fetchApi(`/api/admin/users${userSearch ? `?search=${encodeURIComponent(userSearch)}` : ''}`);
        if (res && Array.isArray(res.users)) {
          setUsersList(res.users);
        }
      } else if (activeTab === 'ai') {
        const res = await fetchApi('/api/admin/ai-usage');
        if (res) {
          setAiSummary(res.summary || null);
          setAiLogs(res.recentLogs || []);
        }
      } else if (activeTab === 'audit') {
        const url = `/api/admin/audit-logs${auditActionFilter !== 'ALL' ? `?action=${auditActionFilter}` : ''}`;
        const res = await fetchApi(url);
        if (res && Array.isArray(res.logs)) {
          setAuditLogs(res.logs);
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load admin records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab, auditActionFilter]);

  const handleInspectUser = async (targetUserId: string) => {
    try {
      setInspectLoading(true);
      setInspectModalOpen(true);
      const res = await fetchApi(`/api/admin/users/${targetUserId}`);
      if (res && res.user) {
        setInspectingUser(res.user);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to inspect user data');
      setInspectModalOpen(false);
    } finally {
      setInspectLoading(false);
    }
  };

  const handleStartViewAs = (u: any) => {
    setImpersonatedUser({
      id: u.id,
      name: u.name,
      email: u.email,
    });
    setInspectModalOpen(false);
    toast.success(`Entered View-As mode for ${u.name || u.email}`);
    navigate('/');
  };

  if (user?.role !== 'ADMIN') {
    return (
      <div className="p-12 text-center space-y-4 max-w-md mx-auto">
        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Administrator Access Required</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          This portal is reserved for system administrators. Please log in with admin privileges.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-linear-to-r from-emerald-900 via-emerald-800 to-gray-900 text-white shadow-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <span className="p-2 rounded-xl bg-emerald-700/80 text-emerald-200">
              <Shield className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                FinSense Superadmin Console
              </h1>
              <p className="text-xs sm:text-sm text-emerald-200/80 mt-0.5">
                Role-Based Access Control • Financial Inspector • AI Monitoring • Audit Trail
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3 self-start sm:self-auto">
          <span className="text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
            ADMIN: {user.name || user.email}
          </span>
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition cursor-pointer text-white"
            title="Refresh Admin Data"
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-gray-200 dark:border-gray-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition cursor-pointer whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Platform Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition cursor-pointer whitespace-nowrap ${
            activeTab === 'users'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User Directory & Accounts</span>
        </button>

        <button
          onClick={() => setActiveTab('ai')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition cursor-pointer whitespace-nowrap ${
            activeTab === 'ai'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>AI Usage & Monitoring</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition cursor-pointer whitespace-nowrap ${
            activeTab === 'audit'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Audit Trail & Security</span>
        </button>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Total Registered Users</span>
              <p className="text-3xl font-black text-gray-900 dark:text-gray-100 mt-2">{metrics?.totalUsers || 0}</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-semibold">Active FinSense User Base</p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Total System Assets</span>
              <p className="text-3xl font-black text-gray-900 dark:text-gray-100 mt-2">{formatINR(metrics?.totalPlatformBalance || 0)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Net aggregate balance across all users</p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">System Transactions</span>
              <p className="text-3xl font-black text-gray-900 dark:text-gray-100 mt-2">{metrics?.totalTransactions || 0}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">In {metrics?.totalAccounts || 0} connected accounts</p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">AI Invocations</span>
              <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-2">{metrics?.totalAiQueries || 0}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">~{metrics?.totalAiTokens?.toLocaleString('en-IN') || 0} tokens consumed</p>
            </div>
          </div>

          {/* Recent Users preview */}
          <div className="p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-xs">
            <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100 mb-4 flex items-center justify-between">
              <span>Recently Registered Users</span>
              <button 
                onClick={() => setActiveTab('users')}
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                View Full Directory →
              </button>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700 text-gray-400 text-xs uppercase">
                    <th className="pb-3 font-semibold">User</th>
                    <th className="pb-3 font-semibold">Role</th>
                    <th className="pb-3 font-semibold">Accounts</th>
                    <th className="pb-3 font-semibold">Joined Date</th>
                    <th className="pb-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {recentUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-100/70 dark:hover:bg-gray-800/80 transition-colors">
                      <td className="py-3 font-medium text-gray-900 dark:text-gray-100">
                        <div>{u.name || 'Anonymous User'}</div>
                        <div className="text-xs text-gray-400">{u.email}</div>
                      </td>
                      <td className="py-3">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 text-gray-600 dark:text-gray-300">
                        {u._count?.accounts || 0} Accounts
                      </td>
                      <td className="py-3 text-xs text-gray-500">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleInspectUser(u.id)}
                          className="px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition cursor-pointer"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Users Directory */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, or user UUID..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadData()}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400 self-start sm:self-auto">
              Total {usersList.length} user records found
            </span>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-gray-100/70 dark:bg-gray-900/90 text-gray-500 dark:text-gray-400 text-xs uppercase border-b border-gray-200 dark:border-gray-800">
                    <th className="p-4 font-semibold">User Details</th>
                    <th className="p-4 font-semibold">Role</th>
                    <th className="p-4 font-semibold">Net Balance</th>
                    <th className="p-4 font-semibold">Activity</th>
                    <th className="p-4 font-semibold">Registered</th>
                    <th className="p-4 font-semibold text-right">Administrative Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {usersList.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-100/70 dark:hover:bg-gray-800/80 transition-colors">
                      <td className="p-4 font-medium text-gray-900 dark:text-gray-100">
                        <div className="font-bold">{u.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{u.email}</div>
                        <div className="text-[10px] font-mono text-gray-400 truncate max-w-xs">{u.id}</div>
                      </td>
                      <td className="p-4">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                          u.role === 'ADMIN'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-gray-900 dark:text-gray-100">
                        {formatINR(u.totalBalance)}
                      </td>
                      <td className="p-4 text-xs text-gray-600 dark:text-gray-300 space-y-0.5">
                        <div>{u.accountsCount} Accounts</div>
                        <div>{u.transactionsCount} Transactions</div>
                        <div>{u.budgetsCount} Budgets • {u.goalsCount} Goals</div>
                      </td>
                      <td className="p-4 text-xs text-gray-500">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => handleInspectUser(u.id)}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-xs cursor-pointer inline-flex items-center space-x-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect Financials</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: AI Usage & Performance */}
      {activeTab === 'ai' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Total Invocations</span>
              <p className="text-3xl font-black text-gray-900 dark:text-gray-100 mt-2">{aiSummary?.totalQueries || 0}</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-semibold">{aiSummary?.successRate || 100}% Success Rate</p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Total Tokens</span>
              <p className="text-3xl font-black text-gray-900 dark:text-gray-100 mt-2">{aiSummary?.totalTokens?.toLocaleString('en-IN') || 0}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Prompt: {aiSummary?.promptTokens} • Completion: {aiSummary?.completionTokens}</p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Average Latency</span>
              <p className="text-3xl font-black text-blue-600 dark:text-blue-400 mt-2">{aiSummary?.averageLatencyMs || 0} ms</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Max latency: {aiSummary?.maxLatencyMs || 0} ms</p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Gemini Key Pool</span>
              <p className="text-3xl font-black text-purple-600 dark:text-purple-400 mt-2">{aiSummary?.activeKeysCount || 1} Active</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Automatic failover configured</p>
            </div>
          </div>

          {/* AI Logs Table */}
          <div className="p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-xs">
            <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100 mb-4">
              Real-Time AI Query Invocations Log
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700 text-gray-400 text-xs uppercase">
                    <th className="pb-3 font-semibold">Timestamp</th>
                    <th className="pb-3 font-semibold">Endpoint</th>
                    <th className="pb-3 font-semibold">Model</th>
                    <th className="pb-3 font-semibold">Latency</th>
                    <th className="pb-3 font-semibold">Tokens</th>
                    <th className="pb-3 font-semibold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {aiLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-100/70 dark:hover:bg-gray-800/80 transition-colors text-xs">
                      <td className="py-2.5 text-gray-500">{new Date(log.createdAt).toLocaleTimeString()}</td>
                      <td className="py-2.5 font-mono text-gray-700 dark:text-gray-300">{log.endpoint}</td>
                      <td className="py-2.5 text-gray-500">{log.model || 'gemini'}</td>
                      <td className="py-2.5 font-semibold text-gray-800 dark:text-gray-200">{log.latencyMs} ms</td>
                      <td className="py-2.5 text-gray-600 dark:text-gray-400">{log.totalTokens}</td>
                      <td className="py-2.5 text-right">
                        <span className={`px-2 py-0.5 rounded-full font-bold ${
                          log.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-red-100 text-red-800'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Audit Logs */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {['ALL', 'ADMIN_LOGIN', 'INSPECT_USER', 'EXPORT_DATA', 'USER_REGISTER'].map((act) => (
              <button
                key={act}
                onClick={() => setAuditActionFilter(act)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  auditActionFilter === act
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50'
                }`}
              >
                {act.replace('_', ' ')}
              </button>
            ))}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-gray-100/70 dark:bg-gray-900/90 text-gray-500 dark:text-gray-400 text-xs uppercase border-b border-gray-200 dark:border-gray-800">
                    <th className="p-4 font-semibold">Timestamp</th>
                    <th className="p-4 font-semibold">Action</th>
                    <th className="p-4 font-semibold">Actor / User</th>
                    <th className="p-4 font-semibold">Details / Target</th>
                    <th className="p-4 font-semibold text-right">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-100/70 dark:hover:bg-gray-800/80 transition-colors text-xs">
                      <td className="p-4 text-gray-500 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="p-4">
                        <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50">
                          {log.action}
                        </span>
                      </td>
                      <td className="p-4 font-medium text-gray-900 dark:text-gray-100">
                        {log.user ? `${log.user.name || 'User'} (${log.user.email})` : 'System / Anonymous'}
                      </td>
                      <td className="p-4 text-gray-600 dark:text-gray-300 font-mono text-[11px] max-w-sm truncate">
                        {log.details || '—'}
                      </td>
                      <td className="p-4 text-right text-gray-400 font-mono">
                        {log.ipAddress || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* User Financial Inspector Modal */}
      {inspectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            {inspectLoading ? (
              <div className="p-12 text-center text-gray-500">
                <RotateCw className="w-8 h-8 animate-spin mx-auto text-emerald-600 mb-2" />
                <p>Loading user financial snapshot...</p>
              </div>
            ) : inspectingUser ? (
              <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      Administrative User Inspection
                    </span>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100">
                      {inspectingUser.name}
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{inspectingUser.email} • ID: {inspectingUser.id}</p>
                  </div>
                  <button
                    onClick={() => setInspectModalOpen(false)}
                    className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Impersonation action button */}
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <div>
                      <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                        View Application as {inspectingUser.name || inspectingUser.email}
                      </h4>
                      <p className="text-xs text-amber-700 dark:text-amber-400">
                        Switches your interface to view their exact dashboard and records with an exit banner.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleStartViewAs(inspectingUser)}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition cursor-pointer"
                  >
                    Enter View-As Mode →
                  </button>
                </div>

                {/* Net Balance & Accounts */}
                <div>
                  <h3 className="font-bold text-base text-gray-900 dark:text-gray-100 mb-3 flex items-center space-x-2">
                    <Wallet className="w-4 h-4 text-emerald-600" />
                    <span>Linked Accounts ({inspectingUser.accounts?.length || 0}) — Total Balance: {formatINR(inspectingUser.totalBalance)}</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {(inspectingUser.accounts || []).map((acc: any) => (
                      <div key={acc.id} className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                        <p className="text-xs font-bold text-gray-500 uppercase">{acc.name} ({acc.type})</p>
                        <p className="text-lg font-black text-gray-900 dark:text-gray-100 mt-1">{formatINR(Number(acc.balance))}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">{acc.transactions?.length || 0} recorded transactions</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Transactions */}
                <div>
                  <h3 className="font-bold text-base text-gray-900 dark:text-gray-100 mb-3 flex items-center space-x-2">
                    <Receipt className="w-4 h-4 text-blue-600" />
                    <span>Recent Transactions (Audit Inspected)</span>
                  </h3>
                  <div className="border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 border-b border-gray-100 dark:border-gray-700">
                        <tr>
                          <th className="p-2.5">Date</th>
                          <th className="p-2.5">Description</th>
                          <th className="p-2.5">Category</th>
                          <th className="p-2.5 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {(inspectingUser.accounts || []).flatMap((a: any) => a.transactions || []).slice(0, 15).map((t: any) => (
                          <tr key={t.id} className="hover:bg-gray-50/50">
                            <td className="p-2.5 text-gray-500">{new Date(t.date).toLocaleDateString()}</td>
                            <td className="p-2.5 font-medium">{t.description || 'General'}</td>
                            <td className="p-2.5 text-gray-500">{t.category?.name || 'Uncategorized'}</td>
                            <td className={`p-2.5 text-right font-bold ${t.type === 'INCOME' ? 'text-emerald-600' : 'text-gray-900 dark:text-gray-100'}`}>
                              {t.type === 'INCOME' ? '+' : '-'}₹{Number(t.amount).toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Budgets & Goals */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                    <h4 className="font-bold text-xs uppercase text-gray-500 mb-2">Category Budgets</h4>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{inspectingUser.budgets?.length || 0} active budgets set</p>
                  </div>
                  <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                    <h4 className="font-bold text-xs uppercase text-gray-500 mb-2">Savings Goals</h4>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{inspectingUser.goals?.length || 0} financial goals active</p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
