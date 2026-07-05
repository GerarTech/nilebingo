import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const currentUserId = searchParams.get('userId') || '';

    const { data: wins } = await supabase
      .from('game_history')
      .select('user_id, win_amount')
      .gt('win_amount', 0);

    if (!wins || wins.length === 0) {
      return NextResponse.json({ leaderboard: [] });
    }

    const aggregator: Record<string, number> = {};
    for (const w of wins) {
      aggregator[w.user_id] = (aggregator[w.user_id] || 0) + Number(w.win_amount);
    }

    const userIds = Object.keys(aggregator);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, first_name, photo_url')
      .in('id', userIds);

    const profileMap = new Map(profiles?.map((p: any) => [p.id, p]) || []);

    const entries = userIds
      .map(id => ({
        id,
        username: profileMap.get(id)?.first_name || profileMap.get(id)?.username || 'Anonymous',
        earnings: aggregator[id],
        avatar: profileMap.get(id)?.photo_url || '👤',
        isUser: id === currentUserId,
      }))
      .sort((a, b) => b.earnings - a.earnings)
      .slice(0, 50);

    return NextResponse.json({ leaderboard: entries }, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json({ leaderboard: [] });
  }
}
