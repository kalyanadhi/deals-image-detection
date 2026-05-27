import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import TransactionForm from '../components/TransactionForm';
import ShareWalletModal from '../components/ShareWalletModal';
import { formatCurrency } from '../components/WalletCard';

const colorBg = {
  indigo: 'from-indigo-600 to-indigo-700', emerald: 'from-emerald-600 to-emerald-700',
  rose: 'from-rose-600 to-rose-700', amber: 'from-amber-500 to-amber-600',
  violet: 'from-violet-600 to-violet-700', cyan: 'from-cyan-600 to-cyan-700',
  orange: 'from-orange-500 to-orange-600', teal: 'from-teal-600 to-teal-700',
};

export default function WalletDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getWalletById, getTransactions, getWalletBalance, deleteWallet, deleteTransaction, canEdit, isOwner } = useFinance();
  const { currentUser } = useAuth();
  const [showAdd, setShowAdd] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [filter, setFilter] = useState('all');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const wallet = getWalletById(id);
  if (!wallet) return (
    <Layout>
      <div className="p-6 text-center">
        <p className="text-gray-500">Wallet not found.</p>
        <button onClick={() => navigate('/wallets')} className="btn-primary mt-4">Back to Wallets</button>
      </div>
    </Layout>
  );

  const allTxns = getTransactions(id).sort((a, b) => new Date(b.date) - new Date(a.date));
  const txns = filter === 'all' ? allTxns : allTxns.filter(t => t.type === filter);
  const balance = getWalletBalance(id);
  const income = allTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = allTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const editable = canEdit(wallet);
  const owner = isOwner(wallet);

  const handleDelete = () => {
    deleteWallet(id);
    navigate('/wallets');
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className={`bg-gradient-to-br ${colorBg[wallet.color] || colorBg.indigo} text-white px-6 pt-8 pb-6`}>
          <button onClick={() => navigate(-1)} className="text-white text-opacity-70 hover:text-opacity-100 text-sm mb-4 flex items-center gap-1">
            ← Back
          </button>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-4xl mb-2">{wallet.icon}</div>
              <h1 className="text-2xl font-bold">{wallet.name}</h1>
              {wallet.description && <p className="text-white text-opacity-75 text-sm mt-1">{wallet.description}</p>}
            </div>
            <div className="flex gap-2">
              {owner && (
                <button onClick={() => setShowShare(true)} className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white text-sm px-3 py-1.5 rounded-lg transition-colors">
                  Share
                </button>
              )}
              {editable && (
                <button onClick={() => setShowAdd(true)} className="bg-white text-indigo-700 hover:bg-indigo-50 text-sm px-3 py-1.5 rounded-lg transition-colors font-medium">
                  + Transaction
                </button>
              )}
            </div>
          </div>
          <div className="mt-6 grid grid-cols-3 gap-4">
            <div>
              <p className="text-white text-opacity-70 text-xs">Balance</p>
              <p className="text-xl font-bold">{formatCurrency(balance, wallet.currency)}</p>
            </div>
            <div>
              <p className="text-white text-opacity-70 text-xs">Income</p>
              <p className="text-lg font-semibold text-green-300">{formatCurrency(income, wallet.currency)}</p>
            </div>
            <div>
              <p className="text-white text-opacity-70 text-xs">Expenses</p>
              <p className="text-lg font-semibold text-red-300">{formatCurrency(expense, wallet.currency)}</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="card mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">Members</h3>
              {owner && <button onClick={() => setShowShare(true)} className="text-xs text-indigo-600 hover:underline">Manage access</button>}
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-2 bg-indigo-50 rounded-full px-3 py-1.5">
                <div className="w-5 h-5 rounded-full bg-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-xs">
                  {wallet.ownerName?.[0]?.toUpperCase()}
                </div>
                <span className="text-xs text-indigo-700 font-medium">{wallet.ownerName} (owner)</span>
              </div>
              {(wallet.members || []).map(m => (
                <div key={m.userId} className="flex items-center gap-2 bg-gray-100 rounded-full px-3 py-1.5">
                  <div className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-bold text-xs">
                    {m.userName?.[0]?.toUpperCase()}
                  </div>
                  <span className="text-xs text-gray-700">{m.userName} ({m.role})</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Transactions</h2>
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              {['all', 'income', 'expense'].map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-colors ${filter === f ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                >{f}</button>
              ))}
            </div>
          </div>

          {txns.length === 0 ? (
            <div className="card text-center py-12">
              <div className="text-3xl mb-3">📋</div>
              <p className="text-gray-500 text-sm">{filter === 'all' ? 'No transactions yet' : `No ${filter} transactions`}</p>
              {editable && filter === 'all' && (
                <button onClick={() => setShowAdd(true)} className="btn-primary mt-4 text-sm">Add First Transaction</button>
              )}
            </div>
          ) : (
            <div className="card p-0 overflow-hidden">
              <div className="divide-y divide-gray-50">
                {txns.map(t => (
                  <div key={t.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 group">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${t.type === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                      {t.type === 'income' ? '↑' : '↓'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{t.category}</p>
                      <p className="text-xs text-gray-500">{t.description ? `${t.description} • ` : ''}{t.date}</p>
                      {t.createdByName && t.createdBy !== currentUser?.id && (
                        <p className="text-xs text-indigo-500">by {t.createdByName}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-semibold ${t.type === 'income' ? 'text-emerald-600' : 'text-red-500'}`}>
                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount, wallet.currency)}
                      </span>
                      {editable && (
                        <button onClick={() => deleteTransaction(t.id)}
                          className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all text-lg leading-none">×</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {owner && (
            <div className="mt-8 border border-red-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-red-700 mb-2">Danger Zone</h3>
              {!confirmDelete ? (
                <button onClick={() => setConfirmDelete(true)} className="btn-danger text-sm py-1.5">Delete Wallet</button>
              ) : (
                <div className="flex items-center gap-3">
                  <p className="text-sm text-gray-600">This will delete all transactions. Are you sure?</p>
                  <button onClick={handleDelete} className="btn-danger text-sm py-1.5">Yes, Delete</button>
                  <button onClick={() => setConfirmDelete(false)} className="btn-secondary text-sm py-1.5">Cancel</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showAdd && <TransactionForm walletId={id} onClose={() => setShowAdd(false)} />}
      {showShare && <ShareWalletModal wallet={getWalletById(id)} onClose={() => setShowShare(false)} />}
    </Layout>
  );
}
