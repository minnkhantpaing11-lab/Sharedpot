import React, { useState } from 'react';
import { DebtTransfer, Roommate, SettlementRecord } from '../types/expense';
import { formatCurrency, getCurrentDateString, getCurrentTimeString } from '../utils/calculations';
import { ArrowRight, History, X, Check, HandCoins } from 'lucide-react';
import confetti from 'canvas-confetti';

interface SettlementBarProps {
  debtTransfers: DebtTransfer[];
  roommates: Roommate[];
  settlements: SettlementRecord[];
  currency: string;
  onRecordSettlement: (settlement: SettlementRecord) => void;
  onDeleteSettlement: (id: string) => void;
}

export const SettlementBar: React.FC<SettlementBarProps> = ({
  debtTransfers,
  roommates,
  settlements,
  currency,
  onRecordSettlement,
  onDeleteSettlement,
}) => {
  const [showHistory, setShowHistory] = useState(false);
  const [settlingTransfer, setSettlingTransfer] = useState<DebtTransfer | null>(null);
  const [settleNote, setSettleNote] = useState('');

  const getRoommate = (id: string) => roommates.find((r) => r.id === id);

  const handleConfirmSettle = (transfer: DebtTransfer) => {
    const newRecord: SettlementRecord = {
      id: `settle-${Date.now()}`,
      fromId: transfer.from,
      toId: transfer.to,
      amount: transfer.amount,
      date: getCurrentDateString(),
      time: getCurrentTimeString(),
      timestamp: Date.now(),
      note: settleNote.trim() || 'Bank transfer / PayPay settle up',
    };

    onRecordSettlement(newRecord);
    setSettlingTransfer(null);
    setSettleNote('');

    try {
      confetti({
        particleCount: 70,
        spread: 70,
        colors: ['#ea580c', '#f97316', '#fbbf24', '#f1f5f9'],
        origin: { y: 0.6 },
      });
    } catch {
      // ignore
    }
  };

  return (
    <div className="bg-white border border-stone-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-200/60 flex items-center justify-center text-orange-600">
            <HandCoins className="w-4 h-4" />
          </div>
          <h2 className="text-sm sm:text-base font-bold text-stone-900">
            Settlement Summary · Who Owes Whom
          </h2>
        </div>

        {settlements.length > 0 && (
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-stone-800 transition-colors"
          >
            <History className="w-3.5 h-3.5" />
            <span>
              {showHistory ? 'Hide History' : `Payment History (${settlements.length})`}
            </span>
          </button>
        )}
      </div>

      {debtTransfers.length === 0 ? (
        <div className="flex items-center gap-2.5 text-xs text-stone-700 bg-stone-50 border border-stone-200 rounded-xl p-3.5">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-medium">
            Everyone is all settled up! No outstanding payments required among roommates.
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {debtTransfers.map((transfer, idx) => {
            const fromPerson = getRoommate(transfer.from);
            const toPerson = getRoommate(transfer.to);

            return (
              <div
                key={idx}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 sm:p-3.5 bg-orange-50/40 border border-orange-200/70 rounded-xl hover:bg-orange-50/70 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {/* From Person */}
                  <span className="font-semibold text-stone-800 text-xs sm:text-sm truncate">
                    {fromPerson?.name || transfer.from}
                  </span>

                  <ArrowRight className="w-3.5 h-3.5 text-orange-500 shrink-0" />

                  {/* To Person */}
                  <span className="font-semibold text-stone-800 text-xs sm:text-sm truncate">
                    {toPerson?.name || transfer.to}
                  </span>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-orange-200/40">
                  <span className="text-xs sm:text-sm font-bold font-mono tabular-nums text-orange-700 bg-white px-2.5 py-1 rounded-lg border border-orange-200 shadow-2xs">
                    {formatCurrency(transfer.amount, currency)}
                  </span>

                  <button
                    onClick={() => setSettlingTransfer(transfer)}
                    className="min-h-[36px] px-3.5 py-1 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors whitespace-nowrap shadow-xs active:scale-95"
                  >
                    Settle Up
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Settle Up Confirmation Modal */}
      {settlingTransfer && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white border-t sm:border border-stone-200 rounded-t-3xl sm:rounded-2xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-xl animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
            {/* Mobile handle */}
            <div className="sm:hidden w-12 h-1.5 bg-stone-300 rounded-full mx-auto -mt-1 mb-1" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                  <HandCoins className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-stone-900">Record Settle Up Payment</h3>
              </div>
              <button
                onClick={() => setSettlingTransfer(null)}
                className="w-8 h-8 flex items-center justify-center text-stone-400 hover:text-stone-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-stone-600">
              Confirm that{' '}
              <strong className="text-stone-900 font-semibold">
                {getRoommate(settlingTransfer.from)?.name}
              </strong>{' '}
              transferred money to{' '}
              <strong className="text-stone-900 font-semibold">
                {getRoommate(settlingTransfer.to)?.name}
              </strong>
              :
            </p>

            <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-700">Settlement Amount:</span>
              <span className="text-xl font-bold font-mono text-orange-600">
                {formatCurrency(settlingTransfer.amount, currency)}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Payment Method / Note (Optional)
              </label>
              <input
                type="text"
                value={settleNote}
                onChange={(e) => setSettleNote(e.target.value)}
                placeholder="e.g. Bank transfer, PayPay, Line Pay, Cash"
                className="w-full px-3 py-2.5 text-base sm:text-xs bg-stone-50 border border-stone-300 rounded-xl text-stone-900 placeholder-stone-400 focus:outline-none focus:border-orange-500 focus:bg-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setSettlingTransfer(null)}
                className="px-4 py-2 text-xs font-semibold text-stone-500 hover:text-stone-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleConfirmSettle(settlingTransfer)}
                className="flex-1 sm:flex-initial px-5 py-2.5 min-h-[42px] text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition-all shadow-xs active:scale-95"
              >
                Confirm Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment History View */}
      {showHistory && settlements.length > 0 && (
        <div className="mt-4 pt-3 border-t border-stone-100 space-y-2">
          <div className="text-xs font-bold text-stone-500 uppercase tracking-wide">
            Settlement Payment History
          </div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {settlements.map((s) => {
              const fromP = getRoommate(s.fromId);
              const toP = getRoommate(s.toId);
              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between text-xs p-2.5 bg-stone-50 rounded-xl border border-stone-200"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-stone-400 font-mono">{s.date} · {s.time}</span>
                    <span className="text-stone-800 font-semibold truncate">
                      {fromP?.name} paid {toP?.name}
                    </span>
                    {s.note && (
                      <span className="text-stone-500 text-[11px] truncate">
                        ({s.note})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono tabular-nums text-orange-600 font-bold">
                      {formatCurrency(s.amount, currency)}
                    </span>
                    <button
                      onClick={() => onDeleteSettlement(s.id)}
                      title="Undo this payment"
                      className="text-stone-400 hover:text-rose-500 p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
