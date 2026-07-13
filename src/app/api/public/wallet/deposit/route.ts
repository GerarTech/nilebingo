import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseServiceKey) throw new Error('Missing Supabase environment variables');
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const { userId, amount, method, txReference, bankId } = await request.json();

    if (!userId || !amount || !method || !txReference) {
      return NextResponse.json({ error: 'userId, amount, method, and txReference are required.' }, { status: 400 });
    }

    const depositAmount = parseFloat(amount);
    const txId = String(txReference).trim();
    if (isNaN(depositAmount) || depositAmount <= 0 || txId.length < 3) {
      return NextResponse.json({ error: 'Invalid amount or transaction reference.' }, { status: 400 });
    }

    const { data: config } = await supabase.from('bot_config').select('commands').eq('id', 'main').single();
    const commands = config?.commands || {};

    const methodKey = String(method).toLowerCase();
    let bankName = 'CBE';

    if (methodKey === 'telebirr') {
      bankName = 'Telebirr';
    } else if (methodKey === 'cbe') {
      bankName = 'CBE';
    } else if (bankId) {
      const banks: any[] = commands.banks || [];
      const bank = banks.find((b: any) => b.id === bankId);
      if (bank) {
        bankName = bank.name || bankId;
      }
    }

    if (depositAmount < 20) {
      return NextResponse.json({ error: 'Minimum deposit is 20 ETB.' }, { status: 400 });
    }

    const { data: existingTx } = await supabase
      .from('transactions')
      .select('id')
      .eq('reference', txId)
      .maybeSingle();

    if (existingTx) {
      return NextResponse.json({ error: 'This transaction reference has already been submitted.' }, { status: 409 });
    }

    const { data: draftTx } = await supabase
      .from('transactions')
      .select('id')
      .eq('user_id', userId)
      .eq('type', 'deposit')
      .eq('reference', '__DRAFT__')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let transactionId: string;

    if (draftTx) {
      const { data: updated, error } = await supabase
        .from('transactions')
        .update({
          amount: depositAmount,
          reference: txId,
          details: { bank_name: bankName, method: methodKey, source: 'web_app' },
        })
        .eq('id', draftTx.id)
        .select('id')
        .single();
      if (error || !updated) {
        return NextResponse.json({ error: 'Failed to submit deposit.' }, { status: 500 });
      }
      transactionId = updated.id;
    } else {
      const { data: created, error } = await supabase
        .from('transactions')
        .insert({
          user_id: userId,
          type: 'deposit',
          amount: depositAmount,
          status: 'pending',
          reference: txId,
          details: { bank_name: bankName, method: methodKey, source: 'web_app' },
        })
        .select('id')
        .single();
      if (error || !created) {
        return NextResponse.json({ error: 'Failed to submit deposit.' }, { status: 500 });
      }
      transactionId = created.id;
    }

    try {
      const { data: prof } = await supabase.from('profiles').select('first_name, username, telegram_id, phone').eq('id', userId).maybeSingle();
      const userName = prof?.first_name || prof?.username || 'Unknown';
      const userPhone = prof?.phone || undefined;
      const channelMsg = `💳 *NEW DEPOSIT (Web App)*\n\n👤 *User:* ${userName}\n💰 *Amount:* ${depositAmount.toLocaleString()} ETB\n🏦 *Method:* ${bankName}\n🆔 *Ref:* \`${txId}\`\n📋 *TX:* \`${transactionId.slice(0, 8)}...\``;
      const { notifyEvent, notifyAdminPendingTransaction } = await import('@/lib/server/admin');

      // Send to notification channels (await so it completes before function exits)
      await notifyEvent('deposit_pending', channelMsg);

      // Send to admin bot with inline Approve/Reject buttons
      await notifyAdminPendingTransaction(
        transactionId,
        'deposit',
        depositAmount,
        bankName,
        txId,
        userName,
        userPhone,
      );

      if (prof?.telegram_id && process.env.TELEGRAM_BOT_TOKEN) {
        await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: prof.telegram_id,
            text: `⏳ *Deposit Submitted*\n\nYour deposit of *${depositAmount.toLocaleString()} ETB* via *${bankName}* is pending review.\n\n🆔 Reference: \`${txId}\``,
            parse_mode: 'Markdown',
          }),
          signal: AbortSignal.timeout(10000),
        });
      }
    } catch (e) {
      console.error('Deposit notification error:', e);
    }

    return NextResponse.json({ success: true, transactionId });
  } catch (error) {
    console.error('Deposit API error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
