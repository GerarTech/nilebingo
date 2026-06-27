'use client';

interface LeaveModalProps {
  show: boolean;
  stake: number;
  onResume: () => void;
  onForfeit: () => void;
  onClose: () => void;
  t: (key: string) => string;
}

export default function LeaveModal({ show, stake, onResume, onForfeit, onClose, t }: LeaveModalProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 font-sans text-white animate-fade-in" onClick={onClose}>
      <div className="bg-[#0f1a30] border-2 border-red-500/30 w-full max-w-sm rounded-3xl p-6 text-center shadow-2xl relative overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-red-500 via-orange-500 to-red-500" />
        <div className="w-14 h-14 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
          <span className="text-2xl text-red-500">⚠️</span>
        </div>
        <h3 className="text-lg font-black text-white uppercase tracking-tight">Abandon Game?</h3>
        <p className="text-xs text-amber-500 font-extrabold mt-1">{t('forfeit_warning')}</p>
        <p className="text-xs text-gray-400 mt-3.5 leading-relaxed font-sans text-center">
          {t('leave_warning')} <span className="text-amber-400 font-bold">{stake.toLocaleString()} {t('birr')}</span> {t('will_be_lost')}
        </p>
        <div className="grid grid-cols-2 gap-3 mt-6">
          <button onClick={onResume} className="bg-[#14223d] border border-white/5 hover:bg-white/5 text-gray-300 font-extrabold py-3 rounded-xl text-xs transition-all uppercase tracking-wider cursor-pointer">
            Resume Play
          </button>
          <button onClick={onForfeit} className="bg-gradient-to-r from-red-600 to-rose-700 text-white font-black py-3 rounded-xl text-xs transition-all uppercase tracking-wider cursor-pointer shadow-lg shadow-red-600/15">
            Forfeit & Exit
          </button>
        </div>
      </div>
    </div>
  );
}
