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

    const { data: wallet } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    return NextResponse.json({ wallet });
  } catch (error) {
    console.error('Wallet API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { userId, amount, type } = await request.json();
    // type: 'main_balance' | 'play_balance'

    if (!userId || amount === undefined || !type) {
      return NextResponse.json({ error: 'userId, amount, and type are required' }, { status: 400 });
    }

    const column = type === 'main_balance' ? 'main_balance' : 'play_balance';

    const { data: wallet } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    const currentVal = Number((wallet as any)[column]) || 0;
    const newVal = Math.max(0, currentVal + amount);

    const { data: updatedWallet, error: updateError } = await supabase
      .from('wallets')
      .update({ [column]: newVal })
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('Wallet update error:', updateError);
      return NextResponse.json({ error: 'Failed to update wallet' }, { status: 500 });
    }

    return NextResponse.json({ wallet: updatedWallet });
  } catch (error) {
    console.error('Wallet PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
