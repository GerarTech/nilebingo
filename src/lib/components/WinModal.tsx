'use client';

import type { ReactNode } from 'react';

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
  onSkip: () => void;
  children?: ReactNode;
  t: (key: string) => string;
}

export default function WinModal({
  show, winners, winAmount, totalWinAmount, winnerCount,
  isPending, message, playerName, countdown, onSkip, children, t,
}: WinModalProps) {
  if (!show) return null;

  return (
    <div
      className="fixed inset-0 bg-[#050e18] z-50 flex flex-col justify-between p-6 overflow-y-auto font-sans text-white animate-fade-in"
      onClick={onSkip}
    >
      <div className="flex justify-end">
        <button
          onClick={(e) => { e.stopPropagation(); onSkip(); }}
          className="text-xs font-black text-gray-400 hover:text-white bg-[#141f33] border border-[#233c66]/40 px-3.5 py-1.5 rounded-xl transition-all uppercase cursor-pointer"
        >
          Skip {countdown !== null && `(${countdown}s)`}
        </button>
      </div>

      {children}

      <div className="max-w-sm w-full mx-auto my-auto space-y-6" onClick={e => e.stopPropagation()}>
        <div className="text-center">
          <span className="text-3xl animate-bounce inline-block">🎉</span>
          <h1 className="text-3xl font-black text-[#FEE800] tracking-tight uppercase mt-1 drop-shadow-md">
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
          <div className="bg-[#141f33]/60 border border-amber-500/30 px-5 py-4 rounded-2xl text-center">
            <div className="text-sm font-bold text-amber-400 mb-1">{message}</div>
            {winners.length > 0 && (
              <div className="text-[11px] text-gray-400">
                {winners.length} winner{winners.length > 1 ? 's' : ''} recorded so far
              </div>
            )}
          </div>
        )}

        {!isPending && (
          <>
            <div className="space-y-2.5">
              {winners.length > 0 ? (
                winners.map((w, i) => (
                  <div
                    key={w.user_id || i}
                    className="flex items-center justify-between bg-[#141f33]/80 border border-amber-500 px-5 py-4 rounded-2xl shadow-lg relative overflow-hidden"
                  >
                    <span className="font-extrabold text-[#FEE800] text-sm tracking-wide flex items-center gap-1.5">
                      <span>👑</span> {w.name}
                      {w.user_id === winners[0]?.user_id && winnerCount > 1 && (
                        <span className="text-[9px] font-black text-amber-400/70 uppercase tracking-wider ml-1">Winner</span>
                      )}
                    </span>
                    <div className="text-right">
                      {winAmount > 0 && (
                        <span className="font-black text-amber-500 text-sm block">
                          +{winAmount.toLocaleString()} {t('birr')}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-between bg-[#141f33]/80 border border-amber-500 px-5 py-4 rounded-2xl shadow-lg">
                  <span className="font-extrabold text-[#FEE800] text-sm tracking-wide flex items-center gap-1.5">
                    <span>👑</span> {playerName}
                  </span>
                  <div className="text-right">
                    <span className="font-black text-amber-500 text-sm block">
                      +{(totalWinAmount > 0 ? totalWinAmount / Math.max(winnerCount, 1) : 0).toLocaleString()} {t('birr')}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {winnerCount > 1 && (
              <div className="bg-[#141f33]/40 border border-[#233c66]/20 p-4 rounded-3xl text-center">
                <div className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Prize Split</div>
                <div className="text-lg font-black text-[#FEE800]">
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

      <div className="max-w-sm w-full mx-auto mt-auto pt-4" onClick={e => e.stopPropagation()}>
        <div className="text-center">
          <div className="text-[10px] uppercase font-black tracking-widest text-amber-500 tracking-wide select-none animate-pulse">
            STARTING IN {countdown ?? 3}S
          </div>
          <div className="w-full bg-[#141f33] h-2.5 rounded-full overflow-hidden mt-2.5 border border-[#233c66]/40 shadow-inner">
            <div
              className="bg-gradient-to-r from-amber-500 via-[#ff5a00] to-orange-600 h-full rounded-full transition-all duration-1000 ease-linear shadow-sm"
              style={{ width: `${((countdown ?? 5) / 5) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}