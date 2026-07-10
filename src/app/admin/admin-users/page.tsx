'use client';

import { useEffect, useState, useCallback } from 'react';
import { Shield, Plus, Trash2, X, Save } from 'lucide-react';

interface AdminUser {
  id: string;
  username: string;
  role: 'super_admin' | 'admin' | 'moderator' | 'support';
  created_at: string;
  last_login: string | null;
}

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'text-red-400 bg-red-500/10 border-red-500/20',
  admin: 'text-gold bg-gold/10 border-gold/20',
  moderator: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  support: 'text-green-400 bg-green-500/10 border-green-500/20',
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<string>('admin');
  const [saving, setSaving] = useState(false);

  // Edit role state
  const [editRoleId, setEditRoleId] = useState<string | null>(null);
  const [editRoleValue, setEditRoleValue] = useState<string>('');

  const loadUsers = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch('/api/admin/admin-users');
      const data = await res.json();
      if (Array.isArray(data)) setUsers(data);
      else setError(data.error || 'Failed to load');
    } catch {
      setError('Failed to load admin users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleCreate = async () => {
    if (!newUsername.trim() || !newPassword.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/admin-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', username: newUsername.trim(), password: newPassword, role: newRole }),
      });
      const data = await res.json();
      if (res.ok) {
        setUsers(prev => [data, ...prev]);
        setShowCreate(false);
        setNewUsername('');
        setNewPassword('');
        setNewRole('admin');
      } else {
        setError(data.error);
      }
    } catch {
      setError('Failed to create user');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateRole = async (id: string) => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/admin-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', id, role: editRoleValue }),
      });
      const data = await res.json();
      if (res.ok) {
        setUsers(prev => prev.map(u => u.id === id ? { ...u, role: data.role } : u));
        setEditRoleId(null);
      } else {
        setError(data.error);
      }
    } catch {
      setError('Failed to update role');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this admin user?')) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/admin-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id }),
      });
      if (res.ok) {
        setUsers(prev => prev.filter(u => u.id !== id));
      } else {
        const data = await res.json();
        setError(data.error);
      }
    } catch {
      setError('Failed to delete user');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Shield size={22} className="text-gold" />
            Admin Users
          </h1>
          <p className="text-[11px] text-gray-400 mt-0.5">Manage role-based access to the admin panel</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 bg-gold text-navy font-bold px-3.5 py-2 rounded-lg text-xs cursor-pointer transition-all hover:bg-gold/90"
        >
          <Plus size={14} />
          Add Admin
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-3 py-2 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300 cursor-pointer"><X size={14} /></button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Loading...</div>
      ) : users.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">No admin users found. Create one to get started.</div>
      ) : (
        <div className="bg-navy rounded-xl overflow-hidden border border-white/5">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/5 bg-navy-light">
                <th className="text-left px-4 py-3 text-gray-400 font-semibold uppercase tracking-wider">Username</th>
                <th className="text-left px-4 py-3 text-gray-400 font-semibold uppercase tracking-wider">Role</th>
                <th className="text-left px-4 py-3 text-gray-400 font-semibold uppercase tracking-wider hidden sm:table-cell">Created</th>
                <th className="text-left px-4 py-3 text-gray-400 font-semibold uppercase tracking-wider hidden md:table-cell">Last Login</th>
                <th className="text-right px-4 py-3 text-gray-400 font-semibold uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center text-gold font-bold text-[11px]">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-white font-medium">{user.username}</span>
                      {user.role === 'super_admin' && (
                        <span className="text-[8px] text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded-full border border-red-500/20">Owner</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {editRoleId === user.id ? (
                      <div className="flex items-center gap-1">
                        <select
                          value={editRoleValue}
                          onChange={e => setEditRoleValue(e.target.value)}
                          className="bg-navy border border-white/10 rounded px-2 py-1 text-white text-[10px]"
                          disabled={user.role === 'super_admin'}
                        >
                          <option value="super_admin">super_admin</option>
                          <option value="admin">admin</option>
                          <option value="moderator">moderator</option>
                          <option value="support">support</option>
                        </select>
                        <button
                          onClick={() => handleUpdateRole(user.id)}
                          disabled={saving}
                          className="text-green-400 hover:text-green-300 cursor-pointer p-0.5"
                        >
                          <Save size={12} />
                        </button>
                        <button
                          onClick={() => setEditRoleId(null)}
                          className="text-gray-400 hover:text-white cursor-pointer p-0.5"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${ROLE_COLORS[user.role] || 'text-gray-400'}`}>
                        {user.role}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-400 hidden sm:table-cell">{new Date(user.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-gray-400 hidden md:table-cell">{user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {user.role !== 'super_admin' && (
                        <>
                          <button
                            onClick={() => { setEditRoleId(user.id); setEditRoleValue(user.role); }}
                            className="text-gray-400 hover:text-gold cursor-pointer p-1 rounded hover:bg-white/5 transition-all"
                            title="Change role"
                          >
                            <Shield size={13} />
                          </button>
                          <button
                            onClick={() => handleDelete(user.id)}
                            className="text-gray-400 hover:text-red-400 cursor-pointer p-1 rounded hover:bg-white/5 transition-all"
                            title="Delete user"
                          >
                            <Trash2 size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-navy border border-white/10 rounded-xl p-5 w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">New Admin User</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-white cursor-pointer"><X size={16} /></button>
            </div>
            <div>
              <label className="text-[10px] text-gray-400 uppercase block mb-1">Username</label>
              <input
                type="text"
                value={newUsername}
                onChange={e => setNewUsername(e.target.value)}
                className="w-full bg-navy-light border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-gold/50"
                placeholder="e.g., johndoe"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 uppercase block mb-1">Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full bg-navy-light border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-gold/50"
                placeholder="Min 6 characters"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 uppercase block mb-1">Role</label>
              <select
                value={newRole}
                onChange={e => setNewRole(e.target.value)}
                className="w-full bg-navy-light border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-gold/50"
              >
                <option value="admin">Admin</option>
                <option value="moderator">Moderator</option>
                <option value="support">Support</option>
              </select>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 bg-navy-light border border-white/10 text-gray-300 font-bold py-2 rounded-lg text-xs cursor-pointer transition-all hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!newUsername.trim() || !newPassword.trim() || saving}
                className="flex-1 bg-gold text-navy font-bold py-2 rounded-lg text-xs cursor-pointer transition-all hover:bg-gold/90 disabled:opacity-40"
              >
                {saving ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
