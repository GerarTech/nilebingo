'use client';

import { Info, RefreshCw, Check } from 'lucide-react';
import { useState, useCallback } from 'react';
import { supabase } from '../supabase';
import type { Profile, Wallet } from '../types';

interface WalletTabProps {
  profile: Profile | null;
  wallet: Wallet | null;
  t: (key: string) => string;
  onBalanceUpdate: (amount: number, type: 'play_balance' | 'main_balance') => void;
  referralEnabled: boolean;
  referralBonus: number;
  referralCount: number;
  inviteLink: string;
  onCopyRefLink: () => void;
  copiedLink: boolean;
  onSimulateReferral: () => void;
}

export default function WalletTab({
  profile, wallet, t, onBalanceUpdate,
  referralEnabled, referralBonus, referralCount,
  inviteLink, onCopyRefLink, copiedLink, onSimulateReferral,
}: WalletTabProps) {
  const [depositAmount, setDepositAmount] = useState('');
  const [showDepositForm, setShowDepositForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDeposit = useCallback(async () => {
    const amount = parseFloat(depositAmount);
    if (!amount || amount <= 0 || !profile) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('transactions').insert({
        user_id: profile.id,
        type: 'deposit',
        amount,
        status: 'pending',
        reference: `app_deposit_${Date.now()}`,
      });
      if (!error) {
        onBalanceUpdate(amount, 'main_balance');
        setShowDepositForm(false);
        setDepositAmount('');
      }
    } catch (e) {
      console.error('Deposit error:', e);
    } finally {
      setIsSubmitting(false);
    }
  }, [depositAmount, profile, onBalanceUpdate]);

  return (
    <div className="px-4 pt-4 animate-fade-in pb-20">
      <div className="space-y-3 mb-5">
        <div className="bg-gradient-gold rounded-2xl p-5 flex justify-between items-center shadow-lg">
          <span className="text-navy font-black text-sm">{t('main_wallet')}</span>
          <span className="text-navy text-2xl font-black">{(wallet?.main_balance ?? 0).toLocaleString()} {t('birr')}</span>
        </div>
        <div className="glass rounded-2xl p-5 flex justify-between items-center shadow-md">
          <span className="text-white font-bold text-sm">{t('play_wallet')}</span>
          <span className="text-gold text-2xl font-black">{(wallet?.play_balance ?? 0).toLocaleString()} {t('birr')}</span>
        </div>
      </div>

      {!showDepositForm ? (
        <button
          onClick={() => setShowDepositForm(true)}
          className="w-full bg-[#ff5a00] hover:bg-[#ff7a22] text-white font-black py-3.5 rounded-xl text-xs transition-all uppercase tracking-wider mb-4 cursor-pointer"
        >
          💳 {t('deposit')}
        </button>
      ) : (
        <div className="bg-[#142036] border border-[#233c66]/50 rounded-2xl p-4 mb-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-gray-300">{t('enter_amount')}</span>
            <button onClick={() => setShowDepositForm(false)} className="text-[10px] text-gray-400 hover:text-white">Cancel</button>
          </div>
          <input
            type="number"
            placeholder="Amount in ETB"
            value={depositAmount}
            onChange={e => setDepositAmount(e.target.value)}
            className="w-full bg-[#0a0f1a] border border-[#233c66]/40 text-white p-3 rounded-xl text-sm font-mono focus:outline-none focus:border-amber-500"
          />
          <button
            onClick={handleDeposit}
            disabled={isSubmitting || !depositAmount}
            className="w-full bg-amber-500 hover:bg-amber-600 text-navy font-black py-3 rounded-xl text-xs transition-all uppercase tracking-wider disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? 'Processing...' : `${t('submit')} (${t('deposit')})`}
          </button>
        </div>
      )}

      {referralEnabled && (
        <div className="bg-gradient-to-b from-[#142036] to-[#0d1624] border border-[#233c66]/50 rounded-2xl p-4.5 mb-5 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-gold/10 text-gold text-[8px] font-black tracking-widest px-2 py-0.5 rounded-bl uppercase">Active Program</div>
          <h3 className="text-gold font-bold text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5 font-sans">
            <span>👥</span> Referral & Earn Program
          </h3>
          <p className="text-[10.5px] text-gray-300 leading-relaxed mb-3.5">
            Get <span className="text-emerald-400 font-extrabold">{referralBonus} Birr</span> in your{' '}
            <span className="text-gold font-bold">Play Balance</span> for each referral!
          </p>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-[#0b101c] border border-white/5 rounded-xl p-2.5 text-center">
              <div className="text-[9px] text-gray-400 lowercase leading-none mb-1">invites</div>
              <div className="text-base font-black text-white">{referralCount}</div>
            </div>
            <div className="bg-[#0b101c] border border-white/5 rounded-xl p-2.5 text-center">
              <div className="text-[9px] text-emerald-400 font-bold lowercase leading-none mb-1">earned</div>
              <div className="text-base font-black text-emerald-400">+{referralCount * referralBonus} Birr</div>
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
          <button onClick={onSimulateReferral} className="w-full bg-[#1c3052] hover:bg-[#253f66] text-amber-300 font-extrabold text-[11px] py-2.5 px-4 rounded-xl border border-amber-500/20 flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98]">
            <span>✨</span> Simulate Friend Join (+{referralBonus} Birr)
          </button>
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
