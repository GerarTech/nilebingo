'use client';

import BingoGrid from './BingoGrid';
import { getSeededCard } from '../server/bingo';
import { Play } from 'lucide-react';

interface Room {
  id: string;
  name: string;
  entry: number;
  players: number;
  maxPlayers: number;
  winAmount: number;
  status: 'playing' | 'starting_soon';
  countdown: number;
}

interface RoomLobbyProps {
  room: Room;
  gameId: string;
  selectedCards: number[];
  takenCards: number[];
  lobbyPlayerCount: number;
  reservedCardCount: number;
  previewCard: number[][];
  isRegistered: boolean;
  walletBalance: number;
  wallet?: { main_balance: number; play_balance: number } | null;
  t: (key: string) => string;
  gameActive: boolean;
  onBack: () => void;
  onToggleCard: (num: number) => void;
  onPlay: () => void;
  onUnregister: () => void;
  onDeposit: () => void;
  commissionRate: number;
}

export default function RoomLobby({
  room, gameId, selectedCards, takenCards, lobbyPlayerCount, reservedCardCount,
  previewCard, isRegistered, walletBalance, wallet, t,
  gameActive,
  onBack, onToggleCard, onPlay, onUnregister, onDeposit,
  commissionRate,
}: RoomLobbyProps) {
  const cards = Array.from({ length: 200 }, (_, i) => i + 1);
  const fee = room.entry;
  const totalBalance = (wallet?.main_balance || 0) + (wallet?.play_balance || 0);
  const isBalanceEligible = selectedCards.length > 0 && totalBalance >= fee * selectedCards.length;

  // ===== GAME IN PROGRESS WAIT SCREEN =====
  if (gameActive && !isRegistered) {
    return (
      <div className="px-4 pt-4 animate-fade-in pb-24 font-sans bg-[#0c1322] min-h-screen text-white">
        <div className="flex items-center justify-between mb-4 border-b border-[#233c66]/30 pb-3">
          <button onClick={onBack}
            className="flex items-center gap-1.5 text-xs text-gray-300 hover:text-white bg-[#141f33] px-3 py-1.5 rounded-xl border border-[#233c66]/40 font-bold transition-all cursor-pointer">
            ⬅ Back
          </button>
          <div className="text-center">
            <div className="text-sm font-extrabold text-gold uppercase tracking-wider flex items-center gap-1.5 justify-center">
              <span>🎴</span> GAME ID: {gameId}
            </div>
          </div>
        </div>

        <div className="relative bg-gradient-to-b from-[#1c0d02] to-[#0c0500] border border-[#ff5a00]/30 p-8 rounded-3xl shadow-xl shadow-black/40 overflow-hidden text-center">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,90,0,0.04)_0%,transparent_80%)] pointer-events-none" />
          <span className="text-[9px] text-[#ff7a22] font-black uppercase tracking-widest block mb-2 animate-pulse">⏰ GAME IN PROGRESS</span>
          <div className="flex items-baseline justify-center gap-1.5 mt-2">
            <span className="text-6xl font-extrabold tracking-tight text-[#ff5a00]">{room.countdown}</span>
            <span className="text-lg font-black text-gray-400">S</span>
          </div>
          <p className="text-[10px] text-gray-400 mt-2">Please wait for the current game to finish.</p>
        </div>

        <div className="bg-[#142036]/40 border border-[#233c66]/30 rounded-2xl p-4 mt-4 text-center">
          <div className="text-xs text-gray-400">
            Card selection will be available when the current game ends.
          </div>
        </div>
      </div>
    );
  }

  // ===== REGISTERED WAIT SCREEN =====
  if (isRegistered) {
    const totalCards = Math.max(reservedCardCount, selectedCards.length, 1);
    const prizePool = fee * totalCards * (1 - commissionRate / 100);

    return (
      <div className="px-4 pt-4 animate-fade-in pb-24 font-sans bg-[#0c1322] min-h-screen text-white">
        <div className="space-y-4 animate-fade-in">
          <div className="relative bg-gradient-to-b from-[#1c0d02] to-[#0c0500] border border-[#ff5a00]/30 p-5 rounded-3xl shadow-xl shadow-black/40 overflow-hidden text-center">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,90,0,0.04)_0%,transparent_80%)] pointer-events-none" />
            <span className="text-[9px] text-[#ff7a22] font-black uppercase tracking-widest block mb-2 animate-pulse">⏰ LOBBY OPEN</span>
            <div className="flex items-baseline justify-center gap-1.5 mt-2">
              <span className="text-6xl font-extrabold tracking-tight text-[#2ecc71]">{room.countdown}</span>
              <span className="text-lg font-black text-gray-400">S</span>
            </div>
            <p className="text-[10px] text-gray-400 mt-2">Card selection in progress. Game starts shortly.</p>
          </div>

          {/* Prize Showcase */}
          <div className="relative bg-gradient-to-br from-[#0f2a1a] via-[#0a1f14] to-[#06120b] border border-[#2ecc71]/25 rounded-3xl p-5 shadow-xl shadow-black/30 overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(46,204,113,0.05)_0%,transparent_70%)] pointer-events-none" />
            <div className="absolute top-0 right-0 text-[60px] opacity-[0.04] select-none leading-none">🏆</div>

            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#2ecc71] to-[#1a9c54] flex items-center justify-center shadow-lg shadow-[#2ecc71]/20">
                <span className="text-xs">🏆</span>
              </div>
              <span className="text-[10px] text-[#2ecc71] font-black uppercase tracking-widest">Prize Pool</span>
              <span className="ml-auto text-[9px] text-gray-500 font-bold">🆔 {gameId}</span>
            </div>

            <div className="text-center mb-4">
              <div className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#FEE800] via-[#FFD700] to-[#FEE800] drop-shadow-lg">
                {prizePool.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {t('birr')}
              </div>
              <div className="text-[9px] text-gray-500 mt-0.5">estimated prize for winner</div>
            </div>

            <div className="text-center">
              <div className="inline-block bg-white/[0.03] border border-white/[0.06] rounded-xl px-6 py-2.5 text-center">
                <div className="text-[8px] text-gray-500 uppercase font-bold tracking-wider">Stake</div>
                <div className="text-xs font-extrabold text-white mt-1">{Number(fee * selectedCards.length).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {t('birr')}</div>
              </div>
            </div>
          </div>

          <div className="bg-[#142036]/40 border border-[#233c66]/30 rounded-2xl p-4 shadow-xl">
            <div className="text-[10px] text-amber-400 font-black uppercase tracking-widest mb-3 text-center">🎴 YOUR CARDS</div>
            <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
              {selectedCards.map((cardNum) => (
                <div key={cardNum} className="bg-gradient-to-b from-[#142036] to-[#0e1726] rounded-xl p-3 border border-[#233c66]/55 shadow-md">
                  <div className="text-[10px] font-black tracking-wider text-amber-400 text-center mb-2">CARD #{cardNum}</div>
                  <BingoGrid card={getSeededCard(cardNum)} drawnNumbers={[]} compact={true} />
                </div>
              ))}
            </div>
          </div>

          <button onClick={onUnregister}
            className="w-full bg-red-500/10 border border-red-500/20 text-red-400 font-black py-4 rounded-xl text-xs hover:bg-red-500/20 active:scale-[0.99] transition-all uppercase tracking-wider cursor-pointer shadow-md">
            ❌ Cancel & Refund {Number(fee * selectedCards.length).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {t('birr')}
          </button>
        </div>
      </div>
    );
  }

  // ===== CARD SELECTION =====
  return (
    <div className="px-4 pt-4 animate-fade-in pb-24 font-sans bg-[#0c1322] min-h-screen text-white">
      <div className="flex items-center justify-between mb-4 border-b border-[#233c66]/30 pb-3">
        <button onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-gray-300 hover:text-white bg-[#141f33] px-3 py-1.5 rounded-xl border border-[#233c66]/40 font-bold transition-all cursor-pointer">
          ⬅ Back
        </button>
        <div className="text-center">
          <div className="text-sm font-extrabold text-gold uppercase tracking-wider flex items-center gap-1.5 justify-center">
            <span>🎴</span> GAME ID: {gameId}
          </div>
        </div>
       
      </div>

      <div className="flex items-stretch gap-1.5 mb-4">
        <div className="bg-[#141f33] border border-[#233c66]/30 p-2.5 rounded-xl flex-1 text-center shadow-lg">
          <div className="text-[7.5px] text-gray-400 font-extrabold uppercase tracking-wider">WALLET</div>
          <div className="text-sm font-black text-white mt-1">{Number(totalBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {t('birr')}</div>
        </div>
        <div className="bg-[#141f33] border border-[#233c66]/30 p-2.5 rounded-xl flex-1 text-center shadow-lg">
          <div className="text-[7.5px] text-gray-400 font-extrabold uppercase tracking-wider">PRIZE</div>
          <div className="text-sm font-black text-gold mt-1">
            {(() => {
              const totalCards = Math.max(reservedCardCount, selectedCards.length, 1);
              return `${(fee * totalCards * (1 - commissionRate / 100)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${t('birr')}`;
            })()}
          </div>
        </div>
        <div className="bg-[#141f33] border border-[#233c66]/30 p-2.5 rounded-xl flex-1 text-center shadow-lg">
          <div className="text-[7.5px] text-gray-400 font-extrabold uppercase tracking-wider">STAKE</div>
          <div className="text-sm font-black text-amber-400 mt-1">{Number(fee * selectedCards.length).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {t('birr')}</div>
        </div>
        <div className="bg-gradient-to-br from-[#ff5a00] to-amber-600 rounded-xl px-2.5 flex flex-col items-center justify-center font-black text-center shadow-lg shadow-[#ff5a00]/20 w-14 border border-white/10 select-none h-12 self-center shrink-0">
          <span className="text-[7px] text-white/80 uppercase font-bold tracking-tight">WAIT</span>
          <span className="text-base text-white font-black leading-none mt-0.5">{room.countdown}S</span>
        </div>
      </div>

      <div className="flex items-center justify-between mb-2.5 px-0.5 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          <span className="font-bold text-gray-300 text-[11px] uppercase tracking-wider">MY CARDS</span>
        </div>
        <div className="text-xs font-black text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-md">
          Selected: {selectedCards.length}/2
        </div>
      </div>

      <div className="rounded-2xl bg-[#0a1120] border border-[#1e2f4d]/60 p-2.5 text-center relative overflow-hidden mb-4 shadow-xl shadow-black/30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(35,60,102,0.06)_0%,transparent_75%)] pointer-events-none" />
        <div className="grid grid-cols-10 gap-[5px] sm:gap-1.5 max-h-[35vh] overflow-y-auto pb-1 relative z-10 scrollbar-none">
          {cards.map((num) => {
            const isSelected = selectedCards.includes(num);
            const isTaken = takenCards.includes(num);
            return (
              <button key={num} onClick={() => { if (!isTaken) onToggleCard(num); }} disabled={isTaken || isRegistered}
                className={`aspect-square w-full rounded-lg sm:rounded-xl flex items-center justify-center text-[10px] sm:text-[11.5px] font-black transition-all border select-none ${
                  isSelected
                    ? 'bg-gradient-to-b from-[#ff5a00] to-[#e04f00] border-[#ff7a22]/30 border-b-[3.5px] border-b-[#9e3800] text-white shadow-lg shadow-[#ff5a00]/25 font-black scale-[1.04] z-10'
                    : isTaken
                      ? 'bg-[#0e1624]/40 text-[#253248] border-[#182335]/30 border-dashed cursor-not-allowed opacity-35 text-[8.5px] sm:text-[9.5px]'
                      : 'bg-[#131f36] border-[#1e2f4d] border-b-[3px] border-b-[#1e2f4d] text-white hover:bg-[#1a2b4b] active:translate-y-[1px] active:border-b-[1.5px] cursor-pointer'
                }`}>
                {num}
              </button>
            );
          })}
        </div>
      </div>

      {selectedCards.length > 0 && (
        <div className="mb-4 bg-[#142036]/60 border border-[#233c66]/40 rounded-2xl p-3 shadow-xl">
          <div className="text-[10px] text-amber-400 font-extrabold uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <span>👁</span> Card Preview
          </div>
          <div className="grid grid-cols-2 gap-3">
            {selectedCards.map((cardNum, cIndex) => (
              <div key={cardNum} className="bg-gradient-to-b from-[#142036]/80 to-[#0e1726]/65 rounded-xl p-2.5 border border-[#233c66]/30 shadow-md">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] font-black tracking-wider text-[#8da0c4]">CARD #{cardNum}</span>
                  <span className="text-[7.5px] font-black text-amber-400 bg-amber-400/10 px-1 rounded uppercase">Selected</span>
                </div>
                <BingoGrid card={getSeededCard(cardNum)} drawnNumbers={[]} compact={true} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2.5">
        {selectedCards.length > 0 && !isBalanceEligible && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-300 text-[11px] py-2 px-3 rounded-xl font-medium flex items-center justify-between font-sans shadow-md animate-fade-in">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-ping" />
              Need {Number(fee * selectedCards.length).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {t('birr')}
            </span>
            <button onClick={onDeposit} className="bg-amber-500 text-white text-[9.5px] font-extrabold px-3 py-1 rounded bg-[#ff5a00] hover:opacity-90 shadow-sm">
              Deposit
            </button>
          </div>
        )}
        <div className="flex gap-2.5">
          {selectedCards.length > 0 && isBalanceEligible ? (
            <button onClick={onPlay}
              className="flex-1 bg-gradient-to-r from-[#FEE800] to-amber-500 text-navy font-black py-3.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-gold/20 hover:scale-[1.01] active:scale-[0.99] transition-all uppercase tracking-widest cursor-pointer">
              <Play size={10} fill="currentColor" /> Play {selectedCards.length} Cards ({Number(fee * selectedCards.length).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {t('birr')})
            </button>
          ) : (
            <button disabled
              className="flex-1 bg-gray-500/10 border border-white/5 text-gray-500 font-extrabold py-3.5 rounded-xl text-xs transition-all uppercase tracking-widest cursor-not-allowed text-center">
              {selectedCards.length === 0 ? `SELECT A CARD (${fee} ${t('birr')})` : 'SELECT A CARD'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}