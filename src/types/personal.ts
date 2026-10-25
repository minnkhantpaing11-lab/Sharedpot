export interface PersonalExpense {
  id: string;
  userId: string;
  subject: string;
  amount: number;
  category: PersonalCategory;
  notes?: string;
  date: string;
  time: string;
  timestamp: number;
}

export type PersonalCategory =
  | 'food'
  | 'coffee'
  | 'groceries'
  | 'transport'
  | 'entertainment'
  | 'shopping'
  | 'bills'
  | 'health'
  | 'other';

export interface PersonalBudget {
  userId: string;
  startingBalance: number;
  currency: string;
  periodLabel?: string;
  lastUpdated: number;
}

export interface AuthUser {
  id: string;
  email: string;
  displayName?: string;
  isSupabase?: boolean;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConnected: boolean;
  autoSync: boolean;
}
