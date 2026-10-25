export type RoommateId = 'p1' | 'p2' | 'p3';

export interface Roommate {
  id: RoommateId;
  name: string;
  avatarEmoji?: string;
  avatarColor: string; // Tailwind color or hex
  accentBg: string;
  badgeBg: string;
  textColor: string;
}

export type ExpenseCategory =
  | 'groceries'
  | 'utilities'
  | 'rent'
  | 'wifi'
  | 'household'
  | 'food'
  | 'maintenance'
  | 'other';

export interface Expense {
  id: string;
  title: string;
  amount: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM (24h)
  timestamp: number; // millisecond timestamp
  paidById: RoommateId;
  splitBetween: RoommateId[]; // defaults to ['p1', 'p2', 'p3'] for equal 3-way split
  category: ExpenseCategory;
  notes?: string;
  receiptUrl?: string; // base64 or object URL
  paidFromPot?: boolean; // If true, bill is deducted directly from the Shared Pot
}

export interface SettlementRecord {
  id: string;
  fromId: RoommateId;
  toId: RoommateId;
  amount: number;
  date: string;
  time: string;
  timestamp: number;
  note?: string;
}

export interface DebtTransfer {
  from: RoommateId;
  to: RoommateId;
  amount: number;
}

export interface RoommateFinancialSummary {
  roommate: Roommate;
  totalPaid: number;
  totalShare: number;
  netBalance: number; // positive = should receive, negative = owes
  settlementsPaid: number;
  settlementsReceived: number;
  effectiveBalance: number; // netBalance + settlementsPaid - settlementsReceived
  expenseCount: number;
}

export interface SharedPotContribution {
  id: string;
  roommateId: RoommateId;
  month: string; // YYYY-MM
  amount: number;
  date: string;
  time: string;
  timestamp: number;
  note?: string;
}

export interface SharedPotSettings {
  monthlyContributionPerPerson: number; // e.g. 30000 Yen
  potName: string;
}

export interface HouseSettings {
  houseName: string;
  currency: string;
  roommates: Roommate[];
  sharedPotSettings: SharedPotSettings;
}
