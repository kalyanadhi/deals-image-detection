import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import Layout from '../components/Layout';
import Modal from '../components/Modal';

const CURRENCIES = ['USD','EUR','GBP','INR','CAD','AUD','JPY','SGD','AED','MYR'];

const fmt = (n, cur = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: cur }).format(n);

const colorBg = {
  indigo:'bg-indigo-600', emerald:'bg-emerald-600', rose:'bg-rose-600',
  amber:'bg-amber-500', blue:'bg-blue-600', cyan:'bg-cyan-600',
  orange:'bg-orange-500', teal:'bg-teal-600',
};

function goalStatus(goal, saved) {
  if (goal.status === 'completed') return { label: 'Completed', cls: 'bg-emerald-100 text-emerald-700', bar: 'bg-emerald-500' };
  const daysLeft = Math.ceil((new Date(goal.deadline) - new Date()) / 86400000);
  if (daysLeft < 0) return { label: 'Overdue', cls: 'bg-red-100 text-red-700', bar: 'bg-red-500', daysLeft };
  const totalDays = Math.max(1, Math.ceil((new Date(goal.deadline) - new Date(goal.createdAt)) / 86400000));
  const elapsed = totalDays - daysLeft;
  const expectedPct = (elapsed / totalDays) * 100;
  const actualPct = (saved / goal.targetAmount) * 100;
  if (actualPct < expectedPct - 10) return { label: 'At Risk', cls: 'bg-amber-100 text-amber-700', bar: 'bg-amber-400', daysLeft };
  return { label: 'On Track', cls: 'bg-blue-100 text-blue-700', bar: 'bg-indigo-500', daysLeft };
}

function GoalModal({ goal, onClose, onSave }) {
  const { GOAL_ICONS, GOAL_COLORS } = useFinance();
  const [form, setForm] = useState({
    name:         goal?.name         || '',
    description:  goal?.description  || '',
    targetAmount: goal?.targetAmount || '',
    deadline:     goal?.deadline     || '',
    currency:     goal?.currency     || 'USD',
    icon:         goal?.icon         || '🎯',
    color:        goal?.color        || 'indigo',
  });
  const [error, setError] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Name is required'); return; }
    if (!form.targetAmount || parseFloat(form.targetAmount) <= 0) { setError('Enter a valid target amount'); return; }
    if (!form.deadline) { setError('Deadline is required'); return; }
    onSave(form);
  };

  return (
    <Modal title={goal ? 'Edit Goal' : 'New Goal'} onClose={onClose} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}

        <div>
          <label className="label">Goal Name</label>
          <input className="input" value={form.name} onChange={e => set('name', e.target.value)}
            placeholder="e.g. Emergency Fund" autoFocus required />
        </div>
        <div>
          <label className="label">Description (optional)</label>
          <input className="input" value={form.description} onChange={e => set('description', e.target.value)}
            placeholder="Why this goal matters..." />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="label">Target Amount</label>
            <input className="input" type="number" step="0.01" min="0.01"
              value={form.targetAmount} onChange={e => set('targetAmount', e.target.value)} required />
          </div>
          <div>
            <label className="label">Currency</label>
            <select className="input" value={form.currency} onChange={e => set('currency', e.target.value)}>
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="label">Deadline</label>
          <input className="input" type="date" value={form.deadline} onChange={e => set('deadline', e.target.value)} required />
        </div>

        <div>
          <label className="label">Icon</label>
          <div className="flex flex-wrap gap-1.5">
            {GOAL_ICONS.map(icon => (
              <button key={icon} type="button" onClick={() => set('icon', icon)}
                className={`w-10 h-10 text-xl rounded-lg transition-all ${form.icon === icon ? 'ring-2 ring-indigo-500 bg-indigo-50 scale-110' : 'bg-gray-100 hover:bg-gray-200'}`}
              >{icon}</button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Color</label>
          <div className="flex gap-2">
            {GOAL_COLORS.map(c => (
              <button key={c} type="button" onClick={() => set('color', c)}
                className={`w-8 h-8 rounded-full ${colorBg[c]} transition-transform ${form.color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'}`}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" className="btn-primary flex-1">{goal ? 'Save Changes' : 'Create Goal'}</button>
        </div>
      </form>
    </Modal>
  );
}

function ContributionModal({ goal, onClose }) {
  const { addGoalContribution } = useFinance();
  const [form, setForm] = useState({ amount: '', note: '', date: new Date().toISOString().split('T')[0] });
  const [error, setError] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const cur = goal.currency || 'USD';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.amount || parseFloat(form.amount) <= 0) { setError('Enter a valid amount'); return; }
    addGoalContribution(goal.id, form.amount, form.note, form.date);
    onClose();
  };

  return (
    <Modal title={`Add Funds — ${goal.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}
        <div>
          <label className="label">Amount ({cur})</label>
          <input className="input" type="number" step="0.01" min="0.01"
            value={form.amount} onChange={e => set('amount', e.target.value)} autoFocus required />
        </div>
        <div>
          <label className="label">Date</label>
          <input className="input" type="date" value={form.date} onChange={e => set('date', e.target.value)} required />
        </div>
        <div>
          <label className="label">Note (optional)</label>
          <input className="input" value={form.note} onChange={e => set('note', e.target.value)}
            placeholder="e.g. Monthly contribution" />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" className="btn-primary flex-1">Add Funds</button>
        </div>
      </form>
    </Modal>
  );
}

function GoalCard({ goal, onEdit, onDelete, onContribute }) {
  const { getGoalSaved, getGoalContributions } = useFinance();
  const saved     = getGoalSaved(goal.id);
  const pct       = Math.min((saved / goal.targetAmount) * 100, 100);
  const { label, cls, bar, daysLeft } = goalStatus(goal, saved);
  const remaining = goal.targetAmount - saved;
  const cur       = goal.currency || 'USD';
  const [showHistory, setShowHistory] = useState(false);
  const contribs  = getGoalContributions(goal.id);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group">
      <div className={`${colorBg[goal.color] || 'bg-indigo-600'} px-5 py-4 text-white`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{goal.icon}</span>
            <div>
              <h3 className="font-bold text-lg leading-tight">{goal.name}</h3>
              {goal.description && <p className="text-white text-opacity-75 text-xs mt-0.5">{goal.description}</p>}
            </div>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={onEdit}   className="p-1 bg-white bg-opacity-20 hover:bg-opacity-30 rounded text-xs">Edit</button>
            <button onClick={onDelete} className="p-1 bg-white bg-opacity-20 hover:bg-opacity-30 rounded text-xs">Del</button>
          </div>
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-center justify-between mb-2">
          <span className={`badge ${cls} text-xs`}>{label}</span>
          <span className="text-xs text-gray-400">
            {goal.status === 'completed' ? '🎉 Done!'
              : daysLeft < 0 ? <span className="text-red-500">{Math.abs(daysLeft)}d overdue</span>
              : `${daysLeft}d left`}
          </span>
        </div>

        <div className="w-full bg-gray-100 rounded-full h-3 mb-3 overflow-hidden">
          <div className={`h-3 rounded-full transition-all ${bar}`} style={{ width: `${pct}%` }} />
        </div>

        <div className="flex items-center justify-between text-sm mb-1">
          <span className="font-bold text-gray-900">{fmt(saved, cur)} saved</span>
          <span className="text-gray-500">of {fmt(goal.targetAmount, cur)}</span>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          {goal.status === 'completed'
            ? 'Goal reached!'
            : `${fmt(remaining, cur)} remaining • ${pct.toFixed(1)}% complete`}
        </p>

        <div className="flex items-center gap-2">
          {goal.status === 'active' && (
            <button onClick={onContribute} className="btn-primary flex-1 text-sm py-1.5">+ Add Funds</button>
          )}
          {contribs.length > 0 && (
            <button onClick={() => setShowHistory(h => !h)} className="btn-secondary text-sm py-1.5 px-3">
              {showHistory ? 'Hide' : `History (${contribs.length})`}
            </button>
          )}
        </div>

        {showHistory && (
          <div className="mt-3 space-y-1.5 max-h-36 overflow-y-auto">
            {contribs.slice(0, 8).map(c => (
              <div key={c.id} className="flex items-center justify-between text-xs">
                <span className="text-gray-500">{c.date}{c.note ? ` · ${c.note}` : ''}</span>
                <span className="font-medium text-emerald-600">+{fmt(c.amount, cur)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Goals() {
  const { getGoals, getGoalSaved, createGoal, updateGoal, deleteGoal } = useFinance();
  const [tab, setTab]               = useState('active');
  const [modal, setModal]           = useState(null);
  const [contributeGoal, setContributeGoal] = useState(null);
  const [confirm, setConfirm]       = useState(null);

  const allGoals = getGoals();
  const goals    = allGoals.filter(g => tab === 'active' ? g.status === 'active' : g.status === 'completed');

  const activeGoals     = allGoals.filter(g => g.status === 'active');
  const completedCount  = allGoals.filter(g => g.status === 'completed').length;

  const handleSave = (form) => {
    if (modal === 'add') createGoal(form);
    else updateGoal(modal.id, form);
    setModal(null);
  };

  return (
    <Layout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Goals</h1>
            <p className="text-gray-500 text-sm mt-1">Track your saving targets</p>
          </div>
          <button onClick={() => setModal('add')} className="btn-primary">+ New Goal</button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          <div className="card text-center py-4">
            <p className="text-xl font-bold text-gray-900">{activeGoals.length}</p>
            <p className="text-xs text-gray-500 mt-1">Active Goals</p>
          </div>
          <div className="card text-center py-4">
            <p className="text-xl font-bold text-gray-900">{completedCount}</p>
            <p className="text-xs text-gray-500 mt-1">Completed</p>
          </div>
          <div className="card text-center py-4 sm:block hidden">
            <p className="text-xl font-bold text-gray-900">
              {activeGoals.length > 0
                ? `${Math.round(activeGoals.reduce((s, g) => s + Math.min((getGoalSaved(g.id) / g.targetAmount) * 100, 100), 0) / activeGoals.length)}%`
                : '—'}
            </p>
            <p className="text-xs text-gray-500 mt-1">Avg. Progress</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit mb-6">
          {[['active','Active'], ['completed','Completed']].map(([key, lbl]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-5 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >{lbl}</button>
          ))}
        </div>

        {goals.length === 0 ? (
          <div className="card text-center py-16">
            <div className="text-4xl mb-3">{tab === 'active' ? '🎯' : '🏆'}</div>
            <h3 className="font-semibold text-gray-900 mb-2">{tab === 'active' ? 'No active goals' : 'No completed goals yet'}</h3>
            <p className="text-gray-500 text-sm mb-5">
              {tab === 'active' ? 'Set savings goals with deadlines to stay motivated.' : 'Keep saving — completed goals will appear here.'}
            </p>
            {tab === 'active' && <button onClick={() => setModal('add')} className="btn-primary">Create Your First Goal</button>}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {goals.map(g => (
              <GoalCard
                key={g.id} goal={g}
                onEdit={() => setModal(g)}
                onDelete={() => setConfirm(g)}
                onContribute={() => setContributeGoal(g)}
              />
            ))}
          </div>
        )}
      </div>

      {modal && <GoalModal goal={modal === 'add' ? null : modal} onClose={() => setModal(null)} onSave={handleSave} />}
      {contributeGoal && <ContributionModal goal={contributeGoal} onClose={() => setContributeGoal(null)} />}

      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setConfirm(null)} />
          <div className="relative bg-white rounded-xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-semibold text-gray-900 mb-2">Delete Goal</h3>
            <p className="text-gray-500 text-sm mb-5">Delete "{confirm.name}" and all its contribution history?</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirm(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={() => { deleteGoal(confirm.id); setConfirm(null); }} className="btn-danger flex-1">Delete</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
