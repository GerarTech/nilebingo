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

const ROOM_GRADIENTS: Record<string, string> = {
  bronze: 'linear-gradient(135deg, rgba(205, 127, 50, 0.1) 0%, rgba(205, 127, 50, 0.02) 100%)',
  silver: 'linear-gradient(135deg, rgba(192, 192, 192, 0.1) 0%, rgba(192, 192, 192, 0.02) 100%)',
  gold: 'linear-gradient(135deg, rgba(254, 232, 0, 0.12) 0%, rgba(254, 232, 0, 0.02) 100%)',
  diamond: 'linear-gradient(135deg, rgba(96, 165, 250, 0.12) 0%, rgba(96, 165, 250, 0.02) 100%)',
};

const ROOM_ACCENTS: Record<string, string> = {
  bronze: '#cd7f32',
  silver: '#c0c0c0',
  gold: '#FEE800',
  diamond: '#60a5fa',
};

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
    <div className="px-4 pt-4 animate-fade-in pb-20 font-sans text-white bg-gradient-navy min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 pb-3 border-b border-gold-subtle">
        <div className="font-sans">
          <span className="text-[10px] uppercase font-black tracking-widest text-gray-400 block">WELCOME TO</span>
          <span className="text-2xl font-black tracking-tight uppercase flex items-center gap-1.5 mt-0.5" style={{ color: themeColor }}>
            {appLogoPng ? <img src={appLogoPng} alt="Logo" className="h-7 w-7 object-contain inline-block" /> : appLogo} {appName}
          </span>
        </div>
        <button onClick={onGoToWallet}
          className="flex items-center gap-1 font-extrabold text-[11px] px-3.5 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap shadow-gold-glow-sm hover:shadow-gold-glow border border-gold-subtle"
          style={{ color: themeColor, backgroundColor: `${themeColorDark}33` }}>
          💰 {Number(walletBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
        </button>
      </div>

      <div className="mb-4">
        <div className="text-center">
          <h2 className="text-[12.5px] font-black tracking-widest uppercase text-gray-300">{t('choose_stake')}</h2>
          <span className="w-16 h-1 bg-gradient-to-r from-transparent via-gold to-transparent mt-1.5 rounded-full block mx-auto opacity-60" />
        </div>
      </div>

      {/* Stake Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6 relative z-10">
        {[bronzeRoom, silverRoom, goldRoom].map((room) => {
          const isSelected = selectedStake === room.entry;
          const accent = ROOM_ACCENTS[room.id] || themeColor;
          const roomGradient = ROOM_GRADIENTS[room.id];
          return (
            <button
              key={room.id}
              onClick={() => onSelectStake(room.entry)}
              className={`relative rounded-2xl py-5 px-3 border transition-all duration-300 text-center flex flex-col items-center justify-center cursor-pointer select-none ${
                isSelected
                  ? 'scale-[1.04] border-gold-medium shadow-gold-glow'
                  : 'border-gold-subtle gold-border-hover bg-[#0d1a30]/60 hover:bg-[#111f38]/80'
              }`}
              style={isSelected ? {
                background: roomGradient || `linear-gradient(to bottom, ${accent}22, ${accent}11)`,
                boxShadow: `0 8px 24px ${accent}33, 0 0 20px ${accent}15`,
                borderColor: `${accent}40`,
              } : !isSelected ? { background: roomGradient } : undefined}
            >
              {room.name && (
                <span className="text-[9px] font-black uppercase tracking-widest text-gray-300 block mb-1">{room.name}</span>
              )}
              {room.status === 'playing' && room.countdown > 0 ? (
                <span className="absolute -top-1.5 -right-1.5 text-white text-[7px] font-black px-1.5 py-0.5 rounded-full shadow-md select-none uppercase tracking-tighter bg-red-500 shadow-red-500/40 animate-pulse">
                  PLAYING
                </span>
              ) : (
                <span className="absolute -top-1.5 -right-1.5 text-navy text-[7.5px] font-black px-1.5 py-0.5 rounded-full shadow-md select-none uppercase tracking-tighter shadow-gold-glow-sm"
                  style={{ backgroundColor: accent }}>
                  {room.countdown}S
                </span>
              )}
              <span className="text-xl font-black text-white block">{room.entry}</span>
              <span className="text-[10px] text-gray-400 font-extrabold uppercase mt-1 tracking-wider block">{t('birr')}</span>
              {isSelected && <span className="w-1.5 h-1.5 rounded-full mt-2 shadow-gold-glow-sm" style={{ backgroundColor: accent }} />}
            </button>
          );
        })}
      </div>

      {/* CTA */}
      <div className="mb-6">
        {selectedStake ? (
          <button onClick={onPlay}
            className="w-full text-navy font-black py-4 rounded-2xl text-[13px] tracking-widest flex items-center justify-center gap-2 shadow-gold-glow-lg transition-all hover:scale-[1.01] active:translate-y-0.5 cursor-pointer uppercase font-sans bg-gradient-gold gold-shimmer border border-gold-dark/30">
            🚀 PLAY WITH {selectedStake} {t('birr')}
          </button>
        ) : (
          <button disabled
            className="w-full bg-[#0d1a30]/40 border border-gold-subtle text-gray-500 font-extrabold py-4 rounded-2xl text-[12px] tracking-widest text-center cursor-not-allowed select-none uppercase">
            ⚙️ SELECT A STAKE
          </button>
        )}
      </div>

      {/* Wallet Balance */}
      <div className="bg-[#0a1120]/80 border border-gold-subtle rounded-2xl p-4.5 mb-5 shadow-lg relative overflow-hidden gold-border-hover transition-all">
        <div className="absolute inset-0 bg-gradient-navy-subtle pointer-events-none" />
        <div className="flex items-center justify-between border-b border-gold-subtle pb-2 mb-3 relative z-10">
          <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 flex items-center gap-1.5">💳 WALLET BALANCE</span>
        </div>
        <div className="space-y-2 relative z-10">
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-400">Main Balance</span>
            <span className="font-extrabold text-white">{Number(wallet?.main_balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {t('birr')}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-400">Play Balance</span>
            <span className="font-extrabold text-white">{Number(wallet?.play_balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {t('birr')}</span>
          </div>
          <div className="border-t border-dashed border-gold-subtle pt-1.5 flex justify-between items-center text-[13px] font-black">
            <span style={{ color: themeColor }}>Total</span>
            <span style={{ color: themeColor }}>{Number(walletBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {t('birr')}</span>
          </div>
        </div>
      </div>

      {/* How to Play */}
      <button onClick={onShowRules}
        className="w-full bg-[#0a1120]/60 border border-gold-subtle hover:border-gold-medium hover:bg-[#101c33]/80 text-white/70 py-3 rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-all font-semibold font-sans mt-3 cursor-pointer gold-border-hover">
        <Info size={12} />{t('how_to_play')}
      </button>
    </div>
  );
}
