'use client';

import { Info, RefreshCw, Check, ExternalLink, ArrowUpRight } from 'lucide-react';
import type { Profile, Wallet } from '../types';
import { useState } from 'react';

interface WalletTabProps {
  wallet: Wallet | null;
  botUsername: string;
  t: (key: string) => string;
  referralEnabled: boolean;
  referralBonus: number;
  referralCount: number;
  inviteLink: string;
  onCopyRefLink: () => void;
  copiedLink: boolean;
  onSimulateReferral: () => void;
  withdrawMinAmount: number;
  withdrawRequiredGames: number;
}

export default function WalletTab({
  wallet, botUsername, t,
  referralEnabled, referralBonus, referralCount,
  inviteLink, onCopyRefLink, copiedLink, onSimulateReferral,
  withdrawMinAmount, withdrawRequiredGames,
}: WalletTabProps) {
  const telegramBotLink = `https://t.me/${botUsername}`;
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [withdrawMethod, setWithdrawMethod] = useState<'cbe' | 'telebirr' | ''>('');
  const [withdrawAccount, setWithdrawAccount] = useState<string>('');
  const [withdrawName, setWithdrawName] = useState<string>('');
  const [withdrawError, setWithdrawError] = useState<string>('');
  const [withdrawSuccess, setWithdrawSuccess] = useState<string>('');
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  const mainBalance = wallet?.main_balance ?? 0;
  const playBalance = wallet?.play_balance ?? 0;

  const handleWithdraw = async () => {
    setWithdrawError('');
    setWithdrawSuccess('');
    const amount = parseFloat(withdrawAmount);

    if (!amount || amount <= 0) {
      setWithdrawError('Please enter a valid amount.');
      return;
    }
    if (amount < withdrawMinAmount) {
      setWithdrawError(`Minimum withdrawal is ${withdrawMinAmount} ETB.`);
      return;
    }
    if (amount > mainBalance) {
      setWithdrawError('Insufficient main wallet balance.');
      return;
    }
    if (!withdrawMethod) {
      setWithdrawError('Please select a withdrawal method.');
      return;
    }
    if (!withdrawAccount.trim()) {
      setWithdrawError('Please enter your account number.');
      return;
    }
    if (!withdrawName.trim()) {
      setWithdrawError('Please enter the account holder name.');
      return;
    }

    setWithdrawLoading(true);
    try {
      const res = await fetch('/api/public/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: wallet?.user_id,
          amount,
          method: withdrawMethod,
          accountNumber: withdrawAccount,
          accountName: withdrawName,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setWithdrawError(data.error || 'Withdrawal request failed.');
      } else {
        setWithdrawSuccess(`Withdrawal request for ${amount.toLocaleString()} ETB submitted successfully!`);
        setWithdrawAmount('');
        setWithdrawAccount('');
        setWithdrawName('');
        setWithdrawMethod('');
      }
    } catch {
      setWithdrawError('Network error. Please try again.');
    } finally {
      setWithdrawLoading(false);
    }
  };

  return (
    <div className="px-4 pt-4 animate-fade-in pb-20">
      <div className="space-y-3 mb-5">
        <div className="bg-gradient-gold rounded-2xl p-5 flex justify-between items-center shadow-lg">
          <span className="text-navy font-black text-sm">{t('main_wallet')}</span>
          <span className="text-navy text-2xl font-black">{mainBalance.toLocaleString()} {t('birr')}</span>
        </div>
        <div className="glass rounded-2xl p-5 flex justify-between items-center shadow-md">
          <span className="text-white font-bold text-sm">{t('play_wallet')}</span>
          <span className="text-gold text-2xl font-black">{playBalance.toLocaleString()} {t('birr')}</span>
        </div>
      </div>

      <a
        href={telegramBotLink}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full bg-[#ff5a00] hover:bg-[#ff7a22] text-white font-black py-3.5 rounded-xl text-xs transition-all uppercase tracking-wider mb-4 flex items-center justify-center gap-2"
      >
        <ExternalLink size={14} /> 💳 Deposit via Telegram
      </a>

          

      {referralEnabled && (
        <div className="bg-gradient-to-b from-[#142036] to-[#0d1624] border border-[#233c66]/50 rounded-2xl p-4.5 mb-5 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-gold/10 text-gold text-[8px] font-black tracking-widest px-2 py-0.5 rounded-bl uppercase">Active Program</div>
          <h3 className="text-gold font-bold text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5 font-sans">
            <span>👥</span> Referral & Earn Program
          </h3>
          <p className="text-[10.5px] text-gray-300 leading-relaxed mb-3.5">
            Get <span className="text-emerald-400 font-extrabold">{referralBonus} {t('birr')}</span> in your{' '}
            <span className="text-gold font-bold">Play Balance</span> for each referral!
          </p>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-[#0b101c] border border-white/5 rounded-xl p-2.5 text-center">
              <div className="text-[9px] text-gray-400 lowercase leading-none mb-1">invites</div>
              <div className="text-base font-black text-white">{referralCount}</div>
            </div>
            <div className="bg-[#0b101c] border border-white/5 rounded-xl p-2.5 text-center">
              <div className="text-[9px] text-emerald-400 font-bold lowercase leading-none mb-1">earned</div>
              <div className="text-base font-black text-emerald-400">+{referralCount * referralBonus} {t('birr')}</div>
            </div>
          </div>
          <div className="space-y-2 mb-4">
            <label className="text-[9px] text-gray-400 uppercase font-bold tracking-wider block">Your Invitation Link</label>
            <div className="flex gap-2">
              <input readOnly value={inviteLink} className="bg-[#0a0f1a]/80 text-[10px] text-gray-300 font-mono p-2 rounded-xl border border-[#233c66]/30 flex-1 truncate select-all focus:outline-none" />
              <button onClick={onCopyRefLink} className={`text-[10px] font-bold px-3 py-2 rounded-xl transition-all shadow-md shrink-0 flex items-center gap-1 ${copiedLink ? 'bg-emerald-500 text-white' : 'bg-gold hover:bg-gold/85 text-navy'}`}>
                {copiedLink ? <><Check size={12} /> Copied</> : '📋 Copy'}
              </button>
            </div>
          </div>
         
        </div>
      )}

      <div className="glass rounded-2xl p-4 mb-4">
        <Info size={16} className="text-gold" />
        <p className="text-xs text-gray-400 mt-1">Use the Telegram bot for deposits & withdrawals.</p>
      </div>
      <div className="glass rounded-2xl py-8 text-center text-gray-500 text-xs">
        <RefreshCw size={24} className="mx-auto mb-2 text-gray-600" />
        {t('no_transactions')}
      </div>
    </div>
  );
}
