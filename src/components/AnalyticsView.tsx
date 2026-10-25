import React from 'react';
import { Expense, ExpenseCategory, Roommate, RoommateFinancialSummary } from '../types/expense';
import { CATEGORY_DETAILS, formatCurrency } from '../utils/calculations';
import { PieChart, TrendingUp, DollarSign, Wallet, Users } from 'lucide-react';

interface AnalyticsViewProps {
  expenses: Expense[];
  roommates: Roommate[];
  summaries: Record<string, RoommateFinancialSummary>;
  totalHouseSpend: number;
  totalPerPersonAvg: number;
  currency: string;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  expenses,
  roommates,
  summaries,
  totalHouseSpend,
  totalPerPersonAvg,
  currency,
}) => {
  // Aggregate category spending
  const categoryTotals: Record<ExpenseCategory, { amount: number; count: number }> = {
    groceries: { amount: 0, count: 0 },
    utilities: { amount: 0, count: 0 },
    rent: { amount: 0, count: 0 },
    wifi: { amount: 0, count: 0 },
    household: { amount: 0, count: 0 },
    food: { amount: 0, count: 0 },
    maintenance: { amount: 0, count: 0 },
    other: { amount: 0, count: 0 },
  };

  expenses.forEach((e) => {
    if (categoryTotals[e.category]) {
      categoryTotals[e.category].amount += e.amount;
      categoryTotals[e.category].count += 1;
    }
  });

  const sortedCategories = (Object.keys(categoryTotals) as ExpenseCategory[])
    .map((cat) => ({
      category: cat,
      details: CATEGORY_DETAILS[cat],
      amount: categoryTotals[cat].amount,
      count: categoryTotals[cat].count,
      percentage: totalHouseSpend > 0 ? (categoryTotals[cat].amount / totalHouseSpend) * 100 : 0,
    }))
    .filter((c) => c.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  return (
    <div className="space-y-6">
      {/* Overview Metric Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-stone-200/90 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-stone-500 mb-1">
            <DollarSign className="w-4 h-4 text-orange-600" />
            <span>Total Shared Spend</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-stone-900">
            {formatCurrency(totalHouseSpend, currency)}
          </div>
          <div className="text-xs text-stone-500 mt-1">
            Across {expenses.length} shared house receipts
          </div>
        </div>

        <div className="bg-white border border-stone-200/90 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-stone-500 mb-1">
            <Wallet className="w-4 h-4 text-orange-600" />
            <span>Equal 1/3 Fair Share</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-orange-600">
            {formatCurrency(totalPerPersonAvg, currency)}
          </div>
          <div className="text-xs text-stone-500 mt-1">
            Expected share per roommate
          </div>
        </div>

        <div className="bg-white border border-stone-200/90 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-stone-500 mb-1">
            <TrendingUp className="w-4 h-4 text-stone-500" />
            <span>Average Expense</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-stone-900">
            {formatCurrency(expenses.length > 0 ? totalHouseSpend / expenses.length : 0, currency)}
          </div>
          <div className="text-xs text-stone-500 mt-1">
            Average per bill logged
          </div>
        </div>
      </div>

      {/* Two-Column Analytics Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Spending by Category */}
        <div className="bg-white border border-stone-200/90 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-orange-600" />
              <span>Category Spending Breakdown</span>
            </h2>
            <span className="text-xs text-stone-500 font-medium">
              {sortedCategories.length} Categories
            </span>
          </div>

          {sortedCategories.length === 0 ? (
            <p className="text-xs text-stone-400 py-6 text-center">
              No expenses recorded yet.
            </p>
          ) : (
            <div className="space-y-4">
              {sortedCategories.map((item) => (
                <div key={item.category} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-stone-800 flex items-center gap-1.5">
                      <span>{item.details.emoji}</span>
                      <span>{item.details.label}</span>
                      <span className="text-stone-400 font-normal">({item.count})</span>
                    </span>
                    <div className="flex items-center gap-2 font-mono tabular-nums">
                      <span className="text-stone-900 font-bold">
                        {formatCurrency(item.amount, currency)}
                      </span>
                      <span className="text-stone-500 text-[11px] font-medium">
                        ({item.percentage.toFixed(0)}%)
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-stone-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500 bg-orange-500"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-stone-500">
                    ÷ 3 = <strong className="text-orange-600 font-mono">{formatCurrency(item.amount / 3, currency)}</strong> / person
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Roommate Contribution Breakdown */}
        <div className="bg-white border border-stone-200/90 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-orange-600" />
              <span>Roommate Contribution Comparison</span>
            </h2>
            <span className="text-xs text-stone-500 font-medium">Target: 33.3% each</span>
          </div>

          <div className="space-y-3.5">
            {roommates.map((rm) => {
              const s = summaries[rm.id];
              const paid = s?.totalPaid || 0;
              const percent = totalHouseSpend > 0 ? (paid / totalHouseSpend) * 100 : 0;
              const diffFromAvg = paid - totalPerPersonAvg;

              return (
                <div key={rm.id} className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-lg ${rm.avatarColor} text-xs font-bold flex items-center justify-center`}>
                        {rm.name.slice(0, 1)}
                      </div>
                      <span className="text-xs font-bold text-stone-900">{rm.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold font-mono tabular-nums text-stone-900">
                        {formatCurrency(paid, currency)}
                      </span>
                      <span className="text-xs text-stone-500 ml-1.5 font-mono font-medium">
                        ({percent.toFixed(0)}%)
                      </span>
                    </div>
                  </div>

                  <div className="w-full bg-stone-200/80 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        percent >= 33.3 ? 'bg-orange-500' : 'bg-amber-400'
                      }`}
                      style={{ width: `${Math.min(Math.max(percent, 2), 100)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-stone-500">
                    <span>Target: {formatCurrency(totalPerPersonAvg, currency)}</span>
                    <span className={diffFromAvg >= 0 ? 'text-orange-700 font-semibold' : 'text-stone-600 font-medium'}>
                      {diffFromAvg >= 0
                        ? `+${formatCurrency(diffFromAvg, currency)} above fair share`
                        : `${formatCurrency(Math.abs(diffFromAvg), currency)} below fair share`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};
