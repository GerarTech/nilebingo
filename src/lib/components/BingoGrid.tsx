'use client';

import { useState, useEffect, useRef } from 'react';
import { COLUMN_LABELS } from '../types';

interface BingoGridProps {
  card: number[][];
  drawnNumbers: number[];
  winningCells?: boolean[][];
  interactive?: boolean;
  onCellClick?: (row: number, col: number) => void;
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
  // card is 5 rows x 5 cols
  const isCalled = (num: number) => num === 0 || drawnNumbers.includes(num);
  const isWinning = (row: number, col: number) => winningCells?.[row]?.[col] ?? false;

  return (
    <div className={`w-full mx-auto ${compact ? 'max-w-[280px]' : 'max-w-sm'} transition-transform duration-300`}>
      {/* Column headers with specific background colors from screenshot */}
      <div className={`grid grid-cols-5 gap-1.5 px-0.5 ${compact ? 'mb-1.5' : 'mb-2.5'}`}>
        {COLUMN_LABELS.map((label, idx) => (
          <div
            key={label}
            className={`
              text-center font-black rounded-xl text-white shadow-md flex items-center justify-center select-none aspect-square
              ${compact ? 'text-[11px]' : 'text-base'}
              ${
                idx === 0 ? 'bg-[#5c4df0] shadow-[#5c4df0]/20' :
                idx === 1 ? 'bg-[#2563eb] shadow-[#2563eb]/20' :
                idx === 2 ? 'bg-[#db2777] shadow-[#db2777]/20' :
                idx === 3 ? 'bg-[#10b981] shadow-[#10b981]/20' :
                'bg-[#f97316] shadow-[#f97316]/20'
              }
            `}
          >
            {label}
          </div>
        ))}
      </div>

      {/* Grid - 5 rows x 5 cols with Tactile 3D Coupon cells */}
      <div className={`grid grid-cols-5 ${compact ? 'gap-1' : 'gap-1.5'}`}>
        {card.map((row, rowIdx) =>
          row.map((num, colIdx) => {
            const called = isCalled(num);
            const winning = isWinning(rowIdx, colIdx);
            const isFree = num === 0;

            // Deterministic selection of aesthetic green or orange for called numbers to mimic uploaded screenshot
            const isGreenStyle = (rowIdx + colIdx) % 2 === 0;

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
                    ? isGreenStyle
                      ? 'bg-[#10b981] text-white border-b-[3.5px] border-[#047857] shadow-md shadow-[#10b981]/20'
                      : 'bg-[#ff5a00] text-white border-b-[3.5px] border-[#d94600] shadow-md shadow-[#ff5a00]/20'
                    : 'bg-[#f8fafc] text-[#0f172a] border border-[#cbd5e1] border-b-[3.5px] border-b-[#cbd5e1] hover:bg-[#f1f5f9] hover:border-b-[#b8c5d6] active:translate-y-[1px] active:border-b-[1.5px]'
                  }
                  ${winning ? 'ring-3 ring-amber-400 scale-[1.04] animate-bounce shadow-xl shadow-amber-400/20 z-10' : ''}
                  ${isFree ? 'bg-[#10b981] text-white border-b-[3.5px] border-[#047857] shadow-lg shadow-[#10b981]/20' : ''}
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