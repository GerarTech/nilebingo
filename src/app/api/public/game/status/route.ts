import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseServiceKey) throw new Error('Missing Supabase environment variables');
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gameCode = searchParams.get('gameCode');

    if (!gameCode) {
      return NextResponse.json({ error: 'gameCode is required' }, { status: 400 });
    }

    const { data: games } = await supabase
      .from('games')
      .select('id, status, winner_id, winners')
      .eq('code', gameCode);

    const finishedGame = (games || []).find(g => (g.status === 'finished' && g.winner_id) || (g.winners && (g.winners as any[]).length > 0));

    if (finishedGame) {
      let winnerName = 'Opponent';
      const winnersList = (finishedGame.winners as any[]) || [];
      const winnerId = finishedGame.winner_id || (winnersList[0] && winnersList[0].user_id);
      try {
        if (winnerId) {
          const { data: winnerProfile } = await supabase
            .from('profiles')
            .select('first_name, username')
            .eq('id', winnerId)
            .maybeSingle();
          if (winnerProfile) {
            winnerName = winnerProfile.first_name || winnerProfile.username || 'Opponent';
          }
        } else if (winnersList[0] && winnersList[0].name) {
          winnerName = winnersList[0].name;
        }
      } catch {}

      return NextResponse.json({
        finished: true,
        winner_id: winnerId,
        winner_name: winnerName,
        game_id: finishedGame.id,
        winners: winnersList,
      });
    }

    return NextResponse.json({ finished: false });
  } catch (err) {
    console.error('Game status check error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
