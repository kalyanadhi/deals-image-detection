import React, { createContext, useContext, useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from './AuthContext';

const FinanceContext = createContext(null);

const WALLET_COLORS = ['indigo', 'emerald', 'rose', 'amber', 'violet', 'cyan', 'orange', 'teal'];
const WALLET_ICONS = ['💳', '🏦', '💰', '💼', '🏠', '✈️', '🎓', '🛒'];

const load = (key) => {
  try { return JSON.parse(localStorage.getItem(key)) || []; }
  catch { return []; }
};
const save = (key, data) => localStorage.setItem(key, JSON.stringify(data));

export function FinanceProvider({ children }) {
  const { currentUser } = useAuth();
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick(t => t + 1), []);

  const getWallets = useCallback(() => {
    if (!currentUser) return [];
    return load('finapp_wallets').filter(w =>
      w.ownerId === currentUser.id || (w.members || []).some(m => m.userId === currentUser.id)
    );
  }, [currentUser, tick]);

  const getAllWallets = () => load('finapp_wallets');

  const getTransactions = useCallback((walletId) => {
    const txns = load('finapp_transactions');
    return walletId ? txns.filter(t => t.walletId === walletId) : txns;
  }, [tick]);

  const createWallet = (data) => {
    const wallets = load('finapp_wallets');
    const wallet = {
      id: uuidv4(),
      name: data.name,
      description: data.description || '',
      currency: data.currency || 'USD',
      color: data.color || WALLET_COLORS[0],
      icon: data.icon || WALLET_ICONS[0],
      ownerId: currentUser.id,
      ownerName: currentUser.name,
      members: [],
      createdAt: Date.now(),
    };
    save('finapp_wallets', [...wallets, wallet]);
    refresh();
    return wallet;
  };

  const updateWallet = (id, data) => {
    const wallets = load('finapp_wallets');
    const updated = wallets.map(w => w.id === id ? { ...w, ...data } : w);
    save('finapp_wallets', updated);
    refresh();
  };

  const deleteWallet = (id) => {
    const wallets = load('finapp_wallets').filter(w => w.id !== id);
    const txns = load('finapp_transactions').filter(t => t.walletId !== id);
    save('finapp_wallets', wallets);
    save('finapp_transactions', txns);
    refresh();
  };

  const addMember = (walletId, userId, userName, userEmail, role = 'editor') => {
    const wallets = load('finapp_wallets');
    const updated = wallets.map(w => {
      if (w.id !== walletId) return w;
      const existing = (w.members || []).find(m => m.userId === userId);
      if (existing) throw new Error('User already has access');
      return { ...w, members: [...(w.members || []), { userId, userName, userEmail, role }] };
    });
    save('finapp_wallets', updated);
    refresh();
  };

  const removeMember = (walletId, userId) => {
    const wallets = load('finapp_wallets');
    const updated = wallets.map(w =>
      w.id === walletId ? { ...w, members: (w.members || []).filter(m => m.userId !== userId) } : w
    );
    save('finapp_wallets', updated);
    refresh();
  };

  const updateMemberRole = (walletId, userId, role) => {
    const wallets = load('finapp_wallets');
    const updated = wallets.map(w =>
      w.id === walletId
        ? { ...w, members: (w.members || []).map(m => m.userId === userId ? { ...m, role } : m) }
        : w
    );
    save('finapp_wallets', updated);
    refresh();
  };

  const addTransaction = (data) => {
    const txns = load('finapp_transactions');
    const txn = {
      id: uuidv4(),
      walletId: data.walletId,
      type: data.type,
      amount: parseFloat(data.amount),
      category: data.category,
      description: data.description || '',
      date: data.date || new Date().toISOString().split('T')[0],
      createdBy: currentUser.id,
      createdByName: currentUser.name,
      createdAt: Date.now(),
    };
    save('finapp_transactions', [...txns, txn]);
    refresh();
    return txn;
  };

  const deleteTransaction = (id) => {
    const txns = load('finapp_transactions').filter(t => t.id !== id);
    save('finapp_transactions', txns);
    refresh();
  };

  const getWalletBalance = (walletId) => {
    const txns = load('finapp_transactions').filter(t => t.walletId === walletId);
    return txns.reduce((acc, t) => t.type === 'income' ? acc + t.amount : acc - t.amount, 0);
  };

  const getWalletById = (id) => load('finapp_wallets').find(w => w.id === id) || null;

  const canEdit = (wallet) => {
    if (!currentUser || !wallet) return false;
    if (wallet.ownerId === currentUser.id) return true;
    const member = (wallet.members || []).find(m => m.userId === currentUser.id);
    return member && member.role === 'editor';
  };

  const isOwner = (wallet) => currentUser && wallet && wallet.ownerId === currentUser.id;

  return (
    <FinanceContext.Provider value={{
      getWallets, getWalletById, createWallet, updateWallet, deleteWallet,
      addMember, removeMember, updateMemberRole,
      getTransactions, addTransaction, deleteTransaction,
      getWalletBalance, canEdit, isOwner,
      WALLET_COLORS, WALLET_ICONS, refresh,
    }}>
      {children}
    </FinanceContext.Provider>
  );
}

export const useFinance = () => useContext(FinanceContext);
