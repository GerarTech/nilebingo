'use client';

import { useEffect, useState } from 'react';
import { Search, Check, X, Phone, User as UserIcon, Wallet, ArrowUpDown, Trash2, AlertTriangle } from 'lucide-react';

interface UserWithWallet {
  id: string;
  telegram_id: string;
  username?: string;
  first_name?: string;
  phone?: string;
  language: string;
  verified: boolean;
  created_at: string;
  wallet: { main_balance: number; play_balance: number } | null;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserWithWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustType, setAdjustType] = useState<'main' | 'play'>('main');
  const [adjustReason, setAdjustReason] = useState('');
  const [setValue, setSetValue] = useState('');
  const [setType, setSetType] = useState<'main' | 'play'>('main');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const loadUsers = () => {
    fetch('/api/admin/data?action=users')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setUsers(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { loadUsers(); }, []);

  const loadUserDetail = async (userId: string) => {
    const res = await fetch(`/api/admin/data?action=user&userId=${userId}`);
    const data = await res.json();
    setSelectedUser(data);
    setConfirmDelete(false);
  };

  const handleAdjustBalance = async () => {
    if (!selectedUser || !adjustAmount || !adjustReason) return;
    const amount = parseFloat(adjustAmount);
    if (isNaN(amount)) return;

    await fetch('/api/admin/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'adjust_balance',
        userId: selectedUser.id,
        amount,
        walletType: adjustType,
        reason: adjustReason,
      }),
    });

    setAdjustAmount('');
    setAdjustReason('');
    loadUserDetail(selectedUser.id);
    loadUsers();
  };

  const handleSetBalance = async () => {
    if (!selectedUser || !setValue) return;
    const value = parseFloat(setValue);
    if (isNaN(value) || value < 0) return;

    await fetch('/api/admin/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'set_balance',
        userId: selectedUser.id,
        value,
        walletType: setType,
      }),
    });

    setSetValue('');
    loadUserDetail(selectedUser.id);
    loadUsers();
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    await fetch('/api/admin/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'delete_user',
        userId: selectedUser.id,
      }),
    });
    setSelectedUser(null);
    loadUsers();
  };

  const filtered = users.filter(u =>
    u.first_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.telegram_id?.includes(search) ||
    u.phone?.includes(search)
  );

  if (loading) return <div className="text-gray-400 text-sm">Loading users...</div>;

  return (
    <div>
      <h1 className="text-xl font-bold text-white mb-4">Users</h1>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-navy border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-gold/50"
          placeholder="Search by name, username, ID, or phone..."
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Users List */}
        <div className="lg:col-span-2 space-y-2 max-h-[70vh] overflow-y-auto">
          {filtered.map((user) => (
            <div
              key={user.id}
              onClick={() => loadUserDetail(user.id)}
              className={`glass rounded-xl p-3 cursor-pointer transition-all hover:bg-white/5 ${selectedUser?.id === user.id ? 'ring-1 ring-gold/50' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-gold flex items-center justify-center">
                    <UserIcon size={18} className="text-navy" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">
                      {user.first_name || 'Unknown'}
                      {user.verified && <Check size={12} className="inline ml-1 text-gold" />}
                    </div>
                    <div className="text-[10px] text-gray-500">
                      {user.username ? `@${user.username}` : 'No username'} · ID: {user.telegram_id}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-gold">
                    {user.wallet ? (user.wallet.main_balance + user.wallet.play_balance).toLocaleString() : '0'} ETB
                  </div>
                  {user.phone && <div className="text-[10px] text-gray-500 flex items-center gap-1"><Phone size={10} />{user.phone}</div>}
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div className="text-gray-500 text-sm text-center py-8">No users found</div>}
        </div>

        {/* User Detail */}
        <div className="glass rounded-xl p-4 max-h-[70vh] overflow-y-auto">
          {selectedUser ? (
            <div>
              <h3 className="text-sm font-bold text-white mb-3">User Details</h3>
              <div className="space-y-2 text-xs">
                <div><span className="text-gray-500">Name:</span> <span className="text-white">{selectedUser.first_name || 'N/A'}</span></div>
                <div><span className="text-gray-500">Username:</span> <span className="text-white">{selectedUser.username ? `@${selectedUser.username}` : 'N/A'}</span></div>
                <div><span className="text-gray-500">Telegram ID:</span> <span className="text-white">{selectedUser.telegram_id}</span></div>
                <div><span className="text-gray-500">Phone:</span> <span className="text-white">{selectedUser.phone || 'Not shared'}</span></div>
                <div><span className="text-gray-500">Language:</span> <span className="text-white uppercase">{selectedUser.language}</span></div>
                <div><span className="text-gray-500">Verified:</span> <span className={selectedUser.verified ? 'text-gold' : 'text-gray-500'}>{selectedUser.verified ? 'Yes' : 'No'}</span></div>
                <div><span className="text-gray-500">Joined:</span> <span className="text-white">{new Date(selectedUser.created_at).toLocaleDateString()}</span></div>
              </div>

              {/* Wallet */}
              {selectedUser.wallet && (
                <div className="mt-4 p-3 bg-navy rounded-xl">
                  <div className="flex items-center gap-2 mb-2"><Wallet size={14} className="text-gold" /><span className="text-xs font-semibold text-white">Wallet</span></div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between"><span className="text-gray-500">Main:</span><span className="text-white font-bold">{selectedUser.wallet.main_balance.toLocaleString()} ETB</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Play:</span><span className="text-gold font-bold">{selectedUser.wallet.play_balance.toLocaleString()} ETB</span></div>
                  </div>
                </div>
              )}

              {/* Set Exact Balance (no notification) */}
              {selectedUser.wallet && (
                <div className="mt-4 p-3 bg-navy rounded-xl">
                  <h4 className="text-xs font-semibold text-white mb-2">Set Exact Balance <span className="text-[8px] text-gray-500 font-normal">(no notification)</span></h4>
                  <div className="space-y-2">
                    <select value={setType} onChange={(e) => setSetType(e.target.value as any)} className="w-full bg-navy-light border border-white/10 rounded-lg px-3 py-2 text-xs text-white">
                      <option value="main">Main Wallet</option>
                      <option value="play">Play Wallet</option>
                    </select>
                    <input type="number" value={setValue} onChange={(e) => setSetValue(e.target.value)} placeholder="Exact new balance" className="w-full bg-navy-light border border-white/10 rounded-lg px-3 py-2 text-xs text-white" />
                    <button onClick={handleSetBalance} className="w-full bg-emerald-600 text-white font-bold py-2 rounded-lg text-xs hover:bg-emerald-500">Set Balance</button>
                  </div>
                </div>
              )}

              {/* Adjust Balance (with notification) */}
              <div className="mt-4 p-3 bg-navy rounded-xl">
                <h4 className="text-xs font-semibold text-white mb-2">Adjust Balance <span className="text-[8px] text-gray-500 font-normal">(sends notification)</span></h4>
                <div className="space-y-2">
                  <select value={adjustType} onChange={(e) => setAdjustType(e.target.value as any)} className="w-full bg-navy-light border border-white/10 rounded-lg px-3 py-2 text-xs text-white">
                    <option value="main">Main Wallet</option>
                    <option value="play">Play Wallet</option>
                  </select>
                  <input type="number" value={adjustAmount} onChange={(e) => setAdjustAmount(e.target.value)} placeholder="Amount (+/-)" className="w-full bg-navy-light border border-white/10 rounded-lg px-3 py-2 text-xs text-white" />
                  <input type="text" value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} placeholder="Reason" className="w-full bg-navy-light border border-white/10 rounded-lg px-3 py-2 text-xs text-white" />
                  <button onClick={handleAdjustBalance} className="w-full bg-gold text-navy font-bold py-2 rounded-lg text-xs">Apply Adjustment</button>
                </div>
              </div>

              {/* Delete User */}
              <div className="mt-4 p-3 bg-red-900/20 border border-red-500/20 rounded-xl">
                <h4 className="text-xs font-semibold text-red-400 mb-2 flex items-center gap-1"><Trash2 size={12} /> Delete User</h4>
                {!confirmDelete ? (
                  <button onClick={() => setConfirmDelete(true)} className="w-full bg-red-500/10 border border-red-500/30 text-red-400 font-bold py-2 rounded-lg text-xs hover:bg-red-500/20">
                    Delete This User
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-[10px] text-red-300">
                      <AlertTriangle size={12} /> This will permanently delete the user and all associated data.
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleDeleteUser} className="flex-1 bg-red-600 text-white font-bold py-2 rounded-lg text-xs hover:bg-red-500">
                        Confirm Delete
                      </button>
                      <button onClick={() => setConfirmDelete(false)} className="flex-1 bg-navy border border-white/10 text-gray-300 font-bold py-2 rounded-lg text-xs hover:bg-white/5">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Recent Transactions */}
              {selectedUser.transactions && selectedUser.transactions.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-xs font-semibold text-white mb-2">Recent Transactions</h4>
                  <div className="space-y-1">
                    {selectedUser.transactions.slice(0, 5).map((tx: any) => (
                      <div key={tx.id} className="flex justify-between text-[10px] py-1 border-b border-white/5">
                        <span className={tx.type === 'deposit' || tx.type === 'win' ? 'text-green-400' : 'text-red-400'}>{tx.type}</span>
                        <span className="text-white">{tx.amount} ETB</span>
                        <span className="text-gray-500">{tx.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-gray-500 text-xs text-center py-8">Select a user to view details</div>
          )}
        </div>
      </div>
    </div>
  );
}