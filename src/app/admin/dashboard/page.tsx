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
  totalDepositsApproved: number;
  totalWithdrawals: number;
  totalBets: number;
  totalWins: number;
  totalCommissionEarned: number;
  pendingDeposits: number;
  pendingWithdrawals: number;
  revenue: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [branding, setBranding] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/data?action=dashboard').then(r => r.json()),
      fetch('/api/admin/data?action=bot_config').then(r => r.json()),
    ])
      .then(([d, cfg]) => { if (d && typeof d.totalUsers === 'number') setStats(d); setBranding(cfg); setLoading(false); })
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
    { label: 'Revenue (Bets-Wins)', value: `${stats.revenue.toLocaleString()} ETB`, icon: ArrowUp, color: stats.revenue >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400' },
    { label: 'Deposits Approved', value: `${stats.totalDepositsApproved.toLocaleString()} ETB`, icon: ArrowDown, color: 'bg-emerald-500/20 text-emerald-400' },
    { label: 'Commission Earned', value: `${stats.totalCommissionEarned.toLocaleString()} ETB`, icon: Coins, color: 'bg-purple-500/20 text-purple-400' },
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

      {/* Branding Preview */}
      {branding && (
        <div className="glass rounded-xl p-4 mb-6">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <span role="img" aria-label="branding">🎨</span>
            Bot Branding Preview
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="bg-navy rounded-lg p-3">
              <div className="text-[9px] text-gray-400 uppercase mb-1">Telegram Bot Name</div>
              <div className="text-sm font-bold text-gold">{branding.botName || 'Nile BINGO'}</div>
            </div>
            <div className="bg-navy rounded-lg p-3">
              <div className="text-[9px] text-gray-400 uppercase mb-1">Web App Name</div>
              <div className="text-sm font-bold text-white">{branding.appName || 'Nile BINGO'}</div>
            </div>
            <div className="bg-navy rounded-lg p-3">
              <div className="text-[9px] text-gray-400 uppercase mb-1">Logo</div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                {branding.appLogoPng ? (
                  <img src={branding.appLogoPng} alt="Logo" className="w-8 h-8 rounded" />
                ) : (
                  <span className="text-2xl">{branding.appLogo || '🎰'}</span>
                )}
                <span>{branding.appName || 'Nile BINGO'}</span>
              </div>
            </div>
            <div className="bg-navy rounded-lg p-3">
              <div className="text-[9px] text-gray-400 uppercase mb-1">Bot Description (preview)</div>
              {branding.botDescriptionImage && (
                <img src={branding.botDescriptionImage} alt="Bot Description" className="w-full max-h-32 object-contain rounded-lg mb-2 border border-white/10" />
              )}
              <div className="text-[10px] text-gray-300 line-clamp-2">{(branding.bot_description || 'No description set').substring(0, 120)}</div>
            </div>
          </div>
        </div>
      )}

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