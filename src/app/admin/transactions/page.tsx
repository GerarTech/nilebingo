'use client';

import { useEffect, useState } from 'react';
import { Check, X, Search, RefreshCw } from 'lucide-react';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterBank, setFilterBank] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);

  const loadTransactions = () => {
    let url = '/api/admin/data?action=transactions&limit=100';
    if (filterType) url += `&type=${filterType}`;
    if (filterStatus) url += `&status=${filterStatus}`;
    if (filterBank) url += `&bankName=${encodeURIComponent(filterBank)}`;
    if (dateFrom) url += `&dateFrom=${dateFrom}`;
    if (dateTo) url += `&dateTo=${dateTo}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    fetch(url)
      .then(r => r.json())
      .then(d => { setTransactions(d.transactions || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { loadTransactions(); }, [filterType, filterStatus, filterBank, dateFrom, dateTo, search]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(loadTransactions, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleApprove = async (txId: string) => {
    await fetch('/api/admin/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve_transaction', transactionId: txId }),
    });
    loadTransactions();
  };

  const handleReject = async (txId: string) => {
    await fetch('/api/admin/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject_transaction', transactionId: txId }),
    });
    loadTransactions();
  };

  if (loading) return <div className="text-gray-400 text-sm">Loading transactions...</div>;

  return (
    <div>
      <h1 className="text-xl font-bold text-white mb-4">Transactions</h1>

      {/* Auto-refresh */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setAutoRefresh(!autoRefresh)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${
            autoRefresh ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
          }`}
        >
          <RefreshCw size={12} className={autoRefresh ? 'animate-spin' : ''} />
          {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh'}
        </button>
        <span className="text-[10px] text-gray-500">{transactions.length} transactions</span>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="bg-navy border border-white/10 rounded-lg px-3 py-2 text-xs text-white min-w-[110px]">
          <option value="">All Types</option>
          <option value="deposit">Deposit</option>
          <option value="withdraw">Withdraw</option>
          <option value="bet">Bet</option>
          <option value="win">Win</option>
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-navy border border-white/10 rounded-lg px-3 py-2 text-xs text-white min-w-[110px]">
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>
        <input
          type="text"
          value={filterBank}
          onChange={(e) => setFilterBank(e.target.value)}
          placeholder="Bank name..."
          className="bg-navy border border-white/10 rounded-lg px-3 py-2 text-xs text-white min-w-[130px]"
        />
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="bg-navy border border-white/10 rounded-lg px-3 py-2 text-xs text-white [color-scheme:dark]"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="bg-navy border border-white/10 rounded-lg px-3 py-2 text-xs text-white [color-scheme:dark]"
        />
        <div className="relative min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search user or TX ID..."
            className="bg-navy border border-white/10 rounded-lg pl-8 pr-3 py-2 text-xs text-white w-full"
          />
        </div>
      </div>

      {/* Transactions Table */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/5 text-gray-500">
                <th className="text-left p-3 font-medium">User</th>
                <th className="text-left p-3 font-medium">Type</th>
                <th className="text-right p-3 font-medium">Amount</th>
                <th className="text-left p-3 font-medium">TX ID</th>
                <th className="text-left p-3 font-medium">Bank</th>
                <th className="text-center p-3 font-medium">Status</th>
                <th className="text-right p-3 font-medium">Date</th>
                <th className="text-center p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
                  {transactions.map((tx: any) => (
                <tr key={tx.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="p-3 text-white">
                    <div className="font-semibold">{tx.profiles?.first_name || tx.profiles?.username || 'Unknown'}</div>
                    <div className="text-[9px] text-gray-500">
                      {tx.profiles?.phone ? `📞 ${tx.profiles.phone}` : ''}
                      {tx.profiles?.username ? ` @${tx.profiles.username}` : ''}
                    </div>
                    <div className="text-[9px] text-gray-600">ID: {tx.profiles?.telegram_id || ''}</div>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-medium ${
                      tx.type === 'deposit' ? 'bg-green-500/20 text-green-400' :
                      tx.type === 'withdraw' ? 'bg-red-500/20 text-red-400' :
                      tx.type === 'win' ? 'bg-gold/20 text-gold' :
                      'bg-blue-500/20 text-blue-400'
                    }`}>{tx.type}</span>
                  </td>
                  <td className="p-3 text-right text-white font-bold">{Number(tx.amount).toLocaleString()} ETB</td>
                  <td className="p-3 text-left">
                    <span className="text-white font-mono text-[10px]" title={tx.reference}>{tx.reference ? (tx.reference.length > 16 ? tx.reference.slice(0, 16) + '...' : tx.reference) : '-'}</span>
                  </td>
                  <td className="p-3 text-left">
                    <span className="text-gray-300 text-[10px]">{tx.details?.bank_name || '-'}</span>
                  </td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-medium ${
                      tx.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                      tx.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>{tx.status}</span>
                  </td>
                  <td className="p-3 text-right text-gray-400">{new Date(tx.created_at).toLocaleDateString()}</td>
                  <td className="p-3 text-center">
                    {tx.status === 'pending' && (
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => handleApprove(tx.id)} className="p-1.5 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30" title="Approve">
                          <Check size={14} />
                        </button>
                        <button onClick={() => handleReject(tx.id)} className="p-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30" title="Reject">
                          <X size={14} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr><td colSpan={8} className="p-8 text-center text-gray-500">No transactions found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}