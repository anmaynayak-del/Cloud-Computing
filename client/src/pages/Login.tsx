import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getApiUrl } from '../lib/api';
import { 
  Wallet, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Sparkles, 
  TrendingUp, 
  ShieldCheck, 
  AlertCircle 
} from 'lucide-react';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuth();
  const navigate = useNavigate();

  const handleDemoFill = () => {
    setEmail('name');
    setPassword('demo123');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const res = await fetch(getApiUrl('/api/auth/login'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid email or password');
      
      setUser(data);
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-slate-950 text-slate-100 overflow-hidden px-4 py-12 selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* Background Gradient Mesh & Glow Orbs */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/20 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-500/25 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-80 h-80 bg-teal-500/10 rounded-full blur-[100px] pointer-events-none" />
      
      {/* Subtle Financial Grid Texture */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: '36px 36px',
        }}
      />

      {/* Floating Finance Graphics (Desktop) */}
      <div className="hidden lg:block absolute top-20 left-16 animate-pulse">
        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-slate-900/40 backdrop-blur-md border border-white/10 shadow-xl shadow-black/40">
          <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Smart Portfolio</p>
            <p className="text-sm font-semibold text-emerald-400">+18.4% Return</p>
          </div>
        </div>
      </div>

      <div className="hidden lg:block absolute bottom-24 left-24">
        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-slate-900/40 backdrop-blur-md border border-white/10 shadow-xl shadow-black/40">
          <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Data Protection</p>
            <p className="text-sm font-semibold text-slate-200">256-bit Encrypted</p>
          </div>
        </div>
      </div>

      <div className="hidden lg:block absolute top-32 right-20">
        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-slate-900/40 backdrop-blur-md border border-white/10 shadow-xl shadow-black/40">
          <div className="p-1.5 rounded-lg bg-teal-500/20 text-teal-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">AI Financial Adviser</p>
            <p className="text-sm font-semibold text-teal-300">50/30/20 Budgeting</p>
          </div>
        </div>
      </div>

      {/* Centered Glassmorphism Card */}
      <div className="relative z-10 w-full max-w-md p-6 sm:p-8 md:p-10 rounded-2xl sm:rounded-3xl bg-slate-900/70 backdrop-blur-2xl border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
        
        {/* Brand Header */}
        <div className="text-center space-y-2 mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/25 mb-1">
            <Wallet className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Fin<span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">Sense</span>
          </h1>
          <p className="text-sm text-slate-400">
            AI-powered personal finance & spending advisor
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 flex items-start gap-3 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm animate-in fade-in">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Username or Email Field */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Username or Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="name or name@example.com"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-800/60 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all duration-150"
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Password
              </label>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full pl-10 pr-11 py-3 rounded-xl bg-slate-800/60 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all duration-150"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 focus:outline-none"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Quick Demo Fill Button */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleDemoFill}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300 hover:underline transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Use Demo Credentials (name / demo123)
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-xl font-semibold text-sm text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 active:scale-[0.99] transition-all duration-150 shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Sign In to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Card Footer */}
        <div className="mt-8 pt-6 border-t border-slate-800 text-center">
          <p className="text-sm text-slate-400">
            Don't have an account?{' '}
            <Link 
              to="/register" 
              className="font-medium text-emerald-400 hover:text-emerald-300 hover:underline transition-colors"
            >
              Create Account
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
};
