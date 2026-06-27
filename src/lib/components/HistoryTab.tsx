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
        <div className="bg-navy-card/60 p-3 rounded-xl border border-white/5 text-center">
          <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">{t('total_played')}</span>
          <div className="text-lg font-extrabold text-white mt-0.5">{stakeHistory.length}</div>
        </div>
        <div className="bg-navy-card/60 p-3 rounded-xl border border-white/5 text-center">
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
          return (
            <div key={idx} className="glass rounded-xl p-3 flex items-center justify-between border border-white/5 hover:border-white/10 transition-all">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isWin ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                  {isWin ? <Trophy size={14} /> : <X size={14} />}
                </div>
                <div>
                  <div className="text-xs font-extrabold text-white flex items-center gap-1.5">
                    ID: <span className="font-mono text-gray-300">#{item.gameId.substring(0, 8)}</span>
                  </div>
                  <div className="text-[10px] text-gray-500">{date}</div>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-xs font-black ${isWin ? 'text-[#10b981]' : 'text-red-400'}`}>
                  {isWin ? `+${item.prize || item.stake} ${t('birr')}` : `-${item.stake} ${t('birr')}`}
                </div>
                <span className={`inline-block text-[8.5px] px-2 py-0.5 mt-0.5 rounded-full font-bold uppercase ${isWin ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/15 text-red-400 border border-red-500/20'}`}>
                  {isWin ? 'Win' : 'Loss'}
                </span>
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
