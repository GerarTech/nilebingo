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
  { command: 'approve', description: 'Approve transaction: /approve <txId>' },
  { command: 'reject', description: 'Reject transaction: /reject <txId>' },
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

const COMMAND_DEFAULTS: Record<string, string> = {
  admin_stats: '/admin_stats',
  admin_users: '/admin_users',
  admin_commission: '/admin_commission',
  admin_pending: '/admin_pending',
  admin_games: '/admin_games',
  admin_help: '/admin_help',
  admin_approve: '/approve_',
  admin_reject: '/reject_',
};

function normalizeCommandText(text: string): string {
  return (text || '').trim().replace(/\s+/g, ' ');
}

function stripBotSuffix(text: string): string {
  return text.replace(/(@\w+)$/i, '');
}

function isExactCommand(text: string, command: string): boolean {
  const normalized = stripBotSuffix(normalizeCommandText(text));
  return normalized === command || normalized === `${command}@`;
}

function startsWithCommand(text: string, command: string): boolean {
  const normalized = stripBotSuffix(normalizeCommandText(text));
  return normalized === command || normalized.startsWith(`${command} `) || normalized.startsWith(command);
}

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
    
    cachedCommands = { ...COMMAND_DEFAULTS, ...(data?.commands || {}) };
    commandsCacheTime = now;
    return cachedCommands;
  } catch {
    return { ...COMMAND_DEFAULTS };
  }
}

// Admin command handlers
async function handleAdminStats(chatId: number) {
  try {
    const { data: profileCountData } = await supabase.from('profiles').select('id');
    const profileCount = profileCountData?.length || 0;
    const { data: gameCountData } = await supabase.from('games').select('id');
    const gameCount = gameCountData?.length || 0;
    const { data: activeCountData } = await supabase.from('games').select('id').eq('status', 'active');
    const activeCount = activeCountData?.length || 0;
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

    const msg = `*📊 Admin Dashboard*\n\n👥 Users: ${profileCount ?? 0}\n🎮 Games: ${gameCount ?? 0}\n🟢 Active: ${activeCount ?? 0}\n💰 Deposits: ${totalDeposits.toLocaleString()} ETB\n💸 Withdrawals: ${totalWithdrawals.toLocaleString()} ETB\n📈 Revenue: ${(totalBets - totalWins).toLocaleString()} ETB\n⏳ Pending Deposits: ${pendingDep}\n⏳ Pending Withdrawals: ${pendingWit}`;

    await sendMessage(chatId, msg, { parse_mode: 'Markdown' });
  } catch (e: any) {
    await sendMessage(chatId, `❌ Error loading stats: ${e.message || 'Unknown'}`);
  }
}

async function handleAdminUsers(chatId: number) {
  try {
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
  } catch (e: any) {
    await sendMessage(chatId, `❌ Error loading users: ${e.message || 'Unknown'}`);
  }
}

async function handleAdminPending(chatId: number) {
  const { data: txs, error } = await supabase
    .from('transactions')
    .select('*, profiles!inner(first_name, username, phone, telegram_id)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    await sendMessage(chatId, `❌ Error loading pending transactions: ${error.message}`);
    return;
  }

  if (!txs || txs.length === 0) {
    await sendMessage(chatId, 'No pending transactions.');
    return;
  }

  // Send each pending transaction as a separate message with inline Approve/Reject buttons
  for (const tx of txs) {
    const prof = tx.profiles || {};
    const name = prof.first_name || prof.username || 'Unknown';
    const phone = prof.phone ? `📞 ${prof.phone}` : '';
    const userLink = prof.username ? `@${prof.username}` : `#${String(prof.telegram_id).slice(-4)}`;
    const bankName = tx.details?.bank_name || '-';
    const userRef = tx.reference || '-';
    const amountStr = Number(tx.amount).toLocaleString();
    const txLabel = tx.type === 'deposit' ? 'Deposit' : 'Withdrawal';
    const emoji = tx.type === 'deposit' ? '💳' : '💸';

    const text =
      `${emoji} *${txLabel.toUpperCase()} PENDING*\n\n` +
      `👤 *User:* ${name} (${userLink}) ${phone}\n` +
      `💰 *Amount:* ${amountStr} ETB\n` +
      `🏦 *Bank:* ${bankName}\n` +
      `🆔 *Reference:* \`${userRef}\`\n` +
      `🆔 *Tx ID:* \`${tx.id.slice(0, 8)}...\``;

    await sendMessage(chatId, text, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '✅ Approve', callback_data: `confirm_approve_${tx.id}` },
            { text: '❌ Reject', callback_data: `confirm_reject_${tx.id}` },
          ],
        ],
      },
    });
  }
}

async function handleAdminGames(chatId: number) {
  try {
    // 1. Fetch live games (simple select, no nested joins)
    const { data: liveGames } = await supabase
      .from('games')
      .select('id, code, prize_pool, status, created_at')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    // 2. Fetch recent completed games (simple select)
    const { data: completedGames } = await supabase
      .from('games')
      .select('id, code, prize_pool, status, winner_id, created_at')
      .eq('status', 'finished')
      .order('created_at', { ascending: false })
      .limit(10);

    let msg = `*🎮 Nile BINGO Matches Board*\n\n`;

    if (liveGames && liveGames.length > 0) {
      msg += `*🟢 LIVE ACTIVE GAMES*\n`;
      for (const lg of liveGames) {
        const prize = Number(lg.prize_pool || 0).toLocaleString();
        // Count players separately
        const { data: pCountData } = await supabase
          .from('game_players')
          .select('id')
          .eq('game_id', lg.id)
          .eq('is_watching', false);
        const pCount = pCountData?.length || 0;
        msg += `• \`${lg.code}\` | Prize: *${prize} ETB* | Players: ${pCount ?? 0}\n  Appoint: \`/appoint_${lg.code}_25\`\n\n`;
      }
    } else {
      msg += `*🟢 LIVE ACTIVE GAMES*\n_No live games currently playing._\n\n`;
    }

    if (completedGames && completedGames.length > 0) {
      msg += `*🏆 RECENT COMPLETED MATCHES*\n`;
      for (let i = 0; i < completedGames.length; i++) {
        const g = completedGames[i];
        let winnerName = 'Virtual Player';
        if (g.winner_id) {
          const { data: wp } = await supabase
            .from('profiles')
            .select('first_name, username')
            .eq('id', g.winner_id)
            .maybeSingle();
          if (wp) {
            winnerName = wp.first_name || 'Player';
            if (wp.username) winnerName += ` (@${wp.username})`;
          }
        }
        const prize = Number(g.prize_pool || 0).toLocaleString();
        msg += `${i + 1}. \`${g.code}\` | *${prize} ETB* | ${winnerName}\n`;
      }
    } else {
      msg += `*🏆 RECENT COMPLETED MATCHES*\n_No recently completed matches._`;
    }

    await sendMessage(chatId, msg, { parse_mode: 'Markdown' });
  } catch (e: any) {
    await sendMessage(chatId, `❌ Error loading games: ${e.message || 'Unknown'}`);
  }
}

async function handleAdminCommission(chatId: number) {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data: games } = await supabase
      .from('games')
      .select('id, code, prize_pool, stake_id, created_at')
      .eq('status', 'finished');

    let totalCommission = 0, todayCommission = 0;
    let totalBets = 0, todayBets = 0;
    let gameCount = 0;

    if (games) {
      for (const game of games) {
        const isToday = new Date(game.created_at) >= todayStart;

        const { data: playerCountData } = await supabase
          .from('game_players')
          .select('id')
          .eq('game_id', game.id)
          .eq('is_watching', false);
        const playerCount = playerCountData?.length || 0;

        if (!playerCount || playerCount === 0) continue;

        let stakeAmt = 0;
        if (game.stake_id) {
          const { data: stake } = await supabase
            .from('stakes')
            .select('amount')
            .eq('id', game.stake_id)
            .maybeSingle();
          stakeAmt = Number(stake?.amount) || 0;
        }

        if (stakeAmt === 0) continue;

        // Count actual cards (not just players) for accurate revenue
        const { data: cardData } = await supabase
          .from('game_card_reservations')
          .select('id')
          .eq('game_code', game.code)
          .gt('card_number', 0);
        const totalCards = Math.max(cardData?.length || 0, playerCount, 1);

        const prize = Number(game.prize_pool) || 0;
        const entryTotal = stakeAmt * totalCards;
        const commission = entryTotal - prize;

        if (commission < 0) continue;

        totalCommission += commission;
        totalBets += entryTotal;
        if (isToday) { todayCommission += commission; todayBets += entryTotal; }
        gameCount++;
      }
    }

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
      `📈 Total Entry Fees: ${totalBets.toLocaleString()} ETB`,
      `🎮 Games Counted: ${gameCount}`,
      `🔢 Rate: ${commissionRate}%`,
    ].join('\n');

    await sendMessage(chatId, msg, { parse_mode: 'Markdown' });
  } catch (e: any) {
    await sendMessage(chatId, `❌ Error loading commission: ${e.message || 'Unknown'}`);
  }
}

async function handleAdminApprove(chatId: number, txId: string) {
  const { data: tx, error } = await supabase
    .from('transactions')
    .select('*, profiles!inner(first_name, username, phone, telegram_id)')
    .eq('id', txId)
    .maybeSingle();

  if (error || !tx || tx.status !== 'pending') {
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
  // Use the proven rejectTransaction function from admin.ts (same as admin panel)
  const { rejectTransaction } = await import('@/lib/server/admin');
  const result = await rejectTransaction(txId);

  if (result.error) {
    await sendMessage(chatId, `❌ Error: ${result.error}`, { parse_mode: 'Markdown' });
  } else {
    await sendMessage(chatId, `❌ Transaction ${txId.slice(0, 8)} rejected.`, { parse_mode: 'Markdown' });
  }

}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const message = body.message || body.callback_query?.message;
    const callbackQuery = body.callback_query;
    const chatId = message?.chat?.id || callbackQuery?.message?.chat?.id;
    const from = body.message?.from || body.callback_query?.from;
    const rawText = body.message?.text || '';
    const text = normalizeCommandText(rawText);
    const commandText = stripBotSuffix(text);

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
    if (isExactCommand(commandText, '/start')) {
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
      await sendMessage(chatId, `*🔐 Admin Bot Commands*\n\n${commands.admin_stats || '/admin_stats'} - Dashboard stats\n${commands.admin_users || '/admin_users'} - Recent users\n${commands.admin_commission || '/admin_commission'} - Commission report\n${commands.admin_pending || '/admin_pending'} - Pending transactions\n${commands.admin_games || '/admin_games'} - Matches & winners\n/appoint_<gameId>_<cardNum> - Assign winner card\n/approve <txId> - Approve transaction\n/reject <txId> - Reject transaction\n${commands.admin_help || '/admin_help'} - This help`, { parse_mode: 'Markdown' });
      return NextResponse.json({ ok: true });
    }
    
    if (isExactCommand(commandText, commands.admin_stats)) {
      await handleAdminStats(chatId);
      return NextResponse.json({ ok: true });
    }
    if (isExactCommand(commandText, commands.admin_users)) {
      await handleAdminUsers(chatId);
      return NextResponse.json({ ok: true });
    }
    if (isExactCommand(commandText, commands.admin_pending)) {
      await handleAdminPending(chatId);
      return NextResponse.json({ ok: true });
    }
    if (isExactCommand(commandText, commands.admin_games || '/admin_games')) {
      await handleAdminGames(chatId);
      return NextResponse.json({ ok: true });
    }
    if (isExactCommand(commandText, commands.admin_commission || '/admin_commission')) {
      await handleAdminCommission(chatId);
      return NextResponse.json({ ok: true });
    }
    if (isExactCommand(commandText, commands.admin_help)) {
      await sendMessage(chatId, `*🔐 Admin Bot Commands*\n\n${commands.admin_stats || '/admin_stats'} - Dashboard stats\n${commands.admin_users || '/admin_users'} - Recent users\n${commands.admin_commission || '/admin_commission'} - Commission report\n${commands.admin_pending || '/admin_pending'} - Pending transactions\n${commands.admin_games || '/admin_games'} - Matches & winners\n/appoint_<gameId>_<cardNum> - Assign winner card\n/approve <txId> - Approve transaction\n/reject <txId> - Reject transaction\n${commands.admin_help || '/admin_help'} - This help`, { parse_mode: 'Markdown' });
      return NextResponse.json({ ok: true });
    }
    if (startsWithCommand(commandText, '/appoint')) {
      let gameId = '';
      let cardNumber = 0;
      let afterBalls = 20;

      if (commandText.startsWith('/appoint_')) {
        const parts = commandText.split('_');
        if (parts.length >= 3) {
          gameId = parts[1];
          cardNumber = Number(parts[2]);
          afterBalls = parts.length >= 4 ? Number(parts[3]) || 20 : 20;
        }
      } else {
        const parts = commandText.split(' ');
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

    // Handle /approve command (supports both /approve_<id> and /approve <id> formats)
    if (startsWithCommand(commandText, '/approve') || startsWithCommand(commandText, commands.admin_approve)) {
      let shortId = '';
      if (commandText.startsWith('/approve_')) {
        shortId = commandText.replace('/approve_', '').trim();
      } else if (commandText.startsWith('/approve ')) {
        shortId = commandText.replace('/approve ', '').trim();
      } else if (commandText.startsWith(commands.admin_approve)) {
        shortId = commandText.replace(commands.admin_approve, '').trim();
      }

      if (!shortId) {
        await sendMessage(chatId, `❌ *Usage:* \`/approve <txId>\`\n\nUse \`/admin_pending\` to see pending transactions with their Tx IDs.`, { parse_mode: 'Markdown' });
        return NextResponse.json({ ok: true });
      }

      const { data: txs, error: txError } = await supabase
        .from('transactions')
        .select('id')
        .eq('status', 'pending');
      if (txError) {
        await sendMessage(chatId, `❌ Error fetching transactions: ${txError.message}`);
        return NextResponse.json({ ok: true });
      }
      if (txs && txs.length > 0) {
        const match = txs.find((tx: any) => tx.id.startsWith(shortId));
        if (match) {
          await handleAdminApprove(chatId, match.id);
        } else {
          await sendMessage(chatId, `❌ Transaction not found with ID \`${shortId}\`. Use \`/admin_pending\` to see valid IDs.`, { parse_mode: 'Markdown' });
        }
      } else {
        await sendMessage(chatId, 'No pending transactions to approve.');
      }
      return NextResponse.json({ ok: true });
    }

    // Handle /reject command (supports both /reject_<id> and /reject <id> formats)
    if (startsWithCommand(commandText, '/reject') || startsWithCommand(commandText, commands.admin_reject)) {
      let shortId = '';
      if (commandText.startsWith('/reject_')) {
        shortId = commandText.replace('/reject_', '').trim();
      } else if (commandText.startsWith('/reject ')) {
        shortId = commandText.replace('/reject ', '').trim();
      } else if (commandText.startsWith(commands.admin_reject)) {
        shortId = commandText.replace(commands.admin_reject, '').trim();
      }

      if (!shortId) {
        await sendMessage(chatId, `❌ *Usage:* \`/reject <txId>\`\n\nUse \`/admin_pending\` to see pending transactions with their Tx IDs.`, { parse_mode: 'Markdown' });
        return NextResponse.json({ ok: true });
      }

      const { data: txs, error: txError } = await supabase
        .from('transactions')
        .select('id')
        .eq('status', 'pending');
      if (txError) {
        await sendMessage(chatId, `❌ Error fetching transactions: ${txError.message}`);
        return NextResponse.json({ ok: true });
      }
      if (txs && txs.length > 0) {
        const match = txs.find((tx: any) => tx.id.startsWith(shortId));
        if (match) {
          await handleAdminReject(chatId, match.id);
        } else {
          await sendMessage(chatId, `❌ Transaction not found with ID \`${shortId}\`. Use \`/admin_pending\` to see valid IDs.`, { parse_mode: 'Markdown' });
        }
      } else {
        await sendMessage(chatId, 'No pending transactions to reject.');
      }
      return NextResponse.json({ ok: true });
    }

    // Handle inline keyboard confirmation callbacks
    if (callbackQuery?.data) {
      const data = callbackQuery.data;
      const messageId = callbackQuery.message?.message_id;

      if (data.startsWith('confirm_approve_')) {
        const txId = data.replace('confirm_approve_', '');
        await tgCall('answerCallbackQuery', { callback_query_id: callbackQuery.id, text: 'Processing approval...' });

        // Use the proven approveTransaction function from admin.ts (same as admin panel)
        const { approveTransaction } = await import('@/lib/server/admin');
        const result = await approveTransaction(txId, String(from?.id || 'admin'));

        if (result.error) {
          await sendMessage(chatId, `Warning: ${result.error}`, { parse_mode: 'Markdown' });
        } else {
          // Edit original message to show done
          try {
            await fetch(`${TG_API}/editMessageText`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                message_id: messageId,
                text: `Approved! Transaction has been processed.`,
                parse_mode: 'Markdown',
              }),
            });
          } catch (e) { /* ignore */ }
          await sendMessage(chatId, `Transaction ${txId.slice(0, 8)} approved successfully.`, { parse_mode: 'Markdown' });
        }
        return NextResponse.json({ ok: true });
      }

      if (data.startsWith('confirm_reject_')) {
        const txId = data.replace('confirm_reject_', '');
        await tgCall('answerCallbackQuery', { callback_query_id: callbackQuery.id, text: 'Rejecting transaction...' });

        // Use the proven rejectTransaction function from admin.ts (same as admin panel)
        const { rejectTransaction } = await import('@/lib/server/admin');
        const result = await rejectTransaction(txId);

        if (result.error) {
          await sendMessage(chatId, `Warning: ${result.error}`, { parse_mode: 'Markdown' });
        } else {
          // Edit original message to show done
          try {
            await fetch(`${TG_API}/editMessageText`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                message_id: messageId,
                text: `Rejected! Transaction has been rejected.`,
                parse_mode: 'Markdown',
              }),
            });
          } catch (e) { /* ignore */ }
          await sendMessage(chatId, `Transaction ${txId.slice(0, 8)} rejected successfully.`, { parse_mode: 'Markdown' });
        }
        return NextResponse.json({ ok: true });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Admin bot webhook error:', error);
    return NextResponse.json({ ok: true, warning: 'handled' });
  }
}