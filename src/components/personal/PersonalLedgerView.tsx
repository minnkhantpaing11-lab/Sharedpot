import React, { useState, useEffect, useMemo } from 'react';
import {
  Wallet,
  TrendingDown,
  Plus,
  Search,
  Trash2,
  Edit3,
  Database,
  User as UserIcon,
  LogOut,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Clock,
  PieChart,
  Tag,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { AuthUser, PersonalBudget, PersonalCategory, PersonalExpense, SupabaseConfig } from '../../types/personal';
import {
  loadUserBudget,
  loadUserSpendings,
  saveUserBudget,
  addPersonalExpense,
  deletePersonalExpense,
  parseQuickSpendingInput,
  inferCategoryFromSubject,
  getSavedSupabaseConfig
} from '../../lib/supabase';
import { formatCurrency, getCurrentDateString, getCurrentTimeString } from '../../utils/calculations';

interface PersonalLedgerViewProps {
  currentUser: AuthUser | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenSupabaseSettings: () => void;
  supabaseConfig: SupabaseConfig;
  currency?: string;
}

const CATEGORY_META: Record<PersonalCategory, { label: string; emoji: string; color: string; badge: string }> = {
  food: { label: 'Food & Dining', emoji: '🍜', color: 'bg-orange-500', badge: 'bg-orange-50 text-orange-800 border-orange-200' },
  coffee: { label: 'Coffee & Cafe', emoji: '☕', color: 'bg-amber-600', badge: 'bg-amber-50 text-amber-800 border-amber-200' },
  groceries: { label: 'Groceries', emoji: '🛒', color: 'bg-emerald-600', badge: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  transport: { label: 'Transit & Gas', emoji: '🚆', color: 'bg-blue-600', badge: 'bg-blue-50 text-blue-800 border-blue-200' },
  entertainment: { label: 'Fun & Movies', emoji: '🎬', color: 'bg-purple-600', badge: 'bg-purple-50 text-purple-800 border-purple-200' },
  shopping: { label: 'Shopping & Gear', emoji: '🛍️', color: 'bg-pink-600', badge: 'bg-pink-50 text-pink-800 border-pink-200' },
  bills: { label: 'Personal Bills', emoji: '📱', color: 'bg-rose-600', badge: 'bg-rose-50 text-rose-800 border-rose-200' },
  health: { label: 'Health & Fitness', emoji: '💊', color: 'bg-teal-600', badge: 'bg-teal-50 text-teal-800 border-teal-200' },
  other: { label: 'Other / Misc', emoji: '📦', color: 'bg-stone-500', badge: 'bg-stone-100 text-stone-800 border-stone-200' },
};

export const PersonalLedgerView: React.FC<PersonalLedgerViewProps> = ({
  currentUser,
  onOpenAuth,
  onLogout,
  onOpenSupabaseSettings,
  supabaseConfig,
  currency = '¥',
}) => {
  // State for user data
  const [budget, setBudget] = useState<PersonalBudget | null>(null);
  const [spendings, setSpendings] = useState<PersonalExpense[]>([]);
  const [loading, setLoading] = useState(false);

  // Quick Command input (e.g. "food 1500")
  const [quickInput, setQuickInput] = useState('');
  const [quickParsedPreview, setQuickParsedPreview] = useState<{ subject: string; amount: number; category: PersonalCategory } | null>(null);

  // Detailed add form state
  const [showDetailedForm, setShowDetailedForm] = useState(false);
  const [subject, setSubject] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [category, setCategory] = useState<PersonalCategory>('food');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(getCurrentDateString());
  const [time, setTime] = useState(getCurrentTimeString());

  // Edit Starting Budget modal state
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [newBudgetStr, setNewBudgetStr] = useState('');

  // Search & filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Load data when user changes
  useEffect(() => {
    if (!currentUser) {
      setBudget(null);
      setSpendings([]);
      return;
    }

    let isMounted = true;
    setLoading(true);

    Promise.all([
      loadUserBudget(currentUser.id),
      loadUserSpendings(currentUser.id),
    ]).then(([b, s]) => {
      if (isMounted) {
        setBudget(b);
        setSpendings(s);
        setNewBudgetStr(b.startingBalance.toString());
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  // Live preview parser for quick input like "food 1500"
  useEffect(() => {
    const parsed = parseQuickSpendingInput(quickInput);
    setQuickParsedPreview(parsed);
  }, [quickInput]);

  // Financial calculations
  const totalSpent = useMemo(() => {
    return spendings.reduce((sum, item) => sum + item.amount, 0);
  }, [spendings]);

  const startingBalance = budget?.startingBalance || 0;
  const remainingBalance = startingBalance - totalSpent;
  const spentPercentage = startingBalance > 0 ? Math.min(Math.round((totalSpent / startingBalance) * 100), 100) : 0;
  const remainingPercentage = Math.max(0, 100 - spentPercentage);

  // Quick command submit
  const handleQuickSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !quickParsedPreview) return;

    const newExpense: PersonalExpense = {
      id: `pexp-${Date.now()}`,
      userId: currentUser.id,
      subject: quickParsedPreview.subject,
      amount: quickParsedPreview.amount,
      category: quickParsedPreview.category,
      date: getCurrentDateString(),
      time: getCurrentTimeString(),
      timestamp: Date.now(),
    };

    setSpendings((prev) => [newExpense, ...prev]);
    setQuickInput('');
    setQuickParsedPreview(null);
    await addPersonalExpense(newExpense);
  };

  // Detailed form submit
  const handleDetailedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    const numAmount = parseFloat(amountStr);
    if (!subject.trim() || isNaN(numAmount) || numAmount <= 0) return;

    const newExpense: PersonalExpense = {
      id: `pexp-${Date.now()}`,
      userId: currentUser.id,
      subject: subject.trim(),
      amount: Math.round(numAmount),
      category,
      notes: notes.trim() || undefined,
      date,
      time,
      timestamp: Date.now(),
    };

    setSpendings((prev) => [newExpense, ...prev]);
    setSubject('');
    setAmountStr('');
    setNotes('');
    setShowDetailedForm(false);
    await addPersonalExpense(newExpense);
  };

  // Delete expense
  const handleDelete = async (id: string) => {
    if (!currentUser) return;
    setSpendings((prev) => prev.filter((item) => item.id !== id));
    await deletePersonalExpense(currentUser.id, id);
  };

  // Save updated starting budget
  const handleSaveBudget = async () => {
    if (!currentUser || !budget) return;
    const num = parseFloat(newBudgetStr);
    if (isNaN(num) || num < 0) return;

    const updated: PersonalBudget = {
      ...budget,
      startingBalance: Math.round(num),
      lastUpdated: Date.now(),
    };

    setBudget(updated);
    setIsEditingBudget(false);
    await saveUserBudget(updated);
  };

  // Filtered spendings
  const filteredSpendings = useMemo(() => {
    return spendings.filter((item) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchSub = item.subject.toLowerCase().includes(q);
        const matchNotes = item.notes?.toLowerCase().includes(q) || false;
        if (!matchSub && !matchNotes) return false;
      }
      if (filterCategory !== 'all' && item.category !== filterCategory) {
        return false;
      }
      return true;
    });
  }, [spendings, searchQuery, filterCategory]);

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    spendings.forEach((item) => {
      map[item.category] = (map[item.category] || 0) + item.amount;
    });
    return Object.entries(map)
      .map(([cat, amount]) => ({
        category: cat as PersonalCategory,
        meta: CATEGORY_META[cat as PersonalCategory] || CATEGORY_META.other,
        amount,
        percentage: totalSpent > 0 ? (amount / totalSpent) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [spendings, totalSpent]);

  // If user is not logged in, show the clean auth card
  if (!currentUser) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center">
        <div className="bg-white border border-stone-200/90 rounded-3xl p-8 sm:p-10 shadow-xs space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center mx-auto shadow-sm shadow-orange-500/10">
            <Wallet className="w-8 h-8" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h2 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
              My Personal Pocketbook
            </h2>
            <p className="text-sm text-stone-600 leading-relaxed">
              Log in with your own account to track individual daily spendings, manage your starting allowance, and watch your remaining balance automatically deduct in Japanese Yen.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left pt-2">
            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200">
              <span className="text-base select-none block mb-1">🔒</span>
              <span className="text-xs font-bold text-stone-900 block">Private & Isolated</span>
              <span className="text-[11px] text-stone-500">Only you can view your personal spendings.</span>
            </div>
            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200">
              <span className="text-base select-none block mb-1">⚡</span>
              <span className="text-xs font-bold text-stone-900 block">Quick "food 1500"</span>
              <span className="text-[11px] text-stone-500">Type subject and amount to deduct instantly.</span>
            </div>
            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200">
              <span className="text-base select-none block mb-1">☁️</span>
              <span className="text-xs font-bold text-stone-900 block">Supabase Linked</span>
              <span className="text-[11px] text-stone-500">Optional cloud database sync with Row-Level Security.</span>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={onOpenAuth}
              className="w-full sm:w-auto px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm rounded-xl shadow-xs shadow-orange-500/25 flex items-center justify-center gap-2 transition-all"
            >
              <UserIcon className="w-4 h-4" />
              <span>Log In or Create Account</span>
            </button>
            <button
              onClick={onOpenSupabaseSettings}
              className="w-full sm:w-auto px-5 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs sm:text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Database className="w-4 h-4 text-stone-500" />
              <span>Link Supabase</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* User Header & Supabase Status Strip */}
      <div className="bg-white border border-stone-200/90 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-orange-500 text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
            {currentUser.displayName ? currentUser.displayName.slice(0, 2).toUpperCase() : 'ME'}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold text-stone-900 truncate">
                {currentUser.displayName || currentUser.email.split('@')[0]}
              </h2>
              <span className="text-xs text-stone-400 font-mono truncate hidden sm:inline">
                ({currentUser.email})
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                supabaseConfig.isConnected
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-stone-100 text-stone-600 border border-stone-200'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${supabaseConfig.isConnected ? 'bg-emerald-500' : 'bg-stone-400'}`} />
                <span>{supabaseConfig.isConnected ? 'Supabase Linked' : 'Private Storage'}</span>
              </span>
            </div>
            <p className="text-xs text-stone-500">
              Only you can see your personal spendings and balance
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
          <button
            onClick={onOpenSupabaseSettings}
            title="Configure Supabase Project Connection"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-700 bg-stone-50 hover:bg-stone-100 border border-stone-250 rounded-xl transition-colors"
          >
            <Database className="w-3.5 h-3.5 text-orange-600" />
            <span className="hidden xs:inline">Supabase</span>
          </button>

          <button
            onClick={onLogout}
            title="Sign out of your account"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Main KPI Balance Cards: Starting, Spent, Remaining */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Starting Balance */}
        <div className="bg-white border border-stone-200/90 rounded-2xl p-5 shadow-2xs relative">
          <div className="flex items-center justify-between text-xs font-semibold text-stone-500 mb-1">
            <span className="flex items-center gap-1.5">
              <Wallet className="w-4 h-4 text-stone-400" />
              <span>Starting Allowance</span>
            </span>
            <button
              onClick={() => setIsEditingBudget(true)}
              className="text-orange-600 hover:text-orange-700 text-xs font-bold flex items-center gap-0.5"
            >
              <Edit3 className="w-3 h-3" />
              <span>Edit</span>
            </button>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-stone-900">
            {formatCurrency(startingBalance, currency)}
          </div>
          <p className="text-xs text-stone-400 mt-1">
            Allocated monthly or periodic balance
          </p>
        </div>

        {/* Total Spent */}
        <div className="bg-white border border-stone-200/90 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-stone-500 mb-1">
            <span className="flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4 text-orange-600" />
              <span>Total Spent</span>
            </span>
            <span className="font-mono text-stone-600 font-semibold">{spentPercentage}% used</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-stone-900">
            {formatCurrency(totalSpent, currency)}
          </div>
          <p className="text-xs text-stone-400 mt-1">
            Across {spendings.length} individual purchases
          </p>
        </div>

        {/* Remaining Balance (Highlight Card) */}
        <div className={`border rounded-2xl p-5 shadow-2xs transition-colors ${
          remainingBalance >= 0
            ? 'bg-orange-50/50 border-orange-200/80 text-stone-900'
            : 'bg-rose-50 border-rose-200 text-rose-950'
        }`}>
          <div className="flex items-center justify-between text-xs font-semibold mb-1">
            <span className="flex items-center gap-1.5 text-orange-800">
              <Sparkles className="w-4 h-4 text-orange-600" />
              <span>Remaining Balance</span>
            </span>
            <span className={`font-mono font-bold text-xs ${
              remainingBalance >= 0 ? 'text-orange-700' : 'text-rose-600'
            }`}>
              {remainingPercentage}% left
            </span>
          </div>
          <div className={`text-2xl sm:text-3xl font-extrabold font-mono tabular-nums ${
            remainingBalance >= 0 ? 'text-orange-600' : 'text-rose-600'
          }`}>
            {formatCurrency(remainingBalance, currency)}
          </div>

          {/* Balance health progress bar */}
          <div className="w-full bg-stone-200/70 rounded-full h-2 mt-2.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                remainingBalance <= 0
                  ? 'bg-rose-600'
                  : remainingPercentage < 25
                  ? 'bg-amber-500'
                  : 'bg-orange-500'
              }`}
              style={{ width: `${Math.min(Math.max(remainingPercentage, 2), 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* QUICK COMMAND INPUT BAR ("food 1500") */}
      <div className="bg-white border-2 border-orange-300 rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden">
        <div className="flex items-center justify-between gap-2 mb-2">
          <label className="text-xs sm:text-sm font-bold text-stone-900 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-orange-500" />
            <span>Quick Spending Input (Auto-Deduct)</span>
          </label>
          <button
            type="button"
            onClick={() => setShowDetailedForm(!showDetailedForm)}
            className="text-xs font-semibold text-stone-500 hover:text-stone-800 underline underline-offset-4"
          >
            {showDetailedForm ? 'Hide detailed form' : 'Open detailed form'}
          </button>
        </div>

        <form onSubmit={handleQuickSubmit} className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={quickInput}
                onChange={(e) => setQuickInput(e.target.value)}
                placeholder='Type e.g. "food 1500", "coffee 450", "ramen 980", "train 350"'
                className="w-full px-4 py-3 text-sm sm:text-base font-medium text-stone-900 bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:border-orange-500 focus:bg-white placeholder-stone-400"
              />
            </div>

            <button
              type="submit"
              disabled={!quickParsedPreview}
              className="py-3 px-5 sm:px-6 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs shadow-orange-500/25 flex items-center gap-2 shrink-0 transition-all active:scale-[0.98]"
            >
              <span>Deduct</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>

          {/* Quick Parser Live Detection Feedback */}
          {quickParsedPreview ? (
            <div className="flex items-center gap-2 text-xs bg-orange-50 border border-orange-200 text-orange-950 p-2.5 rounded-xl animate-in fade-in duration-100">
              <CheckCircle2 className="w-4 h-4 text-orange-600 shrink-0" />
              <span>
                Detected: <strong className="font-semibold text-stone-900">{quickParsedPreview.subject}</strong> · Amount:{' '}
                <strong className="font-mono text-orange-600 font-bold">{formatCurrency(quickParsedPreview.amount, currency)}</strong> · Category:{' '}
                <span className="font-semibold">{CATEGORY_META[quickParsedPreview.category]?.label}</span>
              </span>
              <span className="ml-auto text-[11px] text-stone-400 hidden sm:inline">Press Enter ↵ to deduct</span>
            </div>
          ) : quickInput.trim() ? (
            <p className="text-[11px] text-stone-500 pl-1">
              Tip: Include both a subject name and a number (e.g. <span className="font-mono font-semibold text-stone-700">food 1500</span>)
            </p>
          ) : (
            <div className="flex items-center gap-2 pt-1 text-[11px] text-stone-400 overflow-x-auto">
              <span>Quick ideas:</span>
              <button
                type="button"
                onClick={() => setQuickInput('Lunch Bento 850')}
                className="px-2 py-0.5 rounded-md bg-stone-100 hover:bg-orange-100 hover:text-orange-800 text-stone-600 transition-colors"
              >
                🍱 Lunch Bento 850
              </button>
              <button
                type="button"
                onClick={() => setQuickInput('Iced Coffee 450')}
                className="px-2 py-0.5 rounded-md bg-stone-100 hover:bg-orange-100 hover:text-orange-800 text-stone-600 transition-colors"
              >
                ☕ Iced Coffee 450
              </button>
              <button
                type="button"
                onClick={() => setQuickInput('Subway Train 320')}
                className="px-2 py-0.5 rounded-md bg-stone-100 hover:bg-orange-100 hover:text-orange-800 text-stone-600 transition-colors"
              >
                🚆 Subway Train 320
              </button>
              <button
                type="button"
                onClick={() => setQuickInput('Supermarket 2400')}
                className="px-2 py-0.5 rounded-md bg-stone-100 hover:bg-orange-100 hover:text-orange-800 text-stone-600 transition-colors"
              >
                🛒 Supermarket 2400
              </button>
            </div>
          )}
        </form>

        {/* Detailed Manual Form (Collapsible) */}
        {showDetailedForm && (
          <form onSubmit={handleDetailedSubmit} className="mt-4 pt-4 border-t border-stone-200 space-y-3">
            <div className="text-xs font-bold text-stone-700 uppercase tracking-wide">
              Detailed Expense Entry
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Subject *</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => {
                    setSubject(e.target.value);
                    setCategory(inferCategoryFromSubject(e.target.value));
                  }}
                  placeholder="e.g. food, dinner, coffee, shoes"
                  className="w-full px-3 py-2.5 text-base sm:text-sm bg-stone-50 border border-stone-300 rounded-xl text-stone-900 focus:outline-none focus:border-orange-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Amount ({currency}) *</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  required
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  placeholder="1500"
                  className="w-full px-3 py-2.5 text-base sm:text-sm font-mono font-bold bg-stone-50 border border-stone-300 rounded-xl text-stone-900 focus:outline-none focus:border-orange-500 focus:bg-white"
                />
              </div>
            </div>

            {/* Category chips */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Category</label>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(CATEGORY_META) as PersonalCategory[]).map((catKey) => {
                  const meta = CATEGORY_META[catKey];
                  const isSelected = category === catKey;
                  return (
                    <button
                      key={catKey}
                      type="button"
                      onClick={() => setCategory(catKey)}
                      className={`px-2.5 py-1 text-xs rounded-lg border font-medium flex items-center gap-1 transition-all ${
                        isSelected
                          ? 'bg-orange-50 text-orange-800 border-orange-400 font-bold shadow-2xs'
                          : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      <span>{meta.emoji}</span>
                      <span>{meta.label.split('&')[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl text-stone-900 focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Time</label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl text-stone-900 focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Notes (Optional)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional detail..."
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl text-stone-900 focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowDetailedForm(false)}
                className="px-3 py-1.5 text-xs text-stone-500 hover:text-stone-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-xl shadow-2xs"
              >
                Add & Deduct
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Two Column Layout: Spendings List & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2 spans): Spending History */}
        <div className="lg:col-span-2 bg-white border border-stone-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <span>Personal Spending History</span>
                <span className="text-xs font-semibold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">
                  {filteredSpendings.length}
                </span>
              </h3>
              <p className="text-xs text-stone-500">
                Each expense deducted from your remaining balance
              </p>
            </div>

            {/* Filter controls */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-44">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter subject..."
                  className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-stone-50 border border-stone-300 rounded-xl text-stone-900 placeholder-stone-400 focus:outline-none focus:border-orange-500"
                />
              </div>

              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-stone-50 border border-stone-300 rounded-xl text-stone-700 font-semibold focus:outline-none focus:border-orange-500"
              >
                <option value="all">All</option>
                {(Object.keys(CATEGORY_META) as PersonalCategory[]).map((cat) => (
                  <option key={cat} value={cat}>
                    {CATEGORY_META[cat].emoji} {CATEGORY_META[cat].label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {filteredSpendings.length === 0 ? (
            <div className="py-12 text-center text-stone-400 space-y-2">
              <Tag className="w-8 h-8 mx-auto text-stone-300" />
              <p className="text-sm font-semibold text-stone-700">No spendings recorded</p>
              <p className="text-xs text-stone-400">
                Type something like <code className="bg-stone-100 px-1.5 py-0.5 rounded text-stone-600 font-mono">food 1500</code> above to deduct your first expense!
              </p>
            </div>
          ) : (
            <div className="divide-y divide-stone-100 max-h-[550px] overflow-y-auto pr-1">
              {filteredSpendings.map((item) => {
                const meta = CATEGORY_META[item.category] || CATEGORY_META.other;
                return (
                  <div
                    key={item.id}
                    className="py-3 flex items-center justify-between gap-3 group hover:bg-stone-50 px-2 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-stone-100 flex items-center justify-center text-base shrink-0 select-none">
                        <span>{meta.emoji}</span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-stone-900 truncate">
                            {item.subject}
                          </h4>
                          <span className={`text-[10px] px-2 py-0.2 rounded-full font-semibold border ${meta.badge}`}>
                            {meta.label.split('&')[0]}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-stone-400 mt-0.5">
                          <span className="font-mono">{item.date} · {item.time}</span>
                          {item.notes && (
                            <span className="text-stone-500 italic truncate max-w-xs">
                              · {item.notes}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-bold font-mono text-stone-900 tabular-nums">
                        -{formatCurrency(item.amount, currency)}
                      </span>
                      <button
                        onClick={() => handleDelete(item.id)}
                        title="Delete spending and restore balance"
                        className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column (1 span): Category Breakdown & Allowance Health */}
        <div className="space-y-4">
          <div className="bg-white border border-stone-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-orange-600" />
              <span>Spending by Category</span>
            </h3>

            {categoryBreakdown.length === 0 ? (
              <p className="text-xs text-stone-400 py-4 text-center">
                No spending data to categorize yet.
              </p>
            ) : (
              <div className="space-y-3">
                {categoryBreakdown.map((cat) => (
                  <div key={cat.category} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-stone-700 flex items-center gap-1.5">
                        <span>{cat.meta.emoji}</span>
                        <span>{cat.meta.label}</span>
                      </span>
                      <span className="font-mono font-bold text-stone-900">
                        {formatCurrency(cat.amount, currency)}
                        <span className="text-stone-400 font-normal font-sans text-[11px] ml-1">
                          ({cat.percentage.toFixed(0)}%)
                        </span>
                      </span>
                    </div>
                    <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${cat.meta.color}`}
                        style={{ width: `${cat.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tips card */}
          <div className="p-4 bg-orange-50/60 border border-orange-200 rounded-2xl text-xs space-y-2 text-stone-700">
            <span className="font-bold text-orange-900 flex items-center gap-1.5">
              <span>💡 Fast Input Syntax</span>
            </span>
            <p className="text-[11px] leading-relaxed text-stone-600">
              You can quickly deduct expenses directly from the command box:
            </p>
            <ul className="space-y-1 text-[11px] text-stone-600 font-mono">
              <li>• <span className="text-orange-700 font-bold">food 1500</span> → -¥1,500 (Food)</li>
              <li>• <span className="text-orange-700 font-bold">coffee 480</span> → -¥480 (Coffee)</li>
              <li>• <span className="text-orange-700 font-bold">train 350</span> → -¥350 (Transit)</li>
              <li>• <span className="text-orange-700 font-bold">supermarket 3200</span> → -¥3,200</li>
            </ul>
          </div>
        </div>

      </div>

      {/* Edit Budget Modal */}
      {isEditingBudget && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white border-t sm:border border-stone-200 rounded-t-3xl sm:rounded-2xl max-w-sm w-full p-5 sm:p-6 space-y-4 shadow-xl animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
            {/* Mobile drag handle */}
            <div className="sm:hidden w-12 h-1.5 bg-stone-300 rounded-full mx-auto -mt-1 mb-1" />

            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <Wallet className="w-4 h-4 text-orange-600" />
                <span>Edit Starting Allowance</span>
              </h3>
              <button
                onClick={() => setIsEditingBudget(false)}
                className="w-8 h-8 flex items-center justify-center text-stone-400 hover:text-stone-700 rounded-lg"
              >
                <span className="text-lg">×</span>
              </button>
            </div>
            <p className="text-xs text-stone-500">
              Set your target starting budget. Your remaining balance will automatically calculate as Starting Balance minus Total Spent.
            </p>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Starting Budget ({currency})
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-bold text-stone-400">
                  {currency}
                </span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={newBudgetStr}
                  onChange={(e) => setNewBudgetStr(e.target.value)}
                  placeholder="100000"
                  className="w-full pl-8 pr-3 py-2.5 text-base font-bold font-mono bg-stone-50 border border-stone-300 rounded-xl text-stone-900 focus:outline-none focus:border-orange-500 focus:bg-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsEditingBudget(false)}
                className="px-4 py-2.5 text-xs font-semibold text-stone-500 hover:text-stone-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveBudget}
                className="flex-1 sm:flex-initial px-5 py-2.5 min-h-[42px] text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-xl shadow-xs active:scale-95 transition-all"
              >
                Update Budget
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
