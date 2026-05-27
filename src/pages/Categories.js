import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import Layout from '../components/Layout';
import Modal from '../components/Modal';

const ICONS = ['📌','💡','🛠️','🎯','💵','💻','📈','🎁','↩️','💰','🍔','🛍️','🚗','🏠','🎬','💊','📚','✈️','📄','📦','💳','🏋️','🐾','👶','🎮','🎵','⚽','🌱','🎓','🛒','🏦','📱','🍕','☕','🏖️','🎪','🎨','🔧','📸','🌿'];

function CategoryModal({ category, defaultType, onClose, onSave }) {
  const [form, setForm] = useState({
    name: category?.name || '',
    type: category?.type || defaultType || 'expense',
    icon: category?.icon || '📌',
  });
  const [error, setError] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Name is required'); return; }
    onSave(form);
  };

  return (
    <Modal title={category ? 'Edit Category' : 'New Category'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}

        <div>
          <label className="label">Name</label>
          <input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Groceries" autoFocus required />
        </div>

        <div>
          <label className="label">Type</label>
          <div className="flex gap-2">
            {['expense', 'income'].map(t => (
              <button key={t} type="button" onClick={() => set('type', t)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                  form.type === t
                    ? t === 'income' ? 'bg-emerald-600 text-white' : 'bg-red-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >{t}</button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Icon</label>
          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1">
            {ICONS.map(icon => (
              <button key={icon} type="button" onClick={() => set('icon', icon)}
                className={`w-9 h-9 text-lg rounded-lg transition-all ${form.icon === icon ? 'ring-2 ring-indigo-500 bg-indigo-50 scale-110' : 'bg-gray-100 hover:bg-gray-200'}`}
              >{icon}</button>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" className="btn-primary flex-1">{category ? 'Save Changes' : 'Add Category'}</button>
        </div>
      </form>
    </Modal>
  );
}

function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onCancel} />
      <div className="relative bg-white rounded-xl shadow-xl p-6 max-w-sm w-full">
        <h3 className="font-semibold text-gray-900 mb-2">Confirm Delete</h3>
        <p className="text-gray-500 text-sm mb-5">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-secondary flex-1">Cancel</button>
          <button onClick={onConfirm} className="btn-danger flex-1">Delete</button>
        </div>
      </div>
    </div>
  );
}

export default function Categories() {
  const { getCategories, createCategory, updateCategory, deleteCategory } = useFinance();
  const [tab, setTab] = useState('expense');
  const [modal, setModal] = useState(null); // null | 'add' | category obj
  const [confirm, setConfirm] = useState(null);

  const cats = getCategories(tab);
  const incomeCount = getCategories('income').length;
  const expenseCount = getCategories('expense').length;

  const handleSave = (form) => {
    if (modal === 'add') createCategory(form);
    else updateCategory(modal.id, form);
    setModal(null);
  };

  return (
    <Layout>
      <div className="p-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
            <p className="text-gray-500 text-sm mt-1">Organize your transactions</p>
          </div>
          <button onClick={() => setModal('add')} className="btn-primary">+ New Category</button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit mb-6">
          {[
            { key: 'expense', label: `Expense (${expenseCount})` },
            { key: 'income',  label: `Income (${incomeCount})` },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-5 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >{label}</button>
          ))}
        </div>

        {/* Category grid */}
        {cats.length === 0 ? (
          <div className="card text-center py-12">
            <div className="text-4xl mb-3">🏷️</div>
            <p className="text-gray-500 text-sm">No {tab} categories yet.</p>
            <button onClick={() => setModal('add')} className="btn-primary mt-4 text-sm">Add Category</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {cats.map(cat => (
              <div key={cat.id} className="card flex items-center gap-4 p-4 group hover:shadow-md transition-shadow">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${tab === 'income' ? 'bg-emerald-50' : 'bg-red-50'}`}>
                  {cat.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{cat.name}</p>
                  {cat.isDefault && <span className="text-xs text-gray-400">Default</span>}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button onClick={() => setModal(cat)}
                    className="px-2.5 py-1 text-xs text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors font-medium">
                    Edit
                  </button>
                  <button onClick={() => setConfirm(cat)}
                    className="px-2.5 py-1 text-xs text-red-500 hover:bg-red-50 rounded-lg transition-colors font-medium">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <CategoryModal
          category={modal === 'add' ? null : modal}
          defaultType={tab}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}

      {confirm && (
        <ConfirmDialog
          message={`Delete "${confirm.name}"? Existing transactions won't be affected.`}
          onConfirm={() => { deleteCategory(confirm.id); setConfirm(null); }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </Layout>
  );
}
