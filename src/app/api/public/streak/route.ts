import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  getEthiopiaDateString,
  getStreakRewardForDay,
  type DailyStreakConfig,
} from '@/lib/server/promotions';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseServiceKey) throw new Error('Missing Supabase environment variables');
const supabase = createClient(supabaseUrl, supabaseServiceKey);

function yesterdayDate(today: string): string {
  const d = new Date(today + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

async function getStreakConfig(): Promise<DailyStreakConfig> {
  const { data } = await supabase.from('bot_config').select('commands').eq('id', 'main').single();
  return (data?.commands?.daily_streak as DailyStreakConfig) || { enabled: false, rewards: [5, 5, 5, 10, 10, 15, 25] };
}

export async function GET(request: NextRequest) {
  try {
    const userId = new URL(request.url).searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 });

    const config = await getStreakConfig();
    const today = getEthiopiaDateString();

    const { data: streakRow } = await supabase
      .from('user_streaks')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    const streakCount = streakRow?.streak_count || 0;
    const lastClaim = streakRow?.last_claim_date || null;
    const alreadyClaimedToday = lastClaim === today;
    const nextStreakDay = alreadyClaimedToday
      ? streakCount
      : lastClaim === yesterdayDate(today)
        ? streakCount + 1
        : 1;

    return NextResponse.json({
      enabled: config.enabled !== false,
      streakCount: alreadyClaimedToday ? streakCount : (lastClaim === yesterdayDate(today) ? streakCount : (lastClaim ? 0 : streakCount)),
      displayStreak: alreadyClaimedToday ? streakCount : (lastClaim === yesterdayDate(today) ? streakCount : 0),
      lastClaimDate: lastClaim,
      canClaim: config.enabled !== false && !alreadyClaimedToday,
      todayReward: getStreakRewardForDay(nextStreakDay, config),
      nextStreakDay,
      totalClaimed: Number(streakRow?.total_claimed) || 0,
      rewards: config.rewards || [5, 5, 5, 10, 10, 15, 25],
    });
  } catch (error) {
    console.error('Streak GET error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();
    if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 });

    const config = await getStreakConfig();
    if (config.enabled === false) {
      return NextResponse.json({ error: 'Daily streak is currently disabled.' }, { status: 403 });
    }

    const today = getEthiopiaDateString();
    const yday = yesterdayDate(today);

    const { data: streakRow } = await supabase
      .from('user_streaks')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (streakRow?.last_claim_date === today) {
      return NextResponse.json({ error: 'Already claimed today.' }, { status: 409 });
    }

    let newStreak = 1;
    if (streakRow?.last_claim_date === yday) {
      newStreak = (streakRow.streak_count || 0) + 1;
    }

    const reward = getStreakRewardForDay(newStreak, config);
    if (reward <= 0) {
      return NextResponse.json({ error: 'No reward configured.' }, { status: 400 });
    }

    const playRes = await supabase.rpc('adjust_play_balance', { p_user_id: userId, p_amount: reward });
    if (playRes.error) {
      return NextResponse.json({ error: 'Failed to credit reward.' }, { status: 500 });
    }

    await supabase.from('transactions').insert({
      user_id: userId,
      type: 'transfer_to_play',
      amount: reward,
      status: 'completed',
      reference: `STREAK-D${newStreak}-${today}`,
      details: { source: 'daily_streak', streak_day: newStreak },
    });

    const totalClaimed = Number(streakRow?.total_claimed || 0) + reward;
    await supabase.from('user_streaks').upsert({
      user_id: userId,
      streak_count: newStreak,
      last_claim_date: today,
      total_claimed: totalClaimed,
      updated_at: new Date().toISOString(),
    });

    const { data: wallet } = await supabase.from('wallets').select('*').eq('user_id', userId).single();

    return NextResponse.json({
      success: true,
      streakCount: newStreak,
      reward,
      wallet,
    });
  } catch (error) {
    console.error('Streak POST error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
