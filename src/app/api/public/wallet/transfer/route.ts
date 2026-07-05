import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseServiceKey) throw new Error('Missing Supabase environment variables');
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const { userId, amount, direction } = await request.json();

    if (!userId || !amount || !direction) {
      return NextResponse.json({ error: 'userId, amount, and direction are required.' }, { status: 400 });
    }

    const transferAmount = parseFloat(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      return NextResponse.json({ error: 'Invalid amount.' }, { status: 400 });
    }

    if (direction !== 'to_play' && direction !== 'to_main') {
      return NextResponse.json({ error: 'direction must be to_play or to_main.' }, { status: 400 });
    }

    const { data: wallet } = await supabase
      .from('wallets')
      .select('main_balance, play_balance')
      .eq('user_id', userId)
      .single();

    if (!wallet) {
      return NextResponse.json({ error: 'Wallet not found.' }, { status: 404 });
    }

    const mainBalance = Number(wallet.main_balance) || 0;
    const playBalance = Number(wallet.play_balance) || 0;

    if (direction === 'to_play') {
      if (transferAmount > mainBalance) {
        return NextResponse.json({ error: 'Insufficient main wallet balance.' }, { status: 400 });
      }
      const mainRes = await supabase.rpc('adjust_main_balance', { p_user_id: userId, p_amount: -transferAmount });
      if (mainRes.error) return NextResponse.json({ error: 'Transfer failed.' }, { status: 500 });
      const playRes = await supabase.rpc('adjust_play_balance', { p_user_id: userId, p_amount: transferAmount });
      if (playRes.error) {
        await supabase.rpc('adjust_main_balance', { p_user_id: userId, p_amount: transferAmount });
        return NextResponse.json({ error: 'Transfer failed.' }, { status: 500 });
      }
      await supabase.from('transactions').insert({
        user_id: userId,
        type: 'transfer_to_play',
        amount: transferAmount,
        status: 'completed',
        reference: `XFR-P-${Date.now()}`,
      });
    } else {
      if (transferAmount > playBalance) {
        return NextResponse.json({ error: 'Insufficient play wallet balance.' }, { status: 400 });
      }
      const playRes = await supabase.rpc('adjust_play_balance', { p_user_id: userId, p_amount: -transferAmount });
      if (playRes.error) return NextResponse.json({ error: 'Transfer failed.' }, { status: 500 });
      const mainRes = await supabase.rpc('adjust_main_balance', { p_user_id: userId, p_amount: transferAmount });
      if (mainRes.error) {
        await supabase.rpc('adjust_play_balance', { p_user_id: userId, p_amount: transferAmount });
        return NextResponse.json({ error: 'Transfer failed.' }, { status: 500 });
      }
      await supabase.from('transactions').insert({
        user_id: userId,
        type: 'transfer_to_main',
        amount: transferAmount,
        status: 'completed',
        reference: `XFR-M-${Date.now()}`,
      });
    }

    const { data: updatedWallet } = await supabase.from('wallets').select('*').eq('user_id', userId).single();
    return NextResponse.json({ success: true, wallet: updatedWallet });
  } catch (error) {
    console.error('Transfer API error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
