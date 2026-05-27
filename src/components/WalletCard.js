import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';

const colorMap = {
  indigo: { bg: 'bg-indigo-600', light: 'bg-indigo-50', text: 'text-indigo-700' },
  emerald: { bg: 'bg-emerald-600', light: 'bg-emerald-50', text: 'text-emerald-700' },
  rose: { bg: 'bg-rose-600', light: 'bg-rose-50', text: 'text-rose-700' },
  amber: { bg: 'bg-amber-500', light: 'bg-amber-50', text: 'text-amber-700' },
  violet: { bg: 'bg-violet-600', light: 'bg-violet-50', text: 'text-violet-700' },
  cyan: { bg: 'bg-cyan-600', light: 'bg-cyan-50', text: 'text-cyan-700' },
  orange: { bg: 'bg-orange-500', light: 'bg-orange-50', text: 'text-orange-700' },
  teal: { bg: 'bg-teal-600', light: 'bg-teal-50', text: 'text-teal-700' },
};

export function formatCurrency(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

export default function WalletCard({ wallet }) {
  const { getWalletBalance, isOwner } = useFinance();
  const navigate = useNavigate();
  const balance = getWalletBalance(wallet.id);
  const colors = colorMap[wallet.color] || colorMap.indigo;

  return (
    <div
      onClick={() => navigate(`/wallets/${wallet.id}`)}
      className="cursor-pointer rounded-xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow bg-white"
    >
      <div className={`${colors.bg} p-5 text-white`}>
        <div className="flex items-start justify-between mb-4">
          <div className="text-3xl">{wallet.icon}</div>
          <div className="flex flex-col items-end gap-1">
            {isOwner(wallet) ? (
              <span className="badge bg-white bg-opacity-25 text-white text-xs">Owner</span>
            ) : (
              <span className="badge bg-white bg-opacity-25 text-white text-xs">Shared</span>
            )}
            <span className="text-xs text-white text-opacity-80">{wallet.currency}</span>
          </div>
        </div>
        <p className="text-sm text-white text-opacity-80 mb-1">{wallet.name}</p>
        <p className="text-2xl font-bold">{formatCurrency(balance, wallet.currency)}</p>
      </div>
      <div className="px-5 py-3 flex items-center justify-between">
        <p className="text-xs text-gray-500 truncate max-w-[60%]">{wallet.description || 'No description'}</p>
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-400">{(wallet.members || []).length + 1}</span>
          <span className="text-xs text-gray-400">members</span>
        </div>
      </div>
    </div>
  );
}
