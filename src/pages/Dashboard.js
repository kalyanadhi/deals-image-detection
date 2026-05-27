import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useFinance } from '../context/FinanceContext';
import Layout from '../components/Layout';
import WalletCard from '../components/WalletCard';
import CreateWalletModal from '../components/CreateWalletModal';
import { formatCurrency } from '../components/WalletCard';

const colorBg = {
  indigo:'bg-indigo-600', emerald:'bg-emerald-600', rose:'bg-rose-600',
  amber:'bg-amber-500', violet:'bg-violet-600', cyan:'bg-cyan-600',
  orange:'bg-orange-500', teal:'bg-teal-600',
};

function GoalMiniCard({ goal, saved }) {
  const pct = Math.min((saved / goal.targetAmount) * 100, 100);
  const daysLeft = Math.ceil((new Date(goal.deadline) - new Date()) / 86400000);
  const isOverdue = daysLeft < 0 && goal.status !== 'completed';

  return (
    <div className="flex items-center gap-3 py-2">
      <div className={`w-9 h-9 rounded-lg ${colorBg[goal.color] || 'bg-indigo-600'} flex items-center justify-center text-lg flex-shrink-0`}>
        {goal.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-medium text-gray-900 truncate">{goal.name}</p>
          <span className="text-xs text-gray-500 ml-2 flex-shrink-0">{pct.toFixed(0)}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full ${goal.status === 'completed' ? 'bg-emerald-500' : isOverdue ? 'bg-red-500' : 'bg-indigo-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-0.5">
          {isOverdue ? <span className="text-red-500">{Math.abs(daysLeft)}d overdue</span>
            : goal.status === 'completed' ? <span className="text-emerald-600">Completed!</span>
            : `${daysLeft}d left`}
        </p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { currentUser } = useAuth();
  const {
    getWallets, getTransactions, getWalletBalance,
    getSavingsAccounts, getSavingsBalance,
    getPortfolioSummary, getGoals, getGoalSaved, getNetWorth,
  } = useFinance();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);

  const wallets   = getWallets();
  const goals     = getGoals().filter(g => g.status === 'active').slice(0, 4);
  const savings   = getSavingsAccounts();
  const { currentValue: investmentsValue } = getPortfolioSummary();
  const savingsTotal = savings.reduce((s, a) => s + getSavingsBalance(a.id), 0);
  const netWorth     = getNetWorth();

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
      income:  monthTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
      expense: monthTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    };
  }, [allTxns]);

  const recentTxns = allTxns.slice(0, 6);

  return (
    <Layout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Good {getGreeting()}, {currentUser?.name?.split(' ')[0]}
          </h1>
          <p className="text-gray-500 text-sm mt-1">Here's your financial overview</p>
        </div>

        {/* Net worth + month stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
          <div className="card bg-gradient-to-br from-indigo-600 to-violet-700 text-white border-0 sm:col-span-2">
            <p className="text-indigo-200 text-sm mb-1">Net Worth</p>
            <p className="text-3xl font-bold">{formatCurrency(netWorth)}</p>
            <div className="flex gap-4 mt-2">
              <span className="text-xs text-indigo-200">Wallets: {formatCurrency(totalBalance)}</span>
              <span className="text-xs text-indigo-200">Savings: {formatCurrency(savingsTotal)}</span>
              <span className="text-xs text-indigo-200">Investments: {formatCurrency(investmentsValue)}</span>
            </div>
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

        {/* Quick links */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { path: '/goals',       icon: '🎯', label: 'Goals',       color: 'indigo' },
            { path: '/savings',     icon: '🏦', label: 'Savings',     color: 'emerald' },
            { path: '/investments', icon: '📈', label: 'Investments', color: 'blue' },
          ].map(item => (
            <Link key={item.path} to={item.path}
              className="card flex flex-col items-center gap-2 py-4 hover:shadow-md transition-shadow cursor-pointer text-center"
            >
              <span className="text-3xl">{item.icon}</span>
              <span className="text-sm font-medium text-gray-700">{item.label}</span>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Wallets */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">My Wallets</h2>
              <button onClick={() => setShowCreate(true)} className="btn-primary text-sm py-1.5 px-3">+ New</button>
            </div>
            {wallets.length === 0 ? (
              <div className="card text-center py-8">
                <div className="text-3xl mb-2">👛</div>
                <p className="text-gray-500 text-sm mb-3">No wallets yet</p>
                <button onClick={() => setShowCreate(true)} className="btn-primary text-sm">Create Wallet</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {wallets.slice(0, 4).map(w => <WalletCard key={w.id} wallet={w} />)}
              </div>
            )}
          </div>

          {/* Goals sidebar */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Active Goals</h2>
              <Link to="/goals" className="text-sm text-indigo-600 hover:underline">View all</Link>
            </div>
            <div className="card">
              {goals.length === 0 ? (
                <div className="text-center py-6">
                  <div className="text-3xl mb-2">🎯</div>
                  <p className="text-gray-400 text-sm mb-3">No active goals</p>
                  <Link to="/goals" className="btn-primary text-xs py-1.5 px-3">Set a Goal</Link>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {goals.map(g => (
                    <GoalMiniCard key={g.id} goal={g} saved={getGoalSaved(g.id)} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        {recentTxns.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Transactions</h2>
            <div className="card p-0 overflow-hidden">
              <div className="divide-y divide-gray-50">
                {recentTxns.map(t => (
                  <div key={t.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/wallets/${t.walletId}`)}>
                    <div className={`w-10 h-10 rounded-full ${colorBg[t.walletColor] || 'bg-indigo-600'} flex items-center justify-center text-lg flex-shrink-0`}>
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
