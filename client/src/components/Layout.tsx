import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { 
  LayoutDashboard, 
  Receipt, 
  PieChart, 
  Target, 
  LogOut, 
  Menu, 
  MessageSquare, 
  Bell, 
  AlertTriangle, 
  AlertOctagon, 
  CheckCircle, 
  X,
  ChevronsLeft,
  Wallet
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { fetchApi, getApiUrl } from '../lib/api';
import { formatINR } from '../lib/currency';

interface AlertItem {
  id: string;
  category: string;
  budgeted: number;
  spent: number;
  percent: number;
  type: 'WARNING' | 'OVER_BUDGET';
  severity: 'warning' | 'danger';
  message: string;
}

export const Layout = () => {
  const { user, setUser } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Alerts State
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [alertsCount, setAlertsCount] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadAlerts = async () => {
    try {
      const res = await fetchApi('/api/alerts');
      if (res && Array.isArray(res.alerts)) {
        setAlerts(res.alerts);
        setAlertsCount(res.count || res.alerts.length);
      }
    } catch {
      // Silently fail if alerts service is loading
    }
  };

  useEffect(() => {
    loadAlerts();
    const interval = setInterval(loadAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  const handleLogout = async () => {
    await fetch(getApiUrl('/api/auth/logout'), { method: 'POST', credentials: 'include' });
    setUser(null);
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Accounts', path: '/accounts', icon: Wallet },
    { name: 'Transactions', path: '/transactions', icon: Receipt },
    { name: 'Budgets', path: '/budgets', icon: PieChart },
    { name: 'Goals', path: '/goals', icon: Target },
    { name: 'AI Adviser', path: '/chat', icon: MessageSquare },
  ];

  // User Initials Badge (like 'PA' in CardioNexus)
  const userInitials = (user?.name || user?.email || 'User')
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0].toUpperCase())
    .join('') || 'U';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col">
      {/* Top Header Bar (spans full width) */}
      <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between px-6 sticky top-0 z-30 shadow-xs">
        <div className="flex items-center space-x-3.5">
          {/* 3 lines button (visible when sidebar is closed) */}
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 rounded-lg text-emerald-800 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition cursor-pointer"
              title="Open Dashboard Sidebar"
              aria-label="Open Dashboard Sidebar"
            >
              <Menu className="w-6 h-6" />
            </button>
          )}

          {/* Brand Logo */}
          <Link to="/" className="flex items-center space-x-2 group">
            <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              <Wallet className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold text-emerald-900 dark:text-emerald-300 tracking-tight">
              FinSense
            </span>
          </Link>
        </div>

        {/* Right Header: Alerts Bell & User Avatar Badge */}
        <div className="flex items-center space-x-4">
          {/* Overspending Alerts Bell */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="relative p-2 text-gray-500 dark:text-gray-400 hover:text-emerald-700 dark:hover:text-emerald-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              title="Overspending Alerts"
              aria-label="Overspending Alerts"
            >
              <Bell className="w-5 h-5" />
              {alertsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center border-2 border-white dark:border-gray-900 animate-pulse">
                  {alertsCount}
                </span>
              )}
            </button>

            {/* Alerts Dropdown */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b dark:border-gray-700 flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <Bell className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                      Budget Alerts ({alertsCount})
                    </h4>
                  </div>
                  <button 
                    onClick={() => setDropdownOpen(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y dark:divide-gray-700">
                  {alerts.length === 0 ? (
                    <div className="p-6 text-center space-y-2">
                      <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto" />
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">All Budgets on Track</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">No categories have exceeded 80% of their limit.</p>
                    </div>
                  ) : (
                    alerts.map((alert) => (
                      <div 
                        key={alert.id}
                        className={`p-3.5 flex items-start space-x-3 transition hover:bg-gray-50 dark:hover:bg-gray-700/30 ${
                          alert.type === 'OVER_BUDGET' ? 'bg-red-50/40 dark:bg-red-900/10' : 'bg-amber-50/40 dark:bg-amber-900/10'
                        }`}
                      >
                        <div className="mt-0.5 flex-shrink-0">
                          {alert.type === 'OVER_BUDGET' ? (
                            <div className="p-1.5 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 rounded-lg">
                              <AlertOctagon className="w-4 h-4" />
                            </div>
                          ) : (
                            <div className="p-1.5 bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 rounded-lg">
                              <AlertTriangle className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                              {alert.category}
                            </p>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              alert.type === 'OVER_BUDGET' 
                                ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' 
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                            }`}>
                              {alert.percent}%
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                            Spent {formatINR(alert.spent)} of {formatINR(alert.budgeted)}
                          </p>
                          <p className="text-[11px] font-medium mt-1 text-gray-500 dark:text-gray-400">
                            {alert.type === 'OVER_BUDGET' ? 'Over budget by ' + formatINR(alert.spent - alert.budgeted) : 'Approaching monthly budget threshold'}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-2.5 bg-gray-50 dark:bg-gray-700/50 border-t dark:border-gray-700 text-center">
                  <Link
                    to="/budgets"
                    onClick={() => setDropdownOpen(false)}
                    className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline inline-block"
                  >
                    Manage Category Budgets →
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* User Initials Avatar Badge (like 'PA' in CardioNexus) */}
          <div 
            className="w-8 h-8 rounded-full bg-emerald-800 text-white font-semibold text-xs flex items-center justify-center shadow-xs cursor-pointer select-none"
            title={`${user?.name || user?.email} (Click to Logout)`}
            onClick={handleLogout}
          >
            {userInitials}
          </div>
        </div>
      </header>

      {/* Main Body Container: Sidebar + Content */}
      <div className="flex flex-1 relative min-h-[calc(100vh-4rem)]">
        {/* Sidebar (when open) */}
        {sidebarOpen && (
          <aside className="w-72 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 flex flex-col justify-between p-4 flex-shrink-0 animate-in slide-in-from-left duration-200 z-20">
            <div>
              {/* Workspace Header Row with << collapse icon */}
              <div className="flex items-center justify-between px-3 py-2 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  FINSENSE WORKSPACE
                </span>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-1 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
                  title="Collapse sidebar"
                  aria-label="Collapse sidebar"
                >
                  <ChevronsLeft className="w-5 h-5" />
                </button>
              </div>

              {/* Pill-shaped Navigation Items */}
              <nav className="space-y-1.5">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => {
                        if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                          setSidebarOpen(false);
                        }
                      }}
                      className={`flex items-center space-x-3.5 px-4 py-3 rounded-full text-base font-semibold transition-all ${
                        isActive
                          ? 'bg-emerald-100/75 text-emerald-900 dark:bg-emerald-950/70 dark:text-emerald-300 shadow-xs'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100/70 dark:hover:bg-gray-800/60 hover:text-gray-900 dark:hover:text-gray-100'
                      }`}
                    >
                      <Icon className="w-6 h-6 flex-shrink-0" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Bottom of Sidebar: Sign Out and Version */}
            <div className="pt-4 border-t border-gray-100 dark:border-gray-800 space-y-2">
              <button
                onClick={handleLogout}
                className="w-full flex items-center space-x-3.5 px-4 py-2.5 rounded-full text-base font-semibold text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition cursor-pointer"
              >
                <LogOut className="w-6 h-6 flex-shrink-0" />
                <span>Sign Out</span>
              </button>
              <p className="text-xs text-center text-gray-400 dark:text-gray-500 font-mono">
                FinSense v1.0.0
              </p>
            </div>
          </aside>
        )}

        {/* Mobile backdrop */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-xs z-10 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content Area */}
        <main className="flex-1 p-6 lg:p-10 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
