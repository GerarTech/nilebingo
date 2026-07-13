import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getComboConfig, type WinComboConfig } from '@/lib/server/promotions';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseServiceKey) throw new Error('Missing Supabase environment variables');
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function getComboConfigFromDB(): Promise<WinComboConfig> {
  const { data } = await supabase.from('bot_config').select('commands').eq('id', 'main').single();
  return (data?.commands?.win_combo as WinComboConfig) || { enabled: false };
}

export async function GET(request: NextRequest) {
  try {
    const userId = new URL(request.url).searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 });

    const rawConfig = await getComboConfigFromDB();
    const config = getComboConfig(rawConfig);

    const { data: comboRow } = await supabase
      .from('user_win_combos')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    const consecutiveWins = comboRow?.consecutive_wins || 0;
    const canClaim = config.enabled && consecutiveWins >= config.requiredWins;

    return NextResponse.json({
      enabled: config.enabled,
      consecutiveWins,
      requiredWins: config.requiredWins,
      bonusAmount: config.bonusAmount,
      canClaim,
      totalBonusesClaimed: comboRow?.total_bonuses_claimed || 0,
    });
  } catch (error) {
    console.error('Combo GET error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();
    if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 });

    const rawConfig = await getComboConfigFromDB();
    const config = getComboConfig(rawConfig);

    if (!config.enabled) {
      return NextResponse.json({ error: 'Win Combo is currently disabled.' }, { status: 403 });
    }

    const { data: comboRow } = await supabase
      .from('user_win_combos')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    const consecutiveWins = comboRow?.consecutive_wins || 0;

    if (consecutiveWins < config.requiredWins) {
      return NextResponse.json({
        error: `Need ${config.requiredWins - consecutiveWins} more consecutive wins to claim.`,
        consecutiveWins,
        requiredWins: config.requiredWins,
      }, { status: 400 });
    }

    // Credit bonus to play balance
    const playRes = await supabase.rpc('adjust_play_balance', { p_user_id: userId, p_amount: config.bonusAmount });
    if (playRes.error) {
      return NextResponse.json({ error: 'Failed to credit bonus.' }, { status: 500 });
    }

    // Record transaction
    await supabase.from('transactions').insert({
      user_id: userId,
      type: 'transfer_to_play',
      amount: config.bonusAmount,
      status: 'completed',
      reference: `COMBO-W${consecutiveWins}-${new Date().toISOString().slice(0, 10)}`,
      details: { source: 'win_combo', consecutive_wins: consecutiveWins },
    });

    // Reset combo counter after claiming
    const totalClaimed = (comboRow?.total_bonuses_claimed || 0) + 1;
    await supabase.from('user_win_combos').upsert({
      user_id: userId,
      consecutive_wins: 0,
      last_win_at: new Date().toISOString(),
      total_bonuses_claimed: totalClaimed,
      updated_at: new Date().toISOString(),
    });

    const { data: wallet } = await supabase.from('wallets').select('*').eq('user_id', userId).single();

    return NextResponse.json({
      success: true,
      bonusAmount: config.bonusAmount,
      consecutiveWins,
      wallet,
    });
  } catch (error) {
    console.error('Combo POST error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
