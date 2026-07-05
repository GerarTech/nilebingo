import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get('gameId');
    const userId = searchParams.get('userId');

    if (!gameId) {
      return NextResponse.json({ error: 'gameId is required' }, { status: 400 });
    }

    let lobbyPlayerCount = 0;
    let reservedCardCount = 0;
    let prizePool = 0;
    let gameStatus: string | null = null;
    let winnerId: string | null = null;

    // Get game info if it exists
    const { data: game } = await supabase
      .from('games')
      .select('id, status, winner_id, prize_pool')
      .eq('code', gameId)
      .maybeSingle();

    if (game) {
      gameStatus = game.status;
      winnerId = game.winner_id;
      prizePool = Number(game.prize_pool) || 0;

      const { count } = await supabase
        .from('game_players')
        .select('*', { count: 'exact', head: true })
        .eq('game_id', game.id)
        .eq('is_watching', false);
      if (count !== null) lobbyPlayerCount = count;
    }

    // Get card reservations count
    const { data: reservations } = await supabase
      .from('game_card_reservations')
      .select('card_number, user_id', { count: 'exact' })
      .eq('game_code', gameId);

    const realReservations = (reservations || []).filter(r => Number(r.card_number) > 0);
    reservedCardCount = realReservations.length;

    if (reservations && lobbyPlayerCount === 0) {
      const uniqueUsers = new Set(reservations.map(r => r.user_id));
      lobbyPlayerCount = Math.max(uniqueUsers.size, lobbyPlayerCount);
    }

    return NextResponse.json({
      success: true,
      lobbyPlayerCount,
      reservedCardCount,
      prizePool,
      gameStatus,
      winnerId,
      serverTime: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Heartbeat error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
