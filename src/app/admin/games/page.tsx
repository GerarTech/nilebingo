'use client';

import { useEffect, useState } from 'react';
import { Users, RefreshCw, Search } from 'lucide-react';

const statusLabel: Record<string, { text: string; color: string }> = {
  lobby: { text: 'Lobby', color: 'text-yellow-400' },
  active: { text: 'Active', color: 'text-green-400' },
  finished: { text: 'Finished', color: 'text-gray-400' },
};

export default function GamesPage() {
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState<any>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [search, setSearch] = useState('');

  const loadGames = (q?: string) => {
    const params = new URLSearchParams({ action: 'games' });
    if (q) params.set('search', q);
    fetch(`/api/admin/data?${params}`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setGames(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadGames();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => loadGames(search), 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, search]);

  const loadGameDetail = async (gameId: string) => {
    const res = await fetch(`/api/admin/data?action=game&gameId=${gameId}`);
    const data = await res.json();
    setSelectedGame(data);
  };

  const handleSearch = (val: string) => {
    setSearch(val);
    setLoading(true);
    loadGames(val || undefined);
  };

  if (loading) return <div className="text-gray-400 text-sm">Loading games...</div>;

  return (
    <div>
      <h1 className="text-xl font-bold text-white mb-4">Games</h1>

      {/* Search + Auto-refresh */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by game code or ID..."
            className="w-full bg-navy-light border border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-gold/50"
          />
        </div>
        <button
          onClick={() => setAutoRefresh(!autoRefresh)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${
            autoRefresh ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
          }`}
        >
          <RefreshCw size={12} className={autoRefresh ? 'animate-spin' : ''} />
          {autoRefresh ? 'Auto ON' : 'Auto'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Games List */}
        <div className="lg:col-span-2 space-y-2 max-h-[70vh] overflow-y-auto">
          {games.map((game: any) => {
            const st = statusLabel[game.status] || { text: game.status, color: 'text-gray-400' };
            return (
              <div
                key={game.id}
                onClick={() => loadGameDetail(game.id)}
                className={`glass rounded-xl p-3 cursor-pointer transition-all hover:bg-white/5 ${selectedGame?.id === game.id ? 'ring-1 ring-gold/50' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-white">#{game.code}</div>
                    <div className="text-[10px] text-gray-500">{game.id.slice(0, 8)}...</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-xs font-bold ${st.color}`}>{st.text}</div>
                    <div className="text-[10px] text-gray-500">{game.drawn_numbers?.length || 0}/75</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-500">
                  <span>{game.stakes?.amount || 'N/A'} ETB</span>
                  <span>{Number(game.prize_pool || 0).toLocaleString()} ETB</span>
                  {game.winner_id && <span className="text-gold">{game.profiles?.username || game.profiles?.first_name || 'N/A'}</span>}
                </div>
              </div>
            );
          })}
          {games.length === 0 && <div className="text-gray-500 text-sm text-center py-8">No games found</div>}
        </div>

        {/* Game Detail */}
        <div className="glass rounded-xl p-4 max-h-[70vh] overflow-y-auto">
          {selectedGame ? (
            <div>
              <h3 className="text-sm font-bold text-white mb-3">#{selectedGame.code}</h3>
              <div className="space-y-2 text-xs">
                <div><span className="text-gray-500">Status:</span> <span className="text-white capitalize">{(statusLabel[selectedGame.status] || { text: selectedGame.status }).text}</span></div>
                <div><span className="text-gray-500">Stake:</span> <span className="text-white">{selectedGame.stakes?.amount || 'N/A'} ETB</span></div>
                <div><span className="text-gray-500">Prize Pool:</span> <span className="text-gold font-bold">{Number(selectedGame.prize_pool || 0).toLocaleString()} ETB</span></div>
                <div><span className="text-gray-500">Called:</span> <span className="text-white">{selectedGame.drawn_numbers?.length || 0}/75</span></div>
                <div><span className="text-gray-500">Winner:</span> <span className="text-white">{selectedGame.profiles?.username || selectedGame.profiles?.first_name || 'None yet'}</span></div>
                <div><span className="text-gray-500">Created:</span> <span className="text-white">{new Date(selectedGame.created_at).toLocaleString()}</span></div>
              </div>

              {selectedGame.status !== 'finished' && (
                <button
                  onClick={async () => {
                    if (!confirm('Mark this game as finished?')) return;
                    await fetch('/api/admin/data', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ action: 'finish_game', gameId: selectedGame.id }),
                    });
                    loadGames(search);
                    setSelectedGame(null);
                  }}
                  className="mt-4 w-full py-2 rounded-xl text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-all cursor-pointer"
                >
                  Mark as Finished
                </button>
              )}
              {selectedGame.players && selectedGame.players.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-xs font-semibold text-white mb-2 flex items-center gap-1"><Users size={12} /> Players ({selectedGame.players.length})</h4>
                  <div className="space-y-1">
                    {selectedGame.players.map((p: any) => (
                      <div key={p.id} className="flex justify-between text-[10px] py-1 border-b border-white/5">
                        <span className="text-white">{p.profiles?.username || p.profiles?.first_name || 'Unknown'}</span>
                        <span className="text-gray-500">{p.is_watching ? 'Watching' : 'Playing'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-gray-500 text-xs text-center py-8">Select a game to view details</div>
          )}
        </div>
      </div>
    </div>
  );
}