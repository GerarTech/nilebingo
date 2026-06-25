'use client';

import { useEffect, useState } from 'react';
import { Users, Gamepad2, Wallet, Coins, ArrowUp, ArrowDown, Activity, Check, X } from 'lucide-react';

interface Stats {
  totalUsers: number;
  totalGames: number;
  activeGamesCount: number;
  totalMainBalance: number;
  totalPlayBalance: number;
  totalDeposits: number;
  totalWithdrawals: number;
  totalBets: number;
  totalWins: number;
  pendingDeposits: number;
  pendingWithdrawals: number;
  revenue: number;
}

interface PendingTransaction {
  id: string;
  type: string;
  amount: number;
  status: string;
  created_at: string;
  profiles: {
    first_name?: string;
    username?: string;
    telegram_id?: string;
  };
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingTransactions, setPendingTransactions] = useState<PendingTransaction[]>([]);
  const [loadingPending, setLoadingPending] = useState(true);

  const loadDashboard = async () => {
    try {
      const [statsRes, pendingRes] = await Promise.all([
        fetch('/api/admin/data?action=dashboard'),
        fetch('/api/admin/data?action=transactions&status=pending&limit=5'),
      ]);
      const statsData = await statsRes.json();
      const pendingData = await pendingRes.json();
      setStats(statsData);
      setPendingTransactions(pendingData.transactions || []);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
      setLoadingPending(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) return <div className="text-gray-400 text-sm">Loading dashboard...</div>;
  if (!stats) return <div className="text-red-400 text-sm">Failed to load dashboard</div>;

  const handleQuickApprove = async (txId: string) => {
    await fetch('/api/admin/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve_transaction', transactionId: txId }),
    });
    loadDashboard();
  };

  const handleReject = async (txId: string) => {
    await fetch('/api/admin/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject_transaction', transactionId: txId }),
    });
    loadDashboard();
  };

  const cards = [
    { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'bg-blue-500/20 text-blue-400' },
    { label: 'Active Games', value: stats.activeGamesCount, icon: Gamepad2, color: 'bg-green-500/20 text-green-400' },
    { label: 'Total Games', value: stats.totalGames, icon: Activity, color: 'bg-violet-500/20 text-violet-400' },
    { label: 'Main Balance', value: `${stats.totalMainBalance.toLocaleString()} ETB`, icon: Wallet, color: 'bg-gold/20 text-gold' },
    { label: 'Play Balance', value: `${stats.totalPlayBalance.toLocaleString()} ETB`, icon: Coins, color: 'bg-amber-500/20 text-amber-400' },
    { label: 'Revenue', value: `${stats.revenue.toLocaleString()} ETB`, icon: ArrowUp, color: stats.revenue >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400' },
  ];

  return (
    <div>
      <h1 className="text-xl font-bold text-white mb-6">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {cards.map((card) => (
          <div key={card.label} className="glass rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 rounded-lg ${card.color} flex items-center justify-center`}>
                <card.icon size={16} />
              </div>
            </div>
            <div className="text-lg font-bold text-white">{card.value}</div>
            <div className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Pending Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="glass rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <ArrowDown size={16} className="text-gold" />
            Pending Deposits
          </h3>
          <div className="text-2xl font-bold text-gold">{stats.pendingDeposits}</div>
          <div className="text-xs text-gray-400 mt-1">
            Total deposits: {stats.totalDeposits.toLocaleString()} ETB
          </div>
        </div>
        <div className="glass rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <ArrowUp size={16} className="text-red-400" />
            Pending Withdrawals
          </h3>
          <div className="text-2xl font-bold text-red-400">{stats.pendingWithdrawals}</div>
          <div className="text-xs text-gray-400 mt-1">
            Total withdrawals: {stats.totalWithdrawals.toLocaleString()} ETB
          </div>
        </div>
      </div>

      {/* Latest Pending Transactions Widget */}
      <div className="glass rounded-xl p-4">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Activity size={16} className="text-blue-400" />
          Latest Pending Transactions
        </h3>
        {loadingPending ? (
          <div className="text-gray-400 text-xs">Loading transactions...</div>
        ) : pendingTransactions.length === 0 ? (
          <div className="text-gray-500 text-xs">No pending transactions</div>
        ) : (
          <div className="space-y-2">
            {pendingTransactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-medium ${
                      tx.type === 'deposit' ? 'bg-green-500/20 text-green-400' :
                      tx.type === 'withdraw' ? 'bg-red-500/20 text-red-400' :
                      'bg-blue-500/20 text-blue-400'
                    }`}>{tx.type}</span>
                    <span className="text-white font-bold text-sm">{Number(tx.amount).toLocaleString()} ETB</span>
                  </div>
                  <div className="text-xs text-gray-400 truncate">
                    {tx.profiles?.first_name || tx.profiles?.username || 'Unknown User'}
                  </div>
                  <div className="text-[10px] text-gray-500">
                    {new Date(tx.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <button
                    onClick={() => handleQuickApprove(tx.id)}
                    className="p-1.5 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
                    title="Quick Approve"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    onClick={() => handleReject(tx.id)}
                    className="p-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                    title="Reject"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}