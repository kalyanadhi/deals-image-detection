import React, { createContext, useContext, useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from './AuthContext';

const FinanceContext = createContext(null);

const WALLET_COLORS = ['indigo', 'emerald', 'rose', 'amber', 'violet', 'cyan', 'orange', 'teal'];
const WALLET_ICONS = ['💳', '🏦', '💰', '💼', '🏠', '✈️', '🎓', '🛒'];

const DEFAULT_CATEGORIES = [
  { name: 'Salary',       type: 'income',  icon: '💵' },
  { name: 'Freelance',    type: 'income',  icon: '💻' },
  { name: 'Investment',   type: 'income',  icon: '📈' },
  { name: 'Gift',         type: 'income',  icon: '🎁' },
  { name: 'Refund',       type: 'income',  icon: '↩️' },
  { name: 'Other Income', type: 'income',  icon: '💰' },
  { name: 'Food & Dining',  type: 'expense', icon: '🍔' },
  { name: 'Shopping',       type: 'expense', icon: '🛍️' },
  { name: 'Transport',      type: 'expense', icon: '🚗' },
  { name: 'Housing',        type: 'expense', icon: '🏠' },
  { name: 'Entertainment',  type: 'expense', icon: '🎬' },
  { name: 'Health',         type: 'expense', icon: '💊' },
  { name: 'Education',      type: 'expense', icon: '📚' },
  { name: 'Travel',         type: 'expense', icon: '✈️' },
  { name: 'Bills',          type: 'expense', icon: '📄' },
  { name: 'Other',          type: 'expense', icon: '📦' },
];

const load = (key) => {
  try { return JSON.parse(localStorage.getItem(key)) || []; }
  catch { return []; }
};
const save = (key, data) => localStorage.setItem(key, JSON.stringify(data));

export function FinanceProvider({ children }) {
  const { currentUser } = useAuth();
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick(t => t + 1), []);

  // ── Wallets ──────────────────────────────────────────────────────────────

  const getWallets = useCallback(() => {
    if (!currentUser) return [];
    return load('finapp_wallets').filter(w =>
      w.ownerId === currentUser.id || (w.members || []).some(m => m.userId === currentUser.id)
    );
  }, [currentUser, tick]);

  const getWalletById = (id) => load('finapp_wallets').find(w => w.id === id) || null;

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
    const updated = load('finapp_wallets').map(w => w.id === id ? { ...w, ...data } : w);
    save('finapp_wallets', updated);
    refresh();
  };

  const deleteWallet = (id) => {
    save('finapp_wallets', load('finapp_wallets').filter(w => w.id !== id));
    save('finapp_transactions', load('finapp_transactions').filter(t => t.walletId !== id));
    save('finapp_budgets', load('finapp_budgets').filter(b => b.walletId !== id));
    refresh();
  };

  const addMember = (walletId, userId, userName, userEmail, role = 'editor') => {
    const updated = load('finapp_wallets').map(w => {
      if (w.id !== walletId) return w;
      if ((w.members || []).find(m => m.userId === userId)) throw new Error('User already has access');
      return { ...w, members: [...(w.members || []), { userId, userName, userEmail, role }] };
    });
    save('finapp_wallets', updated);
    refresh();
  };

  const removeMember = (walletId, userId) => {
    const updated = load('finapp_wallets').map(w =>
      w.id === walletId ? { ...w, members: (w.members || []).filter(m => m.userId !== userId) } : w
    );
    save('finapp_wallets', updated);
    refresh();
  };

  const updateMemberRole = (walletId, userId, role) => {
    const updated = load('finapp_wallets').map(w =>
      w.id === walletId
        ? { ...w, members: (w.members || []).map(m => m.userId === userId ? { ...m, role } : m) }
        : w
    );
    save('finapp_wallets', updated);
    refresh();
  };

  const canEdit = (wallet) => {
    if (!currentUser || !wallet) return false;
    if (wallet.ownerId === currentUser.id) return true;
    const member = (wallet.members || []).find(m => m.userId === currentUser.id);
    return member && member.role === 'editor';
  };

  const isOwner = (wallet) => currentUser && wallet && wallet.ownerId === currentUser.id;

  // ── Transactions ──────────────────────────────────────────────────────────

  const getTransactions = useCallback((walletId) => {
    const txns = load('finapp_transactions');
    return walletId ? txns.filter(t => t.walletId === walletId) : txns;
  }, [tick]);

  const addTransaction = (data) => {
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
    save('finapp_transactions', [...load('finapp_transactions'), txn]);
    refresh();
    return txn;
  };

  const deleteTransaction = (id) => {
    save('finapp_transactions', load('finapp_transactions').filter(t => t.id !== id));
    refresh();
  };

  const getWalletBalance = (walletId) => {
    return load('finapp_transactions')
      .filter(t => t.walletId === walletId)
      .reduce((acc, t) => t.type === 'income' ? acc + t.amount : acc - t.amount, 0);
  };

  // ── Categories ────────────────────────────────────────────────────────────

  const _seedCategories = (userId) => {
    const all = load('finapp_categories');
    if (all.some(c => c.userId === userId)) return;
    const seeded = DEFAULT_CATEGORIES.map(cat => ({
      id: uuidv4(), ...cat, userId, isDefault: true, createdAt: Date.now(),
    }));
    save('finapp_categories', [...all, ...seeded]);
  };

  const getCategories = useCallback((type = null) => {
    if (!currentUser) return [];
    _seedCategories(currentUser.id);
    const cats = load('finapp_categories').filter(c => c.userId === currentUser.id);
    return type ? cats.filter(c => c.type === type) : cats;
  }, [currentUser, tick]);

  const createCategory = (data) => {
    const cat = {
      id: uuidv4(),
      name: data.name.trim(),
      type: data.type,
      icon: data.icon || '📌',
      userId: currentUser.id,
      isDefault: false,
      createdAt: Date.now(),
    };
    save('finapp_categories', [...load('finapp_categories'), cat]);
    refresh();
    return cat;
  };

  const updateCategory = (id, data) => {
    const updated = load('finapp_categories').map(c => c.id === id ? { ...c, ...data } : c);
    save('finapp_categories', updated);
    refresh();
  };

  const deleteCategory = (id) => {
    save('finapp_categories', load('finapp_categories').filter(c => c.id !== id));
    refresh();
  };

  // ── Budgets ───────────────────────────────────────────────────────────────

  const getBudgets = useCallback((walletId = null) => {
    if (!currentUser) return [];
    const budgets = load('finapp_budgets').filter(b => b.createdBy === currentUser.id);
    return walletId ? budgets.filter(b => b.walletId === walletId) : budgets;
  }, [currentUser, tick]);

  const createBudget = (data) => {
    const existing = load('finapp_budgets').find(
      b => b.createdBy === currentUser.id && b.walletId === data.walletId &&
           b.categoryName === data.categoryName && b.period === data.period
    );
    if (existing) throw new Error('A budget for this category and period already exists');
    const budget = {
      id: uuidv4(),
      walletId: data.walletId,
      categoryId: data.categoryId,
      categoryName: data.categoryName,
      categoryIcon: data.categoryIcon || '📌',
      amount: parseFloat(data.amount),
      period: data.period || 'monthly',
      createdBy: currentUser.id,
      createdAt: Date.now(),
    };
    save('finapp_budgets', [...load('finapp_budgets'), budget]);
    refresh();
    return budget;
  };

  const updateBudget = (id, data) => {
    const updated = load('finapp_budgets').map(b => b.id === id ? { ...b, ...data } : b);
    save('finapp_budgets', updated);
    refresh();
  };

  const deleteBudget = (id) => {
    save('finapp_budgets', load('finapp_budgets').filter(b => b.id !== id));
    refresh();
  };

  const getBudgetSpending = (budget) => {
    const now = new Date();
    return load('finapp_transactions')
      .filter(t => {
        if (t.walletId !== budget.walletId || t.type !== 'expense' || t.category !== budget.categoryName) return false;
        const d = new Date(t.date);
        if (budget.period === 'monthly') return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
        if (budget.period === 'weekly') {
          const start = new Date(now); start.setDate(now.getDate() - now.getDay()); start.setHours(0,0,0,0);
          return d >= start && d <= now;
        }
        if (budget.period === 'yearly') return d.getFullYear() === now.getFullYear();
        return false;
      })
      .reduce((s, t) => s + t.amount, 0);
  };

  return (
    <FinanceContext.Provider value={{
      // wallets
      getWallets, getWalletById, createWallet, updateWallet, deleteWallet,
      addMember, removeMember, updateMemberRole, canEdit, isOwner,
      // transactions
      getTransactions, addTransaction, deleteTransaction, getWalletBalance,
      // categories
      getCategories, createCategory, updateCategory, deleteCategory,
      // budgets
      getBudgets, createBudget, updateBudget, deleteBudget, getBudgetSpending,
      // constants
      WALLET_COLORS, WALLET_ICONS, DEFAULT_CATEGORIES, refresh,
    }}>
      {children}
    </FinanceContext.Provider>
  );
}

export const useFinance = () => useContext(FinanceContext);
