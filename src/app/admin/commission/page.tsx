'use client';

import { useEffect, useState } from 'react';
import { Coins, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

export default function CommissionPage() {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const loadReport = () => {
    let url = '/api/admin/data?action=commission';
    if (dateFrom) url += `&dateFrom=${dateFrom}`;
    if (dateTo) url += `&dateTo=${dateTo}`;
    fetch(url)
      .then(r => r.json())
      .then(d => { setReport(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { loadReport(); }, [dateFrom, dateTo]);

  const stats = report ? [
    { label: 'Commission Earned', value: `${(report.totalCommission || 0).toLocaleString()} ETB`, icon: DollarSign, color: 'bg-purple-500/20 text-purple-400' },
    { label: 'Total Bets', value: `${(report.totalBets || 0).toLocaleString()} ETB`, icon: TrendingUp, color: 'bg-blue-500/20 text-blue-400' },
    { label: 'Total Wins', value: `${(report.totalWins || 0).toLocaleString()} ETB`, icon: TrendingDown, color: 'bg-green-500/20 text-green-400' },
    { label: 'Total Deposits', value: `${(report.totalDeposits || 0).toLocaleString()} ETB`, icon: Coins, color: 'bg-yellow-500/20 text-yellow-400' },
  ] : [];

  return (
    <div>
      <h1 className="text-xl font-bold text-white mb-4">Commission</h1>

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap items-center">
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => { setLoading(true); setDateFrom(e.target.value); }}
          className="bg-navy border border-gold-subtle rounded-lg px-3 py-2 text-xs text-white [color-scheme:dark]"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => { setLoading(true); setDateTo(e.target.value); }}
          className="bg-navy border border-gold-subtle rounded-lg px-3 py-2 text-xs text-white [color-scheme:dark]"
        />
        <button
          onClick={() => { setDateFrom(''); setDateTo(''); setLoading(true); }}
          className="px-3 py-2 rounded-lg text-xs bg-white/5 text-gray-400 border border-gold-subtle hover:bg-white/10"
        >
          Reset
        </button>
      </div>

      {loading ? (
        <div className="text-gray-400 text-sm">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((s, i) => (
            <div key={i} className="glass rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider">{s.label}</span>
                <div className={`p-2 rounded-lg ${s.color}`}>
                  <s.icon size={16} />
                </div>
              </div>
              <div className="text-lg font-bold text-white">{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Summary note */}
      {report && (
        <div className="glass rounded-xl p-4 text-xs text-gray-400">
          Commission is calculated per finished game: <span className="text-white font-semibold">(stake × players) − prize pool</span>.
          Each game where at least 1 player joined contributes commission.
          The rate is configured in <span className="text-gold">Settings → Game Config → Commission</span>.
        </div>
      )}
    </div>
  );
}