import React, { useState } from 'react';
import { X, Lock, User, ShieldCheck, ArrowRight, Database } from 'lucide-react';
import { AuthUser } from '../../types/personal';
import { loginUser, signUpUser, getSavedSupabaseConfig } from '../../lib/supabase';

interface PersonalAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: AuthUser) => void;
}

export const PersonalAuthModal: React.FC<PersonalAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const config = getSavedSupabaseConfig();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const normalizedUsername = username.trim().toLowerCase();
    if (!normalizedUsername || !password.trim()) {
      setErrorMsg('Please enter both username and password.');
      return;
    }
    if (!/^[a-z0-9_]{3,24}$/.test(normalizedUsername)) {
      setErrorMsg('Username must be 3–24 characters and use only letters, numbers, or underscores.');
      return;
    }

    // Supabase Auth currently requires an email identifier. Use a non-deliverable
    // internal alias so people can sign in with a username without providing email.
    const authAlias = `${normalizedUsername}@users.sharedpot.invalid`;

    setLoading(true);
    try {
      if (isSignUp) {
        const res = await signUpUser(authAlias, password, name.trim() || normalizedUsername);
        if (res.error) {
          setErrorMsg(res.error);
        } else {
          onSuccess(res.user);
          onClose();
        }
      } else {
        const res = await loginUser(authAlias, password);
        if (res.error) {
          setErrorMsg(res.error);
        } else {
          onSuccess(res.user);
          onClose();
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white border-t sm:border border-stone-200 rounded-t-3xl sm:rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl relative animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
        
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
          <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-sm shadow-orange-500/20 shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-stone-900 leading-tight">
              {isSignUp ? 'Create Personal Account' : 'Log In to Your Account'}
            </h2>
            <p className="text-xs text-stone-500">
              Personal pocketbook & isolated balance tracking
            </p>
          </div>
        </div>

        {/* Supabase status badge */}
        <div className="mb-4 p-2.5 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-stone-700">
            <Database className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-medium text-emerald-950">Cloud Sync:</span>
            <span className="font-semibold text-stone-900">
              Supabase Connected
            </span>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Always Connected</span>
          </span>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {isSignUp && (
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Your Name / Nickname
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Minn"
                  className="w-full pl-9 pr-3.5 py-2.5 text-base sm:text-sm bg-stone-50 border border-stone-300 rounded-xl text-stone-900 placeholder-stone-400 focus:outline-none focus:border-orange-500 focus:bg-white"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Username
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                required
                autoComplete="username"
                minLength={3}
                maxLength={24}
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/\s/g, '').toLowerCase())}
                placeholder="e.g. minn_khant"
                className="w-full pl-9 pr-3.5 py-2.5 text-base sm:text-sm bg-stone-50 border border-stone-300 rounded-xl text-stone-900 placeholder-stone-400 focus:outline-none focus:border-orange-500 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3.5 py-2.5 text-base sm:text-sm bg-stone-50 border border-stone-300 rounded-xl text-stone-900 placeholder-stone-400 focus:outline-none focus:border-orange-500 focus:bg-white"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1 text-[11px] text-stone-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Strict privacy: You can only see your own spendings and balance.</span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[44px] py-2.5 px-4 bg-orange-500 hover:bg-orange-600 active:scale-95 disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs shadow-orange-500/20 flex items-center justify-center gap-2 transition-all mt-2"
          >
            <span>{loading ? 'Processing...' : isSignUp ? 'Create My Account' : 'Log In to My Pocketbook'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-4 pt-3.5 border-t border-stone-100 text-center text-xs text-stone-500">
          {isSignUp ? (
            <span>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(false);
                  setErrorMsg('');
                }}
                className="font-bold text-orange-600 hover:text-orange-700"
              >
                Log In
              </button>
            </span>
          ) : (
            <span>
              Need a personal account?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(true);
                  setErrorMsg('');
                }}
                className="font-bold text-orange-600 hover:text-orange-700"
              >
                Create Account
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
