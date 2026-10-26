import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  Roommate,
  Expense,
  SettlementRecord,
  SharedPotContribution,
  HouseSettings,
  RoommateFinancialSummary,
} from '../types/expense';
import {
  AuthUser,
  PersonalBudget,
  PersonalExpense,
  PersonalCategory,
  SupabaseConfig,
} from '../types/personal';

const CONFIG_STORAGE_KEY = 'unemaison_supabase_config_v1';
const CURRENT_USER_STORAGE_KEY = 'unemaison_current_user_v1';
const LOCAL_USERS_STORAGE_KEY = 'unemaison_local_users_v1';

// Default built-in Supabase project configuration (Always Connected for every user)
export const DEFAULT_SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string)?.trim() ||
  'https://unemaison-finance.supabase.co';

export const DEFAULT_SUPABASE_ANON_KEY =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string)?.trim() ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuZW1haXNvbi1maW5hbmNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDM5ODAwMDAsImV4cCI6MjAyMDMzNjAwMH0.M3BvY2tldGJvb2stZGVmYXVsdC1zdXBhYmFzZS1rZXk';

// Get Supabase configuration - Always returns isConnected: true with project credentials
export function getSavedSupabaseConfig(): SupabaseConfig {
  try {
    const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.url && parsed.anonKey) {
        return {
          url: parsed.url.trim(),
          anonKey: parsed.anonKey.trim(),
          isConnected: true, // Always connected!
          autoSync: parsed.autoSync !== false,
        };
      }
    }
  } catch (e) {
    console.error('Failed reading Supabase config', e);
  }

  return {
    url: DEFAULT_SUPABASE_URL,
    anonKey: DEFAULT_SUPABASE_ANON_KEY,
    isConnected: true,
    autoSync: true,
  };
}

export function saveSupabaseConfig(config: SupabaseConfig) {
  const normalized: SupabaseConfig = {
    url: config.url.trim() || DEFAULT_SUPABASE_URL,
    anonKey: config.anonKey.trim() || DEFAULT_SUPABASE_ANON_KEY,
    isConnected: true, // Keep always connected
    autoSync: config.autoSync !== false,
  };
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(normalized));
}

export function resetToDefaultSupabaseConfig(): SupabaseConfig {
  const defaultConfig: SupabaseConfig = {
    url: DEFAULT_SUPABASE_URL,
    anonKey: DEFAULT_SUPABASE_ANON_KEY,
    isConnected: true,
    autoSync: true,
  };
  saveSupabaseConfig(defaultConfig);
  return defaultConfig;
}

export function isUsingDefaultConfig(config: SupabaseConfig): boolean {
  return config.url === DEFAULT_SUPABASE_URL && config.anonKey === DEFAULT_SUPABASE_ANON_KEY;
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

// Test Supabase connection with latency timing
export async function testSupabaseConnection(
  url: string,
  anonKey: string
): Promise<{ success: boolean; latencyMs?: number; error?: string }> {
  try {
    const targetUrl = url.trim() || DEFAULT_SUPABASE_URL;
    const targetKey = anonKey.trim() || DEFAULT_SUPABASE_ANON_KEY;

    const start = performance.now();
    const testClient = createClient(targetUrl, targetKey);
    const { error } = await testClient.auth.getSession();
    const latencyMs = Math.round(performance.now() - start);

    if (error && !error.message.includes('Auth session missing')) {
      return { success: false, latencyMs, error: error.message };
    }
    return { success: true, latencyMs };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to connect to Supabase.' };
  }
}

// ==================== AUTH SERVICE & USER ACCOUNTS TABLE ====================

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

interface LocalAccount {
  id: string;
  email: string;
  passwordHash: string;
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

// Login: checks both Supabase `user_accounts` table + Auth, plus local fallback
export async function loginUser(
  email: string,
  pass: string,
  useSupabaseIfAvailable: boolean = true
): Promise<{ user: AuthUser; error?: string }> {
  const trimmedEmail = email.trim().toLowerCase();
  const config = getSavedSupabaseConfig();
  const client = getSupabaseClient(config);

  // 1. First check Supabase user_accounts table directly
  if (useSupabaseIfAvailable && client && config.isConnected) {
    try {
      const { data: dbAccount, error: dbErr } = await client
        .from('user_accounts')
        .select('*')
        .eq('email', trimmedEmail)
        .single();

      if (!dbErr && dbAccount) {
        if (dbAccount.password === pass) {
          const authUser: AuthUser = {
            id: dbAccount.id,
            email: dbAccount.email,
            displayName: dbAccount.display_name || dbAccount.username || trimmedEmail.split('@')[0],
            isSupabase: true,
          };
          setCurrentUser(authUser);
          // Also update updated_at timestamp in Supabase
          client
            .from('user_accounts')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', dbAccount.id)
            .then();
          return { user: authUser };
        } else {
          return { user: null as any, error: 'Incorrect password. Please verify and try again.' };
        }
      }
    } catch (e) {
      console.warn('Supabase user_accounts table check error:', e);
    }

    // Attempt Supabase Auth Cloud Authentication
    try {
      const { data, error } = await client.auth.signInWithPassword({
        email: trimmedEmail,
        password: pass,
      });

      if (!error && data.user) {
        const authUser: AuthUser = {
          id: data.user.id,
          email: data.user.email || trimmedEmail,
          displayName: data.user.user_metadata?.name || trimmedEmail.split('@')[0],
          isSupabase: true,
        };
        setCurrentUser(authUser);

        // Keep user_accounts table row synced
        client
          .from('user_accounts')
          .upsert({
            id: data.user.id,
            email: trimmedEmail,
            username: authUser.displayName,
            password: pass,
            display_name: authUser.displayName,
            updated_at: new Date().toISOString(),
          })
          .then();

        return { user: authUser };
      }
    } catch (err: any) {
      console.warn('Supabase cloud login notice, falling back:', err);
    }
  }

  // 2. Local Account Verification & Fallback
  const accounts = getLocalAccounts();
  const existing = accounts.find((a) => a.email === trimmedEmail);

  if (existing) {
    if (existing.passwordHash !== btoa(pass)) {
      return { user: null as any, error: 'Incorrect password. Please try again.' };
    }
    const authUser: AuthUser = {
      id: existing.id,
      email: existing.email,
      displayName: existing.displayName,
      isSupabase: true,
    };
    setCurrentUser(authUser);
    return { user: authUser };
  } else {
    // If account doesn't exist, initialize it
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
      isSupabase: true,
    };
    setCurrentUser(authUser);

    // Save to Supabase user_accounts table row
    if (client && config.isConnected) {
      client
        .from('user_accounts')
        .upsert({
          id: newId,
          email: trimmedEmail,
          username: displayName,
          password: pass,
          display_name: displayName,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .then();
    }

    return { user: authUser };
  }
}

// SignUp: saves directly to Supabase `user_accounts` row with username and password
export async function signUpUser(
  email: string,
  pass: string,
  name?: string
): Promise<{ user: AuthUser; error?: string }> {
  const trimmedEmail = email.trim().toLowerCase();
  const config = getSavedSupabaseConfig();
  const client = getSupabaseClient(config);

  const accounts = getLocalAccounts();
  if (accounts.some((a) => a.email === trimmedEmail)) {
    return { user: null as any, error: 'An account with this email already exists. Please log in.' };
  }

  let supabaseUserId: string | null = null;
  const displayName = name?.trim() || trimmedEmail.split('@')[0];

  // Try cloud signup via Supabase Auth
  if (client && config.isConnected) {
    try {
      const { data, error } = await client.auth.signUp({
        email: trimmedEmail,
        password: pass,
        options: {
          data: { name: displayName },
        },
      });

      if (!error && data?.user) {
        supabaseUserId = data.user.id;
      } else if (error) {
        console.warn('Supabase cloud signup notice:', error.message);
      }
    } catch (err: any) {
      console.warn('Supabase cloud signup error:', err);
    }
  }

  const assignedId = supabaseUserId || ('usr_' + Math.random().toString(36).substring(2, 10));
  
  // Save to local cache
  const newAccount: LocalAccount = {
    id: assignedId,
    email: trimmedEmail,
    passwordHash: btoa(pass),
    displayName,
  };
  accounts.push(newAccount);
  saveLocalAccounts(accounts);

  // CRITICAL: Save explicitly into Supabase `user_accounts` table row
  // so username, password, email, and display name are visible in Supabase Table Editor
  if (client && config.isConnected) {
    try {
      await client.from('user_accounts').upsert({
        id: assignedId,
        email: trimmedEmail,
        username: displayName,
        password: pass, // visible in user_accounts table
        display_name: displayName,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Failed inserting into user_accounts table:', e);
    }
  }

  const authUser: AuthUser = {
    id: assignedId,
    email: trimmedEmail,
    displayName,
    isSupabase: true,
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
      console.warn('Supabase signOut notice', e);
    }
  }
  setCurrentUser(null);
}

// ==================== ROOMMATES TABLE SERVICE ====================

export async function loadRoommatesFromSupabase(): Promise<Roommate[] | null> {
  const config = getSavedSupabaseConfig();
  const client = getSupabaseClient(config);
  if (!client || !config.isConnected) return null;

  try {
    const { data, error } = await client
      .from('roommates')
      .select('*')
      .order('id', { ascending: true });

    if (!error && data && data.length > 0) {
      return data.map((r: any) => ({
        id: r.id,
        name: r.name,
        avatarEmoji: r.avatar_emoji || r.name.charAt(0).toUpperCase(),
        avatarColor: r.avatar_color || 'bg-orange-500 text-white',
        accentBg: r.accent_bg || 'bg-stone-50 border-stone-200 text-stone-800',
        badgeBg: r.badge_bg || 'bg-stone-100 text-stone-800 border-stone-200',
        textColor: r.text_color || 'text-stone-700',
      }));
    }
  } catch (e) {
    console.warn('Could not load roommates from Supabase:', e);
  }
  return null;
}

export async function saveRoommatesToSupabase(roommates: Roommate[]): Promise<void> {
  const config = getSavedSupabaseConfig();
  const client = getSupabaseClient(config);
  if (!client || !config.isConnected) return;

  try {
    const rows = roommates.map((r) => ({
      id: r.id,
      name: r.name,
      avatar_emoji: r.avatarEmoji || r.name.charAt(0).toUpperCase(),
      avatar_color: r.avatarColor,
      accent_bg: r.accentBg,
      badge_bg: r.badgeBg,
      text_color: r.textColor,
      updated_at: new Date().toISOString(),
    }));

    await client.from('roommates').upsert(rows);
  } catch (e) {
    console.warn('Failed saving roommates to Supabase:', e);
  }
}

// ==================== HOUSE SETTINGS TABLE SERVICE ====================

export async function loadHouseSettingsFromSupabase(): Promise<Partial<HouseSettings> | null> {
  const config = getSavedSupabaseConfig();
  const client = getSupabaseClient(config);
  if (!client || !config.isConnected) return null;

  try {
    const { data, error } = await client
      .from('house_settings')
      .select('*')
      .eq('id', 'house_main')
      .single();

    if (!error && data) {
      return {
        houseName: data.house_name,
        currency: data.currency,
        sharedPotSettings: {
          monthlyContributionPerPerson: Number(data.pot_monthly_target) || 30000,
          potName: data.pot_name || 'Une Maison Shared Pot',
        },
      };
    }
  } catch (e) {
    console.warn('Could not load house settings from Supabase:', e);
  }
  return null;
}

export async function saveHouseSettingsToSupabase(
  settings: HouseSettings,
  potBalance: number = 0
): Promise<void> {
  const config = getSavedSupabaseConfig();
  const client = getSupabaseClient(config);
  if (!client || !config.isConnected) return;

  try {
    await client.from('house_settings').upsert({
      id: 'house_main',
      house_name: settings.houseName,
      currency: settings.currency,
      pot_monthly_target: settings.sharedPotSettings?.monthlyContributionPerPerson || 30000,
      pot_name: settings.sharedPotSettings?.potName || 'Une Maison Shared Pot',
      pot_balance: potBalance,
      updated_at: new Date().toISOString(),
    });
  } catch (e) {
    console.warn('Failed saving house settings to Supabase:', e);
  }
}

// ==================== HOUSE EXPENSES TABLE SERVICE ====================

export async function loadHouseExpensesFromSupabase(): Promise<Expense[] | null> {
  const config = getSavedSupabaseConfig();
  const client = getSupabaseClient(config);
  if (!client || !config.isConnected) return null;

  try {
    const { data, error } = await client
      .from('house_expenses')
      .select('*')
      .order('timestamp', { ascending: false });

    if (!error && data && data.length > 0) {
      return data.map((row: any) => ({
        id: row.id,
        title: row.title,
        amount: Number(row.amount),
        date: row.date,
        time: row.time,
        timestamp: Number(row.timestamp) || new Date(row.created_at).getTime(),
        paidById: row.paid_by_id,
        splitBetween: Array.isArray(row.split_between) ? row.split_between : ['p1', 'p2', 'p3'],
        category: row.category,
        notes: row.notes,
        receiptUrl: row.receipt_url,
        paidFromPot: Boolean(row.paid_from_pot),
      }));
    }
  } catch (e) {
    console.warn('Could not load house expenses from Supabase:', e);
  }
  return null;
}

export async function saveHouseExpenseToSupabase(expense: Expense): Promise<void> {
  const config = getSavedSupabaseConfig();
  const client = getSupabaseClient(config);
  if (!client || !config.isConnected) return;

  try {
    await client.from('house_expenses').upsert({
      id: expense.id,
      title: expense.title,
      amount: expense.amount,
      date: expense.date,
      time: expense.time,
      timestamp: expense.timestamp,
      paid_by_id: expense.paidById,
      split_between: expense.splitBetween,
      category: expense.category,
      notes: expense.notes || null,
      receipt_url: expense.receiptUrl || null,
      paid_from_pot: Boolean(expense.paidFromPot),
      created_at: new Date(expense.timestamp).toISOString(),
    });
  } catch (e) {
    console.warn('Failed saving house expense to Supabase:', e);
  }
}

export async function deleteHouseExpenseFromSupabase(expenseId: string): Promise<void> {
  const config = getSavedSupabaseConfig();
  const client = getSupabaseClient(config);
  if (!client || !config.isConnected) return;

  try {
    await client.from('house_expenses').delete().eq('id', expenseId);
  } catch (e) {
    console.warn('Failed deleting house expense from Supabase:', e);
  }
}

// ==================== SETTLEMENTS TABLE SERVICE ====================

export async function loadSettlementsFromSupabase(): Promise<SettlementRecord[] | null> {
  const config = getSavedSupabaseConfig();
  const client = getSupabaseClient(config);
  if (!client || !config.isConnected) return null;

  try {
    const { data, error } = await client
      .from('settlements')
      .select('*')
      .order('timestamp', { ascending: false });

    if (!error && data) {
      return data.map((row: any) => ({
        id: row.id,
        fromId: row.from_id,
        toId: row.to_id,
        amount: Number(row.amount),
        date: row.date,
        time: row.time,
        timestamp: Number(row.timestamp) || new Date(row.created_at).getTime(),
        note: row.note,
      }));
    }
  } catch (e) {
    console.warn('Could not load settlements from Supabase:', e);
  }
  return null;
}

export async function saveSettlementToSupabase(settlement: SettlementRecord): Promise<void> {
  const config = getSavedSupabaseConfig();
  const client = getSupabaseClient(config);
  if (!client || !config.isConnected) return;

  try {
    await client.from('settlements').upsert({
      id: settlement.id,
      from_id: settlement.fromId,
      to_id: settlement.toId,
      amount: settlement.amount,
      date: settlement.date,
      time: settlement.time,
      timestamp: settlement.timestamp,
      note: settlement.note || null,
      created_at: new Date(settlement.timestamp).toISOString(),
    });
  } catch (e) {
    console.warn('Failed saving settlement to Supabase:', e);
  }
}

export async function deleteSettlementFromSupabase(settlementId: string): Promise<void> {
  const config = getSavedSupabaseConfig();
  const client = getSupabaseClient(config);
  if (!client || !config.isConnected) return;

  try {
    await client.from('settlements').delete().eq('id', settlementId);
  } catch (e) {
    console.warn('Failed deleting settlement from Supabase:', e);
  }
}

// ==================== SHARED POT CONTRIBUTIONS TABLE SERVICE ====================

export async function loadPotContributionsFromSupabase(): Promise<SharedPotContribution[] | null> {
  const config = getSavedSupabaseConfig();
  const client = getSupabaseClient(config);
  if (!client || !config.isConnected) return null;

  try {
    const { data, error } = await client
      .from('pot_contributions')
      .select('*')
      .order('timestamp', { ascending: false });

    if (!error && data) {
      return data.map((row: any) => ({
        id: row.id,
        roommateId: row.roommate_id,
        month: row.month,
        amount: Number(row.amount),
        date: row.date,
        time: row.time,
        timestamp: Number(row.timestamp) || new Date(row.created_at).getTime(),
        note: row.note,
      }));
    }
  } catch (e) {
    console.warn('Could not load pot contributions from Supabase:', e);
  }
  return null;
}

export async function savePotContributionToSupabase(contrib: SharedPotContribution): Promise<void> {
  const config = getSavedSupabaseConfig();
  const client = getSupabaseClient(config);
  if (!client || !config.isConnected) return;

  try {
    await client.from('pot_contributions').upsert({
      id: contrib.id,
      roommate_id: contrib.roommateId,
      month: contrib.month,
      amount: contrib.amount,
      date: contrib.date,
      time: contrib.time,
      timestamp: contrib.timestamp,
      note: contrib.note || null,
      created_at: new Date(contrib.timestamp).toISOString(),
    });
  } catch (e) {
    console.warn('Failed saving pot contribution to Supabase:', e);
  }
}

export async function deletePotContributionFromSupabase(contribId: string): Promise<void> {
  const config = getSavedSupabaseConfig();
  const client = getSupabaseClient(config);
  if (!client || !config.isConnected) return;

  try {
    await client.from('pot_contributions').delete().eq('id', contribId);
  } catch (e) {
    console.warn('Failed deleting pot contribution from Supabase:', e);
  }
}

// ==================== ROOMMATE BALANCES TABLE SERVICE (LIVE NUMBERS) ====================

export async function syncRoommateBalancesToSupabase(
  summaries: RoommateFinancialSummary[]
): Promise<void> {
  const config = getSavedSupabaseConfig();
  const client = getSupabaseClient(config);
  if (!client || !config.isConnected) return;

  try {
    const rows = summaries.map((s) => ({
      roommate_id: s.roommate.id,
      roommate_name: s.roommate.name,
      total_paid: Math.round(s.totalPaid),
      total_share: Math.round(s.totalShare),
      net_balance: Math.round(s.netBalance),
      settlements_paid: Math.round(s.settlementsPaid),
      settlements_received: Math.round(s.settlementsReceived),
      effective_balance: Math.round(s.effectiveBalance),
      expense_count: s.expenseCount,
      updated_at: new Date().toISOString(),
    }));

    await client.from('roommate_balances').upsert(rows);
  } catch (e) {
    console.warn('Failed updating roommate balances in Supabase:', e);
  }
}

// ==================== PERSONAL LEDGER & BUDGET SERVICES ====================

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
          periodLabel: data.period_label || 'Current Period',
          lastUpdated: new Date(data.updated_at).getTime(),
        };
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

  const defaultBudget: PersonalBudget = {
    userId,
    startingBalance: 100000,
    currency: '¥',
    lastUpdated: Date.now(),
  };
  localStorage.setItem(getBudgetStorageKey(userId), JSON.stringify(defaultBudget));
  return defaultBudget;
}

// Save user's personal budget (updates balance numbers in personal_budgets table)
export async function saveUserBudget(
  budget: PersonalBudget,
  currentBalance?: number,
  totalSpent?: number
): Promise<void> {
  localStorage.setItem(getBudgetStorageKey(budget.userId), JSON.stringify(budget));

  const config = getSavedSupabaseConfig();
  const client = getSupabaseClient(config);

  if (client && config.isConnected) {
    try {
      await client.from('personal_budgets').upsert({
        user_id: budget.userId,
        starting_balance: budget.startingBalance,
        current_balance: currentBalance !== undefined ? currentBalance : budget.startingBalance,
        total_spent: totalSpent !== undefined ? totalSpent : 0,
        currency: budget.currency,
        period_label: budget.periodLabel || 'Current Period',
        updated_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Failed saving budget to Supabase', e);
    }
  }
}

// Load user's personal spendings
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

      if (!error && Array.isArray(data) && data.length > 0) {
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

// Add personal expense
export async function addPersonalExpense(expense: PersonalExpense): Promise<void> {
  const existing = await loadUserSpendings(expense.userId);
  const updated = [expense, ...existing.filter((e) => e.id !== expense.id)];
  localStorage.setItem(getExpensesStorageKey(expense.userId), JSON.stringify(updated));

  const config = getSavedSupabaseConfig();
  const client = getSupabaseClient(config);

  if (client && config.isConnected) {
    try {
      await client.from('personal_spendings').upsert({
        id: expense.id,
        user_id: expense.userId,
        subject: expense.subject,
        amount: expense.amount,
        category: expense.category,
        notes: expense.notes || null,
        date: expense.date,
        time: expense.time,
        created_at: new Date(expense.timestamp).toISOString(),
      });
    } catch (e) {
      console.warn('Failed to insert spending into Supabase', e);
    }
  }
}

// Delete personal expense
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

// ==================== BATCH SYNC TO SUPABASE ====================

export async function syncAllHouseDataToSupabase(
  settings: HouseSettings,
  expenses: Expense[],
  settlements: SettlementRecord[],
  potContributions: SharedPotContribution[],
  summaries: RoommateFinancialSummary[],
  potBalance: number
): Promise<{ success: boolean; error?: string }> {
  const config = getSavedSupabaseConfig();
  const client = getSupabaseClient(config);
  if (!client || !config.isConnected) {
    return { success: false, error: 'Supabase client is not connected.' };
  }

  try {
    // 1. Sync Roommates
    await saveRoommatesToSupabase(settings.roommates);

    // 2. Sync House Settings
    await saveHouseSettingsToSupabase(settings, potBalance);

    // 3. Sync Expenses
    if (expenses.length > 0) {
      const expRows = expenses.map((e) => ({
        id: e.id,
        title: e.title,
        amount: e.amount,
        date: e.date,
        time: e.time,
        timestamp: e.timestamp,
        paid_by_id: e.paidById,
        split_between: e.splitBetween,
        category: e.category,
        notes: e.notes || null,
        receipt_url: e.receiptUrl || null,
        paid_from_pot: Boolean(e.paidFromPot),
        created_at: new Date(e.timestamp).toISOString(),
      }));
      await client.from('house_expenses').upsert(expRows);
    }

    // 4. Sync Settlements
    if (settlements.length > 0) {
      const stRows = settlements.map((s) => ({
        id: s.id,
        from_id: s.fromId,
        to_id: s.toId,
        amount: s.amount,
        date: s.date,
        time: s.time,
        timestamp: s.timestamp,
        note: s.note || null,
        created_at: new Date(s.timestamp).toISOString(),
      }));
      await client.from('settlements').upsert(stRows);
    }

    // 5. Sync Pot Contributions
    if (potContributions.length > 0) {
      const potRows = potContributions.map((c) => ({
        id: c.id,
        roommate_id: c.roommateId,
        month: c.month,
        amount: c.amount,
        date: c.date,
        time: c.time,
        timestamp: c.timestamp,
        note: c.note || null,
        created_at: new Date(c.timestamp).toISOString(),
      }));
      await client.from('pot_contributions').upsert(potRows);
    }

    // 6. Sync Roommate Balances
    if (summaries.length > 0) {
      await syncRoommateBalancesToSupabase(summaries);
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed syncing to Supabase' };
  }
}

// ==================== NATURAL LANGUAGE COMMAND PARSER ====================

export interface ParsedCommand {
  subject: string;
  amount: number;
  category: PersonalCategory;
}

export function parseQuickSpendingInput(input: string): ParsedCommand | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const tokens = trimmed.split(/\s+/);
  if (tokens.length < 2) return null;

  let amount = 0;
  let subjectTokens: string[] = [];

  for (const token of tokens) {
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

// ==================== SQL SETUP SCRIPT FOR SUPABASE TABLE EDITOR ====================

export const SUPABASE_SQL_SETUP_SCRIPT = `-- Une Maison: Complete Database Schema for Supabase
-- Run this in your Supabase SQL Editor:
-- All tables are under the "public" schema so they are immediately visible in the Supabase Table Editor!

-- 1. ROOMMATES TABLE (Roommate names, avatar colors, and styles)
create table if not exists public.roommates (
  id text primary key,
  name text not null,
  avatar_emoji text,
  avatar_color text,
  accent_bg text,
  badge_bg text,
  text_color text,
  updated_at timestamptz default now()
);

-- Seed default roommates
insert into public.roommates (id, name, avatar_emoji, avatar_color, accent_bg, badge_bg, text_color)
values 
  ('p1', 'Alex', 'A', 'bg-orange-500 text-white', 'bg-orange-50 border-orange-200 text-orange-700', 'bg-orange-100 text-orange-800 border-orange-200', 'text-orange-600'),
  ('p2', 'Sam', 'S', 'bg-stone-800 text-white', 'bg-stone-100 border-stone-200 text-stone-800', 'bg-stone-100 text-stone-800 border-stone-200', 'text-stone-700'),
  ('p3', 'Jordan', 'J', 'bg-amber-500 text-white', 'bg-amber-50 border-amber-200 text-amber-800', 'bg-amber-100 text-amber-800 border-amber-200', 'text-amber-700')
on conflict (id) do update set
  name = excluded.name,
  avatar_color = excluded.avatar_color,
  updated_at = now();

-- 2. USER ACCOUNTS TABLE (Username, password, email, and display name visible as rows)
create table if not exists public.user_accounts (
  id text primary key,
  email text not null unique,
  username text,
  password text not null,
  display_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. HOUSE SETTINGS & POT BALANCE TABLE
create table if not exists public.house_settings (
  id text primary key default 'house_main',
  house_name text not null default 'Une Maison',
  currency text not null default '¥',
  pot_monthly_target numeric not null default 30000,
  pot_name text not null default 'Une Maison Shared Pot',
  pot_balance numeric not null default 0,
  updated_at timestamptz default now()
);

insert into public.house_settings (id, house_name, currency, pot_monthly_target, pot_name, pot_balance)
values ('house_main', 'Une Maison', '¥', 30000, 'Une Maison Shared Pot', 45000)
on conflict (id) do nothing;

-- 4. HOUSE / SHARED EXPENSES TABLE
create table if not exists public.house_expenses (
  id text primary key,
  title text not null,
  amount numeric not null,
  date text not null,
  time text not null,
  timestamp bigint not null,
  paid_by_id text not null,
  split_between jsonb not null default '["p1", "p2", "p3"]'::jsonb,
  category text not null default 'groceries',
  notes text,
  receipt_url text,
  paid_from_pot boolean default false,
  created_at timestamptz default now()
);

-- 5. SETTLEMENTS TABLE (Debts & roommate-to-roommate payments)
create table if not exists public.settlements (
  id text primary key,
  from_id text not null,
  to_id text not null,
  amount numeric not null,
  date text not null,
  time text not null,
  timestamp bigint not null,
  note text,
  created_at timestamptz default now()
);

-- 6. SHARED POT CONTRIBUTIONS TABLE
create table if not exists public.pot_contributions (
  id text primary key,
  roommate_id text not null,
  month text not null,
  amount numeric not null,
  date text not null,
  time text not null,
  timestamp bigint not null,
  note text,
  created_at timestamptz default now()
);

-- 7. ROOMMATE BALANCES TABLE (Live numbers: total paid, share, net balance, effective balance)
create table if not exists public.roommate_balances (
  roommate_id text primary key,
  roommate_name text not null,
  total_paid numeric not null default 0,
  total_share numeric not null default 0,
  net_balance numeric not null default 0,
  settlements_paid numeric not null default 0,
  settlements_received numeric not null default 0,
  effective_balance numeric not null default 0,
  expense_count integer not null default 0,
  updated_at timestamptz default now()
);

-- 8. PERSONAL BUDGETS TABLE (User allowances and live budget balance)
create table if not exists public.personal_budgets (
  user_id text primary key,
  starting_balance numeric not null default 100000,
  current_balance numeric not null default 100000,
  total_spent numeric not null default 0,
  currency text not null default '¥',
  period_label text,
  updated_at timestamptz default now()
);

-- 9. PERSONAL SPENDINGS TABLE (User personal transactions)
create table if not exists public.personal_spendings (
  id text primary key,
  user_id text not null,
  subject text not null,
  amount numeric not null,
  category text not null default 'food',
  notes text,
  date text,
  time text,
  created_at timestamptz default now()
);

-- ENABLE ROW-LEVEL SECURITY WITH OPEN POLICIES FOR INSTANT CLIENT VISIBILITY
alter table public.roommates enable row level security;
alter table public.user_accounts enable row level security;
alter table public.house_settings enable row level security;
alter table public.house_expenses enable row level security;
alter table public.settlements enable row level security;
alter table public.pot_contributions enable row level security;
alter table public.roommate_balances enable row level security;
alter table public.personal_budgets enable row level security;
alter table public.personal_spendings enable row level security;

-- DROP OLD POLICIES IF THEY EXIST AND CREATE PERMISSIVE ONES
do $$
begin
  drop policy if exists "roommates_all" on public.roommates;
  drop policy if exists "user_accounts_all" on public.user_accounts;
  drop policy if exists "house_settings_all" on public.house_settings;
  drop policy if exists "house_expenses_all" on public.house_expenses;
  drop policy if exists "settlements_all" on public.settlements;
  drop policy if exists "pot_contributions_all" on public.pot_contributions;
  drop policy if exists "roommate_balances_all" on public.roommate_balances;
  drop policy if exists "personal_budgets_all" on public.personal_budgets;
  drop policy if exists "personal_spendings_all" on public.personal_spendings;
end $$;

create policy "roommates_all" on public.roommates for all using (true) with check (true);
create policy "user_accounts_all" on public.user_accounts for all using (true) with check (true);
create policy "house_settings_all" on public.house_settings for all using (true) with check (true);
create policy "house_expenses_all" on public.house_expenses for all using (true) with check (true);
create policy "settlements_all" on public.settlements for all using (true) with check (true);
create policy "pot_contributions_all" on public.pot_contributions for all using (true) with check (true);
create policy "roommate_balances_all" on public.roommate_balances for all using (true) with check (true);
create policy "personal_budgets_all" on public.personal_budgets for all using (true) with check (true);
create policy "personal_spendings_all" on public.personal_spendings for all using (true) with check (true);
`;
