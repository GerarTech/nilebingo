'use client';

import { useEffect, useState } from 'react';
import { Users, Gamepad2, Wallet, Coins, ArrowUp, ArrowDown, Activity, TrendingUp, UserPlus, Flame } from 'lucide-react';

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

interface Analytics {
  dauToday: number;
  dauYesterday: number;
  dauChange: number;
  newUsersToday: number;
  gamesToday: number;
  depositsToday: number;
  betsToday: number;
  winsToday: number;
  streakClaimsToday: number;
  totalUsers: number;
  dailyChart: { date: string; activeUsers: number; games: number; deposits: number; bets: number; newUsers: number }[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [branding, setBranding] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/data?action=dashboard').then(r => r.json()),
      fetch('/api/admin/data?action=analytics').then(r => r.json()),
      fetch('/api/admin/data?action=bot_config').then(r => r.json()),
    ])
      .then(([d, a, cfg]) => {
        if (d && typeof d.totalUsers === 'number') setStats(d);
        if (a && typeof a.dauToday === 'number') setAnalytics(a);
        setBranding(cfg);
        setLoading(false);
      })
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
    { label: 'Revenue (Commission)', value: `${stats.revenue.toLocaleString()} ETB`, icon: ArrowUp, color: stats.revenue >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400' },
    { label: 'Deposits Approved', value: `${stats.totalDepositsApproved.toLocaleString()} ETB`, icon: ArrowDown, color: 'bg-emerald-500/20 text-emerald-400' },
    { label: 'Commission Earned', value: `${stats.totalCommissionEarned.toLocaleString()} ETB`, icon: Coins, color: 'bg-purple-500/20 text-purple-400' },
  ];

  const analyticsCards = analytics ? [
    { label: 'DAU Today', value: analytics.dauToday, sub: `${analytics.dauChange >= 0 ? '+' : ''}${analytics.dauChange}% vs yesterday`, icon: TrendingUp, color: 'bg-cyan-500/20 text-cyan-400' },
    { label: 'New Users Today', value: analytics.newUsersToday, icon: UserPlus, color: 'bg-pink-500/20 text-pink-400' },
    { label: 'Games Today', value: analytics.gamesToday, icon: Gamepad2, color: 'bg-green-500/20 text-green-400' },
    { label: 'Deposits Today', value: `${analytics.depositsToday.toLocaleString()} ETB`, icon: ArrowDown, color: 'bg-emerald-500/20 text-emerald-400' },
    { label: 'Bets Today', value: `${analytics.betsToday.toLocaleString()} ETB`, icon: Coins, color: 'bg-amber-500/20 text-amber-400' },
    { label: 'Streak Claims', value: analytics.streakClaimsToday, icon: Flame, color: 'bg-orange-500/20 text-orange-400' },
  ] : [];

  const maxChartVal = analytics?.dailyChart?.length
    ? Math.max(...analytics.dailyChart.map(d => Math.max(d.activeUsers, d.games, 1)))
    : 1;

  return (
    <div>
      <h1 className="text-xl font-bold text-white mb-6">Dashboard & Analytics</h1>

      {analytics && (
        <>
          <h2 className="text-sm font-semibold text-gold mb-3 uppercase tracking-wider">Today&apos;s Activity</h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            {analyticsCards.map(card => (
              <div key={card.label} className="glass rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-8 h-8 rounded-lg ${card.color} flex items-center justify-center`}>
                    <card.icon size={16} />
                  </div>
                </div>
                <div className="text-lg font-bold text-white">{card.value}</div>
                <div className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">{card.label}</div>
                {'sub' in card && card.sub && <div className="text-[9px] text-gray-500 mt-1">{card.sub}</div>}
              </div>
            ))}
          </div>

          <h2 className="text-sm font-semibold text-gold mb-3 uppercase tracking-wider">7-Day Trend</h2>
          <div className="glass rounded-xl p-4 mb-6 overflow-x-auto">
            <div className="flex items-end gap-2 min-w-[420px] h-40">
              {(analytics.dailyChart || []).map(day => (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex flex-col items-center justify-end h-28 gap-0.5">
                    <div className="w-full bg-cyan-500/60 rounded-t" style={{ height: `${(day.activeUsers / maxChartVal) * 100}%`, minHeight: day.activeUsers > 0 ? 4 : 0 }} title={`${day.activeUsers} users`} />
                    <div className="w-full bg-green-500/40 rounded-t" style={{ height: `${(day.games / maxChartVal) * 100}%`, minHeight: day.games > 0 ? 2 : 0 }} title={`${day.games} games`} />
                  </div>
                  <span className="text-[8px] text-gray-500">{day.date.slice(5)}</span>
                  <span className="text-[9px] text-gray-400 font-mono">{day.activeUsers}u</span>
                </div>
              ))}
            </div>
            <div className="flex gap-4 mt-3 text-[9px] text-gray-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-cyan-500/60 rounded" /> Active users</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500/40 rounded" /> Games</span>
            </div>
            <table className="w-full mt-4 text-[10px]">
              <thead>
                <tr className="text-gray-500 border-b border-white/5">
                  <th className="text-left py-1">Date</th>
                  <th className="text-right py-1">Users</th>
                  <th className="text-right py-1">Games</th>
                  <th className="text-right py-1">Deposits</th>
                  <th className="text-right py-1">New</th>
                </tr>
              </thead>
              <tbody>
                {(analytics.dailyChart || []).slice().reverse().map(day => (
                  <tr key={day.date} className="border-b border-white/5 text-gray-300">
                    <td className="py-1.5">{day.date}</td>
                    <td className="text-right">{day.activeUsers}</td>
                    <td className="text-right">{day.games}</td>
                    <td className="text-right">{day.deposits.toLocaleString()}</td>
                    <td className="text-right">{day.newUsers}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <h2 className="text-sm font-semibold text-gold mb-3 uppercase tracking-wider">Platform Overview</h2>
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

      {branding && (
        <div className="glass rounded-xl p-4 mb-6">
          <h3 className="text-sm font-semibold text-white mb-3">Bot Branding Preview</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
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
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <ArrowDown size={16} className="text-gold" />
            Pending Deposits
          </h3>
          <div className="text-2xl font-bold text-gold">{stats.pendingDeposits}</div>
          <div className="text-xs text-gray-400 mt-1">Total deposits: {stats.totalDeposits.toLocaleString()} ETB</div>
        </div>
        <div className="glass rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <ArrowUp size={16} className="text-red-400" />
            Pending Withdrawals
          </h3>
          <div className="text-2xl font-bold text-red-400">{stats.pendingWithdrawals}</div>
          <div className="text-xs text-gray-400 mt-1">Total withdrawals: {stats.totalWithdrawals.toLocaleString()} ETB</div>
        </div>
      </div>
    </div>
  );
}
