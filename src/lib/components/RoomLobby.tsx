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
  previewCard: number[][];
  isRegistered: boolean;
  walletBalance: number;
  wallet?: { main_balance: number; play_balance: number } | null;
  t: (key: string) => string;
  onBack: () => void;
  onToggleCard: (num: number) => void;
  onPlay: () => void;
  onUnregister: () => void;
  onDeposit: () => void;
  commissionRate: number;
}

export default function RoomLobby({
  room, gameId, selectedCards, takenCards, lobbyPlayerCount,
  previewCard, isRegistered, walletBalance, wallet, t,
  onBack, onToggleCard, onPlay, onUnregister, onDeposit,
  commissionRate,
}: RoomLobbyProps) {
  const cards = Array.from({ length: 100 }, (_, i) => i + 1);
  const fee = room.entry;
  const totalBalance = (wallet?.main_balance || 0) + (wallet?.play_balance || 0);
  const isBalanceEligible = selectedCards.length > 0 && totalBalance >= fee * selectedCards.length;

  if (isRegistered) {
    return (
      <div className="px-4 pt-4 animate-fade-in pb-24 font-sans bg-[#0c1322] min-h-screen text-white">
        <div className="space-y-4 animate-fade-in">
          <div className="relative bg-gradient-to-b from-[#1c0d02] to-[#0c0500] border border-[#ff5a00]/30 p-5 rounded-3xl shadow-xl shadow-black/40 overflow-hidden text-center">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,90,0,0.04)_0%,transparent_80%)] pointer-events-none" />
            <span className="text-[9px] text-[#ff7a22] font-black uppercase tracking-widest block mb-2 animate-pulse">⏰ WAITING FOR GAME START</span>
            <div className="flex items-baseline justify-center gap-1.5 mt-2">
              <span className="text-4xl font-extrabold tracking-tight text-white">{room.countdown}</span>
              <span className="text-sm font-bold text-[#ff7a22] uppercase">seconds</span>
            </div>
            <p className="text-[10px] text-gray-400 mt-2">Game will start when countdown hits zero.</p>
          </div>

          <div className="bg-gradient-to-r from-[#111c30] to-[#0d1627] border border-[#ff5a00]/20 rounded-2xl p-4 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[radial-gradient(circle_at_center,rgba(254,232,0,0.05)_0%,transparent_70%)] pointer-events-none" />
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[9px] text-[#ff7a22] font-black uppercase tracking-wider flex items-center gap-1">
                  <span>🏆</span> ESTIMATED GAME PRIZE
                </div>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-black text-gold tracking-tight">
                    {Math.round(fee * (1 + (Math.max(lobbyPlayerCount, room.players) - 1) * (1 - commissionRate / 100))).toLocaleString()}
                  </span>
                  <span className="text-xs font-bold text-gray-300">{t('birr')}</span>
                </div>
                <p className="text-[9px] text-gray-400 mt-1">
                                    Commission of {commissionRate}% is deducted from the total prize pool.
                </p>
              </div>
              <div className="text-right">
                <span className="text-[8px] text-emerald-400 font-black uppercase block tracking-wider animate-pulse">● LIVE POOL</span>
                <span className="text-xs font-bold text-white mt-1 block">
                  {(Math.max(lobbyPlayerCount, room.players) * fee).toLocaleString()} ETB
                </span>
              </div>
            </div>
          </div>

          <div className="bg-[#141f33]/60 border border-[#233c66]/30 p-4 rounded-2xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[9px] text-emerald-400 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                PLAYERS IN LOBBY
              </span>
              <span className="text-[8px] text-gray-400 font-bold uppercase">{lobbyPlayerCount} registered</span>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {Array.from({ length: Math.max(lobbyPlayerCount, 1) }).map((_, i) => (
                <span key={i} className="bg-[#0c1322] border border-[#233c66]/20 text-gray-300 text-[9px] font-extrabold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm animate-pulse">
                  <span className="w-1 h-1 bg-emerald-400 rounded-full" />
                  Player {i + 1}
                </span>
              ))}
              {lobbyPlayerCount === 0 && <span className="text-[10px] text-gray-500 italic">Waiting for players...</span>}
            </div>
          </div>

          <div className="bg-[#142036]/40 border border-[#233c66]/30 rounded-2xl p-4 shadow-xl">
            <div className="text-[10px] text-amber-400 font-black uppercase tracking-widest mb-3 text-center">🎴 YOUR CARDS</div>
            <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
              {selectedCards.map((cardNum) => (
                <div key={cardNum} className="bg-gradient-to-b from-[#142036] to-[#0e1726] rounded-xl p-3 border border-[#233c66]/55 shadow-md">
                  <div className="text-[10px] font-black tracking-wider text-amber-400 text-center mb-2">CARD #{cardNum}</div>
                  <BingoGrid card={getSeededCard(cardNum, gameId)} drawnNumbers={[]} compact={true} />
                </div>
              ))}
            </div>
          </div>

          <button onClick={onUnregister}
            className="w-full bg-red-500/10 border border-red-500/20 text-red-400 font-black py-4 rounded-xl text-xs hover:bg-red-500/20 active:scale-[0.99] transition-all uppercase tracking-wider cursor-pointer shadow-md">
            ❌ Cancel & Refund {(fee * selectedCards.length).toLocaleString()} {t('birr')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 animate-fade-in pb-24 font-sans bg-[#0c1322] min-h-screen text-white">
      <div className="flex items-center justify-between mb-4 border-b border-[#233c66]/30 pb-3">
        <button onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-gray-300 hover:text-white bg-[#141f33] px-3 py-1.5 rounded-xl border border-[#233c66]/40 font-bold transition-all">
          ⬅ Back
        </button>
        <div className="text-center">
          <div className="text-sm font-extrabold text-gold uppercase tracking-wider flex items-center gap-1.5 justify-center">
            <span>🎴</span> GAME ID: {gameId}
          </div>
        </div>
        <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
          <span className="text-[8px] font-extrabold uppercase text-emerald-400">Live</span>
        </div>
      </div>

      <div className="flex items-stretch gap-1.5 mb-4">
        <div className="bg-[#141f33] border border-[#233c66]/30 p-2.5 rounded-xl flex-1 text-center shadow-lg">
          <div className="text-[7.5px] text-gray-400 font-extrabold uppercase tracking-wider">MAIN</div>
          <div className="text-sm font-black text-white mt-1">{(wallet?.main_balance || 0).toLocaleString()} {t('birr')}</div>
        </div>
        <div className="bg-[#141f33] border border-[#233c66]/30 p-2.5 rounded-xl flex-1 text-center shadow-lg">
          <div className="text-[7.5px] text-gray-400 font-extrabold uppercase tracking-wider">PLAY</div>
          <div className="text-sm font-black text-amber-400 mt-1">{(wallet?.play_balance || 0).toLocaleString()} {t('birr')}</div>
        </div>
        <div className="bg-[#141f33] border border-[#233c66]/30 p-2.5 rounded-xl flex-1 text-center shadow-lg">
          <div className="text-[7.5px] text-gray-400 font-extrabold uppercase tracking-wider">STAKE</div>
          <div className="text-sm font-black text-amber-400 mt-1">{(fee * selectedCards.length).toLocaleString()} {t('birr')}</div>
        </div>
        <div className="bg-gradient-to-br from-[#ff5a00] to-amber-600 rounded-xl px-2.5 flex flex-col items-center justify-center font-black text-center shadow-lg shadow-[#ff5a00]/20 w-14 border border-white/10 select-none h-12 self-center shrink-0">
          <span className="text-[7px] text-white/80 uppercase font-bold tracking-tight">WAIT</span>
          <span className="text-base text-white font-black leading-none mt-0.5">{room.countdown}S</span>
        </div>
      </div>

      {/* 🏆 PRIZE & PLAYERS */}
      <div className="flex items-stretch gap-1.5 mb-4">
        <div className="bg-[#141f33] border border-[#233c66]/30 p-2.5 rounded-xl flex-1 text-center shadow-lg">
          <div className="text-[7.5px] text-gray-400 font-extrabold uppercase tracking-wider">PRIZE</div>
          <div className="text-sm font-black text-gold mt-1">
                        {Math.round(fee * Math.max(lobbyPlayerCount, room.players) * (1 - commissionRate / 100)).toLocaleString()} {t('birr')}
          </div>
        </div>
        <div className="bg-[#141f33] border border-[#233c66]/30 p-2.5 rounded-xl flex-1 text-center shadow-lg">
          <div className="text-[7.5px] text-gray-400 font-extrabold uppercase tracking-wider">PLAYERS</div>
          <div className="text-sm font-black text-emerald-400 mt-1">{lobbyPlayerCount || room.players}</div>
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
              <button key={num} onClick={() => { if (!isTaken) onToggleCard(num); }} disabled={isTaken}
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
        <div className="mb-4 bg-[#142036]/60 border border-[#233c66]/40 rounded-2xl p-3 animate-fade-in shadow-xl">
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
                <BingoGrid card={getSeededCard(cardNum, gameId)} drawnNumbers={[]} compact={true} />
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
              Need {(fee * selectedCards.length).toLocaleString()} {t('birr')}
            </span>
            <button onClick={onDeposit} className="bg-amber-500 text-white text-[9.5px] font-extrabold px-3 py-1 rounded bg-[#ff5a00] hover:opacity-90 shadow-sm">
              Deposit
            </button>
          </div>
        )}
        <div className="flex gap-2.5">
          {selectedCards.length > 0 && isBalanceEligible ? (
            <button onClick={onPlay}
              className="flex-1 bg-gradient-to-r from-[#FEE800] to-amber-500 text-navy font-black py-3.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-gold/20 hover:scale-[1.01] active:scale-[0.99] transition-all uppercase tracking-widest animate-pulse cursor-pointer">
              <Play size={10} fill="currentColor" /> Play {selectedCards.length} Cards ({(fee * selectedCards.length).toLocaleString()} {t('birr')})
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
