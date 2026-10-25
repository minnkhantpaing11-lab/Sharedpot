import React from 'react';
import { X, Download } from 'lucide-react';

interface ReceiptModalProps {
  url: string | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ url, onClose }) => {
  if (!url) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white border-t sm:border border-stone-200 rounded-t-3xl sm:rounded-2xl max-w-2xl w-full p-5 relative shadow-2xl animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
        {/* Mobile handle */}
        <div className="sm:hidden w-12 h-1.5 bg-stone-300 rounded-full mx-auto -mt-2 mb-3" />

        <div className="flex items-center justify-between pb-3.5 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <span className="text-xl">📎</span>
            <span className="text-sm font-bold text-stone-900">Receipt Attachment</span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={url}
              download="expense-receipt.jpg"
              className="w-8 h-8 flex items-center justify-center text-stone-500 hover:text-stone-800 rounded-lg hover:bg-stone-100 transition-colors"
              title="Download receipt"
            >
              <Download className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-stone-500 hover:text-stone-800 rounded-lg hover:bg-stone-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="mt-3.5 flex items-center justify-center bg-stone-50 rounded-xl p-2 overflow-hidden max-h-[75vh]">
          <img
            src={url}
            alt="Expense receipt"
            className="max-h-[70vh] w-auto object-contain rounded-lg"
          />
        </div>
      </div>
    </div>
  );
};
