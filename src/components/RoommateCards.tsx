import React from 'react';
import { Roommate, RoommateFinancialSummary } from '../types/expense';
import { formatCurrency } from '../utils/calculations';
import { ArrowDownRight, ArrowUpRight, Check, Receipt, Users } from 'lucide-react';

interface RoommateCardsProps {
  roommates: Roommate[];
  summaries: Record<string, RoommateFinancialSummary>;
  totalHouseSpend: number;
  totalPerPersonAvg: number;
  currency: string;
  sharedPotBalance?: number;
  onSwitchToPot?: () => void;
}

export const RoommateCards: React.FC<RoommateCardsProps> = ({
  roommates,
  summaries,
  totalHouseSpend,
  totalPerPersonAvg,
  currency,
  sharedPotBalance,
  onSwitchToPot,
}) => {
  return (
    <div className="space-y-4">
      {/* Top Banner KPI Card */}
      <div className="bg-white border border-stone-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-200/80 flex items-center justify-center text-orange-600 shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                Total Shared Expenses
              </span>
              {typeof sharedPotBalance === 'number' && onSwitchToPot && (
                <button
                  type="button"
                  onClick={onSwitchToPot}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-800 bg-orange-100/70 hover:bg-orange-100 px-2.5 py-0.5 rounded-full border border-orange-200/80 transition-colors"
                >
                  <span>🍯 Pot: {formatCurrency(sharedPotBalance, currency)}</span>
                  <span>→</span>
                </button>
              )}
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-stone-900 tracking-tight">
              {formatCurrency(totalHouseSpend, currency)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6 sm:gap-8 border-t sm:border-t-0 border-stone-100 pt-3 sm:pt-0 w-full sm:w-auto justify-between sm:justify-end">
          <div>
            <div className="text-xs font-semibold text-stone-500">Equal 1/3 Share</div>
            <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-orange-600">
              {formatCurrency(totalPerPersonAvg, currency)}
              <span className="text-xs text-stone-500 font-sans font-normal ml-1">/ person</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-semibold text-stone-500">Roommates</div>
            <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-stone-800">
              3 <span className="text-xs text-stone-500 font-sans font-normal">people</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3 Roommate Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {roommates.map((rm) => {
          const s = summaries[rm.id] || {
            totalPaid: 0,
            totalShare: 0,
            netBalance: 0,
            effectiveBalance: 0,
            expenseCount: 0,
          };

          const isOwed = s.effectiveBalance > 0.005;
          const owes = s.effectiveBalance < -0.005;
          const isSettled = Math.abs(s.effectiveBalance) <= 0.005;

          const percentPaid = totalHouseSpend > 0 
            ? Math.round((s.totalPaid / totalHouseSpend) * 100) 
            : 33;

          return (
            <div
              key={rm.id}
              className="bg-white border border-stone-200/90 rounded-2xl p-5 shadow-2xs hover:shadow-sm transition-all relative overflow-hidden"
            >
              {/* Header with avatar initial and name */}
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-xl ${rm.avatarColor} flex items-center justify-center text-sm font-bold shadow-xs select-none`}
                  >
                    {rm.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-stone-900 leading-tight">
                      {rm.name}
                    </h2>
                    <span className="text-xs text-stone-500">
                      Roommate · 1/3 share
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-stone-600 bg-stone-100 px-2.5 py-1 rounded-lg">
                  <Receipt className="w-3.5 h-3.5 text-stone-400" />
                  <span className="font-mono tabular-nums font-bold text-stone-800">{s.expenseCount}</span>
                  <span>bills</span>
                </div>
              </div>

              {/* Financial Metrics */}
              <div className="space-y-3 pt-2 border-t border-stone-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-500 font-medium">Total Paid</span>
                  <span className="text-sm font-bold font-mono tabular-nums text-stone-900">
                    {formatCurrency(s.totalPaid, currency)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-500 font-medium">1/3 Fair Share</span>
                  <span className="text-sm font-semibold font-mono tabular-nums text-stone-700">
                    {formatCurrency(s.totalShare, currency)}
                  </span>
                </div>

                {/* Net status */}
                <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                  <span className="text-xs font-semibold text-stone-500">
                    Net Balance
                  </span>
                  <div>
                    {isSettled ? (
                      <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                        <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                        <span>Settled Up</span>
                      </div>
                    ) : isOwed ? (
                      <div className="inline-flex items-center gap-1 text-xs font-bold text-orange-700 bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-200">
                        <ArrowDownRight className="w-3.5 h-3.5 text-orange-600" />
                        <span className="font-mono tabular-nums">
                          +{formatCurrency(s.effectiveBalance, currency)} to receive
                        </span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1 text-xs font-bold text-stone-700 bg-stone-100 px-2.5 py-1 rounded-lg border border-stone-200">
                        <ArrowUpRight className="w-3.5 h-3.5 text-stone-500" />
                        <span className="font-mono tabular-nums">
                          owes {formatCurrency(Math.abs(s.effectiveBalance), currency)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Contribution relative bar */}
                <div className="pt-1.5">
                  <div className="flex justify-between items-center text-[11px] text-stone-500 mb-1">
                    <span>Share of total paid</span>
                    <span className="font-mono font-bold tabular-nums text-stone-700">{percentPaid}%</span>
                  </div>
                  <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isOwed
                          ? 'bg-orange-500'
                          : owes
                          ? 'bg-amber-400'
                          : 'bg-stone-400'
                      }`}
                      style={{ width: `${Math.min(Math.max(percentPaid, 5), 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
