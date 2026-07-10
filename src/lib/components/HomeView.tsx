'use client';

import { Info, Play } from 'lucide-react';
import type { Wallet } from '../types';

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

interface HomeViewProps {
  rooms: Room[];
  selectedStake: number | null;
  wallet: Wallet | null;
  appName: string;
  appLogo: string;
  appLogoPng: string | null;
  commissionRate: number;
  themeColor: string;
  themeColorDark: string;
  t: (key: string) => string;
  onSelectStake: (amount: number) => void;
  onPlay: () => void;
  onShowRules: () => void;
  onGoToWallet: () => void;
}

export default function HomeView({
  rooms, selectedStake, wallet, appName, appLogo, appLogoPng, commissionRate,
  themeColor, themeColorDark, t, onSelectStake, onPlay, onShowRules, onGoToWallet,
}: HomeViewProps) {
  const walletBalance = (wallet?.main_balance || 0) + (wallet?.play_balance || 0);
  const bronzeRoom = rooms.find(r => r.id === 'bronze') || rooms[0];
  const silverRoom = rooms.find(r => r.id === 'silver') || rooms[1];
  const goldRoom = rooms.find(r => r.id === 'gold') || rooms[2];
  const diamondRoom = rooms.find(r => r.id === 'diamond');

  return (
    <div className="px-4 pt-4 animate-fade-in pb-20 font-sans text-white bg-[#050e1e] min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 border-[#233c66]/30 pb-3 border-b">
        <div className="font-sans">
          <span className="text-[10px] uppercase font-black tracking-widest text-gray-400 block">WELCOME TO</span>
          <span className="text-2xl font-black tracking-tight uppercase flex items-center gap-1.5 mt-0.5 animate-pulse" style={{ color: themeColor }}>
            {appLogoPng ? <img src={appLogoPng} alt="Logo" className="h-7 w-7 object-contain inline-block" /> : appLogo} {appName}
          </span>
        </div>
        <button onClick={onGoToWallet} className="flex items-center gap-1 font-extrabold text-[11px] px-3.5 py-2 rounded-xl shadow-md transition-all cursor-pointer whitespace-nowrap" style={{ color: themeColor, backgroundColor: themeColorDark, boxShadow: `0 4px 14px ${themeColor}44` }}>
          💰 {Number(walletBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
        </button>
      </div>

      <div className="mb-4">
        <div className="text-center">
          <h2 className="text-[12.5px] font-black tracking-widest uppercase text-gray-300">{t('choose_stake')}</h2>
          <span className="w-16 h-1 bg-gradient-to-r from-transparent via-[#ff5a00] to-transparent mt-1.5 rounded-full block mx-auto" />
        </div>
      </div>

      {/* Stake Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6 relative z-10">
        {[bronzeRoom, silverRoom, goldRoom].map((room) => {
          const isSelected = selectedStake === room.entry;
          return (
            <button
              key={room.id}
              onClick={() => onSelectStake(room.entry)}
              className={`relative rounded-2xl py-5 px-3 border transition-all text-center flex flex-col items-center justify-center cursor-pointer select-none ${
                isSelected
                  ? 'border-[#233c66] scale-[1.04]'
                  : 'bg-[#141f33]/70 border-[#233c66]/40 hover:border-white/20'
              }`}
              style={isSelected ? { background: `linear-gradient(to bottom, ${themeColor}22, ${themeColorDark}33)`, boxShadow: `0 8px 24px ${themeColor}22` } : undefined}
            >
              {room.name && (
                <span className="text-[9px] font-black uppercase tracking-widest text-gray-300 block mb-1">{room.name}</span>
              )}
              {room.status === 'playing' && room.countdown > 0 ? (
                <span className="absolute -top-1.5 -right-1.5 text-white text-[7px] font-black px-1.5 py-0.5 rounded-full shadow-md select-none uppercase tracking-tighter bg-red-500 shadow-red-500/40 animate-pulse">
                  PLAYING
                </span>
              ) : (
                <span className="absolute -top-1.5 -right-1.5 text-navy text-[7.5px] font-black px-1.5 py-0.5 rounded-full shadow-md select-none uppercase tracking-tighter" style={{ backgroundColor: themeColor, boxShadow: `0 2px 8px ${themeColor}55` }}>
                  {room.countdown}S
                </span>
              )}
              <span className="text-xl font-black text-white block">{room.entry}</span>
              <span className="text-[10px] text-gray-400 font-extrabold uppercase mt-1 tracking-wider block">{t('birr')}</span>
              {isSelected && <span className="w-1.5 h-1.5 rounded-full mt-2" style={{ backgroundColor: themeColor }} />}
            </button>
          );
        })}
      </div>

      {/* CTA */}
      <div className="mb-6">
        {selectedStake ? (
          <button onClick={onPlay}
            className="w-full text-white font-black py-4 rounded-2xl text-[13px] tracking-widest flex items-center justify-center gap-2 shadow-xl transition-transform hover:scale-[1.01] active:translate-y-0.5 cursor-pointer uppercase font-sans animate-pulse"
            style={{ background: `linear-gradient(to right, ${themeColor}, ${themeColorDark})`, boxShadow: `0 10px 30px ${themeColor}44` }}>
            🚀 PLAY WITH {selectedStake} {t('birr')}
          </button>
        ) : (
          <button disabled
            className="w-full bg-[#141f33]/40 border border-white/5 text-gray-500 font-extrabold py-4 rounded-2xl text-[12px] tracking-widest text-center cursor-not-allowed select-none uppercase">
            ⚙️ SELECT A STAKE
          </button>
        )}
      </div>

      {/* Wallet Balance */}
      <div className="bg-[#0a1120] border border-[#1e2f4d]/60 rounded-2xl p-4.5 mb-5 shadow-lg relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(35,60,102,0.04)_0%,transparent_80%)] pointer-events-none" />
        <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3">
          <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 flex items-center gap-1.5">💳 WALLET BALANCE</span>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-400">Main Balance</span>
            <span className="font-extrabold text-white">{Number(wallet?.main_balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {t('birr')}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-400">Play Balance</span>
            <span className="font-extrabold text-white">{Number(wallet?.play_balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {t('birr')}</span>
          </div>
          <div className="border-t border-dashed border-white/5 pt-1.5 flex justify-between items-center text-[13px] font-black">
            <span style={{ color: themeColor }}>Total</span>
            <span style={{ color: themeColor }}>{Number(walletBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {t('birr')}</span>
          </div>
        </div>
      </div>

      {/* How to Play */}
      <button onClick={onShowRules}
        className="w-full bg-[#0a1120] border border-[#1e2f4d]/60 hover:bg-[#101c33] text-white/70 py-3 rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-all font-semibold font-sans mt-3 cursor-pointer">
        <Info size={12} />{t('how_to_play')}
      </button>
    </div>
  );
}
