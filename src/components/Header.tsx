import React, { useState } from 'react';
import {
  Plus,
  Download,
  MessageSquare,
  Settings as SettingsIcon,
  Home,
  Check,
  Wallet,
  User,
  Database
} from 'lucide-react';
import { HouseSettings, Expense, SettlementRecord } from '../types/expense';
import { AuthUser, SupabaseConfig } from '../types/personal';
import { generateChatSummary, exportToCsv } from '../utils/calculations';

interface HeaderProps {
  settings: HouseSettings;
  expenses: Expense[];
  settlements: SettlementRecord[];
  onOpenNewExpense: () => void;
  onOpenSettings: () => void;
  activeTab: 'expenses' | 'pot' | 'analytics';
  setActiveTab: (tab: 'expenses' | 'pot' | 'analytics') => void;
  activeMode: 'house' | 'personal';
  setActiveMode: (mode: 'house' | 'personal') => void;
  currentUser: AuthUser | null;
  onOpenAuth: () => void;
  onOpenSupabaseSettings: () => void;
  supabaseConfig: SupabaseConfig;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  expenses,
  settlements,
  onOpenNewExpense,
  onOpenSettings,
  activeTab,
  setActiveTab,
  activeMode,
  setActiveMode,
  currentUser,
  onOpenAuth,
  onOpenSupabaseSettings,
  supabaseConfig,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyChatSummary = () => {
    const summaryText = generateChatSummary(
      settings.houseName,
      settings.roommates,
      expenses,
      settlements,
      settings.currency
    );
    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleExportCsv = () => {
    exportToCsv(expenses, settings.roommates, settings.currency);
  };

  return (
    <header className="border-b border-stone-200/90 bg-white/95 backdrop-blur-md sticky top-0 z-30 transition-colors shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          
          {/* Brand & House Title */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white shrink-0 shadow-sm shadow-orange-500/20">
              <Home className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-stone-900 tracking-tight truncate">
                  {settings.houseName}
                </h1>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 font-semibold border border-orange-200/70 hidden md:inline-flex items-center">
                  Sharehouse & Pocketbook
                </span>
              </div>
              <p className="text-xs text-stone-500 truncate hidden xs:block">
                Auto-divided by 3 in {settings.currency === '¥' ? 'Japanese Yen (¥)' : settings.currency} + Private Pocketbook
              </p>
            </div>
          </div>

          {/* Primary View Switcher: Sharehouse vs Personal Pocketbook (Desktop/Tablet) */}
          <div className="hidden sm:flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200/70 shadow-2xs">
            <button
              onClick={() => setActiveMode('house')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                activeMode === 'house'
                  ? 'bg-white text-orange-600 shadow-xs border border-stone-200/60 font-bold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Home className="w-3.5 h-3.5" />
              <span>House Split (÷ 3)</span>
            </button>
            <button
              onClick={() => setActiveMode('personal')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                activeMode === 'personal'
                  ? 'bg-white text-orange-600 shadow-xs border border-stone-200/60 font-bold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Wallet className="w-3.5 h-3.5 text-orange-500" />
              <span>My Pocketbook</span>
              {currentUser && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              )}
            </button>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {activeMode === 'house' ? (
              <>
                {/* Secondary navigation for House mode: Expenses vs Shared Pot vs Analytics (Desktop) */}
                <div className="hidden lg:flex items-center bg-stone-100 p-0.5 rounded-xl border border-stone-200/70 mr-1">
                  <button
                    onClick={() => setActiveTab('expenses')}
                    className={`px-2.5 py-1 text-xs rounded-lg transition-all ${
                      activeTab === 'expenses'
                        ? 'bg-white text-stone-900 font-bold shadow-2xs'
                        : 'text-stone-500 hover:text-stone-900 font-medium'
                    }`}
                  >
                    Expenses ({expenses.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('pot')}
                    className={`px-2.5 py-1 text-xs rounded-lg transition-all flex items-center gap-1 ${
                      activeTab === 'pot'
                        ? 'bg-white text-orange-600 font-bold shadow-2xs'
                        : 'text-stone-500 hover:text-stone-900 font-medium'
                    }`}
                  >
                    <span>🍯 Shared Pot</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('analytics')}
                    className={`px-2.5 py-1 text-xs rounded-lg transition-all ${
                      activeTab === 'analytics'
                        ? 'bg-white text-stone-900 font-bold shadow-2xs'
                        : 'text-stone-500 hover:text-stone-900 font-medium'
                    }`}
                  >
                    Charts
                  </button>
                </div>

                {/* Copy Chat summary (Responsive: icon-only on mobile, label on desktop) */}
                <button
                  onClick={handleCopyChatSummary}
                  title="Copy formatted summary for LINE, WhatsApp or group chat"
                  className="inline-flex items-center justify-center gap-1.5 min-w-[38px] h-[38px] sm:h-9 px-2 sm:px-3 text-xs font-semibold text-stone-700 bg-white border border-stone-250 rounded-xl hover:bg-orange-50 hover:text-orange-700 hover:border-orange-200 shadow-2xs transition-colors whitespace-nowrap active:scale-95"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-orange-600" />
                      <span className="hidden sm:inline text-orange-700 font-bold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <MessageSquare className="w-4 h-4 text-orange-500" />
                      <span className="hidden sm:inline">Copy for Chat</span>
                    </>
                  )}
                </button>

                {/* Export CSV (large screens) */}
                <button
                  onClick={handleExportCsv}
                  title="Download full expense spreadsheet as CSV"
                  className="hidden 2xl:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-700 bg-white border border-stone-250 rounded-xl hover:bg-stone-50 shadow-2xs transition-colors whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5 text-stone-500" />
                  <span>CSV</span>
                </button>

                {/* Settings Button */}
                <button
                  onClick={onOpenSettings}
                  title="Roommate & House Settings"
                  className="w-[38px] h-[38px] sm:w-9 sm:h-9 flex items-center justify-center text-stone-600 hover:text-stone-900 bg-white hover:bg-stone-50 rounded-xl border border-stone-250 shadow-2xs transition-colors active:scale-95"
                >
                  <SettingsIcon className="w-4 h-4" />
                </button>

                {/* Add Expense Primary CTA (Desktop/Tablet) */}
                <button
                  onClick={onOpenNewExpense}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 active:scale-[0.98] rounded-xl shadow-xs shadow-orange-500/25 transition-all whitespace-nowrap"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Add Expense</span>
                </button>
              </>
            ) : (
              /* In Personal Mode */
              <div className="flex items-center gap-2">
                <button
                  onClick={onOpenSupabaseSettings}
                  title="Supabase Settings"
                  className={`p-2 rounded-xl border shadow-2xs transition-colors ${
                    supabaseConfig.isConnected
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-250 hover:bg-emerald-100'
                      : 'bg-white text-stone-600 border-stone-250 hover:bg-stone-50'
                  }`}
                >
                  <Database className="w-4 h-4" />
                </button>

                {currentUser ? (
                  <button
                    onClick={onOpenAuth}
                    title="Account details"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-stone-800 bg-white border border-stone-250 hover:bg-stone-50 rounded-xl shadow-2xs transition-colors"
                  >
                    <div className="w-5 h-5 rounded-lg bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {currentUser.displayName ? currentUser.displayName[0].toUpperCase() : 'U'}
                    </div>
                    <span className="hidden sm:inline truncate max-w-[100px]">
                      {currentUser.displayName || currentUser.email.split('@')[0]}
                    </span>
                  </button>
                ) : (
                  <button
                    onClick={onOpenAuth}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-xl shadow-xs shadow-orange-500/25 transition-all whitespace-nowrap"
                  >
                    <User className="w-4 h-4" />
                    <span>Log In</span>
                  </button>
                )}
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
