'use client';

import { useState, useEffect, useRef } from 'react';
import { COLUMN_LABELS } from '../types';

interface BingoGridProps {
  card: number[][];
  drawnNumbers: number[];
  winningCells?: boolean[][];
  interactive?: boolean;
  onCellClick?: (_row: number, _col: number) => void;
  compact?: boolean;
  mini?: boolean;
}

export default function BingoGrid({
  card,
  drawnNumbers,
  winningCells,
  interactive = false,
  onCellClick,
  compact = false,
  mini = false,
}: BingoGridProps) {
  const isCalled = (num: number) => num === 0 || drawnNumbers.includes(num);
  const isWinning = (row: number, col: number) => winningCells?.[row]?.[col] ?? false;

  const [shouldShake, setShouldShake] = useState(false);
  const prevDrawnCount = useRef(drawnNumbers.length);

  useEffect(() => {
    if (drawnNumbers.length > prevDrawnCount.current) {
      setShouldShake(true);
      const timer = setTimeout(() => setShouldShake(false), 400);
      prevDrawnCount.current = drawnNumbers.length;
      return () => clearTimeout(timer);
    }
    prevDrawnCount.current = drawnNumbers.length;
  }, [drawnNumbers]);

  return (
    <div className={`w-full mx-auto ${mini ? '' : compact ? 'max-w-[280px]' : 'max-w-sm'} ${shouldShake ? 'animate-grid-shake' : ''} transition-transform duration-300`}>
      {/* Column headers — navy BINGO letters with gold text (contrasts with gold marked cells) */}
      <div className={`grid grid-cols-5 ${mini ? 'gap-0.5' : compact ? 'gap-1.5' : 'gap-1.5'} px-0.5 ${compact ? 'mb-1.5' : 'mb-2.5'}`}>
        {COLUMN_LABELS.map((label) => (
          <div
            key={label}
            className={`
              text-center font-black rounded-xl text-gold flex items-center justify-center select-none aspect-square
              ${mini ? 'text-[9px] rounded-lg' : compact ? 'text-[11px]' : 'text-base'}
              bg-navy border border-gold/30 shadow-gold-glow-sm
            `}
          >
            {label}
          </div>
        ))}
      </div>

      {/* Grid — navy cells with gold accents */}
      <div className={`grid grid-cols-5 ${mini ? 'gap-0.5' : compact ? 'gap-1' : 'gap-1.5'}`}>
        {card.map((row, rowIdx) =>
          row.map((num, colIdx) => {
            const called = isCalled(num);
            const winning = isWinning(rowIdx, colIdx);
            const isFree = num === 0;
            const isMarked = called || isFree;

            return (
              <button
                key={`${rowIdx}-${colIdx}`}
                onClick={() => interactive && onCellClick?.(rowIdx, colIdx)}
                disabled={!interactive || isFree}
                className={`
                  bingo-cell ${isMarked ? 'marked' : ''}
                  w-full flex items-center justify-center rounded-xl font-black transition-all duration-150 select-none aspect-square relative overflow-visible
                  ${mini ? 'text-[10px] rounded-lg' : compact ? 'text-[11.5px]' : 'text-base'}
                  ${isMarked
                    ? isFree
                      ? 'bg-[#283782] text-gold border-b-[3.5px] border-[#1e2d6e] shadow-gold-glow-sm'
                      : 'bg-gradient-to-br from-[#FEE800] to-[#e6d000] text-navy border-b-[3.5px] border-[#c9b800] shadow-[0_0_10px_rgba(254,232,0,0.4)] ring-1 ring-gold/50 scale-[1.03]'
                    : 'bg-[#1a2a5c] text-white/90 border border-[#283782]/60 border-b-[3.5px] border-b-[#1a2050] hover:bg-[#1e2d6e] hover:border-gold-subtle active:translate-y-[1px] active:border-b-[1.5px] transition-colors'
                  }
                  ${winning ? 'ring-2 ring-gold shadow-gold-glow scale-[1.04] animate-bounce z-10' : ''}
                  ${interactive && !isMarked ? 'cursor-pointer' : ''}
                `}
              >
                {isFree ? '★' : num}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
