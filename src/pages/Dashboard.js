import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useFinance } from '../context/FinanceContext';
import Layout from '../components/Layout';
import WalletCard from '../components/WalletCard';
import CreateWalletModal from '../components/CreateWalletModal';
import { formatCurrency } from '../components/WalletCard';

export default function Dashboard() {
  const { currentUser } = useAuth();
  const { getWallets, getTransactions, getWalletBalance } = useFinance();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);

  const wallets = getWallets();

  const totalBalance = useMemo(() =>
    wallets.reduce((sum, w) => sum + getWalletBalance(w.id), 0), [wallets]);

  const allTxns = useMemo(() => {
    const txns = [];
    wallets.forEach(w => {
      getTransactions(w.id).forEach(t => txns.push({ ...t, walletName: w.name, walletColor: w.color, walletIcon: w.icon }));
    });
    return txns.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [wallets]);

  const thisMonth = useMemo(() => {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthTxns = allTxns.filter(t => t.date.startsWith(month));
    return {
      income: monthTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
      expense: monthTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    };
  }, [allTxns]);

  const recentTxns = allTxns.slice(0, 8);

  const colorMap = { indigo: 'bg-indigo-600', emerald: 'bg-emerald-600', rose: 'bg-rose-600', amber: 'bg-amber-500', violet: 'bg-violet-600', cyan: 'bg-cyan-600', orange: 'bg-orange-500', teal: 'bg-teal-600' };

  return (
    <Layout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Good {getGreeting()}, {currentUser?.name?.split(' ')[0]}</h1>
          <p className="text-gray-500 text-sm mt-1">Here's your financial overview</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="card bg-gradient-to-br from-indigo-600 to-indigo-700 text-white border-0">
            <p className="text-indigo-200 text-sm mb-1">Total Balance</p>
            <p className="text-3xl font-bold">{formatCurrency(totalBalance)}</p>
            <p className="text-indigo-200 text-xs mt-1">across {wallets.length} wallet{wallets.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="card">
            <p className="text-gray-500 text-sm mb-1">This Month Income</p>
            <p className="text-2xl font-bold text-emerald-600">{formatCurrency(thisMonth.income)}</p>
            <p className="text-gray-400 text-xs mt-1">↑ Money in</p>
          </div>
          <div className="card">
            <p className="text-gray-500 text-sm mb-1">This Month Expenses</p>
            <p className="text-2xl font-bold text-red-500">{formatCurrency(thisMonth.expense)}</p>
            <p className="text-gray-400 text-xs mt-1">↓ Money out</p>
          </div>
        </div>

        {/* Wallets */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">My Wallets</h2>
          <button onClick={() => setShowCreate(true)} className="btn-primary text-sm py-1.5 px-3">+ New Wallet</button>
        </div>

        {wallets.length === 0 ? (
          <div className="card text-center py-12 mb-8">
            <div className="text-4xl mb-3">👛</div>
            <h3 className="font-semibold text-gray-900 mb-1">No wallets yet</h3>
            <p className="text-gray-500 text-sm mb-4">Create your first wallet to start tracking finances</p>
            <button onClick={() => setShowCreate(true)} className="btn-primary">Create Wallet</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {wallets.map(w => <WalletCard key={w.id} wallet={w} />)}
            <div
              onClick={() => setShowCreate(true)}
              className="rounded-xl border-2 border-dashed border-gray-200 hover:border-indigo-300 transition-colors cursor-pointer flex flex-col items-center justify-center p-8 text-gray-400 hover:text-indigo-600 min-h-[150px]"
            >
              <span className="text-3xl mb-2">+</span>
              <span className="text-sm font-medium">Add Wallet</span>
            </div>
          </div>
        )}

        {/* Recent Transactions */}
        {recentTxns.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Transactions</h2>
            <div className="card p-0 overflow-hidden">
              <div className="divide-y divide-gray-50">
                {recentTxns.map(t => (
                  <div key={t.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/wallets/${t.walletId}`)}>
                    <div className={`w-10 h-10 rounded-full ${colorMap[t.walletColor] || 'bg-indigo-600'} flex items-center justify-center text-lg flex-shrink-0`}>
                      {t.walletIcon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{t.category}</p>
                      <p className="text-xs text-gray-500">{t.walletName} • {t.date}</p>
                    </div>
                    <span className={`text-sm font-semibold ${t.type === 'income' ? 'text-emerald-600' : 'text-red-500'}`}>
                      {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {showCreate && <CreateWalletModal onClose={() => setShowCreate(false)} />}
    </Layout>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
