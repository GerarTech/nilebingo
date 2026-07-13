'use client';

import type { ReactNode } from 'react';
import BingoGrid from './BingoGrid';
import { getWinningCells } from '../server/bingo';

interface WinnerInfo {
  user_id: string;
  name: string;
  card: number[][];
  won_at: string;
}

interface WinModalProps {
  show: boolean;
  winners: WinnerInfo[];
  winAmount: number;
  totalWinAmount: number;
  winnerCount: number;
  isPending: boolean;
  message: string;
  playerName: string;
  countdown: number | null;
  drawnNumbers: number[];
  onSkip: () => void;
  children?: ReactNode;
  t: (key: string) => string;
}

export default function WinModal({
  show, winners, winAmount, totalWinAmount, winnerCount,
  isPending, message, playerName, countdown, drawnNumbers, onSkip, children, t,
}: WinModalProps) {
  if (!show) return null;

  return (
    <div
      className="fixed inset-0 bg-[#050e18] z-50 flex flex-col justify-between p-6 overflow-y-auto font-sans text-white animate-fade-in"
      onClick={onSkip}
    >
      {/* Gold radial burst effect */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full gold-radial-burst"
          style={{ background: 'radial-gradient(circle, rgba(254,232,0,0.2) 0%, rgba(254,232,0,0.05) 40%, transparent 70%)' }} />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full gold-pulse-ring"
          style={{ background: 'radial-gradient(circle, rgba(254,232,0,0.12) 0%, transparent 60%)' }} />
      </div>

      <div className="flex justify-end relative z-10">
        <button
          onClick={(e) => { e.stopPropagation(); onSkip(); }}
          className="text-xs font-black text-gray-400 hover:text-white bg-[#141f33] border border-gold-subtle px-3.5 py-1.5 rounded-xl transition-all uppercase cursor-pointer gold-border-hover"
        >
          Skip {countdown !== null && `(${countdown}s)`}
        </button>
      </div>

      {children}

      <div className="max-w-sm w-full mx-auto my-auto space-y-6 relative z-10" onClick={e => e.stopPropagation()}>
        <div className="text-center">
          <span className="text-3xl animate-bounce inline-block">🎉</span>
          <h1 className="text-3xl font-black text-gold tracking-tight uppercase mt-1 drop-shadow-[0_0_15px_rgba(254,232,0,0.4)]">
            BINGO! 🎉
          </h1>
          {isPending && (
            <div className="text-[10px] font-black uppercase text-[#8da0c4] mt-1.5 tracking-widest animate-pulse">
              COLLECTING WINNERS...
            </div>
          )}
          {!isPending && winAmount > 0 && (
            <div className="text-[10px] font-black uppercase text-[#8da0c4] mt-1.5 tracking-widest">
              {winnerCount > 1 ? `${winnerCount} WINNERS — SHARED PRIZE` : 'SINGLE WINNER'}
            </div>
          )}
        </div>

        {isPending && (
          <div className="bg-[#141f33]/60 border border-gold-medium px-5 py-4 rounded-2xl text-center gold-border-hover">
            <div className="text-sm font-bold text-gold mb-1">{message}</div>
            {winners.length > 0 && (
              <div className="text-[11px] text-gray-400">
                {winners.length} winner{winners.length > 1 ? 's' : ''} recorded so far
              </div>
            )}
          </div>
        )}

        {/* Winning Card(s) — always show when available */}
        {winners.filter(w => w.card && w.card.length > 0).length > 0 && (
          <div className="space-y-3">
            <div className="text-center">
              <div className="text-[10px] font-black uppercase text-gold tracking-widest">Winning Card</div>
            </div>
            {winners.filter(w => w.card && w.card.length > 0).map((w, i) => {
              const winningCells = getWinningCells(w.card, drawnNumbers);
              return (
                <div key={w.user_id || i} className="bg-[#141f33]/80 border border-gold-medium p-3 rounded-2xl gold-border-hover">
                  {winners.length > 1 && (
                    <div className="text-[9px] font-black text-gold/70 uppercase tracking-wider mb-2 text-center">
                      {w.name}&apos;s Card
                    </div>
                  )}
                  <BingoGrid
                    card={w.card}
                    drawnNumbers={drawnNumbers}
                    winningCells={winningCells}
                    compact
                  />
                </div>
              );
            })}
          </div>
        )}

        {!isPending && (
          <>

            <div className="space-y-2.5">
              {winners.length > 0 ? (
                winners.map((w, i) => (
                  <div
                    key={w.user_id || i}
                    className="flex items-center justify-between bg-[#141f33]/80 border border-gold-medium px-5 py-4 rounded-2xl shadow-gold-glow-sm relative overflow-hidden gold-border-hover"
                  >
                    <div className="absolute inset-0 gold-shimmer pointer-events-none" />
                    <span className="font-extrabold text-gold text-sm tracking-wide flex items-center gap-1.5 relative z-10">
                      <span>👑</span> {w.name}
                      {w.user_id === winners[0]?.user_id && winnerCount > 1 && (
                        <span className="text-[9px] font-black text-gold/70 uppercase tracking-wider ml-1">Winner</span>
                      )}
                    </span>
                    <div className="text-right relative z-10">
                      {winAmount > 0 && (
                        <span className="font-black text-gold text-sm block drop-shadow-[0_0_6px_rgba(254,232,0,0.3)]">
                          +{winAmount.toLocaleString()} {t('birr')}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-between bg-[#141f33]/80 border border-gold-medium px-5 py-4 rounded-2xl shadow-gold-glow-sm relative overflow-hidden">
                  <div className="absolute inset-0 gold-shimmer pointer-events-none" />
                  <span className="font-extrabold text-gold text-sm tracking-wide flex items-center gap-1.5 relative z-10">
                    <span>👑</span> {playerName}
                  </span>
                  <div className="text-right relative z-10">
                    <span className="font-black text-gold text-sm block drop-shadow-[0_0_6px_rgba(254,232,0,0.3)]">
                      +{(totalWinAmount > 0 ? totalWinAmount / Math.max(winnerCount, 1) : 0).toLocaleString()} {t('birr')}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {winnerCount > 1 && (
              <div className="bg-[#141f33]/40 border border-gold-subtle p-4 rounded-3xl text-center gold-border-hover">
                <div className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Prize Split</div>
                <div className="text-lg font-black text-gold drop-shadow-[0_0_8px_rgba(254,232,0,0.3)]">
                  {totalWinAmount.toLocaleString()} ETB ÷ {winnerCount} = {winAmount.toLocaleString()} ETB each
                </div>
              </div>
            )}
          </>
        )}

        {message && !isPending && (
          <div className="bg-[#0a1f2e]/60 border border-emerald-500/20 px-5 py-3 rounded-2xl text-center">
            <div className="text-xs font-bold text-emerald-400">{message}</div>
          </div>
        )}
      </div>

      <div className="max-w-sm w-full mx-auto mt-auto pt-4 relative z-10" onClick={e => e.stopPropagation()}>
        <div className="text-center">
          <div className="text-[10px] uppercase font-black tracking-widest text-gold tracking-wide select-none animate-pulse">
            STARTING IN {countdown ?? 3}S
          </div>
          <div className="w-full bg-[#141f33] h-2.5 rounded-full overflow-hidden mt-2.5 border border-gold-subtle shadow-inner">
            <div
              className="bg-gradient-gold h-full rounded-full transition-all duration-1000 ease-linear shadow-gold-glow-sm"
              style={{ width: `${((countdown ?? 5) / 5) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
