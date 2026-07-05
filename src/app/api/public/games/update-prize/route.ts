import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseServiceKey) throw new Error('Missing Supabase environment variables');
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, stakeAmount } = body;
    if (!code) return NextResponse.json({ error: 'code is required' }, { status: 400 });

    // Call the DB RPC to update and return the prize pool
    try {
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('update_game_prize_pool', { p_game_code: code, p_stake_amt: Number(stakeAmount) || 0 });
      if (rpcErr) {
        console.error('RPC error updating prize pool:', rpcErr);
        return NextResponse.json({ error: 'rpc_error', details: rpcErr }, { status: 500 });
      }
      return NextResponse.json({ success: true, prizePool: rpcRes });
    } catch (e) {
      console.error('Failed to run update_game_prize_pool RPC:', e);
      return NextResponse.json({ error: 'internal' }, { status: 500 });
    }
  } catch (err: any) {
    console.error('Error in update-prize route:', err);
    return NextResponse.json({ error: err.message || 'Internal Error' }, { status: 500 });
  }
}
