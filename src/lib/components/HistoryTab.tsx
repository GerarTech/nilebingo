'use client';

import { Trophy, X, History as HistoryIcon } from 'lucide-react';

interface StakeHistoryEntry {
  gameId: string;
  stake: number;
  result: 'win' | 'loss';
  prize?: number;
  timestamp: string;
}

interface HistoryTabProps {
  stakeHistory: StakeHistoryEntry[];
  t: (key: string) => string;
}

export default function HistoryTab({ stakeHistory, t }: HistoryTabProps) {
  const winsCount = stakeHistory.filter(h => h.result === 'win').length;

  return (
    <div className="px-4 pt-4 animate-fade-in pb-20">
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-navy-card/60 p-3 rounded-xl border border-gold-subtle text-center gold-border-hover transition-all">
          <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">{t('total_played')}</span>
          <div className="text-lg font-extrabold text-white mt-0.5">{stakeHistory.length}</div>
        </div>
        <div className="bg-navy-card/60 p-3 rounded-xl border border-gold-subtle text-center gold-border-hover transition-all">
          <span className="text-[10px] text-gold uppercase tracking-wider font-semibold">{t('total_wins')}</span>
          <div className="text-lg font-extrabold text-gold mt-0.5">{winsCount}</div>
        </div>
      </div>

      <h3 className="text-[11px] text-gray-400 mb-2.5 font-bold uppercase tracking-wider flex items-center justify-between">
        <span>{t('recent_activity')}</span>
      </h3>

      <div className="space-y-2">
        {stakeHistory.map((item, idx) => {
          const isWin = item.result === 'win';
          const date = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' +
            new Date(item.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
          const displayAmount = isWin ? Math.abs(Number(item.prize ?? 0)) : Math.abs(Number(item.stake ?? 0));
          return (
            <div key={idx} className="glass-gold rounded-xl p-3 flex items-center justify-between border border-gold-subtle hover:border-gold-medium transition-all gold-border-hover">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isWin ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                  {isWin ? <Trophy size={14} /> : <X size={14} />}
                </div>
                <div>
                  <span className={`text-xs font-black ${isWin ? 'text-emerald-400' : 'text-red-400'}`}>
                    {isWin ? 'Win' : 'Loss'}
                  </span>
                  <div className="text-[10px] text-gray-500 mt-0.5">{date}</div>
                </div>
              </div>
              <div className={`text-sm font-black ${isWin ? 'text-[#10b981]' : 'text-red-400'}`}>
                {isWin ? '+' : '-'}{displayAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {t('birr')}
              </div>
            </div>
          );
        })}
        {stakeHistory.length === 0 && (
          <div className="glass rounded-xl py-12 text-center text-gray-500 text-xs">
            <HistoryIcon size={26} className="mx-auto mb-2 text-gray-600" />
            {t('no_activity')}
          </div>
        )}
      </div>
    </div>
  );
}
