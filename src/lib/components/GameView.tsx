'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import BingoGrid from './BingoGrid';
import RollingCounter from './RollingCounter';
import { getColumnLabel, getWinningCells, checkWin } from '../server/bingo';
import WinModal from './WinModal';
import LossModal from './LossModal';
import LeaveModal from './LeaveModal';
import { Play } from 'lucide-react';
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
  winningCard: number[][];
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
  winningCard, winningCells, commissionRate, prizePool, resultCountdown,
  t, onSetAutoMark, onSetAutoWin, onManualDraw,
  onBingo, onLeave, onLeaveAttempt, onForfeitExit, onCancelLeave,
  onSkipResult, onMarkNumber,
}: GameViewProps) {
  // When autoMark is ON, the grid shows all drawn numbers (auto-marked).
  // When autoMark is OFF, the grid only shows numbers the user has manually marked.
  const markedNumbers = autoMark ? drawnNumbers : userMarkedNumbers;
  const isBingoReady = inGame && playerCards.some(c => checkWin(c, markedNumbers));

  return (
    <>
      <div className="px-3 pt-2 animate-fade-in pb-20">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 bg-gradient-to-r from-[#0a1628] to-[#0d1f36] p-3.5 rounded-2xl border border-gold/20 font-sans shadow-lg">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-gold"></span>
            </span>
            <div className="flex flex-col">
              <span className="text-[12px] font-black uppercase tracking-wider text-gold">LIVE GAME</span>
              <span className="text-[8px] font-bold uppercase tracking-widest text-gray-400">Game #{gameId.substring(0, 6)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-[10px] text-gray-300 bg-gold/10 border border-gold/30 px-3 py-1.5 rounded-lg">
              STAKE: <span className="text-gold font-black">{selectedStake} ETB</span>
            </div>
          </div>
        </div>

        {/* Top Bar Stats */}
        <div className="grid grid-cols-3 gap-1.5 mb-3 font-sans">
          {[
            { label: t('game_id'), value: `#${gameId.substring(0, 5)}` },
            { label: 'Bet', value: `${selectedStake} ETB` },
            { label: t('prize'), value: <span className="text-gold"><RollingCounter value={prizePool} suffix=" ETB" /></span> },
          ].map((stat, i) => (
            <div key={i} className="glass rounded-xl p-2.5 text-center flex flex-col justify-center border border-white/5 bg-navy-card/45 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-[1.5px] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
              <span className="text-[8.5px] text-gray-400 font-bold uppercase tracking-wider">{stat.label}</span>
              <span className={`text-[12px] font-black mt-0.5 truncate ${i === 3 ? 'text-gold' : 'text-white'}`}>{stat.value}</span>
            </div>
          ))}
        </div>

        {/* Active Ball Display */}
        <div className="relative mb-4 bg-gradient-to-b from-[#082414] to-[#04160c] border border-emerald-500/25 p-4 rounded-3xl shadow-xl shadow-black/40 overflow-hidden group">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,208,0,0.03)_0%,transparent_80%)] pointer-events-none" />
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="relative w-14 h-14 rounded-full bg-black/45 border-2 border-emerald-500/20 flex items-center justify-center overflow-hidden shadow-inner">
                <div className="absolute inset-0.5 rounded-full border border-dashed border-emerald-500/10 animate-[spin_12s_linear_infinite]" />
                <div className="absolute inset-2 rounded-full border border-dotted border-gold/10 animate-[spin_6s_linear_infinite_reverse]" />
                {recentCalled.length > 0 ? (
                  <div className="relative z-10 w-11 h-11 rounded-full bg-gradient-to-br from-[#FEE800] via-[#FEE800] to-amber-500 flex flex-col items-center justify-center font-sans shadow-lg shadow-gold/25 animate-scale-up">
                    <span className="text-[8px] font-black text-navy leading-none mb-0.5 select-none">{recentCalled[0].label.charAt(0)}</span>
                    <span className="text-sm font-extrabold text-navy leading-none select-none">{recentCalled[0].num}</span>
                  </div>
                ) : (
                  <div className="text-xl animate-spin text-gold">🌀</div>
                )}
              </div>
              <div>
                <div className="text-[8.5px] text-gray-500 font-bold uppercase tracking-wider">CURRENT BALL</div>
                <div className="text-sm font-black text-white mt-0.5">
                  {recentCalled.length > 0 ? (
                    <span className="text-gold flex items-center gap-1.5 animate-pulse">
                      Ball {recentCalled[0].label}
                    </span>
                  ) : (
                    <span className="text-[#8db9a1] text-[11px] font-mono animate-pulse">WAITING...</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bingo Cards */}
        <div className="space-y-4 mb-4">
          {(playerCards.length > 0 ? playerCards : (gameCard.length > 0 ? [gameCard] : [])).map((card, cardIndex) => {
            const drawnNumsToShow = markedNumbers;
            const cardWinningCells = getWinningCells(card, drawnNumsToShow);
            return (
              <div key={cardIndex} className="relative bg-gradient-to-b from-[#0b1624] to-[#050e18] border border-[#233c66]/30 p-3.5 rounded-2xl shadow-xl shadow-black/40">
                <div className="absolute top-2 right-3 text-[9px] font-mono text-gold/80 tracking-widest font-black uppercase">
                  CARD #{selectedCards[cardIndex] || cardIndex + 1}
                </div>
                <div className="pt-4">
                  <BingoGrid
                    card={card}
                    drawnNumbers={drawnNumsToShow}
                    winningCells={cardWinningCells}
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

        {/* Recent Calls */}
        <div className="glass rounded-2xl p-3 mb-4 flex items-center justify-between gap-3 font-sans border border-white/5">
          <span className="text-[10px] text-[#8db9a1] uppercase font-bold tracking-wider">Recent Calls:</span>
          <div className="flex gap-2 overflow-x-auto py-1 flex-1 scrollbar-none">
            {recentCalled.slice(1, 10).map((item, i) => (
              <span key={i} className="flex-shrink-0 text-[10px] w-7 h-7 rounded-full flex items-center justify-center font-black bg-[#0d2a1b] border border-[#1e4831] text-gray-400">
                {item.label}
              </span>
            ))}
            {recentCalled.length <= 1 && <span className="text-[10px] text-gray-500 italic">Waiting...</span>}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3 font-sans">
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => { onSetAutoMark(!autoMark); }}
              className={`py-3 rounded-xl text-[10px] sm:text-xs font-bold border transition-all ${autoMark ? 'bg-[#10b981]/15 text-[#10b981] border-[#10b981]/30' : 'bg-black/20 border-white/5 text-gray-400'}`}>
              Mark: <span className="font-extrabold">{autoMark ? 'AUTO' : 'MAN'}</span>
            </button>
            <button onClick={() => { onSetAutoWin(!autoWin); }}
              className={`py-3 rounded-xl text-[10px] sm:text-xs font-bold border transition-all ${autoWin ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30' : 'bg-black/20 border-white/5 text-gray-400'}`}>
              Auto-Win: <span className="font-extrabold">{autoWin ? 'ON' : 'OFF'}</span>
            </button>
          </div>

          <div className="flex gap-2 relative">
            {isBingoReady && !isWatching && (
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-red-600 border border-red-400 text-white font-extrabold text-[9px] px-2.5 py-1 rounded-full animate-bounce shadow-lg shadow-red-500/50 uppercase tracking-widest pointer-events-none flex items-center gap-1.5 z-20">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping shrink-0" />🔥 READY!
              </div>
            )}
            {!isWatching && (
              <button onClick={onBingo} disabled={opponentWinner !== null}
                className={`flex-1 font-black py-4 rounded-xl text-sm transition-all tracking-wider uppercase relative overflow-hidden select-none cursor-pointer ${
                  isBingoReady
                    ? 'bg-gradient-to-r from-red-600 via-amber-500 to-red-600 text-white shadow-xl shadow-red-500/40 scale-[1.01] border border-red-400 animate-pulse'
                    : 'bg-[#FEE800] text-navy hover:opacity-95 shadow-md shadow-gold/15 transition-transform hover:scale-[1.01] active:translate-y-0.5'
                }`}>
                🚀 {isBingoReady ? '🔥 CLAIM BINGO! 🔥' : 'CLAIM BINGO!'}
              </button>
            )}
            <button onClick={onLeaveAttempt}
              className={`${isWatching ? 'w-full py-4' : 'px-6 py-4'} bg-red-500/10 border border-red-500/20 text-red-300 font-extrabold rounded-xl text-xs hover:bg-red-500/20 transition-all uppercase`}>
              {isWatching ? 'Exit' : t('leave')}
            </button>
          </div>
        </div>
      </div>

      <WinModal
        show={showWinModal}
        stake={selectedStake}
        livePlayerCount={livePlayerCount}
        commissionRate={commissionRate}
        prizePool={prizePool}
        card={winningCard}
        drawnNumbers={drawnNumbers}
        winningCells={winningCells}
        cardNumber={selectedCards[0] || 0}
        playerName={profile?.first_name || profile?.username || 'You'}
        countdown={resultCountdown}
        onSkip={onSkipResult}
        t={t}
      />

      <LossModal
        show={showLossModal || !!opponentWinner}
        opponentName={opponentWinner || 'Opponent'}
        stake={selectedStake}
        livePlayerCount={livePlayerCount}
        commissionRate={commissionRate}
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