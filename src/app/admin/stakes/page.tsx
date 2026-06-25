'use client';

import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';

export default function StakesPage() {
  const [stakes, setStakes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newAmount, setNewAmount] = useState('');

  const loadStakes = () => {
    fetch('/api/admin/data?action=stakes')
      .then(r => r.json())
      .then(d => { setStakes(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { loadStakes(); }, []);

  const toggleStatus = async (stakeId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'open' ? 'closed' : 'open';
    await fetch('/api/admin/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_stake', stakeId, updates: { status: newStatus } }),
    });
    loadStakes();
  };

  const createStake = async () => {
    if (!newAmount) return;
    const amount = parseFloat(newAmount);
    if (isNaN(amount)) return;

    await fetch('/api/admin/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create_stake', amount }),
    });
    setNewAmount('');
    loadStakes();
  };

  if (loading) return <div className="text-gray-400 text-sm">Loading stakes...</div>;

  return (
    <div>
      <h1 className="text-xl font-bold text-white mb-4">Stakes Configuration</h1>

      {/* Existing Stakes */}
      <div className="glass rounded-xl p-4 mb-4">
        <h3 className="text-sm font-semibold text-white mb-3">Current Stakes</h3>
        <div className="space-y-2">
          {stakes.map((stake: any) => (
            <div key={stake.id} className="flex items-center justify-between p-3 bg-navy rounded-xl">
              <div>
                <span className="text-white font-bold text-sm">{Number(stake.amount).toLocaleString()} ETB</span>
                <span className={`ml-2 text-[10px] px-2 py-0.5 rounded-full ${stake.status === 'open' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                  {stake.status}
                </span>
              </div>
              <button onClick={() => toggleStatus(stake.id, stake.status)} className={`text-xs px-3 py-1.5 rounded-lg font-medium ${stake.status === 'open' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                {stake.status === 'open' ? 'Close' : 'Open'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Add New Stake */}
      <div className="glass rounded-xl p-4">
        <h3 className="text-sm font-semibold text-white mb-3">Add New Stake</h3>
        <div className="flex gap-2">
          <input
            type="number"
            value={newAmount}
            onChange={(e) => setNewAmount(e.target.value)}
            placeholder="Amount in ETB"
            className="flex-1 bg-navy border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-gold/50"
          />
          <button onClick={createStake} className="bg-gold text-navy font-bold px-4 rounded-lg text-sm hover:opacity-90 flex items-center gap-1">
            <Plus size={16} /> Add
          </button>
        </div>
      </div>
    </div>
  );
}