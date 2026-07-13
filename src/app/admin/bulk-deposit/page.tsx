'use client';

import { useState } from 'react';
import { Search, UserCheck, Loader2 } from 'lucide-react';

export default function BulkDepositPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [foundUser, setFoundUser] = useState<any | null>(null);
  const [searching, setSearching] = useState(false);
  const [amount, setAmount] = useState(0);
  const [reason, setReason] = useState('');
  const [depositing, setDepositing] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const searchUser = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setFoundUser(null);
    setResult(null);
    try {
      const res = await fetch(`/api/admin/data?action=users`);
      const data = await res.json();
      const users = data.users || data || [];
      const q = searchQuery.trim().toLowerCase();
      const match = users.find((u: any) =>
        u.telegram_id === q ||
        u.username?.toLowerCase() === q ||
        u.first_name?.toLowerCase().includes(q) ||
        u.id === q
      );
      if (match) setFoundUser(match);
      else setResult('No user found matching that query.');
    } catch {
      setResult('Search failed.');
    }
    setSearching(false);
  };

  const handleDeposit = async () => {
    if (!foundUser || amount <= 0) return;
    setDepositing(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'adjust_balance',
          userId: foundUser.id,
          amount: amount,
          walletType: 'main',
          reason: reason || 'bulk_deposit',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setResult(`✅ Deposited ${amount} ETB to ${foundUser.first_name || foundUser.username || foundUser.telegram_id}`);
        setAmount(0);
        setReason('');
      } else {
        setResult(`❌ Error: ${data.error || 'Unknown error'}`);
      }
    } catch {
      setResult('❌ Deposit failed.');
    }
    setDepositing(false);
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center">
          <span className="text-gold font-black text-sm">$</span>
        </div>
        <div>
          <h1 className="text-lg font-black text-white">Bulk Deposit</h1>
          <p className="text-[10px] text-gray-500">Credit a user&apos;s main wallet instantly</p>
        </div>
      </div>

      <div className="bg-navy rounded-2xl border border-gold-subtle p-4 space-y-4">
        <div>
          <label className="text-[10px] text-gray-400 uppercase block mb-1.5">Find User</label>
          <div className="flex gap-2">
            <input
              type="text" value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && searchUser()}
              placeholder="Telegram ID, username, or name"
              className="flex-1 bg-navy-card border border-gold-subtle rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-gold/50"
            />
            <button onClick={searchUser} disabled={searching}
              className="bg-gold text-navy px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:opacity-90 disabled:opacity-50">
              {searching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              Search
            </button>
          </div>
        </div>

        {foundUser && (
          <div className="bg-navy-card/60 border border-emerald-500/20 rounded-xl p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <UserCheck size={18} className="text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{foundUser.first_name || 'No name'}</p>
              <p className="text-[10px] text-gray-400 truncate">ID: {foundUser.telegram_id} | @{foundUser.username || 'no username'}</p>
            </div>
          </div>
        )}

        {foundUser && (
          <>
            <div>
              <label className="text-[10px] text-gray-400 uppercase block mb-1.5">Amount (ETB)</label>
              <input type="number" min="1" max="100000" step="1" value={amount}
                onChange={e => setAmount(Number(e.target.value) || 0)}
                className="w-full bg-navy-card border border-gold-subtle rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gold/50"
              />
            </div>

            <div>
              <label className="text-[10px] text-gray-400 uppercase block mb-1.5">Reason (optional)</label>
              <input type="text" value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="e.g. promotional credit"
                className="w-full bg-navy-card border border-gold-subtle rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-gold/50"
              />
            </div>

            <button onClick={handleDeposit} disabled={depositing || amount <= 0}
              className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer hover:opacity-90 disabled:opacity-50">
              {depositing ? <Loader2 size={16} className="animate-spin" /> : null}
              {depositing ? 'Processing...' : `Deposit ${amount} ETB to ${foundUser.first_name || foundUser.telegram_id}`}
            </button>
          </>
        )}

        {result && (
          <div className={`text-xs font-medium p-3 rounded-xl ${result.startsWith('✅') ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' : result.startsWith('❌') ? 'bg-red-500/10 text-red-300 border border-red-500/20' : 'bg-gray-500/10 text-gray-300 border border-gray-500/20'}`}>
            {result}
          </div>
        )}
      </div>
    </div>
  );
}
