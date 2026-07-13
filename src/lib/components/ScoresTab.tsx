'use client';

import { Trophy } from 'lucide-react';
import type { Profile, Wallet } from '../types';

interface LeaderboardEntry {
  id: string;
  username: string;
  gamesPlayed: number;
  totalWins?: number;
  avatar: string;
  isUser: boolean;
  change?: string;
}

interface ScoresTabProps {
  profile: Profile | null;
  wallet: Wallet | null;
  dbLeaderboard: LeaderboardEntry[];
  t: (key: string) => string;
}

export default function ScoresTab({ profile, dbLeaderboard, t }: ScoresTabProps) {
  const userEntry = dbLeaderboard.find(p => p.id === profile?.id);
  const userTotalWins = userEntry?.totalWins ?? 0;
  const userGamesPlayed = userEntry?.gamesPlayed ?? 0;

  const activeDbLeaderboard = dbLeaderboard.length > 0 ? dbLeaderboard : [
    { id: 'user', username: profile?.first_name || 'You', gamesPlayed: userGamesPlayed, totalWins: userTotalWins, avatar: profile?.photo_url || '👑', isUser: true },
  ];

  const listToUse = [...activeDbLeaderboard];
  const userIdx = listToUse.findIndex(p => p.id === profile?.id || p.id === 'user');
  if (userIdx === -1) {
    listToUse.push({
      id: profile?.id || 'user',
      username: profile?.first_name || 'You',
      gamesPlayed: userGamesPlayed,
      totalWins: userTotalWins,
      avatar: profile?.photo_url || '👑',
      isUser: true,
    });
  } else {
    listToUse[userIdx].isUser = true;
    listToUse[userIdx].username = profile?.first_name || 'You';
    listToUse[userIdx].avatar = profile?.photo_url || '👑';
  }

  const sortedList = listToUse.sort((a, b) => (b.gamesPlayed || 0) - (a.gamesPlayed || 0));
  const userRank = sortedList.findIndex(p => p.isUser) + 1;
  const finalLeaderboard = sortedList.slice(0, 10);

  return (
    <div className="px-4 pt-4 animate-fade-in pb-20">
      <div className="bg-gradient-to-r from-navy to-navy-light rounded-2xl p-5 mb-5 shadow-gold-glow-sm relative overflow-hidden border border-gold-subtle">
        <div className="absolute inset-0 gold-shimmer pointer-events-none opacity-30" />
        <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 rounded-full blur-2xl -mr-8 -mt-8" />
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center border border-gold/20 shadow-gold-glow-sm">
            <Trophy size={24} className="text-gold animate-pulse" />
          </div>
          <div>
            <div className="text-[10px] text-white/70 uppercase tracking-widest font-black">{t('my_rank')}</div>
            <div className="text-2xl font-black text-white flex items-baseline gap-2">
              <span>#{userRank}</span>
              <span className="text-xs font-bold text-gold/70">Leaderboard</span>
            </div>
            <div className="text-[11px] text-gold font-semibold mt-0.5">
              Games Played: {userGamesPlayed}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3.5">
        <h3 className="text-xs text-gray-400 font-bold uppercase tracking-wider">🏆 Top Players</h3>
      </div>

      <div className="space-y-2">
        {finalLeaderboard.map((item, index) => {
          const rank = index + 1;
          const isUser = item.isUser;
          return (
            <div
              key={item.id}
              className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                isUser
                  ? 'bg-gradient-to-r from-[#202050] to-[#15153c] border-gold-medium shadow-gold-glow-sm'
                  : 'bg-navy-card/50 border-gold-subtle hover:border-gold-medium gold-border-hover'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs shrink-0 select-none ${
                  rank === 1 ? 'bg-amber-400 text-navy shadow-md shadow-amber-400/20' :
                  rank === 2 ? 'bg-slate-300 text-navy shadow-md shadow-slate-300/20' :
                  rank === 3 ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20' :
                  'bg-white/5 border border-gold-subtle text-gray-400'
                }`}>
                  {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
                </div>
                <span className="text-base shrink-0">{item.avatar}</span>
                <div>
                  <span className={`text-xs font-extrabold ${isUser ? 'text-amber-300 font-black' : 'text-white'}`}>
                    {item.username} {isUser && <span className="text-[9px] font-bold px-1.5 py-0.5 bg-amber-500/15 border border-amber-500/20 rounded text-amber-400 ml-1">YOU</span>}
                  </span>
                  <div className="text-[9px] text-gray-500 leading-none mt-0.5 font-mono font-bold uppercase tracking-wider">{item.totalWins || 0} wins</div>
                </div>
              </div>
              <div className="text-right">
                <span className={`text-xs font-mono font-black ${isUser ? 'text-amber-400' : 'text-gray-200'}`}>
                  {item.gamesPlayed || 0} <span className="text-[9px] font-sans font-bold text-gray-400">games</span>
                </span>
                <div className="text-[9px] flex items-center justify-end gap-0.5 mt-0.5 font-bold">
                  {item.change === 'up' && <span className="text-emerald-400">▲</span>}
                  {item.change === 'down' && <span className="text-red-400">▼</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
