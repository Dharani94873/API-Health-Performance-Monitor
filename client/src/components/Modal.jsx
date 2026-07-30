import { useState } from 'react';
import { MdWarning, MdClose } from 'react-icons/md';

export default function Modal({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', danger = false }) {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setLoading(true);
    await onConfirm();
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass-card max-w-md w-full p-6 animate-slide-up">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-white p-1 rounded-lg hover:bg-white/5"
        >
          <MdClose size={18} />
        </button>

        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
          danger ? 'bg-red-500/20' : 'bg-primary-500/20'
        }`}>
          <MdWarning size={24} className={danger ? 'text-red-400' : 'text-primary-400'} />
        </div>

        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
        <p className="text-sm text-slate-400 mb-6">{message}</p>

        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={`flex-1 justify-center font-medium px-4 py-2 rounded-xl transition-all flex items-center gap-2 disabled:opacity-50 ${
              danger
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-primary-600 hover:bg-primary-700 text-white'
            }`}
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
