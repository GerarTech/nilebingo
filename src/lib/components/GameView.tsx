'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import BingoGrid from './BingoGrid';
import RollingCounter from './RollingCounter';
import { getColumnLabel, getWinningCells, checkWin, getNumbersAwayFromWin } from '../server/bingo';
import WinModal from './WinModal';
import LossModal from './LossModal';
import LeaveModal from './LeaveModal';
import { Play, Volume2, VolumeX } from 'lucide-react';
import { useBingoAudio } from '@/lib/hooks/useBingoAudio';
import type { Profile } from '../types';

interface GameViewProps {
  profile: Profile | null;
  gameCard: number[][];
  playerCards: number[][][];
  selectedCards: number[];
  drawnNumbers: number[];
  gameId: string;
  selectedStake: number;
  inGame: boolean;
  isWatching: boolean;
  autoMark: boolean;
  autoWin: boolean;
  userMarkedNumbers: number[];
  language: 'en' | 'am';
  livePlayerCount: number;
  recentCalled: { num: number; label: string }[];
  opponentWinner: string | null;
  showWinModal: boolean;
  showLossModal: boolean;
  showLeaveModal: boolean;
  winningCards: number[][][];
  allWinners: any[];
  isPendingWin: boolean;
  winMessage: string;
  finalWinAmount: number;
  totalWinAmount: number;
  winnerCount: number;
  winningCells: boolean[][];
  commissionRate: number;
  prizePool: number;
  resultCountdown: number | null;
  t: (key: string) => string;
  onSetAutoMark: (v: boolean) => void;
  onSetAutoWin: (v: boolean) => void;
  onManualDraw: () => void;
  onBingo: () => void;
  onLeave: () => void;
  onLeaveAttempt: () => void;
  onForfeitExit: () => void;
  onCancelLeave: () => void;
  onSkipResult: () => void;
  onMarkNumber: (num: number) => void;
}

export default function GameView({
  profile, gameCard, playerCards, selectedCards, drawnNumbers,
  gameId, selectedStake, inGame, isWatching, autoMark, autoWin, userMarkedNumbers,
  language, livePlayerCount, recentCalled, opponentWinner, showWinModal, showLossModal, showLeaveModal,
  winningCards, allWinners, isPendingWin, winMessage, finalWinAmount, totalWinAmount, winnerCount,
  winningCells, commissionRate, prizePool, resultCountdown,
  t, onSetAutoMark, onSetAutoWin, onManualDraw,
  onBingo, onLeave, onLeaveAttempt, onForfeitExit, onCancelLeave,
  onSkipResult, onMarkNumber,
}: GameViewProps) {
  const { soundEnabled, toggleSound, enqueue, playBingo } = useBingoAudio(language);

  useEffect(() => {
    if (recentCalled.length > 0) {
      console.log('[GameView] enqueue ball:', recentCalled[0].num);
      enqueue(recentCalled[0].num);
    }
  }, [recentCalled.length > 0 ? recentCalled[0].num : null, enqueue]);

  useEffect(() => {
    if (showWinModal) playBingo();
  }, [showWinModal, playBingo]);

  // When autoMark is ON, the grid shows all drawn numbers (auto-marked).
  // When autoMark is OFF, the grid only shows numbers the user has manually marked.
  const markedNumbers = autoMark ? drawnNumbers : userMarkedNumbers;

  return (
    <>
      <div className="px-3 pt-2 animate-fade-in pb-20">
        {/* Header - Compact */}
        <div className="flex items-center justify-between mb-3 bg-gradient-to-r from-[#0a1628] to-[#0d1f36] p-2.5 rounded-xl border border-gold/20 font-sans shadow-lg">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-gold"></span>
            </span>
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-wider text-gold">LIVE GAME</span>
              <span className="text-[7px] font-bold uppercase tracking-widest text-gray-400">#{gameId.substring(0, 6)}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={toggleSound} className="text-[9px] text-gray-400 hover:text-gold transition-colors p-1 rounded-lg hover:bg-gold/10" title={soundEnabled ? 'Mute' : 'Unmute'}>
              {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
            </button>
            <div className="text-[9px] text-gray-300 bg-gold/10 border border-gold/30 px-2 py-1 rounded-lg">
              <span className="text-gold font-black">{selectedStake} ETB</span>
            </div>
          </div>
        </div>

        {/* Top Bar Stats - Compact */}
        <div className="grid grid-cols-3 gap-1 mb-2 font-sans">
          {[
            { label: t('game_id'), value: `#${gameId.substring(0, 5)}` },
            { label: 'Bet', value: `${selectedStake} ETB` },
            { label: t('prize'), value: <span className="text-gold"><RollingCounter value={prizePool} suffix=" ETB" /></span> },
          ].map((stat, i) => (
            <div key={i} className="glass rounded-lg p-1.5 text-center flex flex-col justify-center border border-gold-subtle bg-navy-card/45 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
              <span className="text-[7px] text-gray-400 font-bold uppercase tracking-wider">{stat.label}</span>
              <span className={`text-[10px] font-black mt-0.5 truncate ${i === 3 ? 'text-gold' : 'text-white'}`}>{stat.value}</span>
            </div>
          ))}
        </div>

        {/* Active Ball Display - Compact */}
        <div className="relative mb-3 bg-gradient-to-b from-[#082414] to-[#04160c] border border-emerald-500/25 p-3 rounded-2xl shadow-xl shadow-black/40 overflow-hidden group">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,208,0,0.03)_0%,transparent_80%)] pointer-events-none" />
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 rounded-full bg-black/45 border-2 border-emerald-500/20 flex items-center justify-center overflow-hidden shadow-inner">
                <div className="absolute inset-0.5 rounded-full border border-dashed border-emerald-500/10 animate-[spin_12s_linear_infinite]" />
                <div className="absolute inset-2 rounded-full border border-dotted border-gold/10 animate-[spin_6s_linear_infinite_reverse]" />
                {recentCalled.length > 0 ? (
                  <div className="relative z-10 w-9 h-9 rounded-full bg-gradient-to-br from-[#FEE800] via-[#FEE800] to-amber-500 flex flex-col items-center justify-center font-sans shadow-lg shadow-gold/25 animate-scale-up">
                    <span className="text-[7px] font-black text-navy leading-none mb-0.5 select-none">{recentCalled[0].label.charAt(0)}</span>
                    <span className="text-xs font-extrabold text-navy leading-none select-none">{recentCalled[0].num}</span>
                  </div>
                ) : (
                  <div className="text-lg animate-spin text-gold">🌀</div>
                )}
              </div>
              <div>
                <div className="text-[8px] text-gray-500 font-bold uppercase tracking-wider">CURRENT BALL</div>
                <div className="text-xs font-black text-white mt-0.5">
                  {recentCalled.length > 0 ? (
                    <span className="text-gold flex items-center gap-1.5 animate-pulse">
                      Ball {recentCalled[0].label}
                    </span>
                  ) : (
                    <span className="text-[#8db9a1] text-[10px] font-mono animate-pulse">WAITING...</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Calls - Compact */}
        <div className="glass rounded-xl p-2 mb-3 flex items-center justify-between gap-2 font-sans border border-gold-subtle">
          <span className="text-[9px] text-[#8db9a1] uppercase font-bold tracking-wider">Recent:</span>
          <div className="flex gap-1.5 overflow-x-auto py-1 flex-1 scrollbar-none">
            {recentCalled.slice(1, 10).map((item, i) => (
              <span key={i} className="flex-shrink-0 text-[9px] w-6 h-6 rounded-full flex items-center justify-center font-black bg-[#0d2a1b] border border-[#1e4831] text-gray-400">
                {item.label}
              </span>
            ))}
            {recentCalled.length <= 1 && <span className="text-[9px] text-gray-500 italic">Waiting...</span>}
          </div>
        </div>

        {/* Bingo Cards - Side by side layout */}
        <div className={`mb-3 ${(playerCards.length > 1 || (playerCards.length === 0 && gameCard.length > 1)) ? 'flex gap-2' : ''}`}>
          {(playerCards.length > 0 ? playerCards : (gameCard.length > 0 ? [gameCard] : [])).map((card, cardIndex, arr) => {
            const drawnNumsToShow = markedNumbers;
            const cardWinningCells = getWinningCells(card, drawnNumsToShow);
            const isMulti = arr.length > 1;
            return (
              <div key={cardIndex} className={`relative bg-gradient-to-b from-[#0b1624] to-[#050e18] border border-gold-subtle p-2 rounded-xl shadow-xl shadow-black/40 gold-border-hover transition-all ${isMulti ? 'flex-1 min-w-0' : ''}`}>
                <div className="absolute top-1.5 right-2 text-[8px] font-mono text-gold/80 tracking-widest font-black uppercase z-10">
                  CARD #{selectedCards[cardIndex] || cardIndex + 1}
                </div>
                <div className={`${isMulti ? 'pt-3' : 'pt-3'}`}>
                  <BingoGrid
                    card={card}
                    drawnNumbers={drawnNumsToShow}
                    winningCells={cardWinningCells}
                    compact={true}
                    mini={isMulti}
                    interactive={!autoMark}
                    onCellClick={(row, col) => {
                      if (autoMark) return;
                      const num = card[row][col];
                      if (num === 0) return;
                      if (drawnNumbers.includes(num)) {
                        onMarkNumber(num);
                      }
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>


        {/* Actions - Compact */}
        <div className="space-y-2 font-sans">
          <div className="grid grid-cols-2 gap-1.5">
            <button onClick={() => { onSetAutoMark(!autoMark); }}
              className={`py-2.5 rounded-lg text-[9px] sm:text-[10px] font-bold border transition-all ${autoMark ? 'bg-[#10b981]/15 text-[#10b981] border-[#10b981]/30' : 'bg-black/20 border-gold-subtle text-gray-400'}`}>
              Mark: <span className="font-extrabold">{autoMark ? 'AUTO' : 'MAN'}</span>
            </button>
            <button onClick={() => { onSetAutoWin(!autoWin); }}
              className={`py-2.5 rounded-lg text-[9px] sm:text-[10px] font-bold border transition-all ${autoWin ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30' : 'bg-black/20 border-gold-subtle text-gray-400'}`}>
              Auto-Win: <span className="font-extrabold">{autoWin ? 'ON' : 'OFF'}</span>
            </button>
          </div>

          <div className="flex gap-1.5">
            {!isWatching && (
              <button onClick={onBingo} disabled={opponentWinner !== null}
                className="flex-1 font-black py-3 rounded-lg text-xs transition-all tracking-wider uppercase relative overflow-hidden select-none cursor-pointer bg-[#FEE800] text-navy hover:opacity-95 shadow-md shadow-gold/15 transition-transform hover:scale-[1.01] active:translate-y-0.5">
                🚀 CLAIM BINGO!
              </button>
            )}
            <button onClick={onLeaveAttempt}
              className={`${isWatching ? 'w-full py-3' : 'px-4 py-3'} bg-red-500/10 border border-red-500/20 text-red-300 font-extrabold rounded-lg text-[10px] hover:bg-red-500/20 transition-all uppercase`}>
              {isWatching ? 'Exit' : t('leave')}
            </button>
          </div>
        </div>
      </div>

      <WinModal
        show={showWinModal}
        winners={allWinners}
        winAmount={finalWinAmount}
        totalWinAmount={totalWinAmount}
        winnerCount={winnerCount}
        isPending={isPendingWin}
        message={winMessage}
        playerName={profile?.first_name || profile?.username || 'You'}
        countdown={resultCountdown}
        drawnNumbers={drawnNumbers}
        onSkip={onSkipResult}
        t={t}
      />

      <LossModal
        show={showLossModal || !!opponentWinner}
        opponentName={opponentWinner || 'Opponent'}
        stake={selectedStake}
        livePlayerCount={livePlayerCount}
        commissionRate={commissionRate}
        prizePool={prizePool}
        gameCards={playerCards.length > 0 ? playerCards : (gameCard.length > 0 ? [gameCard] : [])}
        cardNumbers={selectedCards}
        drawnNumbers={drawnNumbers}
        countdown={resultCountdown}
        onSkip={onSkipResult}
        t={t}
      />

      <LeaveModal
        show={showLeaveModal}
        stake={selectedStake}
        onResume={onCancelLeave}
        onForfeit={onForfeitExit}
        onClose={onCancelLeave}
        t={t}
      />
    </>
  );
}