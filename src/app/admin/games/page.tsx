'use client';

import { useEffect, useState } from 'react';
import { Eye, Users, Trophy } from 'lucide-react';

export default function GamesPage() {
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState<any>(null);

  useEffect(() => {
    fetch('/api/admin/data?action=games')
      .then(r => r.json())
      .then(d => { setGames(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const loadGameDetail = async (gameId: string) => {
    const res = await fetch(`/api/admin/data?action=game&gameId=${gameId}`);
    const data = await res.json();
    setSelectedGame(data);
  };

  if (loading) return <div className="text-gray-400 text-sm">Loading games...</div>;

  return (
    <div>
      <h1 className="text-xl font-bold text-white mb-4">Games</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Games List */}
        <div className="lg:col-span-2 space-y-2 max-h-[70vh] overflow-y-auto">
          {games.map((game: any) => (
            <div
              key={game.id}
              onClick={() => loadGameDetail(game.id)}
              className={`glass rounded-xl p-3 cursor-pointer transition-all hover:bg-white/5 ${selectedGame?.id === game.id ? 'ring-1 ring-gold/50' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-white">Game #{game.code}</div>
                  <div className="text-[10px] text-gray-500">ID: {game.id.slice(0, 8)}...</div>
                </div>
                <div className="text-right">
                  <div className={`text-xs font-bold ${game.status === 'active' ? 'text-green-400' : game.status === 'lobby' ? 'text-yellow-400' : 'text-gray-400'}`}>
                    {game.status}
                  </div>
                  <div className="text-[10px] text-gray-500">{game.drawn_numbers?.length || 0}/75 calls</div>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-500">
                <span>Stake: {game.stakes?.amount || 'N/A'} ETB</span>
                <span>Prize: {Number(game.prize_pool || 0).toLocaleString()} ETB</span>
                {game.winner_id && <span className="text-gold">Winner: {game.profiles?.username || game.profiles?.first_name || 'N/A'}</span>}
              </div>
            </div>
          ))}
          {games.length === 0 && <div className="text-gray-500 text-sm text-center py-8">No games found</div>}
        </div>

        {/* Game Detail */}
        <div className="glass rounded-xl p-4 max-h-[70vh] overflow-y-auto">
          {selectedGame ? (
            <div>
              <h3 className="text-sm font-bold text-white mb-3">Game #{selectedGame.code}</h3>
              <div className="space-y-2 text-xs">
                <div><span className="text-gray-500">Status:</span> <span className="text-white capitalize">{selectedGame.status}</span></div>
                <div><span className="text-gray-500">Stake:</span> <span className="text-white">{selectedGame.stakes?.amount || 'N/A'} ETB</span></div>
                <div><span className="text-gray-500">Prize Pool:</span> <span className="text-gold font-bold">{Number(selectedGame.prize_pool || 0).toLocaleString()} ETB</span></div>
                <div><span className="text-gray-500">Numbers Called:</span> <span className="text-white">{selectedGame.drawn_numbers?.length || 0}/75</span></div>
                <div><span className="text-gray-500">Winner:</span> <span className="text-white">{selectedGame.profiles?.username || selectedGame.profiles?.first_name || 'None yet'}</span></div>
                <div><span className="text-gray-500">Created:</span> <span className="text-white">{new Date(selectedGame.created_at).toLocaleString()}</span></div>
              </div>

              {/* Players */}
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