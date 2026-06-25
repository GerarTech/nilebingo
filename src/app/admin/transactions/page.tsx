'use client';

import { useEffect, useState } from 'react';
import { Check, X, Filter } from 'lucide-react';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const loadTransactions = () => {
    let url = '/api/admin/data?action=transactions&limit=100';
    if (filterType) url += `&type=${filterType}`;
    if (filterStatus) url += `&status=${filterStatus}`;
    fetch(url)
      .then(r => r.json())
      .then(d => { setTransactions(d.transactions || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { loadTransactions(); }, [filterType, filterStatus]);

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

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="bg-navy border border-white/10 rounded-lg px-3 py-2 text-xs text-white">
          <option value="">All Types</option>
          <option value="deposit">Deposit</option>
          <option value="withdraw">Withdraw</option>
          <option value="bet">Bet</option>
          <option value="win">Win</option>
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-navy border border-white/10 rounded-lg px-3 py-2 text-xs text-white">
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>
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
                <th className="text-center p-3 font-medium">Status</th>
                <th className="text-right p-3 font-medium">Date</th>
                <th className="text-center p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx: any) => (
                <tr key={tx.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="p-3 text-white">
                    {tx.profiles?.first_name || tx.profiles?.username || 'Unknown'}
                    <div className="text-[9px] text-gray-500">{tx.profiles?.telegram_id || ''}</div>
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
                        <button onClick={() => handleApprove(tx.id)} className="p-1.5 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30">
                          <Check size={14} />
                        </button>
                        <button onClick={() => handleReject(tx.id)} className="p-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30">
                          <X size={14} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-gray-500">No transactions found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}