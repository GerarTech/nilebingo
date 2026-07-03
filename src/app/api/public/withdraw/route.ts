import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, amount, method, accountNumber, accountName } = body;

    if (!userId || !amount || !method || !accountNumber || !accountName) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
    }

    const withdrawAmount = parseFloat(amount);
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      return NextResponse.json({ error: 'Invalid amount.' }, { status: 400 });
    }

    const { data: config } = await supabase
      .from('bot_config')
      .select('commands')
      .eq('id', 'main')
      .single();

    const configCommands = config?.commands || {};
    const minWithdraw = typeof configCommands.withdraw_min_amount === 'number' ? configCommands.withdraw_min_amount : 50;
    const requiredGames = typeof configCommands.withdraw_required_games === 'number' ? configCommands.withdraw_required_games : 5;

    if (withdrawAmount < minWithdraw) {
      return NextResponse.json({ error: `Minimum withdrawal is ${minWithdraw} ETB.` }, { status: 400 });
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
    if (withdrawAmount > mainBalance) {
      return NextResponse.json({ error: 'Insufficient main wallet balance.' }, { status: 400 });
    }

    // Count games played from game_players table (same logic as bot)
    const { count: gamesPlayed } = await supabase
      .from('game_players')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_watching', false);

    if ((gamesPlayed || 0) < requiredGames) {
      return NextResponse.json({ error: 'You must play at least ' + requiredGames + ' games before withdrawing. Completed: ' + (gamesPlayed || 0) }, { status: 400 });
    }
    const { data: txData, error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        type: 'withdraw',
        amount: withdrawAmount,
        status: 'pending',
        reference: `WTH-${Date.now()}`,
        details: { method, account_number: accountNumber, account_name: accountName },
      })
      .select('id')
      .single();

    if (txError || !txData) {
      return NextResponse.json({ error: 'Failed to create transaction.' }, { status: 500 });
    }

    const adminBotToken = process.env.ADMIN_BOT_TOKEN;
    const adminChatId = process.env.ADMIN_CHAT_ID;

    if (adminBotToken && adminChatId) {
      try {
        const { data: prof } = await supabase.from('profiles').select('first_name, username, telegram_id').eq('id', userId).single();
        const userName = prof?.first_name || prof?.username || 'Unknown';
        const userTelegramId = prof?.telegram_id;

        const methodLabel = method === 'telebirr' ? 'Telebirr' : 'CBE Birr';
        const msg = `💸 *New Withdrawal Request*\n\n👤 User: ${userName}\n💰 Amount: ${withdrawAmount.toLocaleString()} ETB\n🏦 Method: ${methodLabel}\n📱 Account: ${accountNumber}\n👤 Name: ${accountName}\n🆔 TxID: \`${txData.id.slice(0, 8)}\`\n\nUse /approve_${txData.id.slice(0, 8)} to approve or /reject_${txData.id.slice(0, 8)} to reject.`;

        await fetch(`https://api.telegram.org/bot${adminBotToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: adminChatId, text: msg, parse_mode: 'Markdown' }),
          signal: AbortSignal.timeout(10000),
        });

        if (userTelegramId) {
          await fetch(`https://api.telegram.org/bot${adminBotToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: userTelegramId,
              text: `✅ *Withdrawal Request Received*\n\nAmount: ${withdrawAmount.toLocaleString()} ETB\nMethod: ${methodLabel}\nAccount: ${accountNumber}\n\nYour request is pending admin approval. We process within 24 hours.`,
              parse_mode: 'Markdown',
            }),
            signal: AbortSignal.timeout(10000),
          });
        }
      } catch (e) {
        console.error('Withdraw notification error:', e);
      }
    }

    return NextResponse.json({ success: true, txId: txData.id });
  } catch (error) {
    console.error('Withdraw error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
