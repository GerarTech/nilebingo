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
}

export default function BingoGrid({
  card,
  drawnNumbers,
  winningCells,
  interactive = false,
  onCellClick,
  compact = false,
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
    <div className={`w-full mx-auto ${compact ? 'max-w-[280px]' : 'max-w-sm'} ${shouldShake ? 'animate-grid-shake' : ''} transition-transform duration-300`}>
      {/* Column headers — gold BINGO letters */}
      <div className={`grid grid-cols-5 gap-1.5 px-0.5 ${compact ? 'mb-1.5' : 'mb-2.5'}`}>
        {COLUMN_LABELS.map((label) => (
          <div
            key={label}
            className={`
              text-center font-black rounded-xl text-navy shadow-gold-glow-sm flex items-center justify-center select-none aspect-square
              ${compact ? 'text-[11px]' : 'text-base'}
              bg-gradient-gold
            `}
          >
            {label}
          </div>
        ))}
      </div>

      {/* Grid — navy cells with gold accents */}
      <div className={`grid grid-cols-5 ${compact ? 'gap-1' : 'gap-1.5'}`}>
        {card.map((row, rowIdx) =>
          row.map((num, colIdx) => {
            const called = isCalled(num);
            const winning = isWinning(rowIdx, colIdx);
            const isFree = num === 0;

            return (
              <button
                key={`${rowIdx}-${colIdx}`}
                onClick={() => interactive && onCellClick?.(rowIdx, colIdx)}
                disabled={!interactive || isFree}
                className={`
                  bingo-cell ${called || isFree ? 'marked' : ''}
                  w-full flex items-center justify-center rounded-xl font-black transition-all duration-150 select-none aspect-square relative overflow-visible
                  ${compact ? 'text-[11.5px]' : 'text-base'}
                  ${called
                    ? isFree
                      ? 'bg-[#283782] text-gold border-b-[3.5px] border-[#1e2d6e] shadow-gold-glow-sm'
                      : 'bg-[#283782] text-gold border-b-[3.5px] border-[#1e2d6e] shadow-gold-glow-sm'
                    : 'bg-[#1a2a5c] text-white/90 border border-[#283782]/60 border-b-[3.5px] border-b-[#1a2050] hover:bg-[#1e2d6e] hover:border-gold-subtle active:translate-y-[1px] active:border-b-[1.5px] transition-colors'
                  }
                  ${winning ? 'ring-2 ring-gold shadow-gold-glow scale-[1.04] animate-bounce z-10' : ''}
                  ${isFree ? 'bg-[#283782] text-gold border-b-[3.5px] border-[#1e2d6e] shadow-gold-glow-sm' : ''}
                  ${interactive && !called && !isFree ? 'cursor-pointer' : ''}
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
