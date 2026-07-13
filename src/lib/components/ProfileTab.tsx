'use client';

import { useState } from 'react';
import { Trophy, Gamepad2, Coins, Star, Check, Camera } from 'lucide-react';
import type { Profile, Wallet } from '../types';

interface ProfileTabProps {
  profile: Profile | null;
  wallet: Wallet | null;
  stakeHistory: { result: 'win' | 'loss'; stake: number; prize?: number }[];
  t: (key: string) => string;
  language: string;
  onSetLanguage: (lang: 'en' | 'am') => void;
  onUpdateAvatar: (avatar: string) => void;
  onUpdateName?: (name: string) => void;
}

const AVATARS = [
  // People
  '👑', '👤', '👨', '👩', '🧑', '👨‍🦰', '👩‍🦰', '🧔', '👱', '👴', '👵',
  '👮', '👷', '👨‍💻', '👩‍💻', '🧑‍🚀', '🧙', '🦸', '🦹', '🥷',

  // Animals
  '🦁', '🦅', '🐺', '🦊', '🐯', '🐻', '🐼', '🐨', '🦄', '🐶',
  '🐱', '🐸', '🐵', '🐧', '🦉', '🦜', '🦖', '🐢', '🐬', '🦈',

  // Activities & Sports
  '🏃‍♂️', '🏃‍♀️', '🚴', '🏋️', '⚽', '🏀', '🏈', '🎾', '🥊', '🏆',

  // Food & Drink
  '☕', '🍕', '🍔', '🍟', '🌮', '🍣', '🍩', '🍎', '🍉', '🥤',

  // Objects & Symbols
  '⚡', '🔥', '💎', '⭐', '🌟', '🎯', '🎮', '🎧', '📷', '🎸',
  '🚀', '🛸', '💻', '📱', '⌚', '🔒', '🗝️', '🧩', '🎲', '🎪',

  // Nature
  '🌍', '🌎', '🌏', '🌙', '☀️', '🌈', '❄️', '🌊', '🌲', '🌵',

  // Vehicles
  '🚗', '🏎️', '🏍️', '🚲', '✈️', '🚁', '🚂', '🚢',

  // Flags
  '🏳️', '🏴', '🏁', '🇪🇹',
  '🇺🇸', '🇬🇧', '🇨🇦', '🇦🇺', '🇳🇿',
  '🇫🇷', '🇩🇪', '🇮🇹', '🇪🇸', '🇵🇹',
  '🇯🇵', '🇰🇷', '🇨🇳', '🇮🇳', '🇸🇬',
  '🇦🇪', '🇸🇦', '🇶🇦', '🇪🇬',
   '🇰🇪', '🇳🇬', '🇿🇦', '🇬🇭',
  '🇧🇷', '🇦🇷', '🇲🇽',
  '🇷🇺', '🇺🇦', '🇹🇷'
];

export default function ProfileTab({
  profile, wallet, stakeHistory, t, language,
  onSetLanguage, onUpdateAvatar, onUpdateName,
}: ProfileTabProps) {
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(profile?.first_name || '');

  const playedCount = stakeHistory.length;
  const winsCount = stakeHistory.filter(h => h.result === 'win').length;
  const userTotalEarnings = stakeHistory
    .filter(h => h.result === 'win')
    .reduce((sum, h: any) => sum + (h.prize || 0), 0);

  return (
    <div className="px-4 pt-4 animate-fade-in pb-20">
      <div className="text-center mb-6">
        <button
          onClick={() => { setShowAvatarSelector(!showAvatarSelector); }}
          className="w-20 h-20 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 mx-auto mb-3 flex items-center justify-center shadow-lg relative border border-amber-300 cursor-pointer group hover:scale-[1.03] transition-all duration-200"
        >
          <span className="text-3xl">{profile?.photo_url || '👑'}</span>
          <div className="absolute -bottom-1 -right-1 bg-amber-500 text-navy p-1 rounded-full border border-[#0d1624] shadow-md group-hover:scale-110 transition-transform">
            <Camera size={10} fill="currentColor" />
          </div>
        </button>

        {showAvatarSelector && (
          <div className="bg-[#142036] border border-[#233c66]/40 p-4 rounded-2xl mb-4 max-w-sm mx-auto shadow-xl animate-fade-in text-left">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] text-gray-200 font-extrabold uppercase tracking-wider flex items-center gap-1">🎭 Choose avatar</span>
              <button onClick={() => setShowAvatarSelector(false)} className="text-[9px] text-amber-400 font-bold hover:text-white uppercase">CLOSE</button>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {AVATARS.map((av) => {
                const isSelected = (profile?.photo_url || '👑') === av;
                return (
                  <button
                    key={av}
                    onClick={() => { onUpdateAvatar(av); setShowAvatarSelector(false); }}
                    className={`aspect-square text-xl rounded-xl flex items-center justify-center border transition-all cursor-pointer hover:scale-105 active:scale-95 duration-150 relative ${
                      isSelected ? 'bg-gold/10 border-gold-medium shadow-gold-glow-sm' : 'bg-[#0a111a] border-gold-subtle hover:border-gold-medium gold-border-hover'
                    }`}
                  >
                    {av}
                    {isSelected && (
                      <span className="absolute -top-1 -right-1 bg-amber-500 w-2.5 h-2.5 rounded-full border border-[#0d1624] flex items-center justify-center">
                        <Check size={6} className="text-navy stroke-[4px]" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {editingName ? (
          <div className="flex items-center gap-2 mt-3 max-w-xs mx-auto">
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              maxLength={30}
              className="flex-1 bg-[#0a111a] border border-amber-500/40 rounded-xl px-3 py-2 text-sm text-white font-bold focus:outline-none focus:border-amber-500"
              autoFocus
            />
            <button
              onClick={() => {
                const trimmed = nameInput.trim();
                if (trimmed && trimmed !== profile?.first_name) {
                  onUpdateName?.(trimmed);
                }
                setEditingName(false);
              }}
              className="bg-amber-500 text-navy px-3 py-2 rounded-xl text-xs font-black"
            >Save</button>
            <button
              onClick={() => { setEditingName(false); setNameInput(profile?.first_name || ''); }}
              className="text-gray-400 text-xs font-bold"
            >Cancel</button>
          </div>
        ) : (
          <h2 className="text-lg font-black text-white mt-2 cursor-pointer hover:text-amber-300 transition-colors" onClick={() => { setNameInput(profile?.first_name || ''); setEditingName(true); }}>
            {profile?.first_name || profile?.username || 'Player'} <span className="text-[10px] text-gray-500 font-normal">✏️</span>
          </h2>
        )}
        {/* {profile?.phone && <div className="text-sm text-gray-400 mt-1">📞 {profile.phone}</div>} */}
        {profile?.verified !== false && (
          <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full mt-2 font-bold uppercase tracking-wider">
            <Check size={10} /> {t('verified')}
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-gradient-to-b from-navy-card/80 to-[#0d1624] border border-gold-subtle rounded-2xl p-3.5 text-center shadow-md gold-border-hover transition-all">
          <Trophy size={16} className="mx-auto mb-1 text-gold" />
          <div className="text-base font-black text-white">{winsCount}</div>
          <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">{t('game_win')}</div>
        </div>
        <div className="bg-gradient-to-b from-navy-card/80 to-[#0d1624] border border-gold-subtle rounded-2xl p-3.5 text-center shadow-md gold-border-hover transition-all">
          <Gamepad2 size={16} className="mx-auto mb-1 text-gold" />
          <div className="text-base font-black text-white">{playedCount}</div>
          <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">{t('played')}</div>
        </div>
        <div className="bg-gradient-to-b from-navy-card/80 to-[#0d1624] border border-gold-subtle rounded-2xl p-3.5 text-center shadow-md gold-border-hover transition-all">
          <Coins size={16} className="mx-auto mb-1 text-gold" />
          <div className="text-base font-black text-gold">{userTotalEarnings.toLocaleString()}</div>
          <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">{t('total_earned')}</div>
        </div>
      </div>

      <div className="space-y-3 mb-5">
        <h3 className="text-xs text-gray-400 mb-2 font-bold uppercase tracking-wider">⚙️ Preferences</h3>
        <div className="glass-gold rounded-2xl divide-y divide-gold-subtle border border-gold-subtle">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Star size={18} className="text-gold" />
              <span className="text-xs text-gray-200 font-bold">{t('language')}</span>
            </div>
            <div className="flex gap-1">
              <button onClick={() => onSetLanguage('en')} className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${language === 'en' ? 'bg-gold text-navy shadow shadow-gold/25' : 'text-gray-400 bg-white/5 hover:bg-white/10'}`}>EN</button>
              <button onClick={() => onSetLanguage('am')} className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${language === 'am' ? 'bg-gold text-navy shadow shadow-gold/25' : 'text-gray-400 bg-white/5 hover:bg-white/10'}`}>አማ</button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
