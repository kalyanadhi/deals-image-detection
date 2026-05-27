import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import Layout from '../components/Layout';
import WalletCard from '../components/WalletCard';
import CreateWalletModal from '../components/CreateWalletModal';

export default function Wallets() {
  const { getWallets } = useFinance();
  const [showCreate, setShowCreate] = useState(false);
  const wallets = getWallets();
  const owned = wallets.filter(w => w.ownerId);
  const shared = wallets.filter(w => !w.ownerId);

  return (
    <Layout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Wallets</h1>
            <p className="text-gray-500 text-sm mt-1">{wallets.length} wallet{wallets.length !== 1 ? 's' : ''} total</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary">+ New Wallet</button>
        </div>

        {wallets.length === 0 ? (
          <div className="card text-center py-16">
            <div className="text-5xl mb-4">👛</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No wallets yet</h3>
            <p className="text-gray-500 text-sm mb-6">Create wallets to track your spending, savings, and more.</p>
            <button onClick={() => setShowCreate(true)} className="btn-primary">Create Your First Wallet</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {wallets.map(w => <WalletCard key={w.id} wallet={w} />)}
            <div
              onClick={() => setShowCreate(true)}
              className="rounded-xl border-2 border-dashed border-gray-200 hover:border-indigo-300 transition-colors cursor-pointer flex flex-col items-center justify-center p-8 text-gray-400 hover:text-indigo-600 min-h-[180px]"
            >
              <span className="text-3xl mb-2">+</span>
              <span className="text-sm font-medium">Add New Wallet</span>
            </div>
          </div>
        )}
      </div>

      {showCreate && <CreateWalletModal onClose={() => setShowCreate(false)} />}
    </Layout>
  );
}
