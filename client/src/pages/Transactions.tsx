import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchApi } from '../lib/api';
import { formatSignedINR, formatINR } from '../lib/currency';
import { Modal } from '../components/ui/Modal';
import { TableRowSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import toast from 'react-hot-toast';
import { Sparkles, ArrowUpDown } from 'lucide-react';
import { DataExporter } from '../components/DataExporter';

export const Transactions = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [meta, setMeta] = useState({ totalPages: 1, page: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  
  // Dependencies for form & filters
  const [accounts, setAccounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  // Filters State
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterAccount, setFilterAccount] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Transaction Add/Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [type, setType] = useState('EXPENSE');
  const [suggestLoading, setSuggestLoading] = useState(false);

  const handleSuggestCategory = async () => {
    if (!description.trim()) {
      toast.error('Please enter a description first to suggest a category');
      return;
    }
    setSuggestLoading(true);
    try {
      const res = await fetchApi('/api/ai/categorize', {
        method: 'POST',
        body: JSON.stringify({
          description: description.trim(),
          amount: parseFloat(amount) || 0,
          type,
        }),
      });

      if (res.categoryId) {
        setCategoryId(res.categoryId);
        toast.success(`Suggested category: ${res.category}`);
      } else {
        toast.error('Could not find a matching category');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to suggest category');
    } finally {
      setSuggestLoading(false);
    }
  };

  const loadDependencies = async () => {
    try {
      const [accRes, catRes] = await Promise.all([
        fetchApi('/api/accounts'),
        fetchApi('/api/categories')
      ]);
      setAccounts(accRes);
      setCategories(catRes);
    } catch (e) {
      console.error(e);
    }
  };

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({ page: page.toString(), limit: '10' });
      if (search) query.append('search', search);
      if (filterType) query.append('type', filterType);
      if (filterAccount) query.append('accountId', filterAccount);
      if (filterCategory) query.append('categoryId', filterCategory);
      if (startDate) query.append('startDate', startDate);
      if (endDate) query.append('endDate', endDate);

      const txnRes = await fetchApi(`/api/transactions?${query.toString()}`);
      setTransactions(txnRes.data);
      setMeta({ totalPages: txnRes.meta.totalPages, page: txnRes.meta.page, total: txnRes.meta.total });
    } catch (e: any) {
      toast.error(e.message || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [page, search, filterType, filterAccount, filterCategory, startDate, endDate]);

  useEffect(() => {
    loadDependencies();
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const openAddModal = () => {
    setEditingId(null);
    setAmount('');
    setDescription('');
    setDate(new Date().toISOString().split('T')[0]);
    if (accounts.length > 0) setAccountId(accounts[0].id);
    if (categories.length > 0) setCategoryId(categories[0].id);
    setIsModalOpen(true);
  };

  const openEditModal = (t: any) => {
    setEditingId(t.id);
    setAccountId(t.accountId);
    setCategoryId(t.categoryId);
    setAmount(t.amount);
    setDate(t.date.split('T')[0]);
    setDescription(t.description || '');
    setType(t.type);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { accountId, categoryId, amount: parseFloat(amount), date, description, type };
      if (editingId) {
        await fetchApi(`/api/transactions/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) });
        toast.success('Transaction updated successfully');
      } else {
        await fetchApi('/api/transactions', { method: 'POST', body: JSON.stringify(payload) });
        toast.success('Transaction added successfully');
      }
      setIsModalOpen(false);
      loadTransactions();
    } catch (e: any) {
      toast.error(e.message || 'Failed to save transaction');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return;
    try {
      await fetchApi(`/api/transactions/${id}`, { method: 'DELETE' });
      toast.success('Transaction deleted successfully');
      loadTransactions();
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete transaction');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Transactions</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Manage and track your account activity</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 sm:space-x-3">
          <DataExporter />
          <button
            onClick={openAddModal}
            className="flex-1 sm:flex-initial px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition shadow-sm cursor-pointer"
          >
            Add Transaction
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/60 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <input
          type="text"
          placeholder="Search descriptions..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border dark:border-gray-600 rounded-lg bg-transparent focus:ring-2 focus:ring-blue-500 outline-none w-full"
        />
        <select
          value={filterType}
          onChange={e => { setFilterType(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border dark:border-gray-600 rounded-lg bg-transparent w-full"
        >
          <option value="">All Types</option>
          <option value="EXPENSE">Expense</option>
          <option value="INCOME">Income</option>
        </select>
        <select
          value={filterAccount}
          onChange={e => { setFilterAccount(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border dark:border-gray-600 rounded-lg bg-transparent w-full"
        >
          <option value="">All Accounts</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select
          value={filterCategory}
          onChange={e => { setFilterCategory(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border dark:border-gray-600 rounded-lg bg-transparent w-full"
        >
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input
          type="date"
          value={startDate}
          onChange={e => { setStartDate(e.target.value); setPage(1); }}
          title="Start Date"
          className="px-3 py-2 text-sm border dark:border-gray-600 rounded-lg bg-transparent w-full"
        />
        <input
          type="date"
          value={endDate}
          onChange={e => { setEndDate(e.target.value); setPage(1); }}
          title="End Date"
          className="px-3 py-2 text-sm border dark:border-gray-600 rounded-lg bg-transparent w-full"
        />
      </div>

      {/* Transactions Table & Empty/Loading States */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/60 overflow-hidden">
        {loading ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 border-b dark:border-gray-700">
                  <th className="p-4 font-medium text-xs text-gray-500 uppercase">Date</th>
                  <th className="p-4 font-medium text-xs text-gray-500 uppercase">Description</th>
                  <th className="p-4 font-medium text-xs text-gray-500 uppercase">Account</th>
                  <th className="p-4 font-medium text-xs text-gray-500 uppercase">Category</th>
                  <th className="p-4 font-medium text-xs text-gray-500 uppercase">Amount</th>
                  <th className="p-4 font-medium text-xs text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                <TableRowSkeleton columns={6} />
                <TableRowSkeleton columns={6} />
                <TableRowSkeleton columns={6} />
                <TableRowSkeleton columns={6} />
                <TableRowSkeleton columns={6} />
              </tbody>
            </table>
          </div>
        ) : transactions.length === 0 ? (
          <EmptyState
            icon={ArrowUpDown}
            title="No transactions found"
            description="No transactions match your filters. Add a new transaction or import a statement CSV to get started."
            actionText="Add Transaction"
            onAction={openAddModal}
            className="border-0 shadow-none rounded-none py-14"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 border-b dark:border-gray-700">
                  <th className="p-4 font-semibold text-xs text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="p-4 font-semibold text-xs text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="p-4 font-semibold text-xs text-gray-500 uppercase tracking-wider">Account</th>
                  <th className="p-4 font-semibold text-xs text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="p-4 font-semibold text-xs text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="p-4 font-semibold text-xs text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-700">
                {transactions.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                    <td className="p-4 text-sm whitespace-nowrap text-gray-600 dark:text-gray-300">
                      {new Date(t.date).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                      {t.description || '-'}
                    </td>
                    <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                      {t.account?.name || '-'}
                    </td>
                    <td className="p-4 text-sm">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                        {t.category?.name || '-'}
                      </span>
                    </td>
                    <td className={`p-4 text-sm font-semibold whitespace-nowrap ${t.type === 'INCOME' ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-gray-100'}`}>
                      {formatSignedINR(t.amount, t.type)}
                    </td>
                    <td className="p-4 text-sm space-x-3 whitespace-nowrap font-medium">
                      <button onClick={() => openEditModal(t)} className="text-blue-600 dark:text-blue-400 hover:underline">Edit</button>
                      <button onClick={() => handleDelete(t.id)} className="text-red-500 hover:underline">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Pagination Controls */}
      {meta.totalPages > 1 && (
        <div className="flex justify-center items-center space-x-4 pt-2">
          <button
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            className="px-4 py-1.5 text-sm bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            Previous
          </button>
          <span className="text-xs text-gray-500 font-medium">Page {page} of {meta.totalPages} ({meta.total} total)</span>
          <button
            disabled={page === meta.totalPages}
            onClick={() => setPage(p => p + 1)}
            className="px-4 py-1.5 text-sm bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            Next
          </button>
        </div>
      )}

      {/* Add / Edit Transaction Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Edit Transaction" : "Add Transaction"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">Type</label>
              <select value={type} onChange={e => setType(e.target.value)} className="w-full px-3 py-2 text-sm border dark:border-gray-600 rounded-lg bg-transparent">
                <option value="EXPENSE">Expense</option>
                <option value="INCOME">Income</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">Date</label>
              <input type="date" required value={date} onChange={e => setDate(e.target.value)} className="w-full px-3 py-2 text-sm border dark:border-gray-600 rounded-lg bg-transparent" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">Account</label>
              <select value={accountId} onChange={e => setAccountId(e.target.value)} required className="w-full px-3 py-2 text-sm border dark:border-gray-600 rounded-lg bg-transparent">
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Category</label>
                <button
                  type="button"
                  onClick={handleSuggestCategory}
                  disabled={suggestLoading}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center space-x-1 font-medium disabled:opacity-50"
                  title="Auto-suggest category using AI"
                >
                  <Sparkles className={`w-3 h-3 ${suggestLoading ? 'animate-spin' : ''}`} />
                  <span>{suggestLoading ? 'Suggesting...' : 'Suggest'}</span>
                </button>
              </div>
              <select value={categoryId} onChange={e => setCategoryId(e.target.value)} required className="w-full px-3 py-2 text-sm border dark:border-gray-600 rounded-lg bg-transparent">
                {categories.filter(c => c.type === type).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">Amount (₹)</label>
            <input type="number" step="0.01" min="0.01" required value={amount} onChange={e => setAmount(e.target.value)} className="w-full px-3 py-2 text-sm border dark:border-gray-600 rounded-lg bg-transparent font-medium" />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Description</label>
              <button
                type="button"
                onClick={handleSuggestCategory}
                disabled={suggestLoading}
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center space-x-1 font-medium disabled:opacity-50"
              >
                <Sparkles className={`w-3 h-3 ${suggestLoading ? 'animate-spin' : ''}`} />
                <span>Suggest category</span>
              </button>
            </div>
            <input
              type="text"
              placeholder="e.g. Starbucks, Uber, Grocery, Netflix..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm border dark:border-gray-600 rounded-lg bg-transparent"
            />
          </div>
          <button type="submit" className="w-full py-2.5 bg-blue-600 text-white font-medium text-sm rounded-lg hover:bg-blue-700 transition shadow-sm">
            Save Transaction
          </button>
        </form>
      </Modal>
    </div>
  );
};

