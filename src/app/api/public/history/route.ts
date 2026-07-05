import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const { data: history, error } = await supabase
      .from('game_history')
      .select('id, game_id, stake, win_amount, numbers_matched, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    // Also fetch game codes for each entry
    const gameIds = [...new Set((history || []).map((h: any) => h.game_id))];
    const { data: games } = await supabase
      .from('games')
      .select('id, code')
      .in('id', gameIds);

    const gameCodeMap = new Map(games?.map((g: any) => [g.id, g.code]) || []);

    const enriched = (history || []).map((h: any) => ({
      id: h.id,
      gameId: h.game_id,
      gameCode: gameCodeMap.get(h.game_id) || h.game_id.slice(0, 8),
      stake: Number(h.stake),
      winAmount: Number(h.win_amount),
      numbersMatched: h.numbers_matched,
      result: Number(h.win_amount) > 0 ? 'win' : 'loss',
      createdAt: h.created_at,
    }));

    return NextResponse.json({ history: enriched });
  } catch (error) {
    console.error('Error fetching game history:', error);
    return NextResponse.json({ history: [] });
  }
}
