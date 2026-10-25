import React, { useState } from 'react';
import { X, Database, Check, Copy, AlertCircle, Link as LinkIcon, ExternalLink, ShieldCheck } from 'lucide-react';
import { SupabaseConfig } from '../../types/personal';
import { getSavedSupabaseConfig, saveSupabaseConfig, testSupabaseConnection, SUPABASE_SQL_SETUP_SCRIPT } from '../../lib/supabase';

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
  const [testResult, setTestResult] = useState<{ success: boolean; msg: string } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showSqlCode, setShowSqlCode] = useState(false);

  if (!isOpen) return null;

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    const res = await testSupabaseConnection(config.url, config.anonKey);
    setTesting(false);
    if (res.success) {
      setTestResult({ success: true, msg: 'Successfully connected to Supabase API!' });
    } else {
      setTestResult({ success: false, msg: res.error || 'Connection failed. Please check your credentials.' });
    }
  };

  const handleSave = () => {
    const updated: SupabaseConfig = {
      ...config,
      url: config.url.trim(),
      anonKey: config.anonKey.trim(),
      isConnected: Boolean(config.url.trim() && config.anonKey.trim()),
    };
    saveSupabaseConfig(updated);
    onConfigUpdated(updated);
    onClose();
  };

  const handleDisconnect = () => {
    const empty: SupabaseConfig = {
      url: '',
      anonKey: '',
      isConnected: false,
      autoSync: false,
    };
    setConfig(empty);
    saveSupabaseConfig(empty);
    onConfigUpdated(empty);
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
          <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600 shadow-2xs shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-stone-900 leading-tight">
              Link Supabase Database
            </h2>
            <p className="text-xs text-stone-500">
              Connect your own Supabase project for persistent cloud data & RLS isolation
            </p>
          </div>
        </div>

        {/* Status banner */}
        <div className={`p-3 rounded-xl border text-xs flex items-center justify-between mb-4 ${
          config.isConnected 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-stone-50 border-stone-200 text-stone-600'
        }`}>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${config.isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-stone-400'}`} />
            <span className="font-semibold">
              {config.isConnected ? 'Supabase Database Linked' : 'Currently using Local Account storage'}
            </span>
          </div>
          {config.isConnected && (
            <button
              onClick={handleDisconnect}
              className="text-[11px] font-bold text-stone-500 hover:text-rose-600 underline"
            >
              Disconnect
            </button>
          )}
        </div>

        {/* Inputs */}
        <div className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Supabase Project URL
            </label>
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
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Supabase Anon Public Key
            </label>
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
              className="flex-1 py-2 px-3 text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 disabled:opacity-50 rounded-xl transition-colors flex items-center justify-center gap-1.5"
            >
              <LinkIcon className="w-3.5 h-3.5" />
              <span>{testing ? 'Testing...' : 'Test Connection'}</span>
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 py-2 px-3 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition-colors shadow-xs shadow-orange-500/20"
            >
              Save & Link Supabase
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
            Paste this SQL script once into your Supabase project's SQL Editor to create tables for <code className="bg-stone-100 px-1 py-0.5 rounded text-stone-700">personal_spendings</code> and <code className="bg-stone-100 px-1 py-0.5 rounded text-stone-700">personal_budgets</code> with Row-Level Security (RLS) enabled so each user only sees their own data.
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
