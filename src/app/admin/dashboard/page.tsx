'use client';

import { useEffect, useState } from 'react';
import { Users, Gamepad2, Wallet, Coins, ArrowUp, ArrowDown, Activity } from 'lucide-react';

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

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/data?action=dashboard')
      .then(r => r.json())
      .then(d => { setStats(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-400 text-sm">Loading dashboard...</div>;
  if (!stats) return <div className="text-red-400 text-sm">Failed to load dashboard</div>;

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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
    </div>
  );
}