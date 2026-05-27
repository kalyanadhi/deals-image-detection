import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useFinance } from '../context/FinanceContext';
import Layout from '../components/Layout';
import { formatCurrency } from '../components/WalletCard';

export default function Profile() {
  const { currentUser, logout } = useAuth();
  const { getWallets, getWalletBalance, getTransactions } = useFinance();
  const navigate = useNavigate();
  const wallets = getWallets();
  const totalBalance = wallets.reduce((s, w) => s + getWalletBalance(w.id), 0);
  const totalTxns = wallets.reduce((s, w) => s + getTransactions(w.id).length, 0);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Layout>
      <div className="p-6 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Profile</h1>

        <div className="card mb-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-2xl">
              {currentUser?.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{currentUser?.name}</h2>
              <p className="text-gray-500 text-sm">{currentUser?.email}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="card text-center">
            <p className="text-3xl font-bold text-indigo-600">{wallets.length}</p>
            <p className="text-gray-500 text-sm mt-1">Wallets</p>
          </div>
          <div className="card text-center">
            <p className="text-3xl font-bold text-gray-700">{totalTxns}</p>
            <p className="text-gray-500 text-sm mt-1">Transactions</p>
          </div>
          <div className="card text-center">
            <p className="text-xl font-bold text-emerald-600">{formatCurrency(totalBalance)}</p>
            <p className="text-gray-500 text-sm mt-1">Net Worth</p>
          </div>
        </div>

        <div className="card mb-4">
          <h3 className="font-semibold text-gray-900 mb-4">Account Details</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-gray-50">
              <span className="text-gray-500">Name</span>
              <span className="text-gray-900 font-medium">{currentUser?.name}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-500">Email</span>
              <span className="text-gray-900 font-medium">{currentUser?.email}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <p className="text-xs text-gray-400 mb-4">
            All data is stored locally in your browser using localStorage. No data is sent to any server.
          </p>
          <button onClick={handleLogout} className="btn-danger w-full">Sign Out</button>
        </div>
      </div>
    </Layout>
  );
}
