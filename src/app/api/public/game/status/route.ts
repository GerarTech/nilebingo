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
      .select('id, status, winner_id')
      .eq('code', gameCode);

    const finishedGame = (games || []).find(g => g.status === 'finished' && g.winner_id);

    if (finishedGame) {
      let winnerName = 'Opponent';
      try {
        const { data: winnerProfile } = await supabase
          .from('profiles')
          .select('first_name, username')
          .eq('id', finishedGame.winner_id)
          .maybeSingle();
        if (winnerProfile) {
          winnerName = winnerProfile.first_name || winnerProfile.username || 'Opponent';
        }
      } catch {}

      return NextResponse.json({
        finished: true,
        winner_id: finishedGame.winner_id,
        winner_name: winnerName,
        game_id: finishedGame.id,
      });
    }

    return NextResponse.json({ finished: false });
  } catch (err) {
    console.error('Game status check error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
