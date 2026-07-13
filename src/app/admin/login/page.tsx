'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();

      if (data.success && data.token) {
        document.cookie = `admin_session=${data.token}; path=/; max-age=86400`;
        document.cookie = `admin_username=${data.session.username}; path=/; max-age=86400`;
        document.cookie = `admin_role=${data.session.role}; path=/; max-age=86400`;
        router.push('/admin/dashboard');
      } else {
        setError(data.error || 'Invalid credentials');
      }
    } catch {
      setError('Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#283782] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-gold">ADMIN</h1>
          <p className="text-gray-400 text-sm mt-2">Nile Bingo Admin Panel</p>
        </div>
        <form onSubmit={handleLogin} className="bg-navy-card rounded-2xl p-6 space-y-4">
          <div>
            <label className="text-xs text-gray-400 uppercase block mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-navy border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-gold/50"
              placeholder="Enter username"
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 uppercase block mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-navy border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-gold/50"
              placeholder="Enter password"
            />
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full bg-gold text-navy font-bold py-3 rounded-xl text-sm disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
