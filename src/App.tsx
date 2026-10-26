/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Expense, HouseSettings, SettlementRecord, SharedPotContribution } from './types/expense';
import { AuthUser, SupabaseConfig } from './types/personal';
import { DEFAULT_SETTINGS, INITIAL_EXPENSES, INITIAL_SETTLEMENTS, INITIAL_POT_CONTRIBUTIONS } from './utils/sampleData';
import { calculateSummaries } from './utils/calculations';
import {
  getCurrentUser,
  getSavedSupabaseConfig,
  logoutUser,
  loadRoommatesFromSupabase,
  saveRoommatesToSupabase,
  loadHouseSettingsFromSupabase,
  saveHouseSettingsToSupabase,
  loadHouseExpensesFromSupabase,
  saveHouseExpenseToSupabase,
  deleteHouseExpenseFromSupabase,
  loadSettlementsFromSupabase,
  saveSettlementToSupabase,
  deleteSettlementFromSupabase,
  loadPotContributionsFromSupabase,
  savePotContributionToSupabase,
  deletePotContributionFromSupabase,
  syncRoommateBalancesToSupabase,
  syncAllHouseDataToSupabase,
} from './lib/supabase';
import { Header } from './components/Header';
import { RoommateCards } from './components/RoommateCards';
import { SettlementBar } from './components/SettlementBar';
import { ExpenseList } from './components/ExpenseList';
import { ExpenseModal } from './components/ExpenseModal';
import { AnalyticsView } from './components/AnalyticsView';
import { SettingsModal } from './components/SettingsModal';
import { ReceiptModal } from './components/ReceiptModal';
import { SharedPotView } from './components/SharedPotView';
import { PersonalLedgerView } from './components/personal/PersonalLedgerView';
import { PersonalAuthModal } from './components/personal/PersonalAuthModal';
import { SupabaseSettingsModal } from './components/personal/SupabaseSettingsModal';
import { Plus, Check, Receipt, PiggyBank, BarChart3, Wallet } from 'lucide-react';

const STORAGE_KEY_EXPENSES = 'triosplit_expenses_v4';
const STORAGE_KEY_SETTLEMENTS = 'triosplit_settlements_v4';
const STORAGE_KEY_SETTINGS = 'triosplit_settings_v4';
const STORAGE_KEY_POT_CONTRIBUTIONS = 'triosplit_pot_contributions_v4';

export default function App() {
  // Initialize state with localStorage or defaults
  const [settings, setSettings] = useState<HouseSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.currency || parsed.currency === '$') {
          parsed.currency = '¥';
        }
        if (!parsed.sharedPotSettings) {
          parsed.sharedPotSettings = DEFAULT_SETTINGS.sharedPotSettings;
        }
        return parsed;
      }
      return DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_EXPENSES);
      return saved ? JSON.parse(saved) : INITIAL_EXPENSES;
    } catch {
      return INITIAL_EXPENSES;
    }
  });

  const [settlements, setSettlements] = useState<SettlementRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SETTLEMENTS);
      return saved ? JSON.parse(saved) : INITIAL_SETTLEMENTS;
    } catch {
      return INITIAL_SETTLEMENTS;
    }
  });

  const [potContributions, setPotContributions] = useState<SharedPotContribution[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_POT_CONTRIBUTIONS);
      return saved ? JSON.parse(saved) : INITIAL_POT_CONTRIBUTIONS;
    } catch {
      return INITIAL_POT_CONTRIBUTIONS;
    }
  });

  // Dual-mode state: 'house' (3-way split) or 'personal' (isolated user account budget)
  const [activeMode, setActiveMode] = useState<'house' | 'personal'>('house');

  // UI state for House mode: 'expenses' | 'pot' | 'analytics'
  const [activeTab, setActiveTab] = useState<'expenses' | 'pot' | 'analytics'>('expenses');
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [viewingReceiptUrl, setViewingReceiptUrl] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Authentication & Supabase state
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => getCurrentUser());
  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig>(() => getSavedSupabaseConfig());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings to localStorage', e);
    }
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_EXPENSES, JSON.stringify(expenses));
    } catch (e) {
      console.error('Failed to save expenses to localStorage', e);
    }
  }, [expenses]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SETTLEMENTS, JSON.stringify(settlements));
    } catch (e) {
      console.error('Failed to save settlements to localStorage', e);
    }
  }, [settlements]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_POT_CONTRIBUTIONS, JSON.stringify(potContributions));
    } catch (e) {
      console.error('Failed to save pot contributions to localStorage', e);
    }
  }, [potContributions]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 3000);
  };

  // Financial calculations for House Split
  const { summaries, totalHouseSpend, totalPerPersonAvg, debtTransfers } = calculateSummaries(
    expenses,
    settlements,
    settings.roommates
  );

  const summariesList = useMemo(() => Object.values(summaries), [summaries]);

  const sharedPotBalance = useMemo(() => {
    const totalDeposited = potContributions.reduce((sum, c) => sum + c.amount, 0);
    const totalDeducted = expenses
      .filter((e) => e.paidFromPot)
      .reduce((sum, e) => sum + e.amount, 0);
    return totalDeposited - totalDeducted;
  }, [potContributions, expenses]);

  // Initial cloud synchronization from Supabase tables
  useEffect(() => {
    let isMounted = true;
    async function loadInitialCloudData() {
      try {
        const [cloudRoommates, cloudSettings, cloudExpenses, cloudSettlements, cloudPot] =
          await Promise.all([
            loadRoommatesFromSupabase(),
            loadHouseSettingsFromSupabase(),
            loadHouseExpensesFromSupabase(),
            loadSettlementsFromSupabase(),
            loadPotContributionsFromSupabase(),
          ]);

        if (!isMounted) return;

        // 1. Roommates Table
        if (cloudRoommates && cloudRoommates.length > 0) {
          setSettings((prev) => ({ ...prev, roommates: cloudRoommates }));
        } else {
          // Table exists but is empty -> seed initial roommates
          saveRoommatesToSupabase(settings.roommates);
        }

        // 2. House Settings Table
        if (cloudSettings) {
          setSettings((prev) => ({
            ...prev,
            houseName: cloudSettings.houseName || prev.houseName,
            currency: cloudSettings.currency || prev.currency,
            sharedPotSettings: cloudSettings.sharedPotSettings || prev.sharedPotSettings,
          }));
        }

        // 3. House Expenses Table
        if (cloudExpenses !== null) {
  setExpenses(cloudExpenses);
}

        // 4. Settlements Table
        if (cloudSettlements) {
          setSettlements(cloudSettlements);
        }

        // 5. Pot Contributions Table
       if (cloudPot !== null) {
  setPotContributions(cloudPot);
}
      } catch (e) {
        console.warn('Startup Supabase sync check:', e);
      }
    }

    loadInitialCloudData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Continuous sync of calculated live financial numbers to Supabase roommate_balances table
  useEffect(() => {
    if (summariesList && summariesList.length > 0) {
      syncRoommateBalancesToSupabase(summariesList);
    }
    saveHouseSettingsToSupabase(settings, sharedPotBalance);
  }, [summariesList, sharedPotBalance, settings]);

  // Handlers for House Split
  const handleSaveExpense = (expense: Expense) => {
    if (editingExpense) {
      setExpenses((prev) => prev.map((e) => (e.id === expense.id ? expense : e)));
      showToast('Expense updated in Supabase table');
    } else {
      setExpenses((prev) => [expense, ...prev]);
      if (expense.paidFromPot) {
        showToast(`Deducted ${expense.title} (¥${expense.amount.toLocaleString()}) from Shared Pot 🍯`);
      } else {
        const share = Math.round(expense.amount / expense.splitBetween.length);
        showToast(`Added ${expense.title} · ¥${share.toLocaleString()}/person`);
      }
    }
    // Update row in Supabase house_expenses table
    saveHouseExpenseToSupabase(expense);
    setEditingExpense(null);
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    deleteHouseExpenseFromSupabase(id);
    showToast('Expense deleted from Supabase table');
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setIsExpenseModalOpen(true);
  };

  const handleRecordSettlement = (newSettlement: SettlementRecord) => {
    setSettlements((prev) => [newSettlement, ...prev]);
    saveSettlementToSupabase(newSettlement);
    showToast('Payment settled and recorded in Supabase table');
  };

  const handleDeleteSettlement = (id: string) => {
    setSettlements((prev) => prev.filter((s) => s.id !== id));
    deleteSettlementFromSupabase(id);
    showToast('Settlement removed from Supabase table');
  };

  // Shared Pot handlers
  const handleAddPotContribution = (newContribution: SharedPotContribution) => {
    setPotContributions((prev) => [newContribution, ...prev]);
    savePotContributionToSupabase(newContribution);
    showToast(`Deposited ¥${newContribution.amount.toLocaleString()} into Shared Pot 🍯`);
  };

  const handleDeletePotContribution = (id: string) => {
    setPotContributions((prev) => prev.filter((c) => c.id !== id));
    deletePotContributionFromSupabase(id);
    showToast('Pot deposit removed from Supabase table');
  };

  const handleUpdatePotSettings = (monthlyAmount: number) => {
    const updated = {
      ...settings,
      sharedPotSettings: {
        ...settings.sharedPotSettings,
        monthlyContributionPerPerson: monthlyAmount,
      },
    };
    setSettings(updated);
    saveHouseSettingsToSupabase(updated, sharedPotBalance);
    showToast(`Shared Pot monthly target set to ¥${monthlyAmount.toLocaleString()} / person`);
  };

  // Save Settings handler: Saves roommate names and house settings to Supabase
  const handleSaveSettings = (newSettings: HouseSettings) => {
    setSettings(newSettings);
    saveRoommatesToSupabase(newSettings.roommates);
    saveHouseSettingsToSupabase(newSettings, sharedPotBalance);
    showToast('Roommate names & house settings saved to Supabase!');
  };

  const handleResetSampleData = () => {
    setExpenses(INITIAL_EXPENSES);
    setSettlements(INITIAL_SETTLEMENTS);
    setPotContributions(INITIAL_POT_CONTRIBUTIONS);
    setSettings(DEFAULT_SETTINGS);
    saveRoommatesToSupabase(DEFAULT_SETTINGS.roommates);
    saveHouseSettingsToSupabase(DEFAULT_SETTINGS, 45000);
    showToast('Sample sharehouse data restored and synced to Supabase');
  };

  const handleClearAllData = () => {
    setExpenses([]);
    setSettlements([]);
    setPotContributions([]);
    showToast('All sharehouse expenses & pot data cleared');
  };

  const handleExportJson = () => {
    const data = {
      version: 2,
      exportedAt: new Date().toISOString(),
      settings,
      expenses,
      settlements,
      potContributions,
    };
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sharehouse-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('JSON backup downloaded');
  };

  const handleImportJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (parsed.expenses && Array.isArray(parsed.expenses)) {
          setExpenses(parsed.expenses);
        }
        if (parsed.settlements && Array.isArray(parsed.settlements)) {
          setSettlements(parsed.settlements);
        }
        if (parsed.potContributions && Array.isArray(parsed.potContributions)) {
          setPotContributions(parsed.potContributions);
        }
        if (parsed.settings) {
          setSettings(parsed.settings);
          saveRoommatesToSupabase(parsed.settings.roommates);
        }
        showToast('Data successfully restored and synced!');
      } catch {
        alert('Invalid backup JSON file');
      }
    };
    reader.readAsText(file);
  };

  // Push all existing data into Supabase tables in one batch
  const handleSyncAllData = async () => {
    const res = await syncAllHouseDataToSupabase(
      settings,
      expenses,
      settlements,
      potContributions,
      summariesList,
      sharedPotBalance
    );
    if (res.success) {
      showToast('All 9 tables synced to Supabase!');
    }
    return res;
  };

  const handleLogout = async () => {
    await logoutUser();
    setCurrentUser(null);
    showToast('Logged out of personal pocketbook');
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9] text-stone-800 flex flex-col font-sans selection:bg-orange-500/20 selection:text-orange-700">
      {/* Top Header */}
      <Header
        settings={settings}
        expenses={expenses}
        settlements={settlements}
        onOpenNewExpense={() => {
          setEditingExpense(null);
          setIsExpenseModalOpen(true);
        }}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeMode={activeMode}
        setActiveMode={setActiveMode}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenSupabaseSettings={() => setIsSupabaseModalOpen(true)}
        supabaseConfig={supabaseConfig}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-6 pb-28 sm:pb-12">
        {activeMode === 'personal' ? (
          /* ================= MODE: PERSONAL POCKETBOOK ================= */
          <PersonalLedgerView
            currentUser={currentUser}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            onLogout={handleLogout}
            onOpenSupabaseSettings={() => setIsSupabaseModalOpen(true)}
            supabaseConfig={supabaseConfig}
            currency={settings.currency}
          />
        ) : (
          /* ================= MODE: HOUSE 3-WAY SPLIT & POT ================= */
          <>
            {/* TAB 1: EXPENSES & SPLIT OVERVIEW */}
            {activeTab === 'expenses' && (
              <>
                {/* 3 Roommates Balances (Alex, Sam, Jordan) */}
                <section aria-label="Roommate balances" className="mb-4 sm:mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-stone-500">
                      Roommate Balances (Equal 3-Way Split)
                    </h2>
                    <span className="text-[11px] text-stone-400 hidden sm:inline">
                      Auto-balanced · Net effective totals
                    </span>
                  </div>
                  <RoommateCards
                    roommates={settings.roommates}
                    summaries={summaries}
                    totalHouseSpend={totalHouseSpend}
                    totalPerPersonAvg={totalPerPersonAvg}
                    currency={settings.currency}
                    sharedPotBalance={sharedPotBalance}
                    onSwitchToPot={() => {
                      setActiveMode('house');
                      setActiveTab('pot');
                    }}
                  />
                </section>

                {/* Settlement Suggestion / Quick Settle Bar */}
                <section aria-label="Debt settlements" className="mb-4 sm:mb-6">
                  <SettlementBar
                    debtTransfers={debtTransfers}
                    roommates={settings.roommates}
                    settlements={settlements}
                    currency={settings.currency}
                    onRecordSettlement={handleRecordSettlement}
                    onDeleteSettlement={handleDeleteSettlement}
                  />
                </section>

                {/* Expense List */}
                <section aria-label="Recent house expenses">
                  <ExpenseList
                    expenses={expenses}
                    roommates={settings.roommates}
                    currency={settings.currency}
                    onEditExpense={handleEditExpense}
                    onDeleteExpense={handleDeleteExpense}
                    onViewReceipt={(url) => setViewingReceiptUrl(url)}
                  />
                </section>
              </>
            )}

            {/* TAB 2: SHARED POT (Fixed monthly fill + communal bills auto-deducted) */}
            {activeTab === 'pot' && (
              <section aria-label="Shared Pot">
                <SharedPotView
                  settings={settings}
                  expenses={expenses}
                  potContributions={potContributions}
                  currency={settings.currency}
                  onAddContribution={handleAddPotContribution}
                  onDeleteContribution={handleDeletePotContribution}
                  onUpdatePotSettings={handleUpdatePotSettings}
                  onOpenNewExpense={() => {
                    setEditingExpense(null);
                    setIsExpenseModalOpen(true);
                  }}
                />
              </section>
            )}

            {/* TAB 3: ANALYTICS & CHARTS */}
            {activeTab === 'analytics' && (
              <section aria-label="Analytics and charts">
                <div className="mb-3">
                  <h2 className="text-base font-bold text-stone-900 tracking-tight flex items-center gap-2">
                    <span>Expense Breakdown</span>
                    <span className="text-lg select-none">📊</span>
                  </h2>
                  <p className="text-xs text-stone-500">
                    Category distribution and individual roommate spend tracking
                  </p>
                </div>

                <AnalyticsView
                  expenses={expenses}
                  roommates={settings.roommates}
                  summaries={summaries}
                  totalHouseSpend={totalHouseSpend}
                  totalPerPersonAvg={totalPerPersonAvg}
                  currency={settings.currency}
                />
              </section>
            )}
          </>
        )}
      </main>

      {/* Floating Action Button on mobile for fast expense entry */}
      {activeMode === 'house' && (
        <div className="fixed right-4 bottom-20 z-40 sm:hidden">
          <button
            onClick={() => {
              setEditingExpense(null);
              setIsExpenseModalOpen(true);
            }}
            aria-label="Add House Expense"
            className="w-14 h-14 rounded-full bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-600/30 active:scale-95 flex items-center justify-center transition-all"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200/80 px-2 py-1.5 flex items-center justify-around sm:hidden shadow-lg"
      >
        {/* Tab 1: Expenses */}
        <button
          onClick={() => {
            setActiveMode('house');
            setActiveTab('expenses');
          }}
          className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all ${
            activeMode === 'house' && activeTab === 'expenses'
              ? 'text-orange-600 font-bold'
              : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          <Receipt
            className={`w-5 h-5 ${
              activeMode === 'house' && activeTab === 'expenses' ? 'stroke-[2.5]' : 'stroke-2'
            }`}
          />
          <span className="text-[10px] mt-0.5 tracking-tight">Expenses</span>
        </button>

        {/* Tab 2: Shared Pot */}
        <button
          onClick={() => {
            setActiveMode('house');
            setActiveTab('pot');
          }}
          className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all relative ${
            activeMode === 'house' && activeTab === 'pot'
              ? 'text-orange-600 font-bold'
              : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          <div className="relative flex items-center justify-center text-lg leading-none w-5 h-5">
            <span>🍯</span>
            {sharedPotBalance < 10000 && (
              <span className="absolute -top-1 -right-2 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white" />
            )}
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">Shared Pot</span>
        </button>

        {/* Tab 3: Charts */}
        <button
          onClick={() => {
            setActiveMode('house');
            setActiveTab('analytics');
          }}
          className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all ${
            activeMode === 'house' && activeTab === 'analytics'
              ? 'text-orange-600 font-bold'
              : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          <BarChart3
            className={`w-5 h-5 ${
              activeMode === 'house' && activeTab === 'analytics' ? 'stroke-[2.5]' : 'stroke-2'
            }`}
          />
          <span className="text-[10px] mt-0.5 tracking-tight">Charts</span>
        </button>

        {/* Tab 4: Pocketbook */}
        <button
          onClick={() => setActiveMode('personal')}
          className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all relative ${
            activeMode === 'personal'
              ? 'text-orange-600 font-bold'
              : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          <div className="relative">
            <Wallet
              className={`w-5 h-5 ${activeMode === 'personal' ? 'stroke-[2.5]' : 'stroke-2'}`}
            />
            {currentUser && (
              <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
            )}
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">Pocketbook</span>
        </button>
      </nav>

      {/* House Expense Modal */}
      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => {
          setIsExpenseModalOpen(false);
          setEditingExpense(null);
        }}
        onSaveExpense={handleSaveExpense}
        editingExpense={editingExpense}
        roommates={settings.roommates}
        currency={settings.currency}
      />

      {/* House Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        onResetSampleData={handleResetSampleData}
        onClearAllData={handleClearAllData}
        onExportJson={handleExportJson}
        onImportJson={handleImportJson}
      />

      {/* Receipt Preview Modal */}
      <ReceiptModal url={viewingReceiptUrl} onClose={() => setViewingReceiptUrl(null)} />

      {/* Personal Account Auth Modal */}
      <PersonalAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(user) => {
          setCurrentUser(user);
          setActiveMode('personal');
          showToast(`Welcome, ${user.displayName || user.email}!`);
        }}
      />

      {/* Supabase Connection & Tables Modal */}
      <SupabaseSettingsModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        onConfigUpdated={(newCfg) => {
          setSupabaseConfig(newCfg);
          showToast('Supabase Cloud configuration saved');
        }}
        onSyncAllData={handleSyncAllData}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 sm:bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 bg-stone-900 border border-stone-800 text-white rounded-xl shadow-xl text-xs font-medium animate-in fade-in slide-in-from-bottom-2 duration-200 pointer-events-none">
          <Check className="w-4 h-4 text-orange-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Subtle Footer */}
      <footer className="border-t border-stone-200/80 py-5 text-center text-xs text-stone-500 bg-white/50 mb-14 sm:mb-0">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="font-medium text-stone-600">
            {settings.houseName} · Sharehouse Pot & Pocketbook
          </span>
          <div className="flex items-center gap-3 text-stone-400">
            <span>Shared Pot (¥)</span>
            <span>·</span>
            <span>Monthly Fixed Fill</span>
            <span>·</span>
            <span>Bills Auto-Deducted</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
