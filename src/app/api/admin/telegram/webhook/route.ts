import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const botToken = process.env.ADMIN_BOT_TOKEN || '';
const adminChatId = process.env.ADMIN_CHAT_ID || '';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const TG_API = `https://api.telegram.org/bot${botToken}`;

async function tgCall(method: string, payload: any = {}): Promise<any> {
  try {
    const res = await fetch(`${TG_API}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });
    return await res.json();
  } catch (err) {
    console.error(`Admin bot API ${method} error:`, err);
    return { ok: false };
  }
}

async function sendMessage(chatId: string | number, text: string, extra: any = {}) {
  return tgCall('sendMessage', { chat_id: chatId, text, ...extra });
}

// Cache for bot commands
let cachedCommands: Record<string, string> = {};
let commandsCacheTime = 0;
const COMMANDS_CACHE_TTL = 30000;

async function getBotCommands(): Promise<Record<string, string>> {
  const now = Date.now();
  if (cachedCommands && (now - commandsCacheTime) < COMMANDS_CACHE_TTL) {
    return cachedCommands;
  }
  
  try {
    const { data } = await supabase
      .from('bot_config')
      .select('commands')
      .eq('id', 'main')
      .single();
    
    cachedCommands = data?.commands || {
      admin_stats: '/admin_stats',
      admin_users: '/admin_users',
      admin_pending: '/admin_pending',
      admin_games: '/admin_games',
      admin_help: '/admin_help',
      admin_approve: '/approve_',
      admin_reject: '/reject_',
    };
    commandsCacheTime = now;
    return cachedCommands;
  } catch {
    return {
      admin_stats: '/admin_stats',
      admin_users: '/admin_users',
      admin_pending: '/admin_pending',
      admin_games: '/admin_games',
      admin_help: '/admin_help',
      admin_approve: '/approve_',
      admin_reject: '/reject_',
    };
  }
}

// Admin command handlers
async function handleAdminStats(chatId: number) {
  const { data: profiles } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
  const { data: games } = await supabase.from('games').select('id', { count: 'exact', head: true });
  const { data: activeGames } = await supabase.from('games').select('id', { count: 'exact', head: true }).eq('status', 'active');
  const { data: transactions } = await supabase.from('transactions').select('type, amount, status');

  let totalDeposits = 0, totalWithdrawals = 0, totalBets = 0, totalWins = 0;
  let pendingDep = 0, pendingWit = 0;
  if (transactions) {
    for (const t of transactions) {
      const amt = Number(t.amount) || 0;
      if (t.type === 'deposit' && t.status === 'completed') totalDeposits += amt;
      if (t.type === 'withdraw' && t.status === 'completed') totalWithdrawals += amt;
      if (t.type === 'bet') totalBets += amt;
      if (t.type === 'win') totalWins += amt;
      if (t.type === 'deposit' && t.status === 'pending') pendingDep++;
      if (t.type === 'withdraw' && t.status === 'pending') pendingWit++;
    }
  }

  const msg = `*📊 Admin Dashboard*\n\n👥 Users: ${profiles?.length || 0}\n🎮 Games: ${games?.length || 0}\n🟢 Active: ${activeGames?.length || 0}\n💰 Deposits: ${totalDeposits.toLocaleString()} ETB\n💸 Withdrawals: ${totalWithdrawals.toLocaleString()} ETB\n📈 Revenue: ${(totalBets - totalWins).toLocaleString()} ETB\n⏳ Pending Deposits: ${pendingDep}\n⏳ Pending Withdrawals: ${pendingWit}`;

  await sendMessage(chatId, msg, { parse_mode: 'Markdown' });
}

async function handleAdminUsers(chatId: number) {
  const { data: users } = await supabase
    .from('profiles')
    .select('first_name, username, telegram_id, phone, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  if (!users || users.length === 0) {
    await sendMessage(chatId, 'No users found.');
    return;
  }

  const list = users.map((u: any, i: number) => 
    `${i + 1}. ${u.first_name || 'Unknown'}${u.username ? ` (@${u.username})` : ''}\n   ID: ${u.telegram_id}${u.phone ? ` | 📞 ${u.phone}` : ''}`
  ).join('\n');

  await sendMessage(chatId, `*👥 Recent Users*\n\n${list}`, { parse_mode: 'Markdown' });
}

async function handleAdminPending(chatId: number) {
  const { data: txs } = await supabase
    .from('transactions')
    .select('*, profiles!inner(first_name, username)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(20);

  if (!txs || txs.length === 0) {
    await sendMessage(chatId, 'No pending transactions.');
    return;
  }

  const list = txs.map((tx: any) => 
    `• ${tx.type.toUpperCase()} | ${Number(tx.amount).toLocaleString()} ETB | ${tx.profiles?.first_name || 'Unknown'}\n  ID: \`${tx.id.slice(0, 8)}...\` | /approve_${tx.id.slice(0, 8)}`
  ).join('\n');

  await sendMessage(chatId, `*⏳ Pending Transactions*\n\n${list}`, { parse_mode: 'Markdown' });
}

async function handleAdminGames(chatId: number) {
  const { data: games } = await supabase
    .from('games')
    .select('*, winner:profiles(first_name, username)')
    .order('created_at', { ascending: false })
    .limit(10);

  if (!games || games.length === 0) {
    await sendMessage(chatId, 'No games played yet.');
    return;
  }

  const list = games.map((g: any, i: number) => {
    const winnerName = g.winner?.first_name || 'Virtual Player (or No Winner)';
    const winnerUser = g.winner?.username ? ` (@${g.winner.username})` : '';
    const prize = Number(g.prize_pool || 0).toLocaleString();
    const roomName = g.code || 'Room';
    return `${i + 1}. Room: *${roomName}*\n   Prize Pool: *${prize} ETB*\n   Winner: *${winnerName}${winnerUser}*`;
  }).join('\n\n');

  await sendMessage(chatId, `*🎮 Recent Matches & Winners*\n\n${list}`, { parse_mode: 'Markdown' });
}

async function handleAdminApprove(chatId: number, txId: string) {
  const { data: tx } = await supabase.from('transactions').select('*').eq('id', txId).single();
  if (!tx || tx.status !== 'pending') {
    await sendMessage(chatId, 'Transaction not found or already processed.');
    return;
  }

  await supabase.from('transactions').update({ status: 'completed' }).eq('id', txId);

  if (tx.type === 'deposit') {
    const { data: wallet } = await supabase.from('wallets').select('main_balance').eq('user_id', tx.user_id).single();
    if (wallet) {
      await supabase.from('wallets').update({ main_balance: Number(wallet.main_balance) + Number(tx.amount) }).eq('user_id', tx.user_id);
    }
  }

  await sendMessage(chatId, `✅ Transaction ${txId.slice(0, 8)} approved.`);
}

async function handleAdminReject(chatId: number, txId: string) {
  await supabase.from('transactions').update({ status: 'failed' }).eq('id', txId);
  await sendMessage(chatId, `❌ Transaction ${txId.slice(0, 8)} rejected.`);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const message = body.message || body.callback_query?.message;
    const callbackQuery = body.callback_query;
    const chatId = message?.chat?.id || callbackQuery?.message?.chat?.id;
    const from = body.message?.from || body.callback_query?.from;
    const text = body.message?.text || '';

    if (!chatId) {
      return NextResponse.json({ ok: true });
    }

    // Only allow admin chat
    if (String(chatId) !== adminChatId) {
      return NextResponse.json({ ok: true });
    }

    // Handle /start command
    if (text === '/start') {
      await sendMessage(chatId, '🔐 Admin Bot Ready\n\nUse the menu below or type /admin_help for commands:', {
        reply_markup: {
          keyboard: [
            [{ text: '📊 Stats' }, { text: '👥 Users' }],
            [{ text: '⏳ Pending' }, { text: '🎮 Matches' }],
            [{ text: '❓ Help' }],
          ],
          resize_keyboard: true,
        }
      });
      return NextResponse.json({ ok: true });
    }

    // Admin commands (dynamic from DB)
    const commands = await getBotCommands();

    // Handle admin menu buttons
    if (text === '📊 Stats') {
      await handleAdminStats(chatId);
      return NextResponse.json({ ok: true });
    }
    if (text === '👥 Users') {
      await handleAdminUsers(chatId);
      return NextResponse.json({ ok: true });
    }
    if (text === '⏳ Pending') {
      await handleAdminPending(chatId);
      return NextResponse.json({ ok: true });
    }
    if (text === '🎮 Matches') {
      await handleAdminGames(chatId);
      return NextResponse.json({ ok: true });
    }
    if (text === '❓ Help') {
      await sendMessage(chatId, `*🔐 Admin Commands*\n\n${commands.admin_stats} - View dashboard stats\n${commands.admin_users} - List recent users\n${commands.admin_pending} - View pending transactions\n${commands.admin_games || '/admin_games'} - View recent matches & winners\n${commands.admin_approve}<tx_id> - Approve a transaction\n${commands.admin_reject}<tx_id> - Reject a transaction\n${commands.admin_help} - Show this help`, { parse_mode: 'Markdown' });
      return NextResponse.json({ ok: true });
    }
    
    if (text === commands.admin_stats) {
      await handleAdminStats(chatId);
      return NextResponse.json({ ok: true });
    }
    if (text === commands.admin_users) {
      await handleAdminUsers(chatId);
      return NextResponse.json({ ok: true });
    }
    if (text === commands.admin_pending) {
      await handleAdminPending(chatId);
      return NextResponse.json({ ok: true });
    }
    if (text === (commands.admin_games || '/admin_games')) {
      await handleAdminGames(chatId);
      return NextResponse.json({ ok: true });
    }
    if (text === commands.admin_help) {
      await sendMessage(chatId, `*🔐 Admin Commands*\n\n${commands.admin_stats} - View dashboard stats\n${commands.admin_users} - List recent users\n${commands.admin_pending} - View pending transactions\n${commands.admin_games || '/admin_games'} - View recent matches & winners\n${commands.admin_approve}<tx_id> - Approve a transaction\n${commands.admin_reject}<tx_id> - Reject a transaction\n${commands.admin_help} - Show this help`, { parse_mode: 'Markdown' });
      return NextResponse.json({ ok: true });
    }
    if (text.startsWith(commands.admin_approve)) {
      const shortId = text.replace(commands.admin_approve, '');
      const { data: txs } = await supabase
        .from('transactions')
        .select('id')
        .eq('status', 'pending');
      if (txs) {
        const match = txs.find((tx: any) => tx.id.startsWith(shortId));
        if (match) {
          await handleAdminApprove(chatId, match.id);
        } else {
          await sendMessage(chatId, 'Transaction not found.');
        }
      }
      return NextResponse.json({ ok: true });
    }
    if (text.startsWith(commands.admin_reject)) {
      const shortId = text.replace(commands.admin_reject, '');
      const { data: txs } = await supabase
        .from('transactions')
        .select('id')
        .eq('status', 'pending');
      if (txs) {
        const match = txs.find((tx: any) => tx.id.startsWith(shortId));
        if (match) {
          await handleAdminReject(chatId, match.id);
        } else {
          await sendMessage(chatId, 'Transaction not found.');
        }
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Admin bot webhook error:', error);
    return NextResponse.json({ ok: true, warning: 'handled' });
  }
}