import React, { createContext, useContext, useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from './AuthContext';

const FinanceContext = createContext(null);

const WALLET_COLORS = ['indigo', 'emerald', 'rose', 'amber', 'blue', 'cyan', 'orange', 'teal'];
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

const GOAL_ICONS  = ['🎯','🏠','🚗','✈️','💍','🎓','💻','🏖️','🏋️','🎸','👶','🐶','💊','🌱','🛒'];
const GOAL_COLORS = ['indigo','emerald','rose','amber','blue','cyan','orange','teal'];
const INV_TYPES   = ['stock','crypto','etf','mutual_fund','bond','real_estate','other'];
const INV_TYPE_LABELS = { stock:'Stock', crypto:'Crypto', etf:'ETF', mutual_fund:'Mutual Fund', bond:'Bond', real_estate:'Real Estate', other:'Other' };

const load = (key) => { try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; } };
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
    const wallet = {
      id: uuidv4(), name: data.name, description: data.description || '',
      currency: data.currency || 'USD', color: data.color || WALLET_COLORS[0],
      icon: data.icon || WALLET_ICONS[0], ownerId: currentUser.id,
      ownerName: currentUser.name, members: [], createdAt: Date.now(),
    };
    save('finapp_wallets', [...load('finapp_wallets'), wallet]);
    refresh(); return wallet;
  };

  const updateWallet = (id, data) => {
    save('finapp_wallets', load('finapp_wallets').map(w => w.id === id ? { ...w, ...data } : w));
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
    save('finapp_wallets', updated); refresh();
  };

  const removeMember = (walletId, userId) => {
    save('finapp_wallets', load('finapp_wallets').map(w =>
      w.id === walletId ? { ...w, members: (w.members || []).filter(m => m.userId !== userId) } : w
    )); refresh();
  };

  const updateMemberRole = (walletId, userId, role) => {
    save('finapp_wallets', load('finapp_wallets').map(w =>
      w.id === walletId
        ? { ...w, members: (w.members || []).map(m => m.userId === userId ? { ...m, role } : m) }
        : w
    )); refresh();
  };

  const canEdit = (wallet) => {
    if (!currentUser || !wallet) return false;
    if (wallet.ownerId === currentUser.id) return true;
    const m = (wallet.members || []).find(m => m.userId === currentUser.id);
    return m && m.role === 'editor';
  };

  const isOwner = (wallet) => currentUser && wallet && wallet.ownerId === currentUser.id;

  // ── Transactions ──────────────────────────────────────────────────────────

  const getTransactions = useCallback((walletId) => {
    const txns = load('finapp_transactions');
    return walletId ? txns.filter(t => t.walletId === walletId) : txns;
  }, [tick]);

  const addTransaction = (data) => {
    const txn = {
      id: uuidv4(), walletId: data.walletId, type: data.type,
      amount: parseFloat(data.amount), category: data.category,
      description: data.description || '',
      date: data.date || new Date().toISOString().split('T')[0],
      createdBy: currentUser.id, createdByName: currentUser.name, createdAt: Date.now(),
    };
    save('finapp_transactions', [...load('finapp_transactions'), txn]);
    refresh(); return txn;
  };

  const deleteTransaction = (id) => {
    save('finapp_transactions', load('finapp_transactions').filter(t => t.id !== id)); refresh();
  };

  const getWalletBalance = (walletId) =>
    load('finapp_transactions').filter(t => t.walletId === walletId)
      .reduce((acc, t) => t.type === 'income' ? acc + t.amount : acc - t.amount, 0);

  // ── Categories ────────────────────────────────────────────────────────────

  const _seedCategories = (userId) => {
    const all = load('finapp_categories');
    if (all.some(c => c.userId === userId)) return;
    save('finapp_categories', [...all, ...DEFAULT_CATEGORIES.map(cat => ({
      id: uuidv4(), ...cat, userId, isDefault: true, createdAt: Date.now(),
    }))]);
  };

  const getCategories = useCallback((type = null) => {
    if (!currentUser) return [];
    _seedCategories(currentUser.id);
    const cats = load('finapp_categories').filter(c => c.userId === currentUser.id);
    return type ? cats.filter(c => c.type === type) : cats;
  }, [currentUser, tick]);

  const createCategory = (data) => {
    const cat = { id: uuidv4(), name: data.name.trim(), type: data.type, icon: data.icon || '📌', userId: currentUser.id, isDefault: false, createdAt: Date.now() };
    save('finapp_categories', [...load('finapp_categories'), cat]); refresh(); return cat;
  };

  const updateCategory = (id, data) => {
    save('finapp_categories', load('finapp_categories').map(c => c.id === id ? { ...c, ...data } : c)); refresh();
  };

  const deleteCategory = (id) => {
    save('finapp_categories', load('finapp_categories').filter(c => c.id !== id)); refresh();
  };

  // ── Budgets ───────────────────────────────────────────────────────────────

  const getBudgets = useCallback((walletId = null) => {
    if (!currentUser) return [];
    const budgets = load('finapp_budgets').filter(b => b.createdBy === currentUser.id);
    return walletId ? budgets.filter(b => b.walletId === walletId) : budgets;
  }, [currentUser, tick]);

  const createBudget = (data) => {
    const dup = load('finapp_budgets').find(b =>
      b.createdBy === currentUser.id && b.walletId === data.walletId &&
      b.categoryName === data.categoryName && b.period === data.period
    );
    if (dup) throw new Error('Budget for this category and period already exists');
    const budget = {
      id: uuidv4(), walletId: data.walletId, categoryId: data.categoryId,
      categoryName: data.categoryName, categoryIcon: data.categoryIcon || '📌',
      amount: parseFloat(data.amount), period: data.period || 'monthly',
      createdBy: currentUser.id, createdAt: Date.now(),
    };
    save('finapp_budgets', [...load('finapp_budgets'), budget]); refresh(); return budget;
  };

  const updateBudget = (id, data) => {
    save('finapp_budgets', load('finapp_budgets').map(b => b.id === id ? { ...b, ...data } : b)); refresh();
  };

  const deleteBudget = (id) => {
    save('finapp_budgets', load('finapp_budgets').filter(b => b.id !== id)); refresh();
  };

  const getBudgetSpending = (budget) => {
    const now = new Date();
    return load('finapp_transactions').filter(t => {
      if (t.walletId !== budget.walletId || t.type !== 'expense' || t.category !== budget.categoryName) return false;
      const d = new Date(t.date);
      if (budget.period === 'monthly') return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      if (budget.period === 'weekly') {
        const start = new Date(now); start.setDate(now.getDate() - now.getDay()); start.setHours(0,0,0,0);
        return d >= start && d <= now;
      }
      if (budget.period === 'yearly') return d.getFullYear() === now.getFullYear();
      return false;
    }).reduce((s, t) => s + t.amount, 0);
  };

  // ── Goals ─────────────────────────────────────────────────────────────────

  const getGoals = useCallback(() => {
    if (!currentUser) return [];
    return load('finapp_goals').filter(g => g.userId === currentUser.id)
      .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
  }, [currentUser, tick]);

  const createGoal = (data) => {
    const goal = {
      id: uuidv4(), userId: currentUser.id, name: data.name.trim(),
      description: data.description || '', targetAmount: parseFloat(data.targetAmount),
      deadline: data.deadline, icon: data.icon || '🎯', color: data.color || 'indigo',
      currency: data.currency || 'USD',
      status: 'active', createdAt: Date.now(),
    };
    save('finapp_goals', [...load('finapp_goals'), goal]); refresh(); return goal;
  };

  const updateGoal = (id, data) => {
    save('finapp_goals', load('finapp_goals').map(g => g.id === id ? { ...g, ...data } : g)); refresh();
  };

  const deleteGoal = (id) => {
    save('finapp_goals', load('finapp_goals').filter(g => g.id !== id));
    save('finapp_goal_contribs', load('finapp_goal_contribs').filter(c => c.goalId !== id));
    refresh();
  };

  const getGoalSaved = (goalId) =>
    load('finapp_goal_contribs').filter(c => c.goalId === goalId).reduce((s, c) => s + c.amount, 0);

  const addGoalContribution = (goalId, amount, note = '', date) => {
    const contrib = {
      id: uuidv4(), goalId, amount: parseFloat(amount), note,
      date: date || new Date().toISOString().split('T')[0], createdAt: Date.now(),
    };
    save('finapp_goal_contribs', [...load('finapp_goal_contribs'), contrib]);
    // auto-complete when target reached
    const goal = load('finapp_goals').find(g => g.id === goalId);
    if (goal && getGoalSaved(goalId) + parseFloat(amount) >= goal.targetAmount) {
      save('finapp_goals', load('finapp_goals').map(g => g.id === goalId ? { ...g, status: 'completed' } : g));
    }
    refresh();
  };

  const getGoalContributions = (goalId) =>
    load('finapp_goal_contribs').filter(c => c.goalId === goalId)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

  // ── Savings ───────────────────────────────────────────────────────────────

  const getSavingsAccounts = useCallback(() => {
    if (!currentUser) return [];
    return load('finapp_savings').filter(s => s.userId === currentUser.id);
  }, [currentUser, tick]);

  const createSavingsAccount = (data) => {
    const acct = {
      id: uuidv4(), userId: currentUser.id, name: data.name.trim(),
      interestRate: parseFloat(data.interestRate) || 0,
      compounding: data.compounding || 'monthly',
      currency: data.currency || 'USD', icon: data.icon || '🏦',
      color: data.color || 'emerald', createdAt: Date.now(),
    };
    save('finapp_savings', [...load('finapp_savings'), acct]); refresh(); return acct;
  };

  const updateSavingsAccount = (id, data) => {
    save('finapp_savings', load('finapp_savings').map(s => s.id === id ? { ...s, ...data } : s)); refresh();
  };

  const deleteSavingsAccount = (id) => {
    save('finapp_savings', load('finapp_savings').filter(s => s.id !== id));
    save('finapp_savings_txns', load('finapp_savings_txns').filter(t => t.savingsId !== id));
    refresh();
  };

  const getSavingsBalance = (savingsId) =>
    load('finapp_savings_txns').filter(t => t.savingsId === savingsId)
      .reduce((s, t) => t.type === 'deposit' ? s + t.amount : s - t.amount, 0);

  const getSavingsTransactions = (savingsId) =>
    load('finapp_savings_txns').filter(t => t.savingsId === savingsId)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

  const addSavingsTransaction = (savingsId, type, amount, note = '', date) => {
    const txn = {
      id: uuidv4(), savingsId, type, amount: parseFloat(amount), note,
      date: date || new Date().toISOString().split('T')[0], createdAt: Date.now(),
    };
    save('finapp_savings_txns', [...load('finapp_savings_txns'), txn]); refresh();
  };

  const projectSavingsGrowth = (principal, annualRate, compounding, years) => {
    const n = { monthly: 12, quarterly: 4, annually: 1 }[compounding] || 12;
    const r = annualRate / 100;
    return [1, 2, 5, 10].filter(y => y <= years + 1).map(y => ({
      year: y,
      amount: r === 0 ? principal : principal * Math.pow(1 + r / n, n * y),
    }));
  };

  // ── Investments ───────────────────────────────────────────────────────────

  const getInvestments = useCallback(() => {
    if (!currentUser) return [];
    return load('finapp_investments').filter(i => i.userId === currentUser.id);
  }, [currentUser, tick]);

  const createInvestment = (data) => {
    const inv = {
      id: uuidv4(), userId: currentUser.id, name: data.name.trim(),
      ticker: (data.ticker || '').toUpperCase(),
      type: data.type || 'stock', quantity: parseFloat(data.quantity),
      purchasePrice: parseFloat(data.purchasePrice),
      currentPrice: parseFloat(data.currentPrice || data.purchasePrice),
      currency: data.currency || 'USD',
      purchaseDate: data.purchaseDate || new Date().toISOString().split('T')[0],
      notes: data.notes || '', createdAt: Date.now(),
    };
    save('finapp_investments', [...load('finapp_investments'), inv]); refresh(); return inv;
  };

  const updateInvestment = (id, data) => {
    save('finapp_investments', load('finapp_investments').map(i => i.id === id ? { ...i, ...data } : i)); refresh();
  };

  const deleteInvestment = (id) => {
    save('finapp_investments', load('finapp_investments').filter(i => i.id !== id)); refresh();
  };

  const getPortfolioSummary = () => {
    const invs = load('finapp_investments').filter(i => i.userId === currentUser?.id);
    const totalInvested = invs.reduce((s, i) => s + i.purchasePrice * i.quantity, 0);
    const currentValue  = invs.reduce((s, i) => s + i.currentPrice  * i.quantity, 0);
    return { totalInvested, currentValue, gain: currentValue - totalInvested };
  };

  // ── Net worth helper ──────────────────────────────────────────────────────

  const getNetWorth = () => {
    const walletTotal   = getWallets().reduce((s, w) => s + getWalletBalance(w.id), 0);
    const savingsTotal  = load('finapp_savings').filter(s => s.userId === currentUser?.id)
                           .reduce((s, acct) => s + getSavingsBalance(acct.id), 0);
    const { currentValue } = getPortfolioSummary();
    return walletTotal + savingsTotal + currentValue;
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
      // goals
      getGoals, createGoal, updateGoal, deleteGoal,
      addGoalContribution, getGoalContributions, getGoalSaved,
      // savings
      getSavingsAccounts, createSavingsAccount, updateSavingsAccount, deleteSavingsAccount,
      getSavingsBalance, getSavingsTransactions, addSavingsTransaction, projectSavingsGrowth,
      // investments
      getInvestments, createInvestment, updateInvestment, deleteInvestment,
      getPortfolioSummary,
      // combined
      getNetWorth,
      // constants
      WALLET_COLORS, WALLET_ICONS, DEFAULT_CATEGORIES,
      GOAL_ICONS, GOAL_COLORS, INV_TYPES, INV_TYPE_LABELS,
      refresh,
    }}>
      {children}
    </FinanceContext.Provider>
  );
}

export const useFinance = () => useContext(FinanceContext);
