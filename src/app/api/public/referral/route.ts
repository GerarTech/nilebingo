import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, referral_claimed')
      .eq('id', userId)
      .maybeSingle();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const { data: configData } = await supabase.from('bot_config').select('commands').eq('id', 'main').single();
    const referralBonus = Number(configData?.commands?.referral_bonus || 10);

    if (profile.referral_claimed) {
      return NextResponse.json({ success: true, bonus: 0, message: 'Referral bonus already claimed' });
    }

    const { error: walletError } = await supabase.rpc('adjust_play_balance', {
      p_user_id: userId,
      p_amount: referralBonus,
    });

    if (walletError) {
      console.error('Referral bonus error:', walletError);
      return NextResponse.json({ error: 'Failed to credit referral bonus' }, { status: 500 });
    }

    await supabase.from('profiles').update({ referral_claimed: true }).eq('id', userId);
    await supabase.from('transactions').insert({
      user_id: userId,
      type: 'deposit',
      amount: referralBonus,
      status: 'completed',
      reference: `REFERRAL_BONUS_${Date.now()}`,
    });

    return NextResponse.json({ success: true, bonus: referralBonus, message: 'Referral bonus credited' });
  } catch (error) {
    console.error('Referral API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
