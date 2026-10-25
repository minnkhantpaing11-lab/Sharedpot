import React, { useState, useMemo } from 'react';
import {
  SharedPotContribution,
  Expense,
  Roommate,
  HouseSettings,
  RoommateId
} from '../types/expense';
import {
  calculateSharedPotSummary,
  formatCurrency,
  formatDateTime,
  formatMonthLabel,
  getCurrentDateString,
  getCurrentMonthString,
  getCurrentTimeString,
  CATEGORY_DETAILS
} from '../utils/calculations';
import {
  PiggyBank,
  CheckCircle2,
  Clock,
  Plus,
  Edit3,
  Calendar,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  Receipt,
  Users,
  X,
  History,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface SharedPotViewProps {
  settings: HouseSettings;
  expenses: Expense[];
  potContributions: SharedPotContribution[];
  currency: string;
  onAddContribution: (contribution: SharedPotContribution) => void;
  onDeleteContribution: (id: string) => void;
  onUpdatePotSettings: (monthlyAmount: number) => void;
  onOpenNewExpense: () => void;
}

export const SharedPotView: React.FC<SharedPotViewProps> = ({
  settings,
  expenses,
  potContributions,
  currency,
  onAddContribution,
  onDeleteContribution,
  onUpdatePotSettings,
  onOpenNewExpense,
}) => {
  const currentMonth = getCurrentMonthString();
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isEditTargetModalOpen, setIsEditTargetModalOpen] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'deposits' | 'bills'>('all');

  // Form states
  const [depositorId, setDepositorId] = useState<RoommateId>('p1');
  const [depositAmountStr, setDepositAmountStr] = useState<string>(
    settings.sharedPotSettings?.monthlyContributionPerPerson?.toString() || '30000'
  );
  const [depositNote, setDepositNote] = useState('');
  const [newTargetStr, setNewTargetStr] = useState<string>(
    settings.sharedPotSettings?.monthlyContributionPerPerson?.toString() || '30000'
  );

  const monthlyTargetPerPerson = settings.sharedPotSettings?.monthlyContributionPerPerson || 30000;

  // Calculate summary
  const summary = useMemo(() => {
    return calculateSharedPotSummary(
      potContributions,
      expenses,
      monthlyTargetPerPerson,
      settings.roommates,
      selectedMonth
    );
  }, [potContributions, expenses, monthlyTargetPerPerson, settings.roommates, selectedMonth]);

  // Available months list from contributions & expenses
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    set.add(currentMonth);
    potContributions.forEach((c) => set.add(c.month));
    expenses.forEach((e) => {
      if (e.date && e.date.length >= 7) {
        set.add(e.date.slice(0, 7));
      }
    });
    return Array.from(set).sort().reverse();
  }, [potContributions, expenses, currentMonth]);

  // Combined ledger activity
  const ledgerActivity = useMemo(() => {
    interface ActivityItem {
      id: string;
      type: 'deposit' | 'deduction';
      title: string;
      amount: number;
      date: string;
      time: string;
      timestamp: number;
      roommateId?: RoommateId;
      category?: string;
      note?: string;
      rawExpenseId?: string;
    }

    const items: ActivityItem[] = [];

    // Add pot contributions
    potContributions.forEach((c) => {
      const rm = settings.roommates.find((r) => r.id === c.roommateId);
      items.push({
        id: c.id,
        type: 'deposit',
        title: `${rm?.name || 'Roommate'} Monthly Pot Deposit`,
        amount: c.amount,
        date: c.date,
        time: c.time,
        timestamp: c.timestamp,
        roommateId: c.roommateId,
        note: c.note,
      });
    });

    // Add expenses paid from pot
    expenses.forEach((e) => {
      if (e.paidFromPot) {
        const cat = CATEGORY_DETAILS[e.category] || CATEGORY_DETAILS.other;
        items.push({
          id: `deduct-${e.id}`,
          type: 'deduction',
          title: e.title,
          amount: e.amount,
          date: e.date,
          time: e.time,
          timestamp: e.timestamp,
          roommateId: e.paidById,
          category: cat.label,
          note: e.notes,
          rawExpenseId: e.id,
        });
      }
    });

    return items
      .filter((item) => {
        if (filterType === 'deposits') return item.type === 'deposit';
        if (filterType === 'bills') return item.type === 'deduction';
        return true;
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [potContributions, expenses, settings.roommates, filterType]);

  // Handle 1-click Quick Fill deposit for a roommate
  const handleQuickDepositForRoommate = (rmId: RoommateId) => {
    const rm = settings.roommates.find((r) => r.id === rmId);
    const newContrib: SharedPotContribution = {
      id: `pot-${Date.now()}`,
      roommateId: rmId,
      month: selectedMonth,
      amount: monthlyTargetPerPerson,
      date: getCurrentDateString(),
      time: getCurrentTimeString(),
      timestamp: Date.now(),
      note: `${formatMonthLabel(selectedMonth)} fixed pot deposit`,
    };

    onAddContribution(newContrib);

    try {
      confetti({
        particleCount: 50,
        spread: 60,
        colors: ['#f97316', '#ea580c', '#fbbf24'],
        origin: { y: 0.6 },
      });
    } catch {
      // ignore
    }
  };

  // Handle custom deposit modal submit
  const handleDepositSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(depositAmountStr);
    if (isNaN(num) || num <= 0) return;

    const newContrib: SharedPotContribution = {
      id: `pot-${Date.now()}`,
      roommateId: depositorId,
      month: selectedMonth,
      amount: Math.round(num),
      date: getCurrentDateString(),
      time: getCurrentTimeString(),
      timestamp: Date.now(),
      note: depositNote.trim() || undefined,
    };

    onAddContribution(newContrib);
    setIsDepositModalOpen(false);
    setDepositNote('');
  };

  // Handle save target
  const handleSaveTarget = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(newTargetStr);
    if (isNaN(num) || num <= 0) return;

    onUpdatePotSettings(Math.round(num));
    setIsEditTargetModalOpen(false);
  };

  const isLowPot = summary.currentBalance < 10000;
  const isDeficit = summary.currentBalance < 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Top Banner & Month Selector */}
      <div className="bg-white border border-stone-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center text-2xl shrink-0 shadow-2xs select-none">
            🍯
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <h2 className="text-base sm:text-lg font-bold text-stone-900 leading-tight">
                Shared Pot (Common Fund)
              </h2>
              <span className="text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-200">
                Fixed Fill + Auto-Deduct
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Fixed monthly deposits; communal bills deduct directly from the pot
            </p>
          </div>
        </div>

        <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          {/* Month Selector */}
          <div className="flex items-center justify-center gap-1.5 bg-stone-50 border border-stone-200 px-3 py-2 sm:py-1.5 rounded-xl text-xs font-semibold text-stone-700 min-h-[40px]">
            <Calendar className="w-4 h-4 text-stone-400 shrink-0" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-stone-900 font-bold focus:outline-none cursor-pointer text-xs"
            >
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {formatMonthLabel(m)} {m === currentMonth ? '(Current)' : ''}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setIsDepositModalOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 min-h-[40px] text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 active:scale-95 rounded-xl shadow-xs shadow-orange-500/20 transition-all whitespace-nowrap"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Deposit to Pot</span>
          </button>
        </div>
      </div>

      {/* KPI Cards: Current Balance, Target Monthly, Deducted */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Pot Current Balance */}
        <div className={`border rounded-2xl p-5 shadow-2xs transition-colors ${
          isDeficit
            ? 'bg-rose-50 border-rose-200 text-rose-950'
            : isLowPot
            ? 'bg-amber-50/60 border-amber-200 text-stone-900'
            : 'bg-white border-stone-200/90 text-stone-900'
        }`}>
          <div className="flex items-center justify-between text-xs font-semibold mb-1">
            <span className="flex items-center gap-1.5 text-stone-500">
              <PiggyBank className="w-4 h-4 text-orange-600" />
              <span>Current Pot Balance</span>
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              isDeficit
                ? 'bg-rose-100 text-rose-800 border-rose-300'
                : isLowPot
                ? 'bg-amber-100 text-amber-800 border-amber-300'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
            }`}>
              {isDeficit ? 'Deficit' : isLowPot ? 'Low Balance' : 'Healthy'}
            </span>
          </div>

          <div className={`text-2xl sm:text-3xl font-extrabold font-mono tabular-nums ${
            isDeficit ? 'text-rose-600' : 'text-orange-600'
          }`}>
            {formatCurrency(summary.currentBalance, currency)}
          </div>

          <div className="text-xs text-stone-500 mt-2 flex items-center justify-between pt-2 border-t border-stone-100">
            <span>Total Deposits:</span>
            <strong className="font-mono text-stone-800">{formatCurrency(summary.totalDeposited, currency)}</strong>
          </div>
        </div>

        {/* Fixed Monthly Target */}
        <div className="bg-white border border-stone-200/90 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-stone-500 mb-1">
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-stone-400" />
              <span>Monthly Target Pot</span>
            </span>
            <button
              onClick={() => setIsEditTargetModalOpen(true)}
              className="text-orange-600 hover:text-orange-700 font-bold flex items-center gap-0.5"
            >
              <Edit3 className="w-3 h-3" />
              <span>Edit</span>
            </button>
          </div>

          <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-stone-900">
            {formatCurrency(summary.totalMonthlyTarget, currency)}
          </div>

          <p className="text-xs text-stone-500 mt-1">
            {formatCurrency(monthlyTargetPerPerson, currency)} fixed per roommate × 3
          </p>

          <div className="w-full bg-stone-100 rounded-full h-2 mt-2.5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 bg-orange-500"
              style={{
                width: `${Math.min(
                  Math.round((summary.monthDeposited / (summary.totalMonthlyTarget || 1)) * 100),
                  100
                )}%`,
              }}
            />
          </div>
        </div>

        {/* Bills Deducted This Month */}
        <div className="bg-white border border-stone-200/90 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-stone-500 mb-1">
            <span className="flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-orange-600" />
              <span>Bills Deducted ({formatMonthLabel(selectedMonth).split(' ')[0]})</span>
            </span>
            <span className="font-mono text-stone-600 font-semibold">{summary.monthDeductionsCount} bills</span>
          </div>

          <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-stone-900">
            -{formatCurrency(summary.monthDeducted, currency)}
          </div>

          <p className="text-xs text-stone-500 mt-1">
            Groceries, utilities, Wi-Fi paid from pot
          </p>

          <div className="text-xs text-stone-500 mt-2 flex items-center justify-between pt-2 border-t border-stone-100">
            <span>All-time deductions:</span>
            <strong className="font-mono text-stone-800">-{formatCurrency(summary.totalDeducted, currency)}</strong>
          </div>
        </div>

      </div>

      {/* MONTHLY FILL-THE-POT CHECKLIST */}
      <div className="bg-white border border-stone-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <span>Monthly Roommate Pot Deposits</span>
              <span className="text-xs font-semibold text-stone-500">({formatMonthLabel(selectedMonth)})</span>
            </h3>
            <p className="text-xs text-stone-500">
              Each roommate fills the pot with their fixed {formatCurrency(monthlyTargetPerPerson, currency)} share
            </p>
          </div>
          <span className="text-xs font-bold text-orange-700 bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-xl">
            {formatCurrency(summary.monthDeposited, currency)} / {formatCurrency(summary.totalMonthlyTarget, currency)} Filled
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {settings.roommates.map((rm) => {
            const st = summary.roommateStatus[rm.id];
            const isFilled = st?.hasCompletedTarget;
            const deposited = st?.depositedThisMonth || 0;

            return (
              <div
                key={rm.id}
                className={`p-4 rounded-xl border transition-all ${
                  isFilled
                    ? 'bg-emerald-50/50 border-emerald-200'
                    : 'bg-stone-50 border-stone-200'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-xl ${rm.avatarColor} font-bold text-xs flex items-center justify-center shadow-2xs`}>
                      {rm.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-stone-900">{rm.name}</h4>
                      <span className="text-[11px] text-stone-500">Target: {formatCurrency(monthlyTargetPerPerson, currency)}</span>
                    </div>
                  </div>

                  {isFilled ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-lg">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Filled</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-lg">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      <span>Pending</span>
                    </span>
                  )}
                </div>

                <div className="space-y-2 pt-2 border-t border-stone-200/60">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-500 font-medium">Deposited:</span>
                    <span className="font-mono font-bold text-stone-900">
                      {formatCurrency(deposited, currency)}
                    </span>
                  </div>

                  {isFilled ? (
                    <div className="py-2.5 px-3 bg-white/80 rounded-xl text-center text-xs text-emerald-700 font-semibold border border-emerald-200/60">
                      ✓ Paid fixed monthly pot amount
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleQuickDepositForRoommate(rm.id)}
                      className="w-full min-h-[44px] py-2.5 px-3 bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs shadow-orange-500/20 flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                      <span>Fill Pot ({formatCurrency(monthlyTargetPerPerson, currency)})</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* POT ACTIVITY LEDGER: Deposits & Shared Bills */}
      <div className="bg-white border border-stone-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <span>Pot Activity & Deductions Ledger</span>
              <span className="text-xs font-semibold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">
                {ledgerActivity.length} events
              </span>
            </h3>
            <p className="text-xs text-stone-500">
              Running history of roommate deposits and communal bills deducted from the pot
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter buttons */}
            <div className="flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200 text-xs">
              <button
                onClick={() => setFilterType('all')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  filterType === 'all'
                    ? 'bg-white text-stone-900 shadow-2xs'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterType('deposits')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  filterType === 'deposits'
                    ? 'bg-white text-stone-900 shadow-2xs'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                Deposits (+)
              </button>
              <button
                onClick={() => setFilterType('bills')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  filterType === 'bills'
                    ? 'bg-white text-stone-900 shadow-2xs'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                Deductions (-)
              </button>
            </div>

            <button
              onClick={onOpenNewExpense}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-xl shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Log Bill to Pot</span>
            </button>
          </div>
        </div>

        {ledgerActivity.length === 0 ? (
          <div className="py-12 text-center text-stone-400 space-y-2">
            <PiggyBank className="w-8 h-8 mx-auto text-stone-300" />
            <p className="text-sm font-semibold text-stone-700">No pot activity recorded yet</p>
            <p className="text-xs text-stone-400">
              Deposit to the pot or log a shared expense with "Deduct from Shared Pot" enabled.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100 max-h-[500px] overflow-y-auto pr-1">
            {ledgerActivity.map((item) => {
              const isDeposit = item.type === 'deposit';
              const rm = settings.roommates.find((r) => r.id === item.roommateId);

              return (
                <div
                  key={item.id}
                  className="py-3.5 flex items-center justify-between gap-3 group hover:bg-stone-50 px-2 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${
                      isDeposit
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-orange-50 text-orange-700 border border-orange-200'
                    }`}>
                      {isDeposit ? <ArrowDownLeft className="w-4 h-4 text-emerald-600" /> : <ArrowUpRight className="w-4 h-4 text-orange-600" />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-stone-900 truncate">
                          {item.title}
                        </h4>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                          isDeposit
                            ? 'bg-emerald-100/70 text-emerald-800 border-emerald-200'
                            : 'bg-orange-100/70 text-orange-800 border-orange-200'
                        }`}>
                          {isDeposit ? 'Deposit' : 'Bill Deducted'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-stone-400 mt-0.5">
                        <span className="font-mono">{formatDateTime(item.date, item.time)}</span>
                        {rm && <span>· By {rm.name}</span>}
                        {item.note && <span className="italic">· {item.note}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-base font-bold font-mono tabular-nums ${
                      isDeposit ? 'text-emerald-600' : 'text-stone-900'
                    }`}>
                      {isDeposit ? `+${formatCurrency(item.amount, currency)}` : `-${formatCurrency(item.amount, currency)}`}
                    </span>

                    {isDeposit && (
                      <button
                        onClick={() => onDeleteContribution(item.id)}
                        title="Remove deposit"
                        className="p-1 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-stone-100"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* DEPOSIT MODAL */}
      {isDepositModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white border-t sm:border border-stone-200 rounded-t-3xl sm:rounded-2xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-xl animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
            {/* Mobile drag handle */}
            <div className="sm:hidden w-12 h-1.5 bg-stone-300 rounded-full mx-auto -mt-1 mb-1" />

            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <PiggyBank className="w-4 h-4 text-orange-600" />
                <span>Record Pot Deposit</span>
              </h3>
              <button
                onClick={() => setIsDepositModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center text-stone-400 hover:text-stone-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleDepositSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Which Roommate is depositing?
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {settings.roommates.map((rm) => (
                    <button
                      key={rm.id}
                      type="button"
                      onClick={() => setDepositorId(rm.id)}
                      className={`min-h-[42px] py-2 px-2 text-xs font-bold rounded-xl border transition-all ${
                        depositorId === rm.id
                          ? 'bg-orange-50 text-orange-700 border-orange-500 shadow-2xs'
                          : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      {rm.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Deposit Amount ({currency})
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={depositAmountStr}
                  onChange={(e) => setDepositAmountStr(e.target.value)}
                  placeholder="30000"
                  className="w-full px-3 py-2.5 text-base font-mono font-bold bg-stone-50 border border-stone-300 rounded-xl text-stone-900 focus:outline-none focus:border-orange-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Note (Optional)
                </label>
                <input
                  type="text"
                  value={depositNote}
                  onChange={(e) => setDepositNote(e.target.value)}
                  placeholder="e.g. October bank transfer deposit"
                  className="w-full px-3 py-2.5 text-base sm:text-xs bg-stone-50 border border-stone-300 rounded-xl text-stone-900 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDepositModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-stone-500 hover:text-stone-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 sm:flex-initial px-5 py-2.5 min-h-[42px] text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-xl shadow-xs active:scale-95 transition-all"
                >
                  Confirm Deposit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT TARGET MODAL */}
      {isEditTargetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white border-t sm:border border-stone-200 rounded-t-3xl sm:rounded-2xl max-w-sm w-full p-5 sm:p-6 space-y-4 shadow-xl animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
            {/* Mobile drag handle */}
            <div className="sm:hidden w-12 h-1.5 bg-stone-300 rounded-full mx-auto -mt-1 mb-1" />

            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-orange-600" />
                <span>Edit Monthly Contribution</span>
              </h3>
              <button
                onClick={() => setIsEditTargetModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center text-stone-400 hover:text-stone-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-stone-500">
              Set the fixed amount each roommate deposits into the Shared Pot monthly.
            </p>

            <form onSubmit={handleSaveTarget} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Monthly Amount per Person ({currency})
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={newTargetStr}
                  onChange={(e) => setNewTargetStr(e.target.value)}
                  placeholder="30000"
                  className="w-full px-3 py-2.5 text-base font-mono font-bold bg-stone-50 border border-stone-300 rounded-xl text-stone-900 focus:outline-none focus:border-orange-500 focus:bg-white"
                />
              </div>

              <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-600">
                Total monthly house pot: <strong className="font-mono text-orange-600 font-bold">{formatCurrency((parseFloat(newTargetStr) || 0) * 3, currency)}</strong>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditTargetModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-stone-500 hover:text-stone-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 sm:flex-initial px-5 py-2.5 min-h-[42px] text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-xl shadow-xs active:scale-95 transition-all"
                >
                  Save Target
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
