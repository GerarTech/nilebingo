'use client';

import { Wallet as WalletIcon, ExternalLink, Copy, Check, Share2 } from 'lucide-react';
import { useState } from 'react';

interface Wallet {
  main_balance: number;
  play_balance: number;
}

interface Props {
  wallet: Wallet | null;
  botUsername?: string;
  referralEnabled?: boolean;
  referralBonus?: number;
  referralCount?: number;
  inviteLink?: string;
  copiedLink?: boolean;
  withdrawMinAmount?: number;
  withdrawRequiredGames?: number;
  t?: (key: string) => string;
  onCopyRefLink?: () => void;
  onSimulateReferral?: () => void;
}

export default function WalletTab({ wallet, botUsername, referralEnabled, referralBonus, referralCount, inviteLink, copiedLink, t, onCopyRefLink, onSimulateReferral }: Props) {
  const birr = t ? t('birr') : 'ETB';
  const mainBalance = wallet?.main_balance ?? 0;
  const playBalance = wallet?.play_balance ?? 0;
  const telegramBotLink = botUsername ? `https://t.me/${botUsername}` : '#';

  return (
    <div className="px-4 pt-4 animate-fade-in pb-20">
      <div className="space-y-3 mb-5">
        <div className="bg-gradient-gold rounded-2xl p-5 flex justify-between items-center shadow-lg">
          <span className="text-navy font-black text-sm">{t ? t('main_wallet') : 'Main Wallet'}</span>
          <span className="text-navy text-2xl font-black">{Number(mainBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {birr}</span>
        </div>
        <div className="glass rounded-2xl p-5 flex justify-between items-center shadow-md">
          <span className="text-white font-bold text-sm">{t ? t('play_wallet') : 'Play Wallet'}</span>
          <span className="text-gold text-2xl font-black">{Number(playBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {birr}</span>
        </div>
      </div>

      <a
        href={telegramBotLink}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full bg-[#ff5a00] hover:bg-[#ff7a22] text-white font-black py-3.5 rounded-xl text-xs transition-all uppercase tracking-wider mb-4 flex items-center justify-center gap-2"
      >
        <ExternalLink size={14} /> {t ? t('deposit_via_telegram') as string : '💳 Deposit via Telegram'}
      </a>

      {referralEnabled && (
        <div className="bg-gradient-to-b from-[#142036] to-[#0d1624] border border-[#233c66]/50 rounded-2xl p-4.5 mb-5 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-gold/10 text-gold text-[8px] font-black tracking-widest px-2 py-0.5 rounded-bl uppercase">Active Program</div>
          <h3 className="text-gold font-bold text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5 font-sans">
            <span>👥</span> Referral &amp; Earn Program
          </h3>
          <p className="text-gray-400 text-[11px] leading-relaxed mb-3 font-sans">
            Invite friends and earn <span className="text-gold font-bold">{Number(referralBonus || 10).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {birr}</span> for each friend who joins!
          </p>
          {inviteLink && (
            <>
              <div className="flex items-center gap-2 bg-navy/80 border border-white/10 rounded-xl px-3 py-2.5 mb-2">
                <code className="text-[10px] text-gray-300 flex-1 truncate">{inviteLink}</code>
                <button
                  onClick={onCopyRefLink}
                  className="text-gold hover:text-gold/80 transition-colors p-1 flex-shrink-0"
                >
                  {copiedLink ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
