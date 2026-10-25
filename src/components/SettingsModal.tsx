import React, { useState } from 'react';
import { HouseSettings, Roommate } from '../types/expense';
import { X, Save, RotateCcw, Trash2, Download, Upload, Home } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: HouseSettings;
  onSaveSettings: (settings: HouseSettings) => void;
  onResetSampleData: () => void;
  onClearAllData: () => void;
  onExportJson: () => void;
  onImportJson: (file: File) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onResetSampleData,
  onClearAllData,
  onExportJson,
  onImportJson,
}) => {
  const [houseName, setHouseName] = useState(settings.houseName);
  const [currency, setCurrency] = useState(settings.currency);
  const [r1Name, setR1Name] = useState(settings.roommates[0]?.name || 'Alex');
  const [r2Name, setR2Name] = useState(settings.roommates[1]?.name || 'Sam');
  const [r3Name, setR3Name] = useState(settings.roommates[2]?.name || 'Jordan');
  const [potMonthlyAmount, setPotMonthlyAmount] = useState<number>(
    settings.sharedPotSettings?.monthlyContributionPerPerson || 30000
  );
  const [confirmClear, setConfirmClear] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedRoommates: Roommate[] = [
      {
        ...settings.roommates[0],
        name: r1Name.trim() || 'Roommate 1',
        avatarColor: 'bg-orange-500 text-white',
      },
      {
        ...settings.roommates[1],
        name: r2Name.trim() || 'Roommate 2',
        avatarColor: 'bg-stone-800 text-white',
      },
      {
        ...settings.roommates[2],
        name: r3Name.trim() || 'Roommate 3',
        avatarColor: 'bg-amber-500 text-white',
      },
    ];

    onSaveSettings({
      houseName: houseName.trim() || 'Une Maison',
      currency,
      roommates: updatedRoommates,
      sharedPotSettings: {
        monthlyContributionPerPerson: Math.max(1, potMonthlyAmount),
        potName: settings.sharedPotSettings?.potName || 'Une Maison Shared Pot',
      },
    });
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportJson(file);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white border-t sm:border border-stone-200 rounded-t-3xl sm:rounded-2xl max-w-lg w-full flex flex-col max-h-[92dvh] sm:max-h-[88vh] shadow-2xl relative animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 overflow-hidden">
        {/* Mobile drag handle */}
        <div className="sm:hidden w-12 h-1.5 bg-stone-300 rounded-full mx-auto mt-2.5 mb-1" />

        <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-100 shrink-0 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
              <Home className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-stone-900 leading-tight">
                Sharehouse Settings
              </h2>
              <p className="text-xs text-stone-500">
                Customize house name, roommate names, and currency
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-4 overscroll-contain">
          
          {/* House Name & Currency */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                House / Apartment Name
              </label>
              <input
                type="text"
                required
                value={houseName}
                onChange={(e) => setHouseName(e.target.value)}
                placeholder="e.g. Une Maison"
                className="w-full px-3.5 py-2.5 text-base sm:text-sm bg-stone-50 border border-stone-300 rounded-xl text-stone-900 focus:outline-none focus:border-orange-500 focus:bg-white font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-stone-50 border border-stone-300 rounded-xl text-stone-900 focus:outline-none focus:border-orange-500 focus:bg-white font-bold"
              >
                <option value="¥">¥ (Japanese Yen / JPY)</option>
                <option value="$">$ (USD / CAD / AUD)</option>
                <option value="€">€ (EUR)</option>
                <option value="£">£ (GBP)</option>
                <option value="₩">₩ (KRW)</option>
                <option value="₹">₹ (INR)</option>
                <option value="CHF">CHF (Swiss Franc)</option>
                <option value="kr">kr (SEK / NOK / DKK)</option>
              </select>
            </div>
          </div>

          {/* Shared Pot Fixed Contribution Setting */}
          <div className="p-3 bg-orange-50/60 border border-orange-200/80 rounded-xl space-y-1.5">
            <label className="block text-xs font-semibold text-orange-950 flex items-center gap-1.5">
              <span>🍯 Shared Pot Monthly Contribution ({currency})</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                step="1"
                value={potMonthlyAmount}
                onChange={(e) => setPotMonthlyAmount(parseFloat(e.target.value) || 0)}
                placeholder="30000"
                className="w-full px-3 py-1.5 text-xs sm:text-sm font-mono font-bold bg-white border border-orange-300 rounded-lg text-stone-900 focus:outline-none focus:border-orange-500"
              />
              <span className="text-xs text-stone-500 whitespace-nowrap">/ person</span>
            </div>
            <p className="text-[11px] text-stone-500">
              Total house pot: <strong className="font-mono text-stone-800">{currency}{(potMonthlyAmount * 3).toLocaleString()}</strong> / month
            </p>
          </div>

          {/* 3 Roommate Names */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-2">
              The 3 Roommates
            </label>
            <div className="space-y-2.5">
              {/* Roommate 1 */}
              <div className="flex items-center gap-2 p-2 bg-stone-50 rounded-xl border border-stone-200">
                <div className="w-8 h-8 rounded-lg bg-orange-500 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  1
                </div>
                <input
                  type="text"
                  required
                  value={r1Name}
                  onChange={(e) => setR1Name(e.target.value)}
                  placeholder="Roommate 1 name"
                  className="flex-1 px-3 py-1.5 text-xs bg-white border border-stone-300 rounded-lg text-stone-900 font-semibold focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Roommate 2 */}
              <div className="flex items-center gap-2 p-2 bg-stone-50 rounded-xl border border-stone-200">
                <div className="w-8 h-8 rounded-lg bg-stone-800 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  2
                </div>
                <input
                  type="text"
                  required
                  value={r2Name}
                  onChange={(e) => setR2Name(e.target.value)}
                  placeholder="Roommate 2 name"
                  className="flex-1 px-3 py-1.5 text-xs bg-white border border-stone-300 rounded-lg text-stone-900 font-semibold focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Roommate 3 */}
              <div className="flex items-center gap-2 p-2 bg-stone-50 rounded-xl border border-stone-200">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  3
                </div>
                <input
                  type="text"
                  required
                  value={r3Name}
                  onChange={(e) => setR3Name(e.target.value)}
                  placeholder="Roommate 3 name"
                  className="flex-1 px-3 py-1.5 text-xs bg-white border border-stone-300 rounded-lg text-stone-900 font-semibold focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>
          </div>

          {/* Data Tools */}
          <div className="pt-3 border-t border-stone-100 space-y-2.5">
            <span className="text-xs font-semibold text-stone-600 block">
              Data Management & Backup
            </span>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onExportJson}
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold bg-stone-50 hover:bg-stone-100 text-stone-700 border border-stone-300 rounded-xl transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-stone-500" />
                <span>Backup JSON</span>
              </button>

              <label className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold bg-stone-50 hover:bg-stone-100 text-stone-700 border border-stone-300 rounded-xl cursor-pointer transition-colors">
                <Upload className="w-3.5 h-3.5 text-stone-500" />
                <span>Restore JSON</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => {
                  onResetSampleData();
                  onClose();
                }}
                className="text-xs font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reload Sample Data</span>
              </button>

              {confirmClear ? (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      onClearAllData();
                      setConfirmClear(false);
                      onClose();
                    }}
                    className="text-xs font-bold text-rose-600 hover:text-rose-700"
                  >
                    Confirm Wipe
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClear(false)}
                    className="text-xs text-stone-500 hover:text-stone-800 ml-1"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmClear(true)}
                  className="text-xs font-medium text-rose-600 hover:text-rose-700 flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear All Expenses</span>
                </button>
              )}
            </div>
          </div>
        </form>

        {/* Sticky Actions Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-t border-stone-100 bg-stone-50/90 sm:bg-white shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs sm:text-sm font-semibold text-stone-500 hover:text-stone-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit as any}
            className="flex-1 sm:flex-initial px-5 py-2.5 min-h-[42px] text-xs sm:text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-xs shadow-orange-500/20 active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>Save Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};
