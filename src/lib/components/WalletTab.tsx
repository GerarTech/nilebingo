'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Wallet as WalletIcon, ArrowLeft, Copy, Check, Share2,
  ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight, History, Flame, Gift,
} from 'lucide-react';

interface Wallet {
  main_balance: number;
  play_balance: number;
}

interface PaymentGateways {
  cbeAccount?: string;
  cbeName?: string;
  cbeMax?: number;
  telebirrNumber?: string;
  telebirrName?: string;
  telebirrMax?: number;
  banks?: { id: string; name: string; account: string; recipient: string; max: string }[];
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  status: string;
  reference: string;
  created_at: string;
}

interface StreakInfo {
  enabled: boolean;
  streakCount: number;
  canClaim: boolean;
  todayReward: number;
  rewards: number[];
}

interface Props {
  wallet: Wallet | null;
  userId?: string;
  walletView: 'main' | 'deposit' | 'withdraw' | 'transfer' | 'transactions';
  botUsername?: string;
  referralEnabled?: boolean;
  referralBonus?: number;
  referralCount?: number;
  inviteLink?: string;
  copiedLink?: boolean;
  withdrawMinAmount?: number;
  withdrawRequiredGames?: number;
  paymentGateways?: PaymentGateways;
  t?: (key: string) => string;
  onSetWalletView: (view: 'main' | 'deposit' | 'withdraw' | 'transfer' | 'transactions') => void;
  onCopyRefLink?: () => void;
  onSimulateReferral?: () => void;
  onRefreshWallet?: () => Promise<void>;
  onToast?: (message: string, type: 'success' | 'error') => void;
}

export default function WalletTab({
  wallet, userId, walletView, botUsername, referralEnabled, referralBonus,
  referralCount, inviteLink, copiedLink, withdrawMinAmount = 50, withdrawRequiredGames = 5,
  paymentGateways, t, onSetWalletView, onCopyRefLink, onSimulateReferral,
  onRefreshWallet, onToast,
}: Props) {
  const birr = t ? t('birr') : 'ETB';
  const mainBalance = wallet?.main_balance ?? 0;
  const playBalance = wallet?.play_balance ?? 0;
  const isGuest = !userId;

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTx, setLoadingTx] = useState(false);
  const [streak, setStreak] = useState<StreakInfo | null>(null);
  const [claimingStreak, setClaimingStreak] = useState(false);

  const [depositMethod, setDepositMethod] = useState<'cbe' | 'telebirr'>('cbe');
  const [depositAmount, setDepositAmount] = useState('');
  const [depositTxRef, setDepositTxRef] = useState('');
  const [depositSubmitting, setDepositSubmitting] = useState(false);

  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState<'telebirr' | 'cbe'>('telebirr');
  const [withdrawAccount, setWithdrawAccount] = useState('');
  const [withdrawName, setWithdrawName] = useState('');
  const [withdrawSubmitting, setWithdrawSubmitting] = useState(false);

  const [transferAmount, setTransferAmount] = useState('');
  const [transferDirection, setTransferDirection] = useState<'to_play' | 'to_main'>('to_play');
  const [transferSubmitting, setTransferSubmitting] = useState(false);

  const loadTransactions = useCallback(async () => {
    if (!userId) return;
    setLoadingTx(true);
    try {
      const res = await fetch(`/api/public/wallet/transactions?userId=${userId}&limit=30`);
      const data = await res.json();
      if (data.transactions) setTransactions(data.transactions);
    } catch { /* ignore */ }
    setLoadingTx(false);
  }, [userId]);

  const loadStreak = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/public/streak?userId=${userId}`);
      const data = await res.json();
      if (!data.error) setStreak(data);
    } catch { /* ignore */ }
  }, [userId]);

  useEffect(() => {
    if (walletView === 'transactions' || walletView === 'main') loadTransactions();
  }, [walletView, loadTransactions]);

  useEffect(() => { loadStreak(); }, [loadStreak]);

  const handleClaimStreak = async () => {
    if (!userId || !streak?.canClaim) return;
    setClaimingStreak(true);
    try {
      const res = await fetch('/api/public/streak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Claim failed');
      onToast?.(`+${data.reward} ${birr} daily bonus! Day ${data.streakCount}`, 'success');
      await onRefreshWallet?.();
      await loadStreak();
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : 'Claim failed', 'error');
    }
    setClaimingStreak(false);
  };

  const handleDeposit = async () => {
    if (!userId) { onToast?.('Sign in via Telegram to deposit', 'error'); return; }
    setDepositSubmitting(true);
    try {
      const res = await fetch('/api/public/wallet/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId, amount: depositAmount, method: depositMethod, txReference: depositTxRef,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Deposit failed');
      onToast?.('Deposit submitted — pending approval', 'success');
      setDepositAmount('');
      setDepositTxRef('');
      onSetWalletView('transactions');
      loadTransactions();
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : 'Deposit failed', 'error');
    }
    setDepositSubmitting(false);
  };

  const handleWithdraw = async () => {
    if (!userId) { onToast?.('Sign in via Telegram to withdraw', 'error'); return; }
    setWithdrawSubmitting(true);
    try {
      const res = await fetch('/api/public/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId, amount: withdrawAmount, method: withdrawMethod,
          accountNumber: withdrawAccount, accountName: withdrawName,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Withdraw failed');
      onToast?.('Withdrawal submitted — pending approval', 'success');
      setWithdrawAmount('');
      setWithdrawAccount('');
      setWithdrawName('');
      onSetWalletView('transactions');
      loadTransactions();
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : 'Withdraw failed', 'error');
    }
    setWithdrawSubmitting(false);
  };

  const handleTransfer = async () => {
    if (!userId) { onToast?.('Sign in via Telegram to transfer', 'error'); return; }
    setTransferSubmitting(true);
    try {
      const res = await fetch('/api/public/wallet/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, amount: transferAmount, direction: transferDirection }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Transfer failed');
      onToast?.('Transfer completed', 'success');
      setTransferAmount('');
      await onRefreshWallet?.();
      onSetWalletView('main');
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : 'Transfer failed', 'error');
    }
    setTransferSubmitting(false);
  };

  const txLabel = (type: string) => {
    const map: Record<string, string> = {
      deposit: 'Deposit', withdraw: 'Withdraw', bet: 'Game Play', win: 'Win',
      transfer_to_play: '→ Play', transfer_to_main: '→ Main',
    };
    return map[type] || type;
  };

  const backBtn = walletView !== 'main' && (
    <button onClick={() => onSetWalletView('main')} className="flex items-center gap-1.5 text-gray-400 hover:text-white text-xs mb-4">
      <ArrowLeft size={14} /> Back
    </button>
  );


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

      {streak?.enabled && (
        <div className="bg-gradient-to-r from-orange-900/40 to-amber-900/30 border border-orange-500/30 rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-orange-300 font-black text-xs uppercase flex items-center gap-1.5">
              <Flame size={14} /> Daily Streak
            </h3>
            <span className="text-gold font-black text-sm">{streak.streakCount} day{streak.streakCount !== 1 ? 's' : ''}</span>
          </div>
          <p className="text-[11px] text-gray-400 mb-3">
            {streak.canClaim
              ? `Claim ${streak.todayReward} ${birr} play bonus today!`
              : 'Come back tomorrow for your next bonus'}
          </p>
          {streak.canClaim && (
            <button onClick={handleClaimStreak} disabled={claimingStreak || isGuest}
              className="w-full bg-gradient-to-r from-orange-500 to-gold text-navy font-black py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 disabled:opacity-50">
              <Gift size={14} /> {claimingStreak ? 'Claiming...' : `Claim ${streak.todayReward} ${birr}`}
            </button>
          )}
        </div>
      )}

      {referralEnabled && (
        <div className="bg-gradient-to-b from-[#142036] to-[#0d1624] border border-[#233c66]/50 rounded-2xl p-4.5 mb-5 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-gold/10 text-gold text-[8px] font-black tracking-widest px-2 py-0.5 rounded-bl uppercase">Active Program</div>
          <h3 className="text-gold font-bold text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Share2 size={14} /> Referral &amp; Earn
          </h3>
          <p className="text-gray-400 text-[11px] leading-relaxed mb-3">
            Earn <span className="text-gold font-bold">{Number(referralBonus || 10).toLocaleString()} {birr}</span> per friend who joins!
          </p>
          {inviteLink && (
            <>
              <div className="flex items-center gap-2 bg-navy/80 border border-white/10 rounded-xl px-3 py-2.5 mb-2">
                <code className="text-[10px] text-gray-300 flex-1 truncate">{inviteLink}</code>
                <button onClick={onCopyRefLink} className="text-gold hover:text-gold/80 p-1 flex-shrink-0">
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
