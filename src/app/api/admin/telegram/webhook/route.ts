import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { notifyAdminTransactionCompleted } from '@/lib/server/admin';

const botToken = process.env.ADMIN_BOT_TOKEN || '';
const adminChatId = process.env.ADMIN_CHAT_ID || '';
const userBotToken = process.env.TELEGRAM_BOT_TOKEN || '';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const TG_API = `https://api.telegram.org/bot${botToken}`;

const ADMIN_BOT_COMMANDS = [
  { command: 'start', description: 'Start the admin bot' },
  { command: 'admin_stats', description: 'Dashboard statistics' },
  { command: 'admin_users', description: 'Recent users list' },
  { command: 'admin_commission', description: 'Commission report' },
  { command: 'admin_pending', description: 'Pending transactions' },
  { command: 'admin_games', description: 'Active matches and winners' },
  { command: 'appoint', description: 'Appoint winner: /appoint <gameId> <cardNum> [afterBalls]' },
  { command: 'admin_help', description: 'Show all admin commands' },
];

async function registerAdminBotCommands() {
  try {
    await tgCall('setMyCommands', { commands: ADMIN_BOT_COMMANDS });
  } catch (e) {
    console.error('Admin bot setMyCommands error:', e);
  }
}

// Register commands on module load so they appear without requiring /start
if (botToken) {
  registerAdminBotCommands().catch(() => {});
}

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
      admin_commission: '/admin_commission',
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
      admin_commission: '/admin_commission',
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
    .select('*, profiles!inner(first_name, username, phone, telegram_id)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(20);

  if (!txs || txs.length === 0) {
    await sendMessage(chatId, 'No pending transactions.');
    return;
  }

  const list = txs.map((tx: any) => {
    const prof = tx.profiles || {};
    const name = prof.first_name || prof.username || 'Unknown';
    const phone = prof.phone ? `📞 ${prof.phone}` : '';
    const userLink = prof.username ? `@${prof.username}` : `#${String(prof.telegram_id).slice(-4)}`;
    const bankName = tx.details?.bank_name || '-';
    const userRef = tx.reference || '-';
    return `• *${tx.type.toUpperCase()}* | ${Number(tx.amount).toLocaleString()} ETB\n  👤 ${name} (${userLink}) ${phone}\n  🏦 ${bankName} | 🆔 \`${userRef}\`\n  🆔 \`${tx.id.slice(0, 8)}...\` | /approve_${tx.id.slice(0, 8)} | /reject_${tx.id.slice(0, 8)}`;
  }).join('\n\n');

  await sendMessage(chatId, `*⏳ Pending Transactions*\n\n${list}`, { parse_mode: 'Markdown' });
}

async function handleAdminGames(chatId: number) {
  // 1. Fetch live games
  const { data: liveGames } = await supabase
    .from('games')
    .select('*, game_players(*, profiles(first_name, username))')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  // 2. Fetch recent completed games
  const { data: completedGames } = await supabase
    .from('games')
    .select('*, winner:profiles(first_name, username)')
    .eq('status', 'finished')
    .order('created_at', { ascending: false })
    .limit(10);

  let msg = `*🎮 Nile BINGO Matches Board*\n\n`;

  if (liveGames && liveGames.length > 0) {
    msg += `*🟢 LIVE ACTIVE GAMES (Spectate & Appoint)*\n`;
    for (const lg of liveGames) {
      const prize = Number(lg.prize_pool || 0).toLocaleString();
      const playersList = lg.game_players?.map((gp: any) => gp.profiles?.first_name || 'Player').join(', ') || 'None';
      msg += `• Game ID: \`${lg.code}\`\n  Prize Pool: *${prize} ETB*\n  Players: ${playersList}\n  Appoint Winner: \`/appoint_${lg.code}_25\`\n\n`;
    }
  } else {
    msg += `*🟢 LIVE ACTIVE GAMES*\n_No live games currently playing._\n\n`;
  }

  if (completedGames && completedGames.length > 0) {
    msg += `*🏆 RECENT COMPLETED MATCHES*\n`;
    const list = completedGames.map((g: any, i: number) => {
      const winnerName = g.winner?.first_name || 'Virtual Player';
      const winnerUser = g.winner?.username ? ` (@${g.winner.username})` : '';
      const prize = Number(g.prize_pool || 0).toLocaleString();
      return `${i + 1}. Game ID: \`${g.code}\`\n   Prize Pool: *${prize} ETB*\n   Winner: *${winnerName}${winnerUser}*`;
    }).join('\n\n');
    msg += list;
  } else {
    msg += `*🏆 RECENT COMPLETED MATCHES*\n_No recently completed matches._`;
  }

  await sendMessage(chatId, msg, { parse_mode: 'Markdown' });
}

async function handleAdminCommission(chatId: number) {
  const { data: transactions } = await supabase
    .from('transactions')
    .select('type, amount, created_at');

  let totalBets = 0, totalWins = 0;
  let todayBets = 0, todayWins = 0;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  if (transactions) {
    for (const t of transactions) {
      const amt = Number(t.amount) || 0;
      const isToday = new Date(t.created_at) >= todayStart;
      if (t.type === 'bet') {
        totalBets += amt;
        if (isToday) todayBets += amt;
      }
      if (t.type === 'win') {
        totalWins += amt;
        if (isToday) todayWins += amt;
      }
    }
  }

  const totalCommission = Math.max(0, totalBets - totalWins);
  const todayCommission = Math.max(0, todayBets - todayWins);

  // Get configured commission rate
  let commissionRate = 10;
  try {
    const { data } = await supabase.from('bot_config').select('commands').eq('id', 'main').single();
    if (data?.commands?.commission) commissionRate = Number(data.commands.commission);
  } catch {}

  const msg = [
    `💰 *COMMISSION REPORT*`,
    ``,
    `📊 *Total Commission:* ${totalCommission.toLocaleString()} ETB`,
    `📅 *Today:* ${todayCommission.toLocaleString()} ETB`,
    ``,
    `📈 Total Bets: ${totalBets.toLocaleString()} ETB`,
    `🏆 Total Wins: ${totalWins.toLocaleString()} ETB`,
    `🔢 Rate: ${commissionRate}%`,
  ].join('\n');

  await sendMessage(chatId, msg, { parse_mode: 'Markdown' });
}

async function handleAdminApprove(chatId: number, txId: string) {
  const { data: tx } = await supabase
    .from('transactions')
    .select('*, profiles!inner(first_name, username, phone, telegram_id)')
    .eq('id', txId)
    .single();

  if (!tx || tx.status !== 'pending') {
    await sendMessage(chatId, 'Transaction not found or already processed.');
    return;
  }

  const prof = tx.profiles || {};
  const amount = Number(tx.amount).toLocaleString();
  const bankName = tx.details?.bank_name || '-';
  const userRef = tx.reference || '-';
  const msg = [
    `*🔄 Confirm Approval*`,
    ``,
    `*Type:* ${tx.type.toUpperCase()}`,
    `*Amount:* ${amount} ETB`,
    `*Bank:* ${bankName}`,
    `*TX ID:* \`${userRef}\``,
    `*User:* ${prof.first_name || prof.username || 'Unknown'}`,
    prof.phone ? `*Phone:* ${prof.phone}` : null,
    prof.username ? `*Username:* @${prof.username}` : null,
    `*Telegram ID:* ${prof.telegram_id || 'N/A'}`,
    ``,
    `Are you sure you want to approve this transaction?`
  ].filter(Boolean).join('\n');

  await sendMessage(chatId, msg, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '✅ Approve', callback_data: `confirm_approve_${txId}` },
          { text: '❌ Cancel', callback_data: `confirm_reject_${txId}` },
        ]
      ]
    }
  });
}

async function handleAdminReject(chatId: number, txId: string) {
  const { data: tx } = await supabase
    .from('transactions')
    .select('*, profiles!inner(telegram_id, first_name, username)')
    .eq('id', txId)
    .single();

  await supabase.from('transactions').update({ status: 'failed' }).eq('id', txId);

  if (tx) {
    const prof = tx.profiles || {};
    const bankName = tx.details?.bank_name || '-';
    const userRef = tx.reference || '-';
    const amountStr = Number(tx.amount).toLocaleString();
    const txLabel = tx.type === 'deposit' ? 'Deposit' : 'Withdrawal';

    // Notify user via user bot
    if (prof.telegram_id && userBotToken) {
      try {
        await fetch(`https://api.telegram.org/bot${userBotToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: prof.telegram_id,
            text: `❌ *${txLabel} Rejected*\n\n💰 Amount: *${amountStr} ETB*\n🏦 Bank: *${bankName}*\n🆔 TX ID: \`${userRef}\`\n\nYour ${tx.type} has been rejected. Please contact support if you have questions.`,
            parse_mode: 'Markdown',
          }),
          signal: AbortSignal.timeout(5000),
        });
      } catch (e) { /* ignore */ }
    }

    // Route to channels
    const eventName = tx.type === 'deposit' ? 'deposit_rejected' : 'withdraw_rejected';
    const userName = prof.first_name || prof.username || 'Unknown';
    const channelMsg =
      `❌ *${txLabel.toUpperCase()} REJECTED*\n\n` +
      `👤 *User:* ${userName}\n` +
      `💰 *Amount:* ${amountStr} ETB\n` +
      `🏦 *Bank:* ${bankName}\n` +
      `🆔 *Reference:* \`${userRef}\`\n` +
      `🆔 *Tx ID:* \`${tx.id.slice(0, 8)}...\``;

    try {
      const { notifyEvent } = await import('@/lib/server/admin');
      notifyEvent(eventName as any, channelMsg);
    } catch (e) { /* ignore */ }
  }

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

    const chatIdStr = String(chatId);
    const isEnvAdmin = adminChatId && chatIdStr === adminChatId;

    if (!isEnvAdmin) {
      const { data: configData } = await supabase
        .from('bot_config')
        .select('commands')
        .eq('id', 'main')
        .single();

      const adminIds: string[] = (configData?.commands as any)?.admin_chat_ids || [];
      const isWhitelisted = adminIds.some((id: string) => String(id) === chatIdStr);

      if (!isWhitelisted) {
        await sendMessage(chatId, '🚫 Access Denied\n\nThis bot is for authorized administrators only.');
        return NextResponse.json({ ok: true });
      }
    }

    // Handle /start command
    if (text === '/start') {
      await registerAdminBotCommands();
      await sendMessage(chatId, '🔐 Admin Bot Ready\n\nUse the menu below or type /admin_help for commands:', {
        reply_markup: {
          keyboard: [
            [{ text: '📊 Stats' }, { text: '👥 Users' }, { text: '💰 Commission' }],
            [{ text: '⏳ Pending' }, { text: '🎮 Matches' }, { text: '🎯 Appoint' }],
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
    if (text === '🎯 Appoint') {
      await sendMessage(chatId, `🎯 *Appoint a Winner*\n\nUse the /appoint command to set a specific card to win a game.\n\n*Usage:*\n\`/appoint <gameId> <cardNumber> [afterBalls]\`\n\`/appoint_<gameId>_<cardNumber>_[afterBalls]\`\n\n*Active Games (click to appoint):*`, { parse_mode: 'Markdown' });
      await handleAdminGames(chatId);
      return NextResponse.json({ ok: true });
    }
    if (text === '💰 Commission') {
      await handleAdminCommission(chatId);
      return NextResponse.json({ ok: true });
    }
    if (text === '❓ Help') {
      await sendMessage(chatId, `*🔐 Admin Bot Commands*\n\n${commands.admin_stats || '/admin_stats'} - Dashboard stats\n${commands.admin_users || '/admin_users'} - Recent users\n${commands.admin_commission || '/admin_commission'} - Commission report\n${commands.admin_pending || '/admin_pending'} - Pending transactions\n${commands.admin_games || '/admin_games'} - Matches & winners\n/appoint_<gameId>_<cardNum> - Assign winner card\n${commands.admin_approve}<tx_id> - Approve transaction\n${commands.admin_reject}<tx_id> - Reject transaction\n${commands.admin_help || '/admin_help'} - This help`, { parse_mode: 'Markdown' });
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
    if (text === (commands.admin_commission || '/admin_commission')) {
      await handleAdminCommission(chatId);
      return NextResponse.json({ ok: true });
    }
    if (text === commands.admin_help) {
      await sendMessage(chatId, `*🔐 Admin Bot Commands*\n\n${commands.admin_stats || '/admin_stats'} - Dashboard stats\n${commands.admin_users || '/admin_users'} - Recent users\n${commands.admin_commission || '/admin_commission'} - Commission report\n${commands.admin_pending || '/admin_pending'} - Pending transactions\n${commands.admin_games || '/admin_games'} - Matches & winners\n/appoint_<gameId>_<cardNum> - Assign winner card\n${commands.admin_approve}<tx_id> - Approve transaction\n${commands.admin_reject}<tx_id> - Reject transaction\n${commands.admin_help || '/admin_help'} - This help`, { parse_mode: 'Markdown' });
      return NextResponse.json({ ok: true });
    }
    if (text.startsWith('/appoint')) {
      let gameId = '';
      let cardNumber = 0;
      let afterBalls = 20;

      if (text.startsWith('/appoint_')) {
        const parts = text.split('_');
        if (parts.length >= 3) {
          gameId = parts[1];
          cardNumber = Number(parts[2]);
          afterBalls = parts.length >= 4 ? Number(parts[3]) || 20 : 20;
        }
      } else {
        const parts = text.split(' ');
        if (parts.length >= 3) {
          gameId = parts[1];
          cardNumber = Number(parts[2]);
          afterBalls = parts.length >= 4 ? Number(parts[3]) || 20 : 20;
        }
      }

      if (gameId && cardNumber > 0) {
        const { data: configData } = await supabase
          .from('bot_config')
          .select('commands')
          .eq('id', 'main')
          .single();

        const currentCommands = configData?.commands || {};
        const currentAppointed = currentCommands.appointed_winners || {};
        currentAppointed[gameId] = { card_number: cardNumber, after_balls: afterBalls };
        currentCommands.appointed_winners = currentAppointed;

        await supabase
          .from('bot_config')
          .update({ commands: currentCommands })
          .eq('id', 'main');

        await sendMessage(chatId, `🎯 *Appointed Winner Recorded*\n\nGame ID: \`${gameId}\`\nAppointed Card: *Card #${cardNumber}*\nWin after: *${afterBalls} balls*\n\nThis card will be prioritized to win during live play!`, { parse_mode: 'Markdown' });

        // Route to subscribed channels
        try {
          const { notifyEvent } = await import('@/lib/server/admin');
          notifyEvent('game_winner_appointed', `🎯 *WINNER APPOINTED*\n\n🆔 Game: \`${gameId}\`\n🎴 Card: *#${cardNumber}*\n🎱 Win after: *${afterBalls} balls*`);
        } catch (e) { /* ignore */ }
      } else {
        await sendMessage(chatId, `❌ *Invalid Command Format*\n\nUse: \`/appoint <gameId> <card_number> [after_balls]\` or click the link from the matches list (e.g., \`/appoint_ABCDEF12_25\`).`, { parse_mode: 'Markdown' });
      }
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

    // Handle inline keyboard confirmation callbacks
    if (callbackQuery?.data) {
      const data = callbackQuery.data;
      const messageId = callbackQuery.message?.message_id;

      if (data.startsWith('confirm_approve_')) {
        const txId = data.replace('confirm_approve_', '');
        const { data: tx } = await supabase.from('transactions').select('*').eq('id', txId).single();
        if (!tx || tx.status !== 'pending') {
          await sendMessage(chatId, 'Transaction already processed.');
          return NextResponse.json({ ok: true });
        }

        if (tx.type === 'deposit') {
          const { error: balanceError } = await supabase.rpc('adjust_main_balance', { p_user_id: tx.user_id, p_amount: Number(tx.amount) });
          if (balanceError) {
            console.error('adjust_main_balance error:', balanceError);
            await sendMessage(chatId, `⚠️ *Balance credit failed*: ${balanceError.message}\n\nTransaction remains pending. Please check the wallet and retry.`, { parse_mode: 'Markdown' });
            await sendMessage(chatId, `❌ Deposit approval aborted — wallet not credited.`);
            return NextResponse.json({ ok: true });
          }
        }

        await supabase.from('transactions').update({ status: 'completed' }).eq('id', txId);

        const bankName = tx.details?.bank_name || '-';
        const userRef = tx.reference || '-';
        const amountStr = Number(tx.amount).toLocaleString();
        const txLabel = tx.type === 'deposit' ? 'Deposit' : 'Withdrawal';

        // Notify the user via user bot
        if (userBotToken) {
          try {
            const { data: prof } = await supabase.from('profiles').select('telegram_id, first_name, username').eq('id', tx.user_id).single();
            if (prof?.telegram_id) {
              await fetch(`https://api.telegram.org/bot${userBotToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: prof.telegram_id, text: `✅ *${txLabel} Approved!*\n\nYour ${tx.type} of *${amountStr} ETB* via *${bankName}* (TX ID: \`${userRef}\`) has been approved and credited to your wallet.`, parse_mode: 'Markdown' }),
                signal: AbortSignal.timeout(5000),
              });
            }
          } catch (e) { /* ignore */ }
        }

        // Route to subscribed channels
        const eventName = tx.type === 'deposit' ? 'deposit_approved' : 'withdraw_approved';
        const { data: prof2 } = await supabase.from('profiles').select('first_name, username').eq('id', tx.user_id).single();
        const userName = prof2?.first_name || prof2?.username || 'Unknown';
        const channelMsg =
          `✅ *${txLabel.toUpperCase()} APPROVED*\n\n` +
          `👤 *User:* ${userName}\n` +
          `💰 *Amount:* ${amountStr} ETB\n` +
          `🏦 *Bank:* ${bankName}\n` +
          `🆔 *Reference:* \`${userRef}\`\n` +
          `🆔 *Tx ID:* \`${tx.id.slice(0, 8)}...\``;
        try {
          const { notifyEvent } = await import('@/lib/server/admin');
          notifyEvent(eventName as any, channelMsg);
        } catch (e) { /* ignore */ }

        // Edit original message to show done
        try {
          await fetch(`${TG_API}/editMessageText`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              message_id: messageId,
              text: `✅ *Transaction Approved*\n\n${tx.type.toUpperCase()} ${amountStr} ETB via ${bankName}\nTX ID: \`${userRef}\`\nhas been approved.`,
              parse_mode: 'Markdown',
            }),
          });
        } catch (e) { /* ignore */ }

        await sendMessage(chatId, `✅ ${tx.type.toUpperCase()} ${amountStr} ETB (${bankName}, TX: \`${userRef}\`) approved and credited.`);
        return NextResponse.json({ ok: true });
      }

      if (data.startsWith('confirm_reject_')) {
        const txId = data.replace('confirm_reject_', '');
        const { data: tx } = await supabase.from('transactions').select('*, profiles!inner(telegram_id, first_name, username)').eq('id', txId).single();
        await supabase.from('transactions').update({ status: 'failed' }).eq('id', txId);
        
        const bankName = tx?.details?.bank_name || '-';
        const userRef = tx?.reference || '-';
        const amountStr = Number(tx?.amount || 0).toLocaleString();
        const txLabel = tx?.type === 'deposit' ? 'Deposit' : 'Withdrawal';

        // Notify user via user bot
        const prof = tx?.profiles || {};
        if (prof.telegram_id && userBotToken) {
          try {
            await fetch(`https://api.telegram.org/bot${userBotToken}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: prof.telegram_id,
                text: `❌ *${txLabel} Rejected*\n\n💰 Amount: *${amountStr} ETB*\n🏦 Bank: *${bankName}*\n🆔 TX ID: \`${userRef}\`\n\nYour ${tx?.type} has been rejected. Please contact support if you have questions.`,
                parse_mode: 'Markdown',
              }),
              signal: AbortSignal.timeout(5000),
            });
          } catch (e) { /* ignore */ }
        }

        // Route to channels
        const eventName = tx?.type === 'deposit' ? 'deposit_rejected' : 'withdraw_rejected';
        const userName = prof.first_name || prof.username || 'Unknown';
        const channelMsg =
          `❌ *${txLabel.toUpperCase()} REJECTED*\n\n` +
          `👤 *User:* ${userName}\n` +
          `💰 *Amount:* ${amountStr} ETB\n` +
          `🏦 *Bank:* ${bankName}\n` +
          `🆔 *Reference:* \`${userRef}\`\n` +
          `🆔 *Tx ID:* \`${txId.slice(0, 8)}...\``;
        try {
          const { notifyEvent } = await import('@/lib/server/admin');
          notifyEvent(eventName as any, channelMsg);
        } catch (e) { /* ignore */ }

        try {
          await fetch(`${TG_API}/editMessageText`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              message_id: messageId,
              text: `❌ *Transaction Rejected*\n\n${tx?.type?.toUpperCase() || ''} ${amountStr} ETB via ${bankName}\nTX ID: \`${userRef}\`\nhas been rejected.`,
              parse_mode: 'Markdown',
            }),
          });
        } catch (e) { /* ignore */ }

        await sendMessage(chatId, `❌ ${tx?.type?.toUpperCase() || ''} ${amountStr} ETB (${bankName}, TX: \`${userRef}\`) rejected.`);
        return NextResponse.json({ ok: true });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Admin bot webhook error:', error);
    return NextResponse.json({ ok: true, warning: 'handled' });
  }
}