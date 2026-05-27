import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import Modal from './Modal';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'INR', 'CHF'];

export default function CreateWalletModal({ onClose, onCreated }) {
  const { createWallet, WALLET_COLORS, WALLET_ICONS } = useFinance();
  const [form, setForm] = useState({
    name: '', description: '', currency: 'USD',
    color: WALLET_COLORS[0], icon: WALLET_ICONS[0],
  });
  const [error, setError] = useState('');

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) { setError('Wallet name is required'); return; }
    try {
      const wallet = createWallet(form);
      onCreated && onCreated(wallet);
      onClose();
    } catch (err) {
      setError(err.message);
    }
  };

  const colorMap = {
    indigo: 'bg-indigo-500', emerald: 'bg-emerald-500', rose: 'bg-rose-500',
    amber: 'bg-amber-500', violet: 'bg-violet-500', cyan: 'bg-cyan-500',
    orange: 'bg-orange-500', teal: 'bg-teal-500',
  };

  return (
    <Modal title="Create New Wallet" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}

        <div>
          <label className="label">Wallet Name</label>
          <input className="input" placeholder="e.g. Main Account" value={form.name} onChange={e => set('name', e.target.value)} required />
        </div>

        <div>
          <label className="label">Description (optional)</label>
          <input className="input" placeholder="What's this wallet for?" value={form.description} onChange={e => set('description', e.target.value)} />
        </div>

        <div>
          <label className="label">Currency</label>
          <select className="input" value={form.currency} onChange={e => set('currency', e.target.value)}>
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label className="label">Icon</label>
          <div className="flex flex-wrap gap-2">
            {WALLET_ICONS.map(icon => (
              <button key={icon} type="button"
                onClick={() => set('icon', icon)}
                className={`w-10 h-10 text-xl rounded-lg transition-all ${form.icon === icon ? 'ring-2 ring-indigo-500 bg-indigo-50 scale-110' : 'bg-gray-100 hover:bg-gray-200'}`}
              >{icon}</button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Color</label>
          <div className="flex flex-wrap gap-2">
            {WALLET_COLORS.map(color => (
              <button key={color} type="button"
                onClick={() => set('color', color)}
                className={`w-8 h-8 rounded-full ${colorMap[color]} transition-transform ${form.color === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'}`}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" className="btn-primary flex-1">Create Wallet</button>
        </div>
      </form>
    </Modal>
  );
}
