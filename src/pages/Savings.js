import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import Layout from '../components/Layout';
import Modal from '../components/Modal';

const fmt = (n, cur = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency: cur }).format(n);

const CURRENCIES = ['USD','EUR','GBP','INR','CAD','AUD','JPY'];
const COMPOUNDING_LABELS = { monthly: 'Monthly', quarterly: 'Quarterly', annually: 'Annually' };
const SAVINGS_ICONS = ['🏦','💰','🏠','🛒','🎓','✈️','💍','🌱','📱','🎯','🐷','🔐'];

const colorBg = {
  indigo:'bg-indigo-600', emerald:'bg-emerald-600', rose:'bg-rose-600',
  amber:'bg-amber-500', blue:'bg-blue-600', cyan:'bg-cyan-600',
  orange:'bg-orange-500', teal:'bg-teal-600',
};

function SavingsModal({ account, onClose, onSave }) {
  const { WALLET_COLORS } = useFinance();
  const [form, setForm] = useState({
    name: account?.name || '', interestRate: account?.interestRate ?? '',
    compounding: account?.compounding || 'monthly', currency: account?.currency || 'USD',
    icon: account?.icon || '🏦', color: account?.color || 'emerald',
  });
  const [error, setError] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Account name is required'); return; }
    onSave(form);
  };

  return (
    <Modal title={account ? 'Edit Account' : 'New Savings Account'} onClose={onClose} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}
        <div>
          <label className="label">Account Name</label>
          <input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Emergency Fund" autoFocus required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Annual Interest Rate (%)</label>
            <input className="input" type="number" step="0.01" min="0" max="30" placeholder="4.5" value={form.interestRate} onChange={e => set('interestRate', e.target.value)} />
          </div>
          <div>
            <label className="label">Compounding</label>
            <select className="input" value={form.compounding} onChange={e => set('compounding', e.target.value)}>
              {Object.entries(COMPOUNDING_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
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
            {SAVINGS_ICONS.map(icon => (
              <button key={icon} type="button" onClick={() => set('icon', icon)}
                className={`w-10 h-10 text-xl rounded-lg transition-all ${form.icon === icon ? 'ring-2 ring-indigo-500 bg-indigo-50 scale-110' : 'bg-gray-100 hover:bg-gray-200'}`}
              >{icon}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="label">Color</label>
          <div className="flex gap-2">
            {WALLET_COLORS.map(c => (
              <button key={c} type="button" onClick={() => set('color', c)}
                className={`w-8 h-8 rounded-full ${colorBg[c]} transition-transform ${form.color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'}`}
              />
            ))}
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" className="btn-primary flex-1">{account ? 'Save Changes' : 'Create Account'}</button>
        </div>
      </form>
    </Modal>
  );
}

function TransactionModal({ account, type: initType, onClose }) {
  const { addSavingsTransaction } = useFinance();
  const [form, setForm] = useState({
    type: initType || 'deposit', amount: '', note: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [error, setError] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.amount || parseFloat(form.amount) <= 0) { setError('Enter a valid amount'); return; }
    addSavingsTransaction(account.id, form.type, form.amount, form.note, form.date);
    onClose();
  };

  return (
    <Modal title={form.type === 'deposit' ? 'Deposit' : 'Withdraw'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}
        <div className="flex gap-2">
          {['deposit','withdrawal'].map(t => (
            <button key={t} type="button" onClick={() => set('type', t)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${form.type === t ? t === 'deposit' ? 'bg-emerald-600 text-white' : 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600'}`}
            >{t === 'deposit' ? '↑ Deposit' : '↓ Withdraw'}</button>
          ))}
        </div>
        <div>
          <label className="label">Amount</label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-gray-500 text-sm">{account.currency === 'USD' ? '$' : account.currency}</span>
            <input className="input pl-7" type="number" step="0.01" min="0.01" value={form.amount} onChange={e => set('amount', e.target.value)} autoFocus required />
          </div>
        </div>
        <div>
          <label className="label">Date</label>
          <input className="input" type="date" value={form.date} onChange={e => set('date', e.target.value)} required />
        </div>
        <div>
          <label className="label">Note (optional)</label>
          <input className="input" value={form.note} onChange={e => set('note', e.target.value)} placeholder="What's this for?" />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" className="btn-primary flex-1">Confirm</button>
        </div>
      </form>
    </Modal>
  );
}

function SavingsCard({ account, onEdit, onDelete }) {
  const { getSavingsBalance, getSavingsTransactions, addSavingsTransaction, projectSavingsGrowth } = useFinance();
  const balance = getSavingsBalance(account.id);
  const txns    = getSavingsTransactions(account.id);
  const projected = projectSavingsGrowth(balance, account.interestRate, account.compounding, 10);
  const interestEarned1yr = projected.find(p => p.year === 1)?.amount - balance || 0;

  const [txnModal, setTxnModal] = useState(null);
  const [showTxns, setShowTxns] = useState(false);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group">
      <div className={`${colorBg[account.color] || 'bg-emerald-600'} px-5 py-5 text-white`}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{account.icon}</span>
            <div>
              <h3 className="font-bold text-lg">{account.name}</h3>
              <span className="text-white text-opacity-75 text-xs">{account.currency}</span>
            </div>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={onEdit}   className="p-1 bg-white bg-opacity-20 hover:bg-opacity-30 rounded text-xs">Edit</button>
            <button onClick={onDelete} className="p-1 bg-white bg-opacity-20 hover:bg-opacity-30 rounded text-xs">Del</button>
          </div>
        </div>
        <p className="text-3xl font-bold">{fmt(balance, account.currency)}</p>
        {account.interestRate > 0 && (
          <p className="text-white text-opacity-75 text-xs mt-1">
            {account.interestRate}% APY · {COMPOUNDING_LABELS[account.compounding]}
            {interestEarned1yr > 0 && ` · +${fmt(interestEarned1yr, account.currency)}/yr`}
          </p>
        )}
      </div>

      <div className="p-5">
        {/* Projected growth */}
        {account.interestRate > 0 && balance > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Projected Growth</p>
            <div className="grid grid-cols-2 gap-2">
              {projected.map(p => (
                <div key={p.year} className="bg-emerald-50 rounded-lg px-3 py-2">
                  <p className="text-xs text-gray-500">{p.year} yr{p.year > 1 ? 's' : ''}</p>
                  <p className="font-semibold text-emerald-700 text-sm">{fmt(p.amount, account.currency)}</p>
                  <p className="text-xs text-emerald-600">+{fmt(p.amount - balance, account.currency)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 mb-3">
          <button onClick={() => setTxnModal('deposit')}   className="btn-primary flex-1 text-sm py-1.5">+ Deposit</button>
          <button onClick={() => setTxnModal('withdrawal')} className="btn-secondary flex-1 text-sm py-1.5">- Withdraw</button>
        </div>

        {/* Transaction history */}
        {txns.length > 0 && (
          <>
            <button onClick={() => setShowTxns(s => !s)} className="text-xs text-indigo-600 hover:underline mb-2">
              {showTxns ? 'Hide' : `Show`} history ({txns.length})
            </button>
            {showTxns && (
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {txns.slice(0, 10).map(t => (
                  <div key={t.id} className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">{t.date}{t.note ? ` · ${t.note}` : ''}</span>
                    <span className={`font-medium ${t.type === 'deposit' ? 'text-emerald-600' : 'text-red-500'}`}>
                      {t.type === 'deposit' ? '+' : '-'}{fmt(t.amount, account.currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {txnModal && <TransactionModal account={account} type={txnModal} onClose={() => setTxnModal(null)} />}
    </div>
  );
}

export default function Savings() {
  const { getSavingsAccounts, getSavingsBalance, createSavingsAccount, updateSavingsAccount, deleteSavingsAccount } = useFinance();
  const [modal, setModal]   = useState(null);
  const [confirm, setConfirm] = useState(null);

  const accounts = getSavingsAccounts();
  const totalBalance = accounts.reduce((s, a) => s + getSavingsBalance(a.id), 0);
  const avgRate = accounts.length > 0 ? accounts.reduce((s, a) => s + a.interestRate, 0) / accounts.length : 0;

  const handleSave = (form) => {
    if (modal === 'add') createSavingsAccount(form);
    else updateSavingsAccount(modal.id, form);
    setModal(null);
  };

  return (
    <Layout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Savings</h1>
            <p className="text-gray-500 text-sm mt-1">Track your savings with growth projections</p>
          </div>
          <button onClick={() => setModal('add')} className="btn-primary">+ New Account</button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="card text-center">
            <p className="text-2xl font-bold text-emerald-600">{new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(totalBalance)}</p>
            <p className="text-xs text-gray-500 mt-1">Total Savings</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-gray-900">{accounts.length}</p>
            <p className="text-xs text-gray-500 mt-1">Accounts</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-indigo-600">{avgRate.toFixed(1)}%</p>
            <p className="text-xs text-gray-500 mt-1">Avg Interest Rate</p>
          </div>
        </div>

        {accounts.length === 0 ? (
          <div className="card text-center py-16">
            <div className="text-4xl mb-3">🏦</div>
            <h3 className="font-semibold text-gray-900 mb-2">No savings accounts yet</h3>
            <p className="text-gray-500 text-sm mb-5">Add savings accounts to track balances and see projected growth.</p>
            <button onClick={() => setModal('add')} className="btn-primary">Add Savings Account</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {accounts.map(a => (
              <SavingsCard key={a.id} account={a} onEdit={() => setModal(a)} onDelete={() => setConfirm(a)} />
            ))}
          </div>
        )}
      </div>

      {modal && <SavingsModal account={modal === 'add' ? null : modal} onClose={() => setModal(null)} onSave={handleSave} />}

      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setConfirm(null)} />
          <div className="relative bg-white rounded-xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-semibold text-gray-900 mb-2">Delete Account</h3>
            <p className="text-gray-500 text-sm mb-5">Delete "{confirm.name}" and all its transactions?</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirm(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={() => { deleteSavingsAccount(confirm.id); setConfirm(null); }} className="btn-danger flex-1">Delete</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
