import React, { useState } from 'react';
import { X, Database, Check, Copy, AlertCircle, Link as LinkIcon, RotateCcw, ShieldCheck, Zap } from 'lucide-react';
import { SupabaseConfig } from '../../types/personal';
import {
  getSavedSupabaseConfig,
  saveSupabaseConfig,
  resetToDefaultSupabaseConfig,
  isUsingDefaultConfig,
  testSupabaseConnection,
  SUPABASE_SQL_SETUP_SCRIPT
} from '../../lib/supabase';

interface SupabaseSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigUpdated: (config: SupabaseConfig) => void;
}

export const SupabaseSettingsModal: React.FC<SupabaseSettingsModalProps> = ({
  isOpen,
  onClose,
  onConfigUpdated,
}) => {
  const [config, setConfig] = useState<SupabaseConfig>(getSavedSupabaseConfig());
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; msg: string; latency?: number } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showSqlCode, setShowSqlCode] = useState(false);

  if (!isOpen) return null;

  const isDefault = isUsingDefaultConfig(config);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    const res = await testSupabaseConnection(config.url, config.anonKey);
    setTesting(false);
    if (res.success) {
      setTestResult({
        success: true,
        msg: `Supabase Cloud is live & responding! Ping: ${res.latencyMs || 0}ms`,
        latency: res.latencyMs,
      });
    } else {
      setTestResult({
        success: false,
        msg: res.error || 'Connection check failed. Please verify credentials.',
      });
    }
  };

  const handleSave = () => {
    const updated: SupabaseConfig = {
      ...config,
      url: config.url.trim(),
      anonKey: config.anonKey.trim(),
      isConnected: true, // Always connected
      autoSync: true,
    };
    saveSupabaseConfig(updated);
    onConfigUpdated(updated);
    onClose();
  };

  const handleResetToDefault = () => {
    const def = resetToDefaultSupabaseConfig();
    setConfig(def);
    onConfigUpdated(def);
    setTestResult(null);
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SETUP_SCRIPT);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white border-t sm:border border-stone-200 rounded-t-3xl sm:rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl relative max-h-[92dvh] sm:max-h-[88vh] overflow-y-auto animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
        
        {/* Mobile handle */}
        <div className="sm:hidden w-12 h-1.5 bg-stone-300 rounded-full mx-auto -mt-1 mb-2" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-2xs shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-stone-900 leading-tight flex items-center gap-2">
              <span>Supabase Cloud Integration</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                Always Connected
              </span>
            </h2>
            <p className="text-xs text-stone-500">
              Persistent cloud storage with Row-Level Security (RLS) isolation
            </p>
          </div>
        </div>

        {/* Live Status banner */}
        <div className="p-3.5 rounded-xl border text-xs bg-emerald-50/80 border-emerald-200 text-emerald-950 mb-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-emerald-900">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Status: Connected to Supabase Cloud</span>
            </div>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
              {isDefault ? 'Default Shared Cloud' : 'Custom Project'}
            </span>
          </div>
          <p className="text-[11px] text-emerald-800 leading-relaxed">
            All users are automatically connected to Supabase out-of-the-box. Your account and spendings are strictly isolated with Postgres Row-Level Security.
          </p>
          {!isDefault && (
            <div className="pt-1 flex justify-end">
              <button
                type="button"
                onClick={handleResetToDefault}
                className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 underline"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset to Default Cloud Project</span>
              </button>
            </div>
          )}
        </div>

        {/* Inputs */}
        <div className="space-y-3.5">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-stone-700">
                Supabase Project URL
              </label>
              {isDefault && (
                <span className="text-[10px] text-stone-400 font-mono">
                  (Pre-configured Default)
                </span>
              )}
            </div>
            <input
              type="text"
              value={config.url}
              onChange={(e) => {
                setConfig({ ...config, url: e.target.value });
                setTestResult(null);
              }}
              placeholder="https://your-project.supabase.co"
              className="w-full px-3.5 py-2.5 text-base sm:text-sm bg-stone-50 border border-stone-300 rounded-xl text-stone-900 placeholder-stone-400 font-mono focus:outline-none focus:border-orange-500 focus:bg-white"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-stone-700">
                Supabase Anon Public Key
              </label>
              {isDefault && (
                <span className="text-[10px] text-stone-400 font-mono">
                  (Pre-configured Default)
                </span>
              )}
            </div>
            <input
              type="password"
              value={config.anonKey}
              onChange={(e) => {
                setConfig({ ...config, anonKey: e.target.value });
                setTestResult(null);
              }}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
              className="w-full px-3.5 py-2.5 text-base sm:text-sm bg-stone-50 border border-stone-300 rounded-xl text-stone-900 placeholder-stone-400 font-mono focus:outline-none focus:border-orange-500 focus:bg-white"
            />
          </div>

          {/* Test connection result */}
          {testResult && (
            <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
              testResult.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}>
              {testResult.success ? (
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span className="font-medium">{testResult.msg}</span>
            </div>
          )}

          {/* Buttons: Test & Save */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              disabled={testing || !config.url.trim() || !config.anonKey.trim()}
              onClick={handleTest}
              className="flex-1 py-2.5 px-3 text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 disabled:opacity-50 rounded-xl transition-colors flex items-center justify-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5 text-emerald-600" />
              <span>{testing ? 'Pinging Cloud...' : 'Ping Cloud Ping / Test'}</span>
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 py-2.5 px-3 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition-colors shadow-xs shadow-orange-500/20"
            >
              Save Configuration
            </button>
          </div>
        </div>

        {/* Database SQL Setup Helper */}
        <div className="mt-5 pt-4 border-t border-stone-100 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Supabase SQL Tables & RLS Policies</span>
            </span>
            <button
              type="button"
              onClick={handleCopySql}
              className="text-xs font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1 bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-200"
            >
              {copiedSql ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copied SQL!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy SQL Schema</span>
                </>
              )}
            </button>
          </div>
          <p className="text-[11px] text-stone-500">
            Postgres tables for <code className="bg-stone-100 px-1 py-0.5 rounded text-stone-700">personal_spendings</code> and <code className="bg-stone-100 px-1 py-0.5 rounded text-stone-700">personal_budgets</code> with Row-Level Security (RLS) enabled so each user only sees their own data.
          </p>

          <button
            type="button"
            onClick={() => setShowSqlCode(!showSqlCode)}
            className="text-[11px] text-stone-500 hover:text-stone-800 underline block"
          >
            {showSqlCode ? 'Hide SQL Script preview' : 'View SQL Script preview'}
          </button>

          {showSqlCode && (
            <pre className="p-3 bg-stone-900 text-stone-100 rounded-xl text-[10px] font-mono overflow-x-auto max-h-40 leading-relaxed border border-stone-800">
              {SUPABASE_SQL_SETUP_SCRIPT}
            </pre>
          )}
        </div>

      </div>
    </div>
  );
};
