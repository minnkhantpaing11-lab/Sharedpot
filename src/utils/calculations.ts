import { Expense, Roommate, RoommateId, SettlementRecord, DebtTransfer, RoommateFinancialSummary, ExpenseCategory, SharedPotContribution } from '../types/expense';

export const CATEGORY_DETAILS: Record<ExpenseCategory, { label: string; emoji: string; color: string; bgColor: string; pillColor: string }> = {
  groceries: { label: 'Groceries & Supermarket', emoji: '🛒', color: '#ea580c', bgColor: 'bg-orange-50 text-orange-900 border-orange-200', pillColor: 'bg-orange-100 text-orange-800' },
  utilities: { label: 'Electricity & Gas', emoji: '⚡', color: '#f97316', bgColor: 'bg-amber-50 text-amber-900 border-amber-200', pillColor: 'bg-amber-100 text-amber-800' },
  rent: { label: 'Rent', emoji: '🏠', color: '#c2410c', bgColor: 'bg-stone-100 text-stone-900 border-stone-200', pillColor: 'bg-stone-200 text-stone-800' },
  wifi: { label: 'Internet & Wi-Fi', emoji: '📶', color: '#ea580c', bgColor: 'bg-orange-50 text-orange-900 border-orange-200', pillColor: 'bg-orange-100 text-orange-800' },
  household: { label: 'Household Supplies', emoji: '🧻', color: '#78716c', bgColor: 'bg-stone-100 text-stone-800 border-stone-200', pillColor: 'bg-stone-200 text-stone-800' },
  food: { label: 'Dining Out & Meals', emoji: '🍽️', color: '#f97316', bgColor: 'bg-orange-50 text-orange-900 border-orange-200', pillColor: 'bg-orange-100 text-orange-800' },
  maintenance: { label: 'Repairs & Maintenance', emoji: '🛠️', color: '#78716c', bgColor: 'bg-stone-100 text-stone-800 border-stone-200', pillColor: 'bg-stone-200 text-stone-800' },
  other: { label: 'Miscellaneous', emoji: '📦', color: '#78716c', bgColor: 'bg-stone-100 text-stone-800 border-stone-200', pillColor: 'bg-stone-200 text-stone-800' },
};

export function formatCurrency(amount: number, symbol: string = '¥'): string {
  const isZeroDecimalCurrency = symbol === '¥' || symbol === 'JPY' || symbol === '₩';
  const absAmount = Math.abs(amount);
  
  let formatted: string;
  if (isZeroDecimalCurrency) {
    formatted = Math.round(absAmount).toLocaleString('ja-JP');
  } else {
    const rounded = absAmount.toFixed(2);
    formatted = Number(rounded).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  return amount < -0.005 ? `-${symbol}${formatted}` : `${symbol}${formatted}`;
}

export function formatDateTime(dateStr: string, timeStr?: string): string {
  if (!dateStr) return '';
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const monthName = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    
    if (timeStr) {
      const [hours, minutes] = timeStr.split(':').map(Number);
      const period = hours >= 12 ? 'PM' : 'AM';
      const standardHour = hours % 12 === 0 ? 12 : hours % 12;
      const formattedMin = minutes < 10 ? `0${minutes}` : `${minutes}`;
      return `${monthName} · ${standardHour}:${formattedMin} ${period}`;
    }
    return monthName;
  } catch {
    return `${dateStr} ${timeStr || ''}`;
  }
}

export function getCurrentDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getCurrentTimeString(): string {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function getCurrentMonthString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function formatMonthLabel(monthStr: string): string {
  try {
    const [year, month] = monthStr.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  } catch {
    return monthStr;
  }
}

export interface SharedPotSummary {
  totalDeposited: number;
  totalDeducted: number;
  currentBalance: number;
  monthlyTargetPerPerson: number;
  totalMonthlyTarget: number;
  monthDeposited: number;
  monthDeducted: number;
  monthDeductionsCount: number;
  roommateStatus: Record<RoommateId, {
    depositedThisMonth: number;
    hasCompletedTarget: boolean;
    remainingToPay: number;
  }>;
}

export function calculateSharedPotSummary(
  contributions: SharedPotContribution[],
  expenses: Expense[],
  monthlyTargetPerPerson: number,
  roommates: Roommate[],
  selectedMonth: string
): SharedPotSummary {
  let totalDeposited = 0;
  let monthDeposited = 0;

  const roommateStatus: Record<RoommateId, {
    depositedThisMonth: number;
    hasCompletedTarget: boolean;
    remainingToPay: number;
  }> = {
    p1: { depositedThisMonth: 0, hasCompletedTarget: false, remainingToPay: monthlyTargetPerPerson },
    p2: { depositedThisMonth: 0, hasCompletedTarget: false, remainingToPay: monthlyTargetPerPerson },
    p3: { depositedThisMonth: 0, hasCompletedTarget: false, remainingToPay: monthlyTargetPerPerson },
  };

  contributions.forEach((c) => {
    totalDeposited += c.amount;
    if (c.month === selectedMonth) {
      monthDeposited += c.amount;
      if (roommateStatus[c.roommateId]) {
        roommateStatus[c.roommateId].depositedThisMonth += c.amount;
      }
    }
  });

  roommates.forEach((rm) => {
    const st = roommateStatus[rm.id];
    if (st) {
      st.hasCompletedTarget = st.depositedThisMonth >= monthlyTargetPerPerson;
      st.remainingToPay = Math.max(0, monthlyTargetPerPerson - st.depositedThisMonth);
    }
  });

  let totalDeducted = 0;
  let monthDeducted = 0;
  let monthDeductionsCount = 0;

  expenses.forEach((e) => {
    if (e.paidFromPot) {
      totalDeducted += e.amount;
      if (e.date.startsWith(selectedMonth)) {
        monthDeducted += e.amount;
        monthDeductionsCount += 1;
      }
    }
  });

  const currentBalance = totalDeposited - totalDeducted;
  const totalMonthlyTarget = monthlyTargetPerPerson * (roommates.length || 3);

  return {
    totalDeposited,
    totalDeducted,
    currentBalance,
    monthlyTargetPerPerson,
    totalMonthlyTarget,
    monthDeposited,
    monthDeducted,
    monthDeductionsCount,
    roommateStatus,
  };
}

export function calculateSummaries(
  expenses: Expense[],
  settlements: SettlementRecord[],
  roommates: Roommate[]
): {
  summaries: Record<RoommateId, RoommateFinancialSummary>;
  totalHouseSpend: number;
  totalPerPersonAvg: number;
  debtTransfers: DebtTransfer[];
} {
  const summaryMap: Record<RoommateId, RoommateFinancialSummary> = {
    p1: { roommate: roommates[0], totalPaid: 0, totalShare: 0, netBalance: 0, settlementsPaid: 0, settlementsReceived: 0, effectiveBalance: 0, expenseCount: 0 },
    p2: { roommate: roommates[1], totalPaid: 0, totalShare: 0, netBalance: 0, settlementsPaid: 0, settlementsReceived: 0, effectiveBalance: 0, expenseCount: 0 },
    p3: { roommate: roommates[2], totalPaid: 0, totalShare: 0, netBalance: 0, settlementsPaid: 0, settlementsReceived: 0, effectiveBalance: 0, expenseCount: 0 },
  };

  let totalHouseSpend = 0;

  // Process all expenses
  expenses.forEach((expense) => {
    totalHouseSpend += expense.amount;

    // If bill was paid out-of-pocket (not from the Shared Pot), it generates peer debts
    if (!expense.paidFromPot) {
      const payer = summaryMap[expense.paidById];
      if (payer) {
        payer.totalPaid += expense.amount;
        payer.expenseCount += 1;
      }

      const splitCount = expense.splitBetween.length || 3;
      const splitShare = expense.amount / splitCount;

      expense.splitBetween.forEach((id) => {
        if (summaryMap[id]) {
          summaryMap[id].totalShare += splitShare;
        }
      });
    } else {
      // If paid from shared pot, increment bill count for payer/record keeper
      const payer = summaryMap[expense.paidById];
      if (payer) {
        payer.expenseCount += 1;
      }
    }
  });

  // Process settlements
  settlements.forEach((s) => {
    if (summaryMap[s.fromId]) {
      summaryMap[s.fromId].settlementsPaid += s.amount;
    }
    if (summaryMap[s.toId]) {
      summaryMap[s.toId].settlementsReceived += s.amount;
    }
  });

  // Calculate balances
  Object.values(summaryMap).forEach((summary) => {
    summary.netBalance = Number((summary.totalPaid - summary.totalShare).toFixed(2));
    summary.effectiveBalance = Number(
      (summary.netBalance + summary.settlementsPaid - summary.settlementsReceived).toFixed(2)
    );
  });

  const totalPerPersonAvg = totalHouseSpend / (roommates.length || 3);
  const debtTransfers = calculateDebtTransfers(summaryMap);

  return {
    summaries: summaryMap,
    totalHouseSpend,
    totalPerPersonAvg,
    debtTransfers,
  };
}

/**
 * Calculates minimal debt transfers among roommates based on effective balances.
 * Debtor owes money (effectiveBalance < 0).
 * Creditor gets money (effectiveBalance > 0).
 */
export function calculateDebtTransfers(
  summaryMap: Record<RoommateId, RoommateFinancialSummary>
): DebtTransfer[] {
  // Clone balances to work with
  const debtors: { id: RoommateId; amount: number }[] = [];
  const creditors: { id: RoommateId; amount: number }[] = [];

  Object.entries(summaryMap).forEach(([id, summary]) => {
    const bal = summary.effectiveBalance;
    if (bal < -0.01) {
      debtors.push({ id: id as RoommateId, amount: Math.abs(bal) });
    } else if (bal > 0.01) {
      creditors.push({ id: id as RoommateId, amount: bal });
    }
  });

  // Sort descending by magnitude to minimize transactions
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transfers: DebtTransfer[] = [];
  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];
    const transferAmount = Math.min(debtor.amount, creditor.amount);

    if (transferAmount > 0.009) {
      transfers.push({
        from: debtor.id,
        to: creditor.id,
        amount: Number(transferAmount.toFixed(2)),
      });
    }

    debtor.amount -= transferAmount;
    creditor.amount -= transferAmount;

    if (debtor.amount < 0.01) dIdx++;
    if (creditor.amount < 0.01) cIdx++;
  }

  return transfers;
}

export function generateChatSummary(
  houseName: string,
  roommates: Roommate[],
  expenses: Expense[],
  settlements: SettlementRecord[],
  currency: string
): string {
  const { summaries, totalHouseSpend, totalPerPersonAvg, debtTransfers } = calculateSummaries(
    expenses,
    settlements,
    roommates
  );

  const lines: string[] = [];
  lines.push(`🏠 *${houseName} — Expense Split Summary*`);
  lines.push(`📅 ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`);
  lines.push(`💰 Total Shared Expenses: ${formatCurrency(totalHouseSpend, currency)}`);
  lines.push(`➗ Equal Share (÷ 3): ${formatCurrency(totalPerPersonAvg, currency)} / person`);
  lines.push('');
  lines.push('👥 *Roommate Breakdown:*');

  roommates.forEach((rm) => {
    const s = summaries[rm.id];
    const statusText =
      Math.abs(s.effectiveBalance) <= 0.01
        ? '✅ All settled up'
        : s.effectiveBalance > 0
        ? `🟢 Gets back ${formatCurrency(s.effectiveBalance, currency)}`
        : `🔴 Owes ${formatCurrency(Math.abs(s.effectiveBalance), currency)}`;
    lines.push(`• *${rm.name}*: Paid ${formatCurrency(s.totalPaid, currency)} (${s.expenseCount} bills) → ${statusText}`);
  });

  lines.push('');
  if (debtTransfers.length === 0) {
    lines.push('✨ All settled up! No outstanding balances.');
  } else {
    lines.push('🤝 *To Settle Up:*');
    debtTransfers.forEach((transfer) => {
      const fromName = roommates.find((r) => r.id === transfer.from)?.name || transfer.from;
      const toName = roommates.find((r) => r.id === transfer.to)?.name || transfer.to;
      lines.push(`👉 *${fromName}* pays *${toName}* ${formatCurrency(transfer.amount, currency)}`);
    });
  }

  return lines.join('\n');
}

export function exportToCsv(
  expenses: Expense[],
  roommates: Roommate[],
  currency: string
): void {
  const headers = ['Date', 'Time', 'Title', 'Category', 'Paid By', 'Payment Source', 'Total Amount', 'Split By', 'Per Person Share', 'Notes'];
  
  const getRoommateName = (id: RoommateId) => roommates.find(r => r.id === id)?.name || id;

  const rows = expenses.map(e => [
    `"${e.date}"`,
    `"${e.time}"`,
    `"${e.title.replace(/"/g, '""')}"`,
    `"${CATEGORY_DETAILS[e.category]?.label || e.category}"`,
    `"${getRoommateName(e.paidById)}"`,
    e.paidFromPot ? '"Shared Pot"' : '"Out-of-Pocket Split"',
    currency === '¥' ? `"${Math.round(e.amount)}"` : `"${e.amount.toFixed(2)}"`,
    `"${e.splitBetween.length} people"`,
    currency === '¥' ? `"${Math.round(e.amount / e.splitBetween.length)}"` : `"${(e.amount / e.splitBetween.length).toFixed(2)}"`,
    `"${(e.notes || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `sharehouse-expenses-${getCurrentDateString()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
