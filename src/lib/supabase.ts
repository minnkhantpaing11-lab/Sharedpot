import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AuthUser, PersonalBudget, PersonalExpense, PersonalCategory, SupabaseConfig } from '../types/personal';

const CONFIG_STORAGE_KEY = 'unemaison_supabase_config_v1';
const CURRENT_USER_STORAGE_KEY = 'unemaison_current_user_v1';
const LOCAL_USERS_STORAGE_KEY = 'unemaison_local_users_v1';

// Default Supabase configuration from environment or empty
export function getSavedSupabaseConfig(): SupabaseConfig {
  try {
    const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed reading Supabase config', e);
  }

  return {
    url: (import.meta.env.VITE_SUPABASE_URL as string) || '',
    anonKey: (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '',
    isConnected: false,
    autoSync: true,
  };
}

export function saveSupabaseConfig(config: SupabaseConfig) {
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
}

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(config?: SupabaseConfig): SupabaseClient | null {
  const activeConfig = config || getSavedSupabaseConfig();
  if (!activeConfig.url || !activeConfig.anonKey) {
    supabaseInstance = null;
    return null;
  }

  try {
    supabaseInstance = createClient(activeConfig.url, activeConfig.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    return supabaseInstance;
  } catch (err) {
    console.error('Error creating Supabase client:', err);
    supabaseInstance = null;
    return null;
  }
}

// Test Supabase connection
export async function testSupabaseConnection(url: string, anonKey: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!url.trim() || !anonKey.trim()) {
      return { success: false, error: 'URL and Anon Key cannot be empty.' };
    }
    const testClient = createClient(url.trim(), anonKey.trim());
    // Quick ping to auth API
    const { error } = await testClient.auth.getSession();
    if (error && !error.message.includes('Auth session missing')) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to connect to Supabase.' };
  }
}

// ==================== AUTH SERVICE ====================

export function getCurrentUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(CURRENT_USER_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed parsing current user', e);
  }
  return null;
}

export function setCurrentUser(user: AuthUser | null) {
  if (user) {
    localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
  }
}

// Local mock user database for instant offline/standalone usage
interface LocalAccount {
  id: string;
  email: string;
  passwordHash: string; // Basic hash for mock
  displayName: string;
}

function getLocalAccounts(): LocalAccount[] {
  try {
    const saved = localStorage.getItem(LOCAL_USERS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveLocalAccounts(accounts: LocalAccount[]) {
  localStorage.setItem(LOCAL_USERS_STORAGE_KEY, JSON.stringify(accounts));
}

export async function loginUser(
  email: string,
  pass: string,
  useSupabaseIfAvailable: boolean = true
): Promise<{ user: AuthUser; error?: string }> {
  const trimmedEmail = email.trim().toLowerCase();
  const config = getSavedSupabaseConfig();
  const client = getSupabaseClient(config);

  if (useSupabaseIfAvailable && client && config.isConnected) {
    try {
      const { data, error } = await client.auth.signInWithPassword({
        email: trimmedEmail,
        password: pass,
      });

      if (error) {
        return { user: null as any, error: error.message };
      }

      if (data.user) {
        const authUser: AuthUser = {
          id: data.user.id,
          email: data.user.email || trimmedEmail,
          displayName: data.user.user_metadata?.name || trimmedEmail.split('@')[0],
          isSupabase: true,
        };
        setCurrentUser(authUser);
        return { user: authUser };
      }
    } catch (err: any) {
      console.warn('Supabase login failed, trying local fallback:', err);
    }
  }

  // Local Accounts Authentication fallback
  const accounts = getLocalAccounts();
  const existing = accounts.find((a) => a.email === trimmedEmail);

  if (existing) {
    if (existing.passwordHash !== btoa(pass)) {
      return { user: null as any, error: 'Incorrect password.' };
    }
    const authUser: AuthUser = {
      id: existing.id,
      email: existing.email,
      displayName: existing.displayName,
      isSupabase: false,
    };
    setCurrentUser(authUser);
    return { user: authUser };
  } else {
    // If account doesn't exist, automatically create it for seamless user onboarding
    const newId = 'usr_' + Math.random().toString(36).substring(2, 10);
    const displayName = trimmedEmail.split('@')[0];
    const newAccount: LocalAccount = {
      id: newId,
      email: trimmedEmail,
      passwordHash: btoa(pass),
      displayName,
    };
    accounts.push(newAccount);
    saveLocalAccounts(accounts);

    const authUser: AuthUser = {
      id: newId,
      email: trimmedEmail,
      displayName,
      isSupabase: false,
    };
    setCurrentUser(authUser);
    return { user: authUser };
  }
}

export async function signUpUser(
  email: string,
  pass: string,
  name?: string
): Promise<{ user: AuthUser; error?: string }> {
  const trimmedEmail = email.trim().toLowerCase();
  const config = getSavedSupabaseConfig();
  const client = getSupabaseClient(config);

  if (client && config.isConnected) {
    try {
      const { data, error } = await client.auth.signUp({
        email: trimmedEmail,
        password: pass,
        options: {
          data: { name: name || trimmedEmail.split('@')[0] },
        },
      });

      if (error) {
        return { user: null as any, error: error.message };
      }

      if (data.user) {
        const authUser: AuthUser = {
          id: data.user.id,
          email: data.user.email || trimmedEmail,
          displayName: name || trimmedEmail.split('@')[0],
          isSupabase: true,
        };
        setCurrentUser(authUser);
        return { user: authUser };
      }
    } catch (err: any) {
      return { user: null as any, error: err?.message || 'Supabase signup failed' };
    }
  }

  // Local fallback signup
  const accounts = getLocalAccounts();
  if (accounts.some((a) => a.email === trimmedEmail)) {
    return { user: null as any, error: 'Account already exists. Please log in.' };
  }

  const newId = 'usr_' + Math.random().toString(36).substring(2, 10);
  const displayName = name?.trim() || trimmedEmail.split('@')[0];
  const newAccount: LocalAccount = {
    id: newId,
    email: trimmedEmail,
    passwordHash: btoa(pass),
    displayName,
  };
  accounts.push(newAccount);
  saveLocalAccounts(accounts);

  const authUser: AuthUser = {
    id: newId,
    email: trimmedEmail,
    displayName,
    isSupabase: false,
  };
  setCurrentUser(authUser);
  return { user: authUser };
}

export async function logoutUser(): Promise<void> {
  const config = getSavedSupabaseConfig();
  const client = getSupabaseClient(config);
  if (client) {
    try {
      await client.auth.signOut();
    } catch (e) {
      console.warn('Supabase signOut error', e);
    }
  }
  setCurrentUser(null);
}

// ==================== USER-ISOLATED DATA SERVICE ====================

// Local storage key isolated strictly by userId
function getExpensesStorageKey(userId: string): string {
  return `unemaison_user_${userId}_spendings_v1`;
}

function getBudgetStorageKey(userId: string): string {
  return `unemaison_user_${userId}_budget_v1`;
}

// Load user's personal budget
export async function loadUserBudget(userId: string): Promise<PersonalBudget> {
  const config = getSavedSupabaseConfig();
  const client = getSupabaseClient(config);

  if (client && config.isConnected) {
    try {
      const { data, error } = await client
        .from('personal_budgets')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!error && data) {
        const b: PersonalBudget = {
          userId: data.user_id,
          startingBalance: Number(data.starting_balance) || 100000,
          currency: data.currency || '¥',
          lastUpdated: new Date(data.updated_at).getTime(),
        };
        // Cache locally
        localStorage.setItem(getBudgetStorageKey(userId), JSON.stringify(b));
        return b;
      }
    } catch (e) {
      console.warn('Failed to fetch budget from Supabase, using local', e);
    }
  }

  // Local fallback
  try {
    const raw = localStorage.getItem(getBudgetStorageKey(userId));
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading local budget', e);
  }

  // Default initial budget (100,000 Yen)
  const defaultBudget: PersonalBudget = {
    userId,
    startingBalance: 100000,
    currency: '¥',
    lastUpdated: Date.now(),
  };
  localStorage.setItem(getBudgetStorageKey(userId), JSON.stringify(defaultBudget));
  return defaultBudget;
}

// Save user's personal budget
export async function saveUserBudget(budget: PersonalBudget): Promise<void> {
  localStorage.setItem(getBudgetStorageKey(budget.userId), JSON.stringify(budget));

  const config = getSavedSupabaseConfig();
  const client = getSupabaseClient(config);

  if (client && config.isConnected) {
    try {
      await client.from('personal_budgets').upsert({
        user_id: budget.userId,
        starting_balance: budget.startingBalance,
        currency: budget.currency,
        updated_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Failed saving budget to Supabase', e);
    }
  }
}

// Load user's personal spendings (Strictly filtered by userId)
export async function loadUserSpendings(userId: string): Promise<PersonalExpense[]> {
  const config = getSavedSupabaseConfig();
  const client = getSupabaseClient(config);

  if (client && config.isConnected) {
    try {
      const { data, error } = await client
        .from('personal_spendings')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        const mapped: PersonalExpense[] = data.map((row: any) => ({
          id: row.id,
          userId: row.user_id,
          subject: row.subject,
          amount: Number(row.amount),
          category: (row.category as PersonalCategory) || 'food',
          notes: row.notes,
          date: row.date || new Date(row.created_at).toISOString().split('T')[0],
          time: row.time || new Date(row.created_at).toTimeString().substring(0, 5),
          timestamp: new Date(row.created_at).getTime(),
        }));
        // Cache locally
        localStorage.setItem(getExpensesStorageKey(userId), JSON.stringify(mapped));
        return mapped;
      }
    } catch (e) {
      console.warn('Failed to load spendings from Supabase, using local cache', e);
    }
  }

  // Local storage isolated by userId
  try {
    const raw = localStorage.getItem(getExpensesStorageKey(userId));
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed reading user spendings', e);
  }

  // Initial sample personal expenses for new user
  const initialUserSpendings: PersonalExpense[] = [
    {
      id: 'pexp-1',
      userId,
      subject: 'Convenience Store Lunch',
      amount: 850,
      category: 'food',
      notes: 'Bento & Green Tea at 7-Eleven',
      date: new Date().toISOString().split('T')[0],
      time: '12:30',
      timestamp: Date.now() - 3600000 * 4,
    },
    {
      id: 'pexp-2',
      userId,
      subject: 'Iced Latte',
      amount: 480,
      category: 'coffee',
      notes: 'Morning coffee',
      date: new Date().toISOString().split('T')[0],
      time: '08:45',
      timestamp: Date.now() - 3600000 * 8,
    },
    {
      id: 'pexp-3',
      userId,
      subject: 'Subway Train IC Card Top-up',
      amount: 2000,
      category: 'transport',
      notes: 'Suica / Pasmo transit refill',
      date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
      time: '18:15',
      timestamp: Date.now() - 86400000,
    },
  ];

  localStorage.setItem(getExpensesStorageKey(userId), JSON.stringify(initialUserSpendings));
  return initialUserSpendings;
}

// Add a new personal expense
export async function addPersonalExpense(expense: PersonalExpense): Promise<void> {
  // Save locally first
  const existing = await loadUserSpendings(expense.userId);
  const updated = [expense, ...existing.filter((e) => e.id !== expense.id)];
  localStorage.setItem(getExpensesStorageKey(expense.userId), JSON.stringify(updated));

  const config = getSavedSupabaseConfig();
  const client = getSupabaseClient(config);

  if (client && config.isConnected) {
    try {
      await client.from('personal_spendings').insert({
        id: expense.id.startsWith('pexp-') ? undefined : expense.id, // let postgres assign uuid if prefix
        user_id: expense.userId,
        subject: expense.subject,
        amount: expense.amount,
        category: expense.category,
        notes: expense.notes || null,
        created_at: new Date(expense.timestamp).toISOString(),
      });
    } catch (e) {
      console.warn('Failed to insert spending into Supabase', e);
    }
  }
}

// Delete a personal expense
export async function deletePersonalExpense(userId: string, expenseId: string): Promise<void> {
  const existing = await loadUserSpendings(userId);
  const updated = existing.filter((e) => e.id !== expenseId);
  localStorage.setItem(getExpensesStorageKey(userId), JSON.stringify(updated));

  const config = getSavedSupabaseConfig();
  const client = getSupabaseClient(config);

  if (client && config.isConnected) {
    try {
      await client.from('personal_spendings').delete().eq('id', expenseId).eq('user_id', userId);
    } catch (e) {
      console.warn('Failed deleting from Supabase', e);
    }
  }
}

// ==================== NATURAL LANGUAGE COMMAND PARSER ====================
// Supports input like "food 1500", "lunch 1200", "coffee 500", "1500 ramen", "train 350"
export interface ParsedCommand {
  subject: string;
  amount: number;
  category: PersonalCategory;
}

export function parseQuickSpendingInput(input: string): ParsedCommand | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Match pattern: word + number OR number + word
  // e.g. "food 1500", "ramen 950 yen", "1500 groceries", "starbucks 650"
  const tokens = trimmed.split(/\s+/);
  if (tokens.length < 2) {
    // Try single string with digits e.g. "food1500" or just number
    return null;
  }

  let amount = 0;
  let subjectTokens: string[] = [];

  for (const token of tokens) {
    // Clean currency symbols or suffixes: ¥, yen, $, etc.
    const cleanNum = token.replace(/^[¥$€£]/, '').replace(/(yen|円|jpy)$/i, '');
    const num = parseFloat(cleanNum);
    if (!isNaN(num) && num > 0 && amount === 0) {
      amount = Math.round(num);
    } else {
      subjectTokens.push(token);
    }
  }

  if (amount <= 0 || subjectTokens.length === 0) {
    return null;
  }

  const subject = subjectTokens.join(' ');
  const category = inferCategoryFromSubject(subject);

  return {
    subject,
    amount,
    category,
  };
}

export function inferCategoryFromSubject(subject: string): PersonalCategory {
  const lower = subject.toLowerCase();
  if (/coffee|cafe|latte|starbucks|tea|espresso|matcha/i.test(lower)) return 'coffee';
  if (/food|lunch|dinner|breakfast|ramen|sushi|bento|burger|mcdonald|pizza|snack|curry|meal/i.test(lower)) return 'food';
  if (/grocery|supermarket|mart|market|vegetable|fruit|meat|milk|eggs|bread|7-eleven|lawson|family\s*mart/i.test(lower)) return 'groceries';
  if (/train|subway|metro|bus|taxi|uber|suica|pasmo|gas|fuel|transit|commute/i.test(lower)) return 'transport';
  if (/movie|game|steam|cinema|concert|karaoke|bowling|beer|bar|club|drink/i.test(lower)) return 'entertainment';
  if (/cloth|shoes|amazon|uniqlo|shirt|pants|shopping|cosmetics|book/i.test(lower)) return 'shopping';
  if (/electric|water|gas|rent|bill|phone|sim|mobile|internet|wifi|utility/i.test(lower)) return 'bills';
  if (/pharmacy|medicine|doctor|clinic|gym|fitness|hospital|vitamins/i.test(lower)) return 'health';
  return 'other';
}

export const SUPABASE_SQL_SETUP_SCRIPT = `-- Une Maison: Personal Budget & Spending Schema for Supabase
-- Run this in your Supabase SQL Editor:

-- 1. Create personal_spendings table
create table if not exists public.personal_spendings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  subject text not null,
  amount numeric not null,
  category text not null default 'food',
  notes text,
  created_at timestamptz default now()
);

-- 2. Create personal_budgets table
create table if not exists public.personal_budgets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  starting_balance numeric not null default 100000,
  currency text not null default '¥',
  updated_at timestamptz default now()
);

-- 3. Enable Row Level Security (RLS) so each user can ONLY see their own data
alter table public.personal_spendings enable row level security;
alter table public.personal_budgets enable row level security;

-- 4. Policies for personal_spendings
create policy "Users can view their own spendings"
  on public.personal_spendings for select
  using (auth.uid() = user_id);

create policy "Users can insert their own spendings"
  on public.personal_spendings for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own spendings"
  on public.personal_spendings for delete
  using (auth.uid() = user_id);

-- 5. Policies for personal_budgets
create policy "Users can view their own budget"
  on public.personal_budgets for select
  using (auth.uid() = user_id);

create policy "Users can update their own budget"
  on public.personal_budgets for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
`;
