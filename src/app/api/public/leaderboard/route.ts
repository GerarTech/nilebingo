import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  try {
    // Fetch profiles
    const { data: profiles, error: pError } = await supabase
      .from('profiles')
      .select('id, username, first_name, photo_url');

    if (pError) throw pError;

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ leaderboard: [] });
    }

    // Fetch wallets for those profiles
    const { data: wallets, error: wError } = await supabase
      .from('wallets')
      .select('user_id, main_balance, play_balance');

    if (wError) throw wError;

    // Map and calculate total balance
    const mapped = profiles.map(profile => {
      const wallet = wallets?.find(w => w.user_id === profile.id);
      const mainBal = wallet ? Number(wallet.main_balance) || 0 : 0;
      const playBal = wallet ? Number(wallet.play_balance) || 0 : 0;
      return {
        id: profile.id,
        username: profile.first_name || (profile.username ? `@${profile.username}` : 'Anonymous'),
        earnings: mainBal, // We'll count main_balance as their earnings/funds
        avatar: profile.photo_url || '👤',
        isUser: false
      };
    });

    // Sort by earnings descending
    const sorted = mapped.sort((a, b) => b.earnings - a.earnings);

    return NextResponse.json({ leaderboard: sorted }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0'
      }
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json({ leaderboard: [] });
  }
}
