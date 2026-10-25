import React, { useState, useEffect } from 'react';
import { Expense, ExpenseCategory, Roommate, RoommateId } from '../types/expense';
import { CATEGORY_DETAILS, formatCurrency, getCurrentDateString, getCurrentTimeString } from '../utils/calculations';
import { X, Calendar, Clock, Upload, AlertCircle, Users } from 'lucide-react';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveExpense: (expense: Expense) => void;
  editingExpense?: Expense | null;
  roommates: Roommate[];
  currency: string;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  onSaveExpense,
  editingExpense,
  roommates,
  currency,
}) => {
  const [title, setTitle] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [date, setDate] = useState(getCurrentDateString());
  const [time, setTime] = useState(getCurrentTimeString());
  const [paidById, setPaidById] = useState<RoommateId>('p1');
  const [category, setCategory] = useState<ExpenseCategory>('groceries');
  const [notes, setNotes] = useState('');
  const [receiptUrl, setReceiptUrl] = useState<string | undefined>(undefined);
  const [splitBetween, setSplitBetween] = useState<RoommateId[]>(['p1', 'p2', 'p3']);
  const [customSplitMode, setCustomSplitMode] = useState(false);
  const [paidFromPot, setPaidFromPot] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingExpense) {
      setTitle(editingExpense.title);
      setAmountStr(editingExpense.amount.toString());
      setDate(editingExpense.date);
      setTime(editingExpense.time);
      setPaidById(editingExpense.paidById);
      setCategory(editingExpense.category);
      setNotes(editingExpense.notes || '');
      setReceiptUrl(editingExpense.receiptUrl);
      setSplitBetween(editingExpense.splitBetween);
      setCustomSplitMode(editingExpense.splitBetween.length !== 3);
      setPaidFromPot(editingExpense.paidFromPot ?? false);
    } else {
      // Reset for new expense
      setTitle('');
      setAmountStr('');
      setDate(getCurrentDateString());
      setTime(getCurrentTimeString());
      setPaidById(roommates[0]?.id || 'p1');
      setCategory('groceries');
      setNotes('');
      setReceiptUrl(undefined);
      setSplitBetween(['p1', 'p2', 'p3']);
      setCustomSplitMode(false);
      setPaidFromPot(true);
      setError('');
    }
  }, [editingExpense, isOpen, roommates]);

  if (!isOpen) return null;

  const numericAmount = parseFloat(amountStr) || 0;
  const numSplitPeople = splitBetween.length || 1;
  const perPersonShare = numericAmount > 0 ? numericAmount / numSplitPeople : 0;

  const handleQuickDate = (type: 'today' | 'yesterday') => {
    const d = new Date();
    if (type === 'yesterday') {
      d.setDate(d.getDate() - 1);
    }
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setDate(`${y}-${m}-${day}`);
    setTime(getCurrentTimeString());
  };

  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      setError('Receipt image must be under 4MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setReceiptUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please enter a description for the expense');
      return;
    }
    if (numericAmount <= 0) {
      setError('Please enter an amount greater than zero');
      return;
    }
    if (splitBetween.length === 0) {
      setError('Please select at least one roommate to split with');
      return;
    }

    const [y, m, d] = date.split('-').map(Number);
    const [h, min] = time.split(':').map(Number);
    const timestamp = new Date(y, m - 1, d, h || 12, min || 0).getTime();

    const expense: Expense = {
      id: editingExpense ? editingExpense.id : `exp-${Date.now()}`,
      title: title.trim(),
      amount: currency === '¥' ? Math.round(numericAmount) : Number(numericAmount.toFixed(2)),
      date,
      time,
      timestamp,
      paidById,
      splitBetween,
      category,
      notes: notes.trim() || undefined,
      receiptUrl,
      paidFromPot,
    };

    onSaveExpense(expense);
    onClose();
  };

  const toggleRoommateInSplit = (id: RoommateId) => {
    if (splitBetween.includes(id)) {
      if (splitBetween.length > 1) {
        setSplitBetween(splitBetween.filter((x) => x !== id));
      }
    } else {
      setSplitBetween([...splitBetween, id]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white border-t sm:border border-stone-200 rounded-t-3xl sm:rounded-2xl max-w-xl w-full flex flex-col max-h-[92dvh] sm:max-h-[88vh] shadow-2xl relative animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 overflow-hidden">
        
        {/* Mobile drag handle indicator */}
        <div className="sm:hidden w-12 h-1.5 bg-stone-300 rounded-full mx-auto mt-2.5 mb-1" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-100 shrink-0 bg-white">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-stone-900 leading-tight">
              {editingExpense ? 'Edit Expense' : 'Add Sharehouse Expense'}
            </h2>
            <p className="text-xs text-stone-500">
              Divides equally by 3 roommates or deducts from pot
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-5 mt-3 p-3 text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-4 overscroll-contain">
          
          {/* Amount and Title */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Total Amount ({currency}) *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400 font-mono font-bold">
                  {currency}
                </div>
                <input
                  type="number"
                  step={currency === '¥' ? '1' : '0.01'}
                  min={currency === '¥' ? '1' : '0.01'}
                  required
                  value={amountStr}
                  onChange={(e) => {
                    setAmountStr(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder={currency === '¥' ? '3000' : '0.00'}
                  className="w-full pl-8 pr-3 py-2.5 text-base font-bold font-mono text-stone-900 bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:border-orange-500 focus:bg-white"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Description / Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (error) setError('');
                }}
                placeholder={currency === '¥' ? 'e.g. スーパーの食料品, 電気代, Wi-Fi' : 'e.g. Weekly Groceries, Electricity Bill, Wi-Fi'}
                className="w-full px-3.5 py-2.5 text-sm font-medium text-stone-900 bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:border-orange-500 focus:bg-white"
              />
            </div>
          </div>

          {/* LIVE 3-WAY SPLIT CALCULATION BOX */}
          <div className="p-4 bg-orange-50/70 border border-orange-200/80 rounded-xl">
            <div className="flex items-center justify-between text-xs text-orange-950 font-semibold mb-1">
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-orange-600" />
                <span>Automatic Equal Split ({splitBetween.length} Roommates)</span>
              </div>
              <span className="font-mono text-orange-800 font-bold">
                {numericAmount > 0 ? `${formatCurrency(numericAmount, currency)} ÷ ${numSplitPeople}` : 'Waiting for amount...'}
              </span>
            </div>

            <div className="flex items-baseline justify-between mt-2 pt-2 border-t border-orange-200/70">
              <span className="text-xs text-stone-600 font-medium">Per-person share:</span>
              <span className="text-xl font-bold font-mono text-orange-600 tabular-nums">
                {formatCurrency(perPersonShare, currency)}
                <span className="text-xs text-stone-500 font-normal font-sans ml-1">/ person</span>
              </span>
            </div>

            {/* Roommate preview chips */}
            <div className="mt-2.5 flex flex-wrap gap-2">
              {roommates.map((rm) => {
                const isIncluded = splitBetween.includes(rm.id);
                return (
                  <span
                    key={rm.id}
                    className={`text-xs px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-medium transition-all ${
                      isIncluded
                        ? 'bg-white text-stone-800 border border-orange-200 shadow-2xs font-semibold'
                        : 'bg-stone-100 text-stone-400 line-through'
                    }`}
                  >
                    <span>{rm.name}:</span>
                    <strong className="font-mono tabular-nums text-orange-600">
                      {isIncluded ? formatCurrency(perPersonShare, currency) : '¥0'}
                    </strong>
                  </span>
                );
              })}
            </div>
          </div>

          {/* Payment Source: Shared Pot vs Out-of-Pocket Split */}
          <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl space-y-2">
            <label className="block text-xs font-semibold text-stone-800">
              Payment Source
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaidFromPot(true)}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  paidFromPot
                    ? 'bg-orange-50 text-orange-800 border-orange-500 shadow-2xs font-bold'
                    : 'bg-white text-stone-600 border-stone-250 hover:bg-stone-100'
                }`}
              >
                <span className="text-sm">🍯</span>
                <span>Deduct from Shared Pot</span>
              </button>
              <button
                type="button"
                onClick={() => setPaidFromPot(false)}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  !paidFromPot
                    ? 'bg-orange-50 text-orange-800 border-orange-500 shadow-2xs font-bold'
                    : 'bg-white text-stone-600 border-stone-250 hover:bg-stone-100'
                }`}
              >
                <span className="text-sm">👥</span>
                <span>Out-of-Pocket (÷ 3 Debt)</span>
              </button>
            </div>
            <p className="text-[11px] text-stone-500 leading-tight">
              {paidFromPot
                ? '✓ Deducts directly from the monthly Shared Pot balance. No roommate debt is created.'
                : '✓ Paid out-of-pocket by the selected roommate and split 3 ways in the settlement ledger.'}
            </p>
          </div>

          {/* Date & Time with quick shortcuts */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-stone-700">
                Date & Time
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleQuickDate('today')}
                  className="text-xs px-2.5 py-0.5 bg-stone-100 text-stone-600 hover:text-stone-900 rounded-md transition-colors font-medium"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDate('yesterday')}
                  className="text-xs px-2.5 py-0.5 bg-stone-100 text-stone-600 hover:text-stone-900 rounded-md transition-colors font-medium"
                >
                  Yesterday
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                  <Calendar className="w-4 h-4" />
                </div>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm text-stone-900 bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:border-orange-500 focus:bg-white"
                />
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                  <Clock className="w-4 h-4" />
                </div>
                <input
                  type="time"
                  required
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm text-stone-900 bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:border-orange-500 focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* Paid By Selector */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              Who paid up front?
            </label>
            <div className="grid grid-cols-3 gap-2">
              {roommates.map((rm) => {
                const isSelected = paidById === rm.id;
                return (
                  <button
                    key={rm.id}
                    type="button"
                    onClick={() => setPaidById(rm.id)}
                    className={`py-2 px-3 rounded-xl border text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                      isSelected
                        ? 'bg-orange-50 text-orange-700 border-orange-500 shadow-xs font-bold'
                        : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100 hover:text-stone-900'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isSelected ? 'bg-orange-500' : 'bg-stone-400'
                      }`}
                    />
                    <span className="truncate">{rm.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category Selector */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              Category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(Object.keys(CATEGORY_DETAILS) as ExpenseCategory[]).map((catKey) => {
                const details = CATEGORY_DETAILS[catKey];
                const isSelected = category === catKey;
                return (
                  <button
                    key={catKey}
                    type="button"
                    onClick={() => setCategory(catKey)}
                    className={`px-3 py-2 rounded-xl border text-xs font-medium flex items-center gap-2 truncate transition-all ${
                      isSelected
                        ? 'bg-orange-50 text-orange-800 border-orange-400 shadow-2xs font-semibold'
                        : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100 hover:text-stone-900'
                    }`}
                  >
                    <span className="text-base select-none">{details.emoji}</span>
                    <span className="truncate">{details.label.split('&')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Split Toggle */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setCustomSplitMode(!customSplitMode)}
              className="text-xs text-stone-500 hover:text-stone-800 underline decoration-stone-300 underline-offset-4"
            >
              {customSplitMode ? '▾ Custom split options' : '▸ Customize who splits this expense (default is all 3)'}
            </button>

            {customSplitMode && (
              <div className="mt-2 p-3 bg-stone-50 border border-stone-200 rounded-xl">
                <span className="text-xs text-stone-700 font-semibold block mb-2">
                  Select roommates included in this split:
                </span>
                <div className="flex gap-2">
                  {roommates.map((rm) => {
                    const checked = splitBetween.includes(rm.id);
                    return (
                      <button
                        key={rm.id}
                        type="button"
                        onClick={() => toggleRoommateInSplit(rm.id)}
                        className={`px-3 py-1.5 text-xs rounded-lg border font-semibold flex items-center gap-1.5 transition-all ${
                          checked
                            ? 'bg-orange-100 text-orange-800 border-orange-300'
                            : 'bg-white text-stone-400 border-stone-200'
                        }`}
                      >
                        <span>{rm.name}</span>
                        <span>{checked ? '✓' : '+'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Notes and Optional Receipt Upload */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Notes / Details (Optional)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Milk, bread, shampoo, quarterly reconciliation..."
                className="w-full px-3 py-2 text-xs text-stone-900 bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:border-orange-500 focus:bg-white resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Receipt Attachment (Optional)
              </label>
              {receiptUrl ? (
                <div className="flex items-center gap-2 p-2 bg-stone-50 border border-stone-300 rounded-xl">
                  <img
                    src={receiptUrl}
                    alt="Receipt preview"
                    className="w-10 h-10 object-cover rounded-lg"
                  />
                  <div className="text-xs text-stone-700 font-medium truncate flex-1">
                    Receipt attached 📎
                  </div>
                  <button
                    type="button"
                    onClick={() => setReceiptUrl(undefined)}
                    className="p-1 text-stone-400 hover:text-rose-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 px-3 py-2.5 bg-stone-50 border border-dashed border-stone-300 hover:border-orange-400 rounded-xl cursor-pointer text-xs text-stone-500 hover:text-stone-800 transition-colors">
                  <Upload className="w-4 h-4 text-stone-400" />
                  <span>Attach receipt image</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleReceiptUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>
        </form>

        {/* Sticky Form Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-t border-stone-100 bg-stone-50/90 sm:bg-white shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs sm:text-sm font-semibold text-stone-600 hover:text-stone-900 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit as any}
            className="flex-1 sm:flex-initial px-6 py-2.5 min-h-[44px] text-xs sm:text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 active:scale-[0.98] rounded-xl shadow-xs shadow-orange-500/20 transition-all flex items-center justify-center gap-1.5"
          >
            <span>{editingExpense ? 'Save Changes' : 'Add Expense & Split by 3'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
