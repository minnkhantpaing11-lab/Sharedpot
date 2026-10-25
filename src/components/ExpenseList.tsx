import React, { useState, useMemo } from 'react';
import { Expense, ExpenseCategory, Roommate, RoommateId } from '../types/expense';
import { CATEGORY_DETAILS, formatCurrency, formatDateTime } from '../utils/calculations';
import { Search, Trash2, Edit2, Image as ImageIcon, FileText } from 'lucide-react';

interface ExpenseListProps {
  expenses: Expense[];
  roommates: Roommate[];
  currency: string;
  onEditExpense: (expense: Expense) => void;
  onDeleteExpense: (id: string) => void;
  onViewReceipt: (url: string) => void;
}

export const ExpenseList: React.FC<ExpenseListProps> = ({
  expenses,
  roommates,
  currency,
  onEditExpense,
  onDeleteExpense,
  onViewReceipt,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPayer, setSelectedPayer] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc'>('date-desc');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filteredExpenses = useMemo(() => {
    return expenses
      .filter((exp) => {
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = exp.title.toLowerCase().includes(q);
          const matchNotes = exp.notes?.toLowerCase().includes(q) || false;
          if (!matchTitle && !matchNotes) return false;
        }

        // Payer filter
        if (selectedPayer !== 'all' && exp.paidById !== selectedPayer) {
          return false;
        }

        // Category filter
        if (selectedCategory !== 'all' && exp.category !== selectedCategory) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'date-desc') return b.timestamp - a.timestamp;
        if (sortBy === 'date-asc') return a.timestamp - b.timestamp;
        if (sortBy === 'amount-desc') return b.amount - a.amount;
        return 0;
      });
  }, [expenses, searchQuery, selectedPayer, selectedCategory, sortBy]);

  const getRoommate = (id: RoommateId) => roommates.find((r) => r.id === id);

  return (
    <div className="bg-white border border-stone-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
      {/* Top Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 sm:gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search expenses by title or notes..."
            className="w-full pl-9 pr-3.5 py-2.5 text-base sm:text-xs bg-stone-50 border border-stone-300 rounded-xl text-stone-900 placeholder-stone-400 focus:outline-none focus:border-orange-500 focus:bg-white transition-colors"
          />
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-3 xs:flex xs:flex-wrap items-center gap-1.5 sm:gap-2">
          {/* Payer Dropdown */}
          <select
            value={selectedPayer}
            onChange={(e) => setSelectedPayer(e.target.value)}
            className="min-h-[38px] px-2 sm:px-3 py-1.5 text-xs bg-stone-50 border border-stone-300 text-stone-700 font-semibold rounded-xl focus:outline-none focus:border-orange-500 truncate"
          >
            <option value="all">All Payers</option>
            {roommates.map((rm) => (
              <option key={rm.id} value={rm.id}>
                Paid by {rm.name}
              </option>
            ))}
          </select>

          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="min-h-[38px] px-2 sm:px-3 py-1.5 text-xs bg-stone-50 border border-stone-300 text-stone-700 font-semibold rounded-xl focus:outline-none focus:border-orange-500 truncate"
          >
            <option value="all">All Categories</option>
            {(Object.keys(CATEGORY_DETAILS) as ExpenseCategory[]).map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_DETAILS[cat].emoji} {CATEGORY_DETAILS[cat].label}
              </option>
            ))}
          </select>

          {/* Sort Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="min-h-[38px] px-2 sm:px-3 py-1.5 text-xs bg-stone-50 border border-stone-300 text-stone-700 font-semibold rounded-xl focus:outline-none focus:border-orange-500 truncate"
          >
            <option value="date-desc">Newest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="amount-desc">Highest Amount</option>
          </select>
        </div>
      </div>

      {/* Expense List Content */}
      {filteredExpenses.length === 0 ? (
        <div className="py-12 text-center text-stone-400">
          <FileText className="w-8 h-8 mx-auto mb-2 text-stone-300 stroke-[1.5]" />
          <p className="text-sm font-semibold text-stone-700">No expenses found</p>
          <p className="text-xs text-stone-400 mt-0.5">
            {expenses.length === 0
              ? 'Click "Add Expense" to log your first shared house expense.'
              : 'Try clearing your filters or search keywords.'}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-stone-100">
          {filteredExpenses.map((expense) => {
            const payer = getRoommate(expense.paidById);
            const numSplit = expense.splitBetween.length || 3;
            const perPerson = expense.amount / numSplit;
            const catInfo = CATEGORY_DETAILS[expense.category] || CATEGORY_DETAILS.other;

            return (
              <div
                key={expense.id}
                className="py-3.5 first:pt-1 last:pb-1 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 group hover:bg-stone-50 px-2 rounded-xl transition-colors"
              >
                {/* Left: Category Icon, Title, and Date/Time */}
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 mt-0.5 border shadow-2xs select-none ${catInfo.bgColor}`}
                  >
                    <span>{catInfo.emoji}</span>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-stone-900 truncate">
                        {expense.title}
                      </h3>
                      {expense.receiptUrl && (
                        <button
                          onClick={() => onViewReceipt(expense.receiptUrl!)}
                          title="View attached receipt"
                          className="text-orange-600 hover:text-orange-700 text-[11px] font-semibold flex items-center gap-1 bg-orange-50 px-2 py-0.5 rounded-lg border border-orange-200 shrink-0"
                        >
                          <ImageIcon className="w-3 h-3" />
                          <span>Receipt</span>
                        </button>
                      )}
                      {expense.paidFromPot && (
                        <span className="text-[10px] font-bold text-orange-800 bg-orange-100/80 px-2 py-0.5 rounded-md border border-orange-200/70 shrink-0">
                          🍯 Shared Pot
                        </span>
                      )}
                    </div>

                    {/* Metadata line: Date, Time, Category, Paid by */}
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-stone-500 mt-1">
                      <span className="font-mono tabular-nums text-stone-600 font-medium">
                        {formatDateTime(expense.date, expense.time)}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-medium text-stone-600">{catInfo.label}</span>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1">
                        <span>Paid by</span>
                        <strong className="text-stone-900 font-bold">
                          {payer?.name || expense.paidById}
                        </strong>
                      </span>
                    </div>

                    {expense.notes && (
                      <p className="text-xs text-stone-500 mt-1 line-clamp-1 italic">
                        "{expense.notes}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Total Amount and 1/3 Split Breakdown */}
                <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                  <div className="text-left sm:text-right">
                    <div className="text-base font-bold font-mono tabular-nums text-stone-900">
                      {formatCurrency(expense.amount, currency)}
                    </div>
                    <div className="text-xs text-orange-600 font-mono tabular-nums font-bold flex items-center sm:justify-end gap-1">
                      <span>÷ {numSplit} =</span>
                      <span>{formatCurrency(perPerson, currency)} / person</span>
                    </div>
                  </div>

                  {/* Actions: Edit & Delete */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEditExpense(expense)}
                      title="Edit expense"
                      className="w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center text-stone-400 hover:text-stone-800 rounded-lg hover:bg-stone-100 transition-colors active:scale-95"
                    >
                      <Edit2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                    </button>

                    {confirmDeleteId === expense.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            onDeleteExpense(expense.id);
                            setConfirmDeleteId(null);
                          }}
                          className="min-h-[32px] px-2.5 py-1 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="min-h-[32px] text-xs text-stone-500 hover:text-stone-800 px-1.5"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(expense.id)}
                        title="Delete expense"
                        className="w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center text-stone-400 hover:text-rose-600 rounded-lg hover:bg-stone-100 transition-colors active:scale-95"
                      >
                        <Trash2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
