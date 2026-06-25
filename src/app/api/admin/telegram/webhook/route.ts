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
      admin_live: '/admin_live',
      admin_winner: '/setwinner_',
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
      admin_live: '/admin_live',
      admin_winner: '/setwinner_',
      admin_help: '/admin_help',
      admin_approve: '/approve_',
      admin_reject: '/reject_',
    };
  }
}

// Admin command handlers
async function handleAdminStats(chatId: number) {
  const profileRes = await supabase.from('profiles').select('id', { count: 'exact', head: true });
  const gamesRes = await supabase.from('games').select('id', { count: 'exact', head: true });
  const activeRes = await supabase.from('games').select('id', { count: 'exact', head: true }).eq('status', 'active');
  const lobbyRes = await supabase.from('games').select('id', { count: 'exact', head: true }).eq('status', 'lobby');
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

  const msg = `*📊 Admin Dashboard*\n\n👥 Users: ${profileRes.count || 0}\n🎮 Games: ${gamesRes.count || 0}\n🟢 Active: ${activeRes.count || 0}\n🟡 Lobby: ${lobbyRes.count || 0}\n💰 Deposits: ${totalDeposits.toLocaleString()} ETB\n💸 Withdrawals: ${totalWithdrawals.toLocaleString()} ETB\n📈 Revenue: ${(totalBets - totalWins).toLocaleString()} ETB\n⏳ Pending Deposits: ${pendingDep}\n⏳ Pending Withdrawals: ${pendingWit}`;

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
    return `${i + 1}. Room: *${roomName}*\n   Status: *${g.status}*\n   Prize Pool: *${prize} ETB*\n   Winner: *${winnerName}${winnerUser}*`;
  }).join('\n\n');

  await sendMessage(chatId, `*🎮 Recent Matches & Winners*\n\n${list}`, { parse_mode: 'Markdown' });
}

// Show active/lobby game sessions with live players
async function handleAdminLive(chatId: number) {
  // Get active and lobby games
  const { data: activeGames, error: gamesError } = await supabase
    .from('games')
    .select('id, code, status, prize_pool, stake_id, created_at, stakes(amount)')
    .in('status', ['active', 'lobby'])
    .order('created_at', { ascending: false })
    .limit(10);

  if (gamesError) {
    console.error('Error fetching active games:', gamesError);
    await sendMessage(chatId, '❌ Error fetching game sessions. Please try again.');
    return;
  }

  if (!activeGames || activeGames.length === 0) {
    await sendMessage(chatId, 'No active game sessions right now.');
    return;
  }

  // Build a comprehensive summary
  let summary = `*🟢 LIVE GAME SESSIONS (${activeGames.length} active)*\n\n`;

  for (const game of activeGames) {
    const gameShortId = game.id.slice(0, 8);
    const stakeAmount = game.stakes?.[0]?.amount || 'N/A';
    const statusIcon = game.status === 'active' ? '🟢' : '🟡';
    const prizePool = Number(game.prize_pool || 0).toLocaleString();

    // Get players for this game
    const { data: players, error: playersError } = await supabase
      .from('game_players')
      .select('user_id, profiles(first_name, username, telegram_id)')
      .eq('game_id', game.id);

    if (playersError) {
      console.error(`Error fetching players for game ${game.id}:`, playersError);
    }

    const playerCount = players?.length || 0;

    summary += `${statusIcon} *Game: #${game.code}*\n`;
    summary += `   ID: \`${gameShortId}\` | Stake: *${stakeAmount} ETB*\n`;
    summary += `   Prize Pool: *${prizePool} ETB*\n`;
    summary += `   👥 *Players (${playerCount}):*\n`;

    if (players && players.length > 0) {
      players.forEach((p: any, i: number) => {
        const name = p.profiles?.first_name || p.profiles?.username || 'Unknown';
        const userShortId = p.user_id.slice(0, 8);
        summary += `   ${i + 1}. ${name}\n`;
        summary += `      /setwinner_${gameShortId}_${userShortId}\n`;
      });
    } else {
      summary += `   _No players yet_\n`;
    }

    summary += `\n`;
  }

  summary += `_Use /setwinner_<gameId>_<userId> to appoint a winner_`;

  await sendMessage(chatId, summary, { parse_mode: 'Markdown' });
}

// Appoint a winner for a game session and credit their wallet
async function handleAdminSetWinner(chatId: number, gameShortId: string, userShortId: string) {
  // Find the game by short ID
  const { data: games } = await supabase
    .from('games')
    .select('*')
    .in('status', ['active', 'lobby']);

  if (!games || games.length === 0) {
    await sendMessage(chatId, 'No active games found.');
    return;
  }

  const game = games.find((g: any) => g.id.startsWith(gameShortId));
  if (!game) {
    await sendMessage(chatId, `Game not found with ID starting with "${gameShortId}".`);
    return;
  }

  // Find the user by short ID
  const { data: players } = await supabase
    .from('game_players')
    .select('*, profiles(first_name, username, telegram_id)')
    .eq('game_id', game.id);

  if (!players || players.length === 0) {
    await sendMessage(chatId, 'No players found in this game session.');
    return;
  }

  const player = players.find((p: any) => p.user_id.startsWith(userShortId));
  if (!player) {
    await sendMessage(chatId, `Player not found with ID starting with "${userShortId}".`);
    return;
  }

  const winnerUserId = player.user_id;
  const prizePool = Number(game.prize_pool || 0);
  const winnerName = player.profiles?.first_name || player.profiles?.username || 'Unknown Player';
  const winnerTgId = player.profiles?.telegram_id;

  // Update game with winner
  const { error: updateError } = await supabase
    .from('games')
    .update({ 
      status: 'finished', 
      winner_id: winnerUserId,
      prize_pool: prizePool
    })
    .eq('id', game.id);

  if (updateError) {
    await sendMessage(chatId, `Failed to update game: ${updateError.message}`);
    return;
  }

  // Credit winner's main wallet
  if (prizePool > 0) {
    const { data: wallet } = await supabase
      .from('wallets')
      .select('main_balance')
      .eq('user_id', winnerUserId)
      .single();

    if (wallet) {
      const currentMain = Number(wallet.main_balance) || 0;
      await supabase
        .from('wallets')
        .update({ main_balance: currentMain + prizePool })
        .eq('user_id', winnerUserId);
    }

    // Record win transaction
    await supabase.from('transactions').insert({
      user_id: winnerUserId,
      type: 'win',
      amount: prizePool,
      status: 'completed',
      reference: `admin_winner_${game.code}_${Date.now()}`,
    });
  }

  // Notify admin
  await sendMessage(chatId, 
    `🏆 *Winner Appointed!*\n\n` +
    `🎮 Game: #${game.code}\n` +
    `👑 Winner: *${winnerName}*\n` +
    `💰 Prize: ${prizePool.toLocaleString()} ETB\n` +
    `✅ Prize credited to Main Wallet\n` +
    `⏰ ${new Date().toLocaleString()}`,
    { parse_mode: 'Markdown' }
  );

  // Notify the winning user
  if (winnerTgId) {
    await sendMessage(winnerTgId,
      `🏆 *Congratulations! You Won!*\n\n` +
      `You have been selected as the winner of game #${game.code}!\n` +
      `💰 ${prizePool.toLocaleString()} ETB has been added to your Main Wallet.\n` +
      `Keep playing and good luck!`,
      { parse_mode: 'Markdown' }
    );
  }
}

async function handleAdminApprove(chatId: number, txId: string) {
  const { data: tx } = await supabase.from('transactions').select('*, profiles!inner(first_name, username, telegram_id)').eq('id', txId).single();
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

  const userName = tx.profiles?.first_name || tx.profiles?.username || 'Unknown User';
  const typeLabel = tx.type === 'deposit' ? '💳 DEPOSIT' : '💸 WITHDRAW';
  await sendMessage(chatId, `✅ *Transaction Approved*\n\n${typeLabel}\n👤 User: ${userName}\n💰 Amount: ${Number(tx.amount).toLocaleString()} ETB\n🆔 TX ID: \`${tx.id.slice(0, 8)}\`\n⏰ ${new Date().toLocaleString()}`, { parse_mode: 'Markdown' });

  // Notify user
  const userTgId = tx.profiles?.telegram_id;
  if (userTgId && tx.type === 'deposit') {
    await sendMessage(userTgId, `✅ *Deposit Approved*\n\n💰 ${Number(tx.amount).toLocaleString()} ETB has been added to your Main Wallet.\nThank you for your payment!`, { parse_mode: 'Markdown' });
  }
}

async function handleAdminReject(chatId: number, txId: string) {
  const { data: tx } = await supabase.from('transactions').select('*, profiles!inner(first_name, username, telegram_id)').eq('id', txId).single();
  await supabase.from('transactions').update({ status: 'failed' }).eq('id', txId);

  if (tx) {
    const userName = tx.profiles?.first_name || tx.profiles?.username || 'Unknown User';
    const userTgId = tx.profiles?.telegram_id;
    const typeLabel = tx.type === 'deposit' ? '💳 DEPOSIT' : '💸 WITHDRAW';
    await sendMessage(chatId, `❌ *Transaction Rejected*\n\n${typeLabel}\n👤 User: ${userName}\n💰 Amount: ${Number(tx.amount).toLocaleString()} ETB\n🆔 TX ID: \`${tx.id.slice(0, 8)}\`\n⏰ ${new Date().toLocaleString()}`, { parse_mode: 'Markdown' });

    if (userTgId) {
      await sendMessage(userTgId, `❌ *Transaction Rejected*\n\nYour ${tx.type} of ${Number(tx.amount).toLocaleString()} ETB was not approved.\nPlease contact support if you have questions.`, { parse_mode: 'Markdown' });
    }
  }
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
            [{ text: '🟢 Live Games' }, { text: '❓ Help' }],
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
    if (text === '🟢 Live Games') {
      await handleAdminLive(chatId);
      return NextResponse.json({ ok: true });
    }
    if (text === '❓ Help') {
      await sendMessage(chatId, `*🔐 Admin Commands*\n\n${commands.admin_stats} - View dashboard stats\n${commands.admin_users} - List recent users\n${commands.admin_pending} - View pending transactions\n${commands.admin_games || '/admin_games'} - View recent matches & winners\n${commands.admin_live || '/admin_live'} - View active game sessions with live players\n${commands.admin_winner || '/setwinner_'}<gameId>_<userId> - Appoint a winner\n${commands.admin_approve}<tx_id> - Approve a transaction\n${commands.admin_reject}<tx_id> - Reject a transaction\n${commands.admin_help} - Show this help`, { parse_mode: 'Markdown' });
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
    if (text === (commands.admin_live || '/admin_live')) {
      await handleAdminLive(chatId);
      return NextResponse.json({ ok: true });
    }
    if (text === commands.admin_help) {
      await sendMessage(chatId, `*🔐 Admin Commands*\n\n${commands.admin_stats} - View dashboard stats\n${commands.admin_users} - List recent users\n${commands.admin_pending} - View pending transactions\n${commands.admin_games || '/admin_games'} - View recent matches & winners\n${commands.admin_live || '/admin_live'} - View active game sessions with live players\n${commands.admin_winner || '/setwinner_'}<gameId>_<userId> - Appoint a winner\n${commands.admin_approve}<tx_id> - Approve a transaction\n${commands.admin_reject}<tx_id> - Reject a transaction\n${commands.admin_help} - Show this help`, { parse_mode: 'Markdown' });
      return NextResponse.json({ ok: true });
    }
    // Handle setwinner command: /setwinner_GAMEID_USERID
    if (text.startsWith(commands.admin_winner || '/setwinner_')) {
      const params = text.replace(commands.admin_winner || '/setwinner_', '');
      const parts = params.split('_');
      if (parts.length >= 2) {
        const gameShortId = parts[0];
        const userShortId = parts[1];
        await handleAdminSetWinner(chatId, gameShortId, userShortId);
      } else {
        await sendMessage(chatId, 'Invalid format. Use: /setwinner_<gameId>_<userId>');
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

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Admin bot webhook error:', error);
    return NextResponse.json({ ok: true, warning: 'handled' });
  }
}