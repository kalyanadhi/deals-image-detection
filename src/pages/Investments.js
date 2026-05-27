import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import Layout from '../components/Layout';
import Modal from '../components/Modal';

const fmt = (n, cur = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency: cur }).format(n);
const fmtPct = (n) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;

const CURRENCIES = ['USD','EUR','GBP','INR','CAD','AUD','JPY'];

const typeBadge = {
  stock:       'bg-blue-100 text-blue-700',
  crypto:      'bg-orange-100 text-orange-700',
  etf:         'bg-cyan-100 text-cyan-700',
  mutual_fund: 'bg-blue-100 text-blue-700',
  bond:        'bg-gray-100 text-gray-700',
  real_estate: 'bg-emerald-100 text-emerald-700',
  other:       'bg-pink-100 text-pink-700',
};

function InvestmentModal({ investment, onClose, onSave }) {
  const { INV_TYPES, INV_TYPE_LABELS } = useFinance();
  const [form, setForm] = useState({
    name: investment?.name || '', ticker: investment?.ticker || '',
    type: investment?.type || 'stock', quantity: investment?.quantity || '',
    purchasePrice: investment?.purchasePrice || '', currentPrice: investment?.currentPrice || '',
    currency: investment?.currency || 'USD', purchaseDate: investment?.purchaseDate || new Date().toISOString().split('T')[0],
    notes: investment?.notes || '',
  });
  const [error, setError] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim())                                   { setError('Name is required'); return; }
    if (!form.quantity || parseFloat(form.quantity) <= 0)    { setError('Enter a valid quantity'); return; }
    if (!form.purchasePrice || parseFloat(form.purchasePrice) <= 0) { setError('Enter a valid purchase price'); return; }
    onSave(form);
  };

  return (
    <Modal title={investment ? 'Edit Investment' : 'Add Investment'} onClose={onClose} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Name</label>
            <input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Apple Inc." autoFocus required />
          </div>
          <div>
            <label className="label">Ticker / Symbol</label>
            <input className="input" value={form.ticker} onChange={e => set('ticker', e.target.value.toUpperCase())} placeholder="AAPL" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Asset Type</label>
            <select className="input" value={form.type} onChange={e => set('type', e.target.value)}>
              {INV_TYPES.map(t => <option key={t} value={t}>{INV_TYPE_LABELS[t]}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Currency</label>
            <select className="input" value={form.currency} onChange={e => set('currency', e.target.value)}>
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Quantity / Shares</label>
            <input className="input" type="number" step="any" min="0" value={form.quantity} onChange={e => set('quantity', e.target.value)} required />
          </div>
          <div>
            <label className="label">Purchase Price</label>
            <input className="input" type="number" step="0.01" min="0" value={form.purchasePrice} onChange={e => set('purchasePrice', e.target.value)} required />
          </div>
          <div>
            <label className="label">Current Price</label>
            <input className="input" type="number" step="0.01" min="0" value={form.currentPrice} onChange={e => set('currentPrice', e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">Purchase Date</label>
          <input className="input" type="date" value={form.purchaseDate} onChange={e => set('purchaseDate', e.target.value)} />
        </div>
        <div>
          <label className="label">Notes (optional)</label>
          <input className="input" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any additional notes..." />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" className="btn-primary flex-1">{investment ? 'Save Changes' : 'Add Investment'}</button>
        </div>
      </form>
    </Modal>
  );
}

function UpdatePriceModal({ investment, onClose, onSave }) {
  const [price, setPrice] = useState(investment.currentPrice);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!price || parseFloat(price) <= 0) { setError('Enter a valid price'); return; }
    onSave(parseFloat(price));
  };

  const oldValue = investment.purchasePrice * investment.quantity;
  const newValue = parseFloat(price || 0) * investment.quantity;
  const gain = newValue - oldValue;

  return (
    <Modal title={`Update Price — ${investment.ticker || investment.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}
        <div>
          <label className="label">Current Price per Share</label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-gray-500 text-sm">$</span>
            <input className="input pl-7" type="number" step="0.01" min="0.01" value={price} onChange={e => setPrice(e.target.value)} autoFocus required />
          </div>
        </div>
        {parseFloat(price) > 0 && (
          <div className={`rounded-lg px-4 py-3 text-sm ${gain >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
            New value: {fmt(newValue, investment.currency)} · {gain >= 0 ? '+' : ''}{fmt(gain, investment.currency)}
          </div>
        )}
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" className="btn-primary flex-1">Update Price</button>
        </div>
      </form>
    </Modal>
  );
}

function InvestmentCard({ inv, onEdit, onDelete, onUpdatePrice }) {
  const { INV_TYPE_LABELS } = useFinance();
  const invested  = inv.purchasePrice * inv.quantity;
  const current   = inv.currentPrice  * inv.quantity;
  const gain      = current - invested;
  const gainPct   = invested > 0 ? (gain / invested) * 100 : 0;
  const isUp      = gain >= 0;

  return (
    <div className="card group hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {inv.ticker && <span className="font-bold text-lg text-gray-900">{inv.ticker}</span>}
            <span className={`badge ${typeBadge[inv.type] || 'bg-gray-100 text-gray-700'} text-xs`}>
              {INV_TYPE_LABELS[inv.type] || inv.type}
            </span>
          </div>
          <p className="text-sm text-gray-600 truncate">{inv.name}</p>
          <p className="text-xs text-gray-400">{inv.purchaseDate} · {inv.currency}</p>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2 flex-shrink-0">
          <button onClick={onEdit}   className="px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-50 rounded font-medium transition-colors">Edit</button>
          <button onClick={onDelete} className="px-2 py-1 text-xs text-red-500  hover:bg-red-50   rounded font-medium transition-colors">Del</button>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">{inv.quantity} shares @ {fmt(inv.currentPrice, inv.currency)}</span>
          <span className="font-bold text-gray-900">{fmt(current, inv.currency)}</span>
        </div>
        <div className="flex justify-between text-xs text-gray-400">
          <span>Cost basis ({fmt(inv.purchasePrice, inv.currency)}/share)</span>
          <span>{fmt(invested, inv.currency)}</span>
        </div>
        <div className={`flex justify-between text-sm font-semibold ${isUp ? 'text-emerald-600' : 'text-red-500'}`}>
          <span>{isUp ? '↑' : '↓'} Total Return</span>
          <span>{isUp ? '+' : ''}{fmt(gain, inv.currency)} ({fmtPct(gainPct)})</span>
        </div>
      </div>

      {inv.notes && <p className="text-xs text-gray-400 mb-3 truncate">{inv.notes}</p>}

      <button onClick={onUpdatePrice} className="btn-secondary w-full text-sm py-1.5">Update Price</button>
    </div>
  );
}

export default function Investments() {
  const { getInvestments, createInvestment, updateInvestment, deleteInvestment, getPortfolioSummary, INV_TYPES, INV_TYPE_LABELS } = useFinance();
  const [modal, setModal]       = useState(null);
  const [priceModal, setPriceModal] = useState(null);
  const [confirm, setConfirm]   = useState(null);
  const [typeFilter, setTypeFilter] = useState('all');

  const investments = getInvestments().sort((a, b) => (b.currentPrice * b.quantity) - (a.currentPrice * a.quantity));
  const { totalInvested, currentValue, gain } = getPortfolioSummary();
  const gainPct = totalInvested > 0 ? (gain / totalInvested) * 100 : 0;
  const isUp    = gain >= 0;

  const presentTypes = [...new Set(investments.map(i => i.type))];
  const filtered = typeFilter === 'all' ? investments : investments.filter(i => i.type === typeFilter);

  const handleSave = (form) => {
    if (modal === 'add') createInvestment(form);
    else updateInvestment(modal.id, form);
    setModal(null);
  };

  return (
    <Layout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Investments</h1>
            <p className="text-gray-500 text-sm mt-1">Portfolio tracker</p>
          </div>
          <button onClick={() => setModal('add')} className="btn-primary">+ Add Investment</button>
        </div>

        {/* Portfolio summary */}
        {investments.length > 0 && (
          <div className="card bg-gradient-to-br from-indigo-600 to-blue-700 text-white border-0 mb-6">
            <p className="text-indigo-200 text-sm mb-3">Portfolio Summary</p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-indigo-200 text-xs">Total Invested</p>
                <p className="text-xl font-bold">{fmt(totalInvested)}</p>
              </div>
              <div>
                <p className="text-indigo-200 text-xs">Current Value</p>
                <p className="text-xl font-bold">{fmt(currentValue)}</p>
              </div>
              <div>
                <p className="text-indigo-200 text-xs">Total Return</p>
                <p className={`text-xl font-bold ${isUp ? 'text-green-300' : 'text-red-300'}`}>
                  {isUp ? '+' : ''}{fmt(gain)} ({fmtPct(gainPct)})
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Type filter */}
        {presentTypes.length > 1 && (
          <div className="flex flex-wrap gap-2 mb-6">
            <button onClick={() => setTypeFilter('all')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${typeFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >All ({investments.length})</button>
            {presentTypes.map(t => (
              <button key={t} onClick={() => setTypeFilter(t)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${typeFilter === t ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >{INV_TYPE_LABELS[t]} ({investments.filter(i => i.type === t).length})</button>
            ))}
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="card text-center py-16">
            <div className="text-4xl mb-3">📈</div>
            <h3 className="font-semibold text-gray-900 mb-2">No investments yet</h3>
            <p className="text-gray-500 text-sm mb-5">Track stocks, crypto, ETFs, real estate, and more.</p>
            <button onClick={() => setModal('add')} className="btn-primary">Add First Investment</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(inv => (
              <InvestmentCard
                key={inv.id} inv={inv}
                onEdit={() => setModal(inv)}
                onDelete={() => setConfirm(inv)}
                onUpdatePrice={() => setPriceModal(inv)}
              />
            ))}
          </div>
        )}
      </div>

      {modal && <InvestmentModal investment={modal === 'add' ? null : modal} onClose={() => setModal(null)} onSave={handleSave} />}
      {priceModal && (
        <UpdatePriceModal
          investment={priceModal}
          onClose={() => setPriceModal(null)}
          onSave={(price) => { updateInvestment(priceModal.id, { currentPrice: price }); setPriceModal(null); }}
        />
      )}

      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setConfirm(null)} />
          <div className="relative bg-white rounded-xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-semibold text-gray-900 mb-2">Remove Investment</h3>
            <p className="text-gray-500 text-sm mb-5">Remove "{confirm.ticker || confirm.name}" from your portfolio?</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirm(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={() => { deleteInvestment(confirm.id); setConfirm(null); }} className="btn-danger flex-1">Remove</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
