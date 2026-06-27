'use client';

import BingoGrid from './BingoGrid';
import type { ReactNode } from 'react';

interface WinModalProps {
  show: boolean;
  stake: number;
  livePlayerCount: number;
  commissionRate: number;
  card: number[][];
  drawnNumbers: number[];
  winningCells: boolean[][];
  cardNumber: number;
  playerName: string;
  countdown: number | null;
  onSkip: () => void;
  children?: ReactNode;
}

export default function WinModal({
  show, stake, livePlayerCount, commissionRate,
  card, drawnNumbers, winningCells, cardNumber,
  playerName, countdown, onSkip, children,
}: WinModalProps) {
  if (!show) return null;

  const rawPrize = stake * livePlayerCount;
  const commissionAmt = Math.round(rawPrize * (commissionRate / 100));
  const singlePrize = rawPrize - commissionAmt;

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
          <h1 className="text-3xl font-black text-[#ffd000] tracking-tight uppercase mt-1 drop-shadow-md">
            BINGO! 🎉
          </h1>
          <div className="text-[10px] font-black uppercase text-[#8da0c4] mt-1.5 tracking-widest">
            SINGLE WINNER (FULL POT CLAIMED)
          </div>
        </div>

        <div className="space-y-2.5">
          <div className="flex items-center justify-between bg-[#141f33]/80 border border-amber-500 px-5 py-4 rounded-2xl shadow-lg relative overflow-hidden">
            <span className="font-extrabold text-[#ffd000] text-sm tracking-wide flex items-center gap-1.5">
              <span>👑</span> {playerName}
            </span>
            <div className="text-right">
              <span className="font-black text-amber-500 text-sm block">
                +{singlePrize.toLocaleString()} ብር
              </span>
              <span className="text-[9px] text-gray-400 block font-mono">
                (House commission of {commissionRate}% deducted)
              </span>
            </div>
          </div>
        </div>

        <div className="text-center">
          <div className="text-[10px] font-black tracking-widest text-[#a1a1aa] uppercase">
            CARTELA NO: {cardNumber}
          </div>
        </div>

        {card.length > 0 && (
          <div className="bg-[#141f33]/40 border border-[#233c66]/20 p-4 rounded-3xl shadow-xl">
            <BingoGrid card={card} drawnNumbers={drawnNumbers} winningCells={winningCells} compact={true} />
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
