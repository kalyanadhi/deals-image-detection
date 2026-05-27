import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import Layout from '../components/Layout';
import Modal from '../components/Modal';

const fmt = (n, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n);

const PERIODS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'weekly',  label: 'Weekly'  },
  { value: 'yearly',  label: 'Yearly'  },
];

function BudgetModal({ budget, wallets, onClose, onSave }) {
  const { getCategories } = useFinance();
  const expenseCats = getCategories('expense');

  const [form, setForm] = useState({
    walletId:   budget?.walletId   || wallets[0]?.id || '',
    categoryId: budget?.categoryId || '',
    amount:     budget?.amount     || '',
    period:     budget?.period     || 'monthly',
  });
  const [error, setError] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.walletId)                                  { setError('Select a wallet');   return; }
    if (!form.categoryId)                                { setError('Select a category'); return; }
    if (!form.amount || parseFloat(form.amount) <= 0)    { setError('Enter a valid amount'); return; }
    const cat = expenseCats.find(c => c.id === form.categoryId);
    try {
      onSave({ ...form, categoryName: cat.name, categoryIcon: cat.icon, amount: parseFloat(form.amount) });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Modal title={budget ? 'Edit Budget' : 'Set Budget'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}

        <div>
          <label className="label">Wallet</label>
          <select className="input" value={form.walletId} onChange={e => set('walletId', e.target.value)}>
            {wallets.map(w => <option key={w.id} value={w.id}>{w.icon} {w.name}</option>)}
          </select>
        </div>

        <div>
          <label className="label">Expense Category</label>
          <select className="input" value={form.categoryId} onChange={e => set('categoryId', e.target.value)} required>
            <option value="">Select category</option>
            {expenseCats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
        </div>

        <div>
          <label className="label">Budget Amount</label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-gray-500 text-sm">$</span>
            <input className="input pl-7" type="number" step="0.01" min="0.01" placeholder="0.00"
              value={form.amount} onChange={e => set('amount', e.target.value)} required />
          </div>
        </div>

        <div>
          <label className="label">Period</label>
          <div className="flex gap-2">
            {PERIODS.map(p => (
              <button key={p.value} type="button" onClick={() => set('period', p.value)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${form.period === p.value ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >{p.label}</button>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" className="btn-primary flex-1">{budget ? 'Save Changes' : 'Set Budget'}</button>
        </div>
      </form>
    </Modal>
  );
}

function BudgetCard({ budget, wallet, onEdit, onDelete }) {
  const { getBudgetSpending } = useFinance();
  const spent = getBudgetSpending(budget);
  const pct   = budget.amount > 0 ? Math.min((spent / budget.amount) * 100, 100) : 0;
  const over  = spent > budget.amount;
  const near  = !over && pct >= 80;
  const currency = wallet?.currency || 'USD';

  const barColor  = over ? 'bg-red-500' : near ? 'bg-amber-400' : 'bg-emerald-500';
  const amtColor  = over ? 'text-red-600' : near ? 'text-amber-600' : 'text-gray-800';

  const periodLabel = PERIODS.find(p => p.value === budget.period)?.label || budget.period;

  return (
    <div className="card group hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{budget.categoryIcon}</span>
          <div>
            <p className="font-semibold text-gray-900">{budget.categoryName}</p>
            <p className="text-xs text-gray-400 capitalize">{periodLabel} · {wallet?.icon} {wallet?.name}</p>
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit}   className="px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-50 rounded-lg font-medium transition-colors">Edit</button>
          <button onClick={onDelete} className="px-2 py-1 text-xs text-red-500  hover:bg-red-50   rounded-lg font-medium transition-colors">Delete</button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-100 rounded-full h-3 mb-3 overflow-hidden">
        <div className={`h-3 rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className={`font-bold ${amtColor}`}>{fmt(spent, currency)}</span>
        <span className="text-gray-400">of {fmt(budget.amount, currency)}</span>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-gray-400">{pct.toFixed(0)}% used</span>
        {over ? (
          <span className="badge bg-red-100 text-red-700">Over by {fmt(spent - budget.amount, currency)}</span>
        ) : near ? (
          <span className="badge bg-amber-100 text-amber-700">Almost at limit</span>
        ) : (
          <span className="badge bg-emerald-100 text-emerald-700">{fmt(budget.amount - spent, currency)} left</span>
        )}
      </div>
    </div>
  );
}

export default function Budgets() {
  const { getWallets, getBudgets, createBudget, updateBudget, deleteBudget } = useFinance();
  const [modal, setModal]   = useState(null); // null | 'add' | budget obj
  const [confirm, setConfirm] = useState(null);
  const [walletFilter, setWalletFilter] = useState('all');

  const wallets    = getWallets();
  const allBudgets = getBudgets();
  const budgets    = walletFilter === 'all' ? allBudgets : allBudgets.filter(b => b.walletId === walletFilter);
  const getWallet  = (id) => wallets.find(w => w.id === id);

  const handleSave = (form) => {
    if (modal === 'add') createBudget(form);
    else updateBudget(modal.id, form);
    setModal(null);
  };

  return (
    <Layout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Budgets</h1>
            <p className="text-gray-500 text-sm mt-1">
              {allBudgets.length} budget{allBudgets.length !== 1 ? 's' : ''} set
            </p>
          </div>
          <button onClick={() => setModal('add')} className="btn-primary" disabled={wallets.length === 0}>
            + Set Budget
          </button>
        </div>

        {/* Wallet filter pills */}
        {wallets.length > 1 && (
          <div className="flex flex-wrap gap-2 mb-6">
            <button onClick={() => setWalletFilter('all')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${walletFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >All Wallets</button>
            {wallets.map(w => (
              <button key={w.id} onClick={() => setWalletFilter(w.id)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${walletFilter === w.id ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >{w.icon} {w.name}</button>
            ))}
          </div>
        )}

        {/* Empty states */}
        {wallets.length === 0 ? (
          <div className="card text-center py-16">
            <div className="text-4xl mb-3">👛</div>
            <h3 className="font-semibold text-gray-900 mb-2">No wallets yet</h3>
            <p className="text-gray-500 text-sm">Create a wallet first, then set budgets for it.</p>
          </div>
        ) : budgets.length === 0 ? (
          <div className="card text-center py-16">
            <div className="text-4xl mb-3">🎯</div>
            <h3 className="font-semibold text-gray-900 mb-2">No budgets set</h3>
            <p className="text-gray-500 text-sm mb-5">Set monthly spending limits per category to stay on track.</p>
            <button onClick={() => setModal('add')} className="btn-primary">Set Your First Budget</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {budgets.map(b => (
              <BudgetCard
                key={b.id}
                budget={b}
                wallet={getWallet(b.walletId)}
                onEdit={() => setModal(b)}
                onDelete={() => setConfirm(b)}
              />
            ))}
          </div>
        )}
      </div>

      {modal && wallets.length > 0 && (
        <BudgetModal
          budget={modal === 'add' ? null : modal}
          wallets={wallets}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}

      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setConfirm(null)} />
          <div className="relative bg-white rounded-xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-semibold text-gray-900 mb-2">Delete Budget</h3>
            <p className="text-gray-500 text-sm mb-5">
              Remove the budget for "{confirm.categoryName}"?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirm(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={() => { deleteBudget(confirm.id); setConfirm(null); }} className="btn-danger flex-1">Delete</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
