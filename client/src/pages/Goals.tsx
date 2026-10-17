import { useState, useEffect } from 'react';
import { fetchApi } from '../lib/api';
import { formatINR } from '../lib/currency';
import { Modal } from '../components/ui/Modal';
import { CardSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import toast from 'react-hot-toast';
import { Target } from 'lucide-react';

export const Goals = () => {
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [savedAmount, setSavedAmount] = useState('');
  const [deadline, setDeadline] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchApi('/api/goals');
      setGoals(data);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load savings goals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setEditingId(null);
    setName('');
    setTargetAmount('');
    setSavedAmount('0');
    setDeadline('');
    setIsModalOpen(true);
  };

  const openEditModal = (g: any) => {
    setEditingId(g.id);
    setName(g.name);
    setTargetAmount(g.targetAmount);
    setSavedAmount(g.savedAmount);
    setDeadline(g.deadline.split('T')[0]);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { name, targetAmount: parseFloat(targetAmount), savedAmount: parseFloat(savedAmount), deadline };
      if (editingId) {
        await fetchApi(`/api/goals/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) });
        toast.success('Goal updated successfully');
      } else {
        await fetchApi('/api/goals', { method: 'POST', body: JSON.stringify(payload) });
        toast.success('Goal created successfully');
      }
      setIsModalOpen(false);
      loadData();
    } catch (e: any) {
      toast.error(e.message || 'Failed to save goal');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this goal?')) return;
    try {
      await fetchApi(`/api/goals/${id}`, { method: 'DELETE' });
      toast.success('Goal deleted successfully');
      loadData();
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete goal');
    }
  };

  const handleAddMoney = async (g: any) => {
    const amountStr = prompt(`Enter amount to add to "${g.name}":`);
    if (!amountStr) return;
    const addAmt = parseFloat(amountStr);
    if (isNaN(addAmt) || addAmt <= 0) return toast.error('Invalid amount. Must be a positive number.');
    try {
      await fetchApi(`/api/goals/${g.id}`, { 
        method: 'PUT', 
        body: JSON.stringify({ name: g.name, targetAmount: g.targetAmount, savedAmount: parseFloat(g.savedAmount) + addAmt, deadline: g.deadline }) 
      });
      toast.success(`Successfully added ${formatINR(addAmt)} to "${g.name}"`);
      loadData();
    } catch (e: any) {
      toast.error(e.message || 'Failed to add money to goal');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Savings Goals</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Track your progress towards important financial milestones</p>
        </div>
        <button
          onClick={openAddModal}
          className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition shadow-sm cursor-pointer"
        >
          Add Goal
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {loading ? (
          <>
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </>
        ) : goals.length === 0 ? (
          <div className="col-span-full">
            <EmptyState
              icon={Target}
              title="No active savings goals"
              description="Create a savings target for an emergency fund, gadget, vacation, or investment."
              actionText="Add Goal"
              onAction={openAddModal}
            />
          </div>
        ) : (
          goals.map(g => {
            const saved = Number(g.savedAmount);
            const target = Number(g.targetAmount);
            const percentage = Math.min((saved / target) * 100, 100);

            return (
              <div key={g.id} className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/60 space-y-4 min-w-0">
                <div className="flex justify-between items-start gap-2">
                  <h3 className="font-semibold text-base sm:text-lg text-gray-900 dark:text-gray-100 truncate">{g.name}</h3>
                  <div className="space-x-2 text-sm shrink-0">
                    <button onClick={() => openEditModal(g)} className="text-blue-500 hover:underline cursor-pointer">Edit</button>
                    <button onClick={() => handleDelete(g.id)} className="text-red-500 hover:underline cursor-pointer">Delete</button>
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 truncate">Target: {formatINR(target, 0)}</span>
                  <span className="text-blue-600 font-medium shrink-0 ml-2">{percentage.toFixed(1)}%</span>
                </div>
                <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 transition-all" style={{ width: `${percentage}%` }}></div>
                </div>
                <div className="text-sm text-gray-500 flex justify-between items-center gap-2">
                  <span className="truncate">{formatINR(saved, 0)} saved</span>
                  <span className="shrink-0 text-xs sm:text-sm">Due: {new Date(g.deadline).toLocaleDateString()}</span>
                </div>
                <button onClick={() => handleAddMoney(g)} className="w-full mt-2 py-2 border border-blue-600 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-sm font-medium transition cursor-pointer">
                  Add Money
                </button>
              </div>
            );
          })
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Edit Goal" : "Add Goal"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">Goal Name</label>
            <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 text-sm border dark:border-gray-600 rounded-lg bg-transparent" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">Target Amount (₹)</label>
              <input type="number" step="0.01" min="1" required value={targetAmount} onChange={e => setTargetAmount(e.target.value)} className="w-full px-3 py-2 text-sm border dark:border-gray-600 rounded-lg bg-transparent font-medium" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">Saved Amount (₹)</label>
              <input type="number" step="0.01" min="0" required value={savedAmount} onChange={e => setSavedAmount(e.target.value)} className="w-full px-3 py-2 text-sm border dark:border-gray-600 rounded-lg bg-transparent font-medium" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">Deadline</label>
            <input type="date" required value={deadline} onChange={e => setDeadline(e.target.value)} className="w-full px-3 py-2 text-sm border dark:border-gray-600 rounded-lg bg-transparent" />
          </div>
          <button type="submit" className="w-full py-2.5 bg-blue-600 text-white font-medium text-sm rounded-lg hover:bg-blue-700 transition shadow-sm cursor-pointer">Save Goal</button>
        </form>
      </Modal>
    </div>
  );
};
