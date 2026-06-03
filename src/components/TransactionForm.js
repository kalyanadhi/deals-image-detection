import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import Modal from './Modal';

export default function TransactionForm({ walletId, onClose }) {
  const { addTransaction, getCategories } = useFinance();
  const [form, setForm] = useState({
    type: 'expense',
    amount: '',
    category: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [error, setError] = useState('');

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));
  const categories = getCategories(form.type);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!form.amount || isNaN(parseFloat(form.amount)) || parseFloat(form.amount) <= 0) {
      setError('Enter a valid amount');
      return;
    }
    if (!form.category) { setError('Select a category'); return; }
    try {
      addTransaction({ ...form, walletId });
      onClose();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Modal title="Add Transaction" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}

        <div className="flex gap-2">
          {['expense', 'income'].map(t => (
            <button
              key={t}
              type="button"
              onClick={() => { set('type', t); set('category', ''); }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                form.type === t
                  ? t === 'income' ? 'bg-emerald-600 text-white' : 'bg-red-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t === 'income' ? '↑ Income' : '↓ Expense'}
            </button>
          ))}
        </div>

        <div>
          <label className="label">Amount</label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-gray-500 text-sm">$</span>
            <input
              className="input pl-7"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={form.amount}
              onChange={e => set('amount', e.target.value)}
              required
            />
          </div>
        </div>

        <div>
          <label className="label">Category</label>
          <select className="input" value={form.category} onChange={e => set('category', e.target.value)} required>
            <option value="">Select category</option>
            {categories.map(c => <option key={c.id} value={c.name}>{c.icon} {c.name}</option>)}
          </select>
        </div>

        <div>
          <label className="label">Date</label>
          <input className="input" type="date" value={form.date} onChange={e => set('date', e.target.value)} required />
        </div>

        <div>
          <label className="label">Note (optional)</label>
          <input className="input" type="text" placeholder="Add a note..." value={form.description} onChange={e => set('description', e.target.value)} />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" className="btn-primary flex-1">Add Transaction</button>
        </div>
      </form>
    </Modal>
  );
}
