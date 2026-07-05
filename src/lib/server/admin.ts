import { createClient } from '@supabase/supabase-js';
import type { Profile, Wallet, Transaction, Game, GamePlayer, Stake } from '../types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ---------------------------------------------------------------------------
// Notification channel system
// ---------------------------------------------------------------------------
type NotifyEvent =
  | 'deposit_pending'
  | 'deposit_approved'
  | 'deposit_rejected'
  | 'withdraw_pending'
  | 'withdraw_approved'
  | 'withdraw_rejected'
  | 'game_started'
  | 'game_winner'
  | 'game_winner_appointed'
  | 'user_registered'
  | 'balance_adjustment';

interface NotifyChannel {
  id: string;
  label: string;
  bot_token: string;
  chat_ids: string[];
  all_events: boolean;
  events: string[];
}

let cachedChannels: NotifyChannel[] | null = null;
let channelsCacheTime = 0;
const CHANNELS_CACHE_TTL = 30000;

async function getNotifyChannels(): Promise<NotifyChannel[]> {
  const now = Date.now();
  if (cachedChannels && (now - channelsCacheTime) < CHANNELS_CACHE_TTL) {
    return cachedChannels;
  }
  try {
    const { data } = await supabase
      .from('bot_config')
      .select('commands')
      .eq('id', 'main')
      .single();
    cachedChannels = (data?.commands?.notification_channels as NotifyChannel[]) || [];
    channelsCacheTime = now;
    return cachedChannels;
  } catch {
    return [];
  }
}

export function clearNotifyChannelsCache() {
  cachedChannels = null;
  channelsCacheTime = 0;
}

/** Send a message to all notification channels subscribed to a given event */
export async function notifyEvent(event: NotifyEvent, text: string, parseMode = 'Markdown') {
  const channels = await getNotifyChannels();
  const envBotToken = process.env.ADMIN_BOT_TOKEN;
  const envChatId = process.env.ADMIN_CHAT_ID;

  for (const ch of channels) {
    if (!ch.bot_token || !ch.chat_ids?.length) continue;
    const subs = ch.all_events || ch.events?.includes(event) || ch.events?.includes('*');
    if (!subs) continue;
    for (const cid of ch.chat_ids) {
      try {
        await fetch(`https://api.telegram.org/bot${ch.bot_token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: cid, text, parse_mode: parseMode }),
          signal: AbortSignal.timeout(5000),
        });
      } catch (err) {
        console.error(`notifyEvent channel ${ch.id} chat ${cid}:`, err);
      }
    }
  }

  // Fallback to env-configured admin
  if (envBotToken && envChatId) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${envBotToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: envChatId, text, parse_mode: parseMode }),
        signal: AbortSignal.timeout(5000),
      });
      const json = await res.json();
      if (!json.ok) console.error('notifyEvent env admin fallback error:', json);
    } catch (err) {
      console.error('notifyEvent env admin fallback fetch error:', err);
    }
  }
}

/** Send a direct message to a user via TELEGRAM_BOT_TOKEN (user bot) */
export async function notifyUser(telegramId: string | number, text: string, parseMode = 'Markdown') {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return;
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: String(telegramId), text, parse_mode: parseMode }),
      signal: AbortSignal.timeout(5000),
    });
    const json = await res.json();
    if (!json.ok) console.error('notifyUser Telegram error:', json);
  } catch (err) {
    console.error('notifyUser error:', err);
  }
}

// Verify admin access
export function verifyAdmin(password: string): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;
  return password === adminPassword;
}

// Dashboard stats
export async function getDashboardStats() {
  const [profiles, wallets, transactions, games, activeGames] = await Promise.all([
    supabase.from('profiles').select('id'),
    supabase.from('wallets').select('main_balance, play_balance'),
    supabase.from('transactions').select('type, amount, status, created_at'),
    supabase.from('games').select('id'),
    supabase.from('games').select('id').eq('status', 'active'),
  ]);

  const totalUsers = profiles.data?.length || 0;
  const totalGames = games.data?.length || 0;
  const activeGamesCount = activeGames.data?.length || 0;

  // Calculate wallet totals
  let totalMainBalance = 0;
  let totalPlayBalance = 0;
  if (wallets.data) {
    for (const w of wallets.data) {
      totalMainBalance += Number(w.main_balance) || 0;
      totalPlayBalance += Number(w.play_balance) || 0;
    }
  }

  // Calculate transaction totals
  let totalDeposits = 0;
  let totalDepositsApproved = 0;
  let totalWithdrawals = 0;
  let totalBets = 0;
  let totalWins = 0;
  let pendingDeposits = 0;
  let pendingWithdrawals = 0;

  if (transactions.data) {
    for (const t of transactions.data) {
      const amt = Number(t.amount) || 0;
      if (t.type === 'deposit' && t.status === 'completed') {
        totalDeposits += amt;
        totalDepositsApproved += amt;
      }
      if (t.type === 'withdraw' && t.status === 'completed') totalWithdrawals += amt;
      if (t.type === 'bet') { totalBets += amt; }
      if (t.type === 'win') { totalWins += amt; }
      if (t.type === 'deposit' && t.status === 'pending') pendingDeposits++;
      if (t.type === 'withdraw' && t.status === 'pending') pendingWithdrawals++;
    }
  }

  // Calculate actual commission from finished games (more accurate than bet-win diff)
  let totalCommissionFromGames = 0;
  const { data: finishedGames } = await supabase
    .from('games')
    .select('id, code, prize_pool, stake_id, commission')
    .eq('status', 'finished')
    .not('prize_pool', 'eq', 0);

  if (finishedGames) {
    for (const g of finishedGames) {
      if (!g.stake_id) continue;
      const { data: pcData } = await supabase
        .from('game_players')
        .select('id')
        .eq('game_id', g.id)
        .eq('is_watching', false);
      const pc = pcData?.length || 0;
      if (!pc || pc === 0) continue;
      const { data: sk } = await supabase
        .from('stakes')
        .select('amount')
        .eq('id', g.stake_id)
        .single();
      const amt = Number(sk?.amount) || 0;
      if (amt === 0) continue;
      const { data: ccData } = await supabase
        .from('game_card_reservations')
        .select('id')
        .eq('game_code', g.code);
      const cc = ccData?.length || 0;
      const totalCards = Math.max(pc, cc || 0);
      const commission = (amt * totalCards) - Number(g.prize_pool || 0);
      if (commission > 0) totalCommissionFromGames += commission;
    }
  }

  return {
    totalUsers,
    totalGames,
    activeGamesCount,
    totalMainBalance,
    totalPlayBalance,
    totalDeposits,
    totalDepositsApproved,
    totalWithdrawals,
    totalBets,
    totalWins,
    totalCommissionEarned: totalCommissionFromGames,
    pendingDeposits,
    pendingWithdrawals,
    revenue: totalCommissionFromGames,
  };
}

function ethDayBounds(dayOffset = 0): { start: string; end: string; label: string } {
  const now = new Date(Date.now() + 3 * 60 * 60 * 1000);
  now.setUTCDate(now.getUTCDate() - dayOffset);
  const label = now.toISOString().slice(0, 10);
  const start = new Date(`${label}T00:00:00+03:00`).toISOString();
  const end = new Date(`${label}T23:59:59.999+03:00`).toISOString();
  return { start, end, label };
}

export async function getAnalytics() {
  const [
    { data: profiles },
    { data: transactions },
    { data: gamePlayers },
    { data: games },
  ] = await Promise.all([
    supabase.from('profiles').select('id, created_at'),
    supabase.from('transactions').select('type, amount, status, created_at, user_id'),
    supabase.from('game_players').select('user_id, created_at, is_watching'),
    supabase.from('games').select('id, created_at, status'),
  ]);

  let streakRows: { user_id: string; streak_count: number; last_claim_date: string | null }[] = [];
  try {
    const { data } = await supabase.from('user_streaks').select('user_id, streak_count, last_claim_date');
    streakRows = (data as typeof streakRows) || [];
  } catch {
    streakRows = [];
  }

  const today = ethDayBounds(0);
  const yesterday = ethDayBounds(1);

  const uniqueUsersInRange = (items: { user_id?: string; created_at?: string }[] | null, start: string, end: string) => {
    const set = new Set<string>();
    (items || []).forEach(item => {
      if (!item.user_id || !item.created_at) return;
      if (item.created_at >= start && item.created_at <= end) set.add(item.user_id);
    });
    return set.size;
  };

  const sumTxInRange = (type: string, status: string, start: string, end: string) => {
    let total = 0;
    (transactions || []).forEach(t => {
      if (t.type === type && t.status === status && t.created_at >= start && t.created_at <= end) {
        total += Number(t.amount) || 0;
      }
    });
    return total;
  };

  const countGamesInRange = (start: string, end: string) =>
    (games || []).filter(g => g.created_at >= start && g.created_at <= end).length;

  const newUsersInRange = (start: string, end: string) =>
    (profiles || []).filter(p => p.created_at >= start && p.created_at <= end).length;

  const dauToday = uniqueUsersInRange(
    (gamePlayers || []).filter(p => !p.is_watching),
    today.start,
    today.end
  );
  const dauYesterday = uniqueUsersInRange(
    (gamePlayers || []).filter(p => !p.is_watching),
    yesterday.start,
    yesterday.end
  );

  const dailyChart = [];
  for (let i = 6; i >= 0; i--) {
    const day = ethDayBounds(i);
    dailyChart.push({
      date: day.label,
      activeUsers: uniqueUsersInRange((gamePlayers || []).filter(p => !p.is_watching), day.start, day.end),
      games: countGamesInRange(day.start, day.end),
      deposits: sumTxInRange('deposit', 'completed', day.start, day.end),
      bets: sumTxInRange('bet', 'completed', day.start, day.end),
      newUsers: newUsersInRange(day.start, day.end),
    });
  }

  const streakClaimsToday = streakRows.filter(s => s.last_claim_date === today.label).length;

  return {
    dauToday,
    dauYesterday,
    dauChange: dauYesterday > 0 ? Math.round(((dauToday - dauYesterday) / dauYesterday) * 100) : (dauToday > 0 ? 100 : 0),
    newUsersToday: newUsersInRange(today.start, today.end),
    gamesToday: countGamesInRange(today.start, today.end),
    depositsToday: sumTxInRange('deposit', 'completed', today.start, today.end),
    betsToday: sumTxInRange('bet', 'completed', today.start, today.end),
    winsToday: sumTxInRange('win', 'completed', today.start, today.end),
    streakClaimsToday,
    totalUsers: profiles?.length || 0,
    dailyChart,
  };
}

// Get all users with their wallets
export async function getUsers() {
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (!profiles) return [];

  const users = [];
  for (const profile of profiles) {
    const { data: wallet } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', profile.id)
      .single();

    users.push({
      ...profile,
      wallet: wallet || null,
    });
  }

  return users;
}

// Get single user with full details
export async function getUserDetail(userId: string) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (!profile) return null;

  const { data: wallet } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', userId)
    .single();

  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  const { data: gameHistory } = await supabase
    .from('game_history')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  return {
    ...profile,
    wallet: wallet || null,
    transactions: transactions || [],
    gameHistory: gameHistory || [],
  };
}

// Get all transactions with filters
export async function getTransactions(options: {
  type?: string;
  status?: string;
  limit?: number;
  offset?: number;
  bankName?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}) {
  let query = supabase
    .from('transactions')
    .select('*, profiles!inner(telegram_id, username, first_name)', { count: 'exact' })
    .neq('reference', '__DRAFT__')
    .order('created_at', { ascending: false });

  if (options.type) query = query.eq('type', options.type);
  if (options.status) query = query.eq('status', options.status);
  if (options.bankName) query = query.ilike('details->>bank_name', `%${options.bankName}%`);
  if (options.dateFrom) query = query.gte('created_at', options.dateFrom);
  if (options.dateTo) query = query.lte('created_at', options.dateTo + 'T23:59:59.999Z');
  if (options.search) {
    query = query.or(
      `reference.ilike.%${options.search}%,profiles.first_name.ilike.%${options.search}%,profiles.username.ilike.%${options.search}%`
    );
  }
  if (options.limit) query = query.limit(options.limit);
  if (options.offset) query = query.range(options.offset, options.offset + (options.limit || 50) - 1);

  const { data, count } = await query;
  return { transactions: data || [], total: count || 0 };
}

export async function getCommissionReport(options: {
  dateFrom?: string;
  dateTo?: string;
}) {
  // Fetch all finished games with prize data
  let gamesQuery = supabase
    .from('games')
    .select('id, code, prize_pool, stake_id, created_at, commission')
    .eq('status', 'finished');

  if (options.dateFrom) gamesQuery = gamesQuery.gte('created_at', options.dateFrom);
  if (options.dateTo) gamesQuery = gamesQuery.lte('created_at', options.dateTo + 'T23:59:59.999Z');

  const { data: games } = await gamesQuery;

  let totalBets = 0, totalWins = 0, totalCommission = 0;
  let gameCount = 0;

  // Also fetch transaction data for deposit/withdrawal info
  let txQuery = supabase
    .from('transactions')
    .select('type, amount, status, created_at');

  if (options.dateFrom) txQuery = txQuery.gte('created_at', options.dateFrom);
  if (options.dateTo) txQuery = txQuery.lte('created_at', options.dateTo + 'T23:59:59.999Z');

  const { data: txs } = await txQuery;
  let depositSum = 0, withdrawSum = 0;
  if (txs) {
    for (const t of txs) {
      const amt = Number(t.amount) || 0;
      if (t.type === 'deposit' && t.status === 'completed') depositSum += amt;
      if (t.type === 'withdraw' && t.status === 'completed') withdrawSum += amt;
    }
  }

  // Calculate commission per finished game from real data
  if (games) {
    for (const game of games) {
      // Count non-watching players
      const { data: playerCountData } = await supabase
        .from('game_players')
        .select('id')
        .eq('game_id', game.id)
        .eq('is_watching', false);
      const playerCount = playerCountData?.length || 0;

      if (!playerCount || playerCount === 0) continue;

      // Count card reservations (each player can have multiple cards)
      const { data: cardCountData } = await supabase
        .from('game_card_reservations')
        .select('id')
        .eq('game_code', game.code);
      const cardCount = cardCountData?.length || 0;

      // Use the larger of player count or card count (same logic as RPC)
      const totalEntities = Math.max(playerCount, cardCount || 0);

      // Resolve stake amount from the stakes table
      let stakeAmt = 0;
      if (game.stake_id) {
        const { data: stake } = await supabase
          .from('stakes')
          .select('amount')
          .eq('id', game.stake_id)
          .single();
        stakeAmt = Number(stake?.amount) || 0;
      }

      if (stakeAmt === 0) continue;

      const prize = Number(game.prize_pool) || 0;
      const entryTotal = stakeAmt * totalEntities;
      const commission = entryTotal - prize;

      if (commission < 0) continue; // skip malformed data

      totalCommission += commission;
      totalBets += entryTotal;
      totalWins += prize;
      gameCount++;
    }
  }

  return {
    totalBets,
    totalWins,
    totalCommission,
    totalDeposits: depositSum,
    totalWithdrawals: withdrawSum,
    gameCount,
  };
}

// Approve transaction (deposit/withdraw)
export async function approveTransaction(transactionId: string, adminId: string) {
  const { data: tx } = await supabase
    .from('transactions')
    .select('*, profiles!inner(telegram_id, first_name, username)')
    .eq('id', transactionId)
    .single();

  if (!tx) return { error: 'Transaction not found' };
  if (tx.status !== 'pending') return { error: 'Transaction already processed' };
  if (tx.reference === '__DRAFT__') return { error: 'Transaction is still awaiting TX ID from user' };

  // Update transaction status
  const { error: updateError } = await supabase
    .from('transactions')
    .update({ status: 'completed' })
    .eq('id', transactionId);

  if (updateError) return { error: updateError.message };

  // Update wallet balance
  const amount = tx.type === 'withdraw' ? -Math.abs(Number(tx.amount)) : Math.abs(Number(tx.amount));
  await supabase.rpc('adjust_main_balance', {
    p_user_id: tx.user_id,
    p_amount: amount,
  });

  // Notify user
  const prof = tx.profiles as any || {};
  const bankName = tx.details?.bank_name || '-';
  const userRef = tx.reference || '-';
  const amountStr = Number(tx.amount).toLocaleString();
  const txLabel = tx.type === 'deposit' ? 'Deposit' : 'Withdrawal';

  if (prof.telegram_id) {
    notifyUser(prof.telegram_id,
      `✅ *${txLabel} Approved!*\n\n💰 Amount: *${amountStr} ETB*\n🏦 Bank: *${bankName}*\n🆔 TX ID: \`${userRef}\`\n\nYour ${tx.type} has been approved and processed.`
    ).catch(() => {});
  }

  // Route to subscribed channels
  const eventName = tx.type === 'deposit' ? 'deposit_approved' : 'withdraw_approved';
  const userName = prof.first_name || prof.username || 'Unknown';
  const channelMsg =
    `✅ *${txLabel.toUpperCase()} APPROVED*\n\n` +
    `👤 *User:* ${userName}\n` +
    `💰 *Amount:* ${amountStr} ETB\n` +
    `🏦 *Bank:* ${bankName}\n` +
    `🆔 *Reference:* \`${userRef}\`\n` +
    `🆔 *Tx ID:* \`${tx.id.slice(0, 8)}...\``;

  notifyEvent(eventName as any, channelMsg).catch(() => {});

  return { success: true };
}

// Reject transaction
export async function rejectTransaction(transactionId: string) {
  const { data: tx } = await supabase
    .from('transactions')
    .select('*, profiles!inner(telegram_id, first_name, username)')
    .eq('id', transactionId)
    .single();

  const { error } = await supabase
    .from('transactions')
    .update({ status: 'failed' })
    .eq('id', transactionId);

  if (error) return { error: error.message };

  // Notify user
  if (tx) {
    const prof = tx.profiles as any || {};
    const bankName = tx.details?.bank_name || '-';
    const userRef = tx.reference || '-';
    const amountStr = Number(tx.amount).toLocaleString();
    const txLabel = tx.type === 'deposit' ? 'Deposit' : 'Withdrawal';

    if (prof.telegram_id) {
      notifyUser(prof.telegram_id,
        `❌ *${txLabel} Rejected*\n\n💰 Amount: *${amountStr} ETB*\n🏦 Bank: *${bankName}*\n🆔 TX ID: \`${userRef}\`\n\nYour ${tx.type} has been rejected. Please contact support if you have questions.`
      ).catch(() => {});
    }

    // Route to subscribed channels
    const eventName = tx.type === 'deposit' ? 'deposit_rejected' : 'withdraw_rejected';
    const userName = prof.first_name || prof.username || 'Unknown';
    const channelMsg =
      `❌ *${txLabel.toUpperCase()} REJECTED*\n\n` +
      `👤 *User:* ${userName}\n` +
      `💰 *Amount:* ${amountStr} ETB\n` +
      `🏦 *Bank:* ${bankName}\n` +
      `🆔 *Reference:* \`${userRef}\`\n` +
      `🆔 *Tx ID:* \`${tx.id.slice(0, 8)}...\``;

    notifyEvent(eventName as any, channelMsg).catch(() => {});
  }

  return { success: true };
}

// Get all games
export async function getGames(search?: string) {
  let query = supabase
    .from('games')
    .select('*, stakes(amount), profiles!winner_id(username, first_name)')
    .order('created_at', { ascending: false })
    .limit(50);

  if (search) {
    query = query.or(`code.ilike.%${search}%,id.ilike.%${search}%`);
  }

  const { data } = await query;
  return data || [];
}

// Get game details
export async function getGameDetail(gameId: string) {
  const { data: game } = await supabase
    .from('games')
    .select('*, stakes(amount), profiles!winner_id(username, first_name)')
    .eq('id', gameId)
    .single();

  if (!game) return null;

  const { data: players } = await supabase
    .from('game_players')
    .select('*, profiles(username, first_name)')
    .eq('game_id', gameId);

  return { ...game, players: players || [] };
}

// Get stakes configuration
export async function getStakes() {
  const { data } = await supabase
    .from('stakes')
    .select('*')
    .order('amount', { ascending: true });

  return data || [];
}

// Update stake
export async function updateStake(stakeId: string, updates: Partial<Stake>) {
  const { error } = await supabase
    .from('stakes')
    .update(updates)
    .eq('id', stakeId);

  if (error) return { error: error.message };
  return { success: true };
}

// Create new stake
export async function createStake(amount: number) {
  const { data, error } = await supabase
    .from('stakes')
    .insert({ amount, status: 'open', lobby_open_until: new Date(Date.now() + 3600000).toISOString() })
    .select()
    .single();

  if (error) return { error: error.message };
  return { data };
}

// Get contacts (users who shared phone)
export async function getContacts() {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .not('phone', 'is', null)
    .order('created_at', { ascending: false });

  return data || [];
}

// Get bot config (commands)
export async function getBotConfig() {
  const { data } = await supabase
    .from('bot_config')
    .select('commands')
    .eq('id', 'main')
    .single();

  return data?.commands || {
    admin_stats: '/admin_stats',
    admin_users: '/admin_users',
    admin_pending: '/admin_pending',
    admin_help: '/admin_help',
    admin_approve: '/approve_',
    admin_reject: '/reject_',
  };
}

// Update bot config
export async function updateBotConfig(commands: Record<string, any>) {
  const { error } = await supabase
    .from('bot_config')
    .upsert({ id: 'main', commands, updated_at: new Date().toISOString() });

  if (error) return { error: error.message };
  return { success: true };
}

// Set exact balance (no notification, no transaction record)
export async function setBalance(userId: string, type: 'main' | 'play', value: number) {
  const column = type === 'main' ? 'main_balance' : 'play_balance';

  if (value < 0) return { error: 'Balance cannot be negative' };

  const { error: updateError } = await supabase
    .from('wallets')
    .update({ [column]: value })
    .eq('user_id', userId);

  if (updateError) return { error: updateError.message };
  return { success: true };
}

// Delete user and all associated data
export async function deleteUser(userId: string) {
  const childTables = ['game_card_reservations', 'game_players', 'transactions', 'wallets', 'game_history'];
  for (const table of childTables) {
    const { error } = await supabase.from(table).delete().eq('user_id', userId);
    if (error) return { error: error.message };
  }
  const { error: profileErr } = await supabase.from('profiles').delete().eq('id', userId);
  if (profileErr) return { error: profileErr.message };
  return { success: true };
}

export async function bulkDeleteUsers(userIds: string[]) {
  let deleted = 0;
  let errors = 0;
  for (const userId of userIds) {
    const result = await deleteUser(userId);
    if (result.success) deleted++;
    else errors++;
  }
  return { success: true, deleted, errors };
}

export async function bulkAdjustBalance(userIds: string[], amount: number, type: 'main' | 'play', reason: string) {
  let updated = 0;
  let errors = 0;
  for (const userId of userIds) {
    const result = await adjustBalance(userId, amount, type, reason);
    if (result.success) updated++;
    else errors++;
  }
  return { success: true, updated, errors };
}

export async function bulkSetBalance(userIds: string[], type: 'main' | 'play', value: number) {
  let updated = 0;
  let errors = 0;
  for (const userId of userIds) {
    const result = await setBalance(userId, type, value);
    if (result.success) updated++;
    else errors++;
  }
  return { success: true, updated, errors };
}

export async function getBotMessages() {
  const { data } = await supabase
    .from('bot_messages')
    .select('messages')
    .eq('id', 'main')
    .single();

  return data?.messages || {};
}

// Update bot messages
export async function updateBotMessages(messages: Record<string, any>) {
  const { error } = await supabase
    .from('bot_messages')
    .upsert({ id: 'main', messages, updated_at: new Date().toISOString() });

  if (error) return { error: error.message };

  // Sync description with the Telegram Bot API
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (botToken && messages && typeof messages.bot_description === 'string') {
    try {
      await fetch(`https://api.telegram.org/bot${botToken}/setMyDescription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: messages.bot_description }),
        signal: AbortSignal.timeout(5000),
      }).then(r => r.json()).then(data => {
        console.info('Telegram setMyDescription sync ok');
      });
    } catch (err) {
      console.error('Failed to sync bot description with Telegram:', err);
    }
  }

  return { success: true };
}

// Adjust user balance
export async function adjustBalance(userId: string, amount: number, type: 'main' | 'play', reason: string) {
  const column = type === 'main' ? 'main_balance' : 'play_balance';
  
  // Get current balance
  const { data: wallet } = await supabase
    .from('wallets')
    .select('main_balance, play_balance')
    .eq('user_id', userId)
    .single();

  if (!wallet) return { error: 'Wallet not found' };

  const currentBalance = type === 'main' ? Number(wallet.main_balance) : Number(wallet.play_balance);
  const newBalance = currentBalance + amount;
  if (newBalance < 0) return { error: 'Insufficient balance' };

  const { error: updateError } = await supabase
    .from('wallets')
    .update({ [column]: newBalance })
    .eq('user_id', userId);

  if (updateError) return { error: updateError.message };

  // Record transaction
  const { data: insertedTx } = await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      type: amount > 0 ? 'deposit' : 'withdraw',
      amount: Math.abs(amount),
      status: 'completed',
      reference: `admin_${reason}_${Date.now()}`,
    })
    .select('id')
    .single();

  if (insertedTx) {
    notifyAdminTransactionCompleted(insertedTx.id).catch(err => {
      console.error('Error triggering admin notification for balance adjustment:', err);
    });
  }

  // Notify the user via their Telegram bot
  notifyUserBalanceChange(userId, amount, type, newBalance, reason).catch(err => {
    console.error('Error notifying user of balance adjustment:', err);
  });

  return { success: true };
}

async function notifyUserBalanceChange(userId: string, amount: number, type: 'main' | 'play', newBalance: number, reason: string) {
  const userBotToken = process.env.TELEGRAM_BOT_TOKEN;
  const { data: profile } = await supabase
    .from('profiles')
    .select('telegram_id, first_name, language')
    .eq('id', userId)
    .maybeSingle();

  if (!profile?.telegram_id || !userBotToken) return;

  const emoji = amount > 0 ? '✅' : '❌';
  const dirLabel = amount > 0 ? 'credited to' : 'deducted from';
  const walletLabel = type === 'main' ? 'Main Wallet' : 'Play Wallet';
  const absAmount = Math.abs(amount).toLocaleString();

  const text = `${emoji} *Balance Update*\n\n` +
    `💰 *${absAmount} ETB* ${dirLabel} your *${walletLabel}*\n` +
    `📊 New ${walletLabel} balance: *${newBalance.toLocaleString()} ETB*\n` +
    `📝 Reason: ${reason}\n\n` +
    `Use /balance to check your full wallet.`;

  try {
    await fetch(`https://api.telegram.org/bot${userBotToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: profile.telegram_id,
        text,
        parse_mode: 'Markdown',
      }),
      signal: AbortSignal.timeout(5000),
    });
  } catch (err) {
    console.error('Telegram user notification error:', err);
  }
}

// Helper to send real-time notification to Admin Telegram Bot for completed transactions
export async function notifyAdminTransactionCompleted(transactionId: string) {
  const adminBotToken = process.env.ADMIN_BOT_TOKEN;
  const adminChatId = process.env.ADMIN_CHAT_ID;
  
  if (!adminBotToken || !adminChatId) {
    console.warn('Admin Telegram transaction notification skipped: ADMIN_BOT_TOKEN or ADMIN_CHAT_ID not configured');
    return;
  }

  try {
    // 1. Fetch transaction details
    const { data: tx, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .maybeSingle();

    if (txError || !tx) {
      console.error(`Error fetching transaction ${transactionId} for notification:`, txError);
      return;
    }

    // 2. Fetch user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, username, phone')
      .eq('id', tx.user_id)
      .maybeSingle();

    const playerName = profile 
      ? (profile.first_name || (profile.username ? `@${profile.username}` : 'Unknown Player'))
      : 'Unknown Player';
    const playerPhone = profile?.phone || 'N/A';
    const playerUsername = profile?.username ? `@${profile.username}` : 'N/A';

    // 3. Status icon
    let statusIcon = '⏳ PENDING';
    if (tx.status === 'completed') {
      statusIcon = '✅ COMPLETED';
    } else if (tx.status === 'failed') {
      statusIcon = '❌ FAILED/REJECTED';
    }

    // 4. Bank / Method
    const bankName = tx.details?.bank_name || 'N/A';
    const userRef = tx.reference || 'N/A';

    // 5. Construct message
    const text = `💰 *TRANSACTION RECORDED / UPDATED*\n\n` +
                 `🏷️ *Type:* ${tx.type.toUpperCase()}\n` +
                 `💵 *Amount:* ${Number(tx.amount).toLocaleString()} ETB\n` +
                 `🚦 *Status:* ${statusIcon}\n` +
                 `🏦 *Bank:* ${bankName}\n` +
                 `🔗 *Reference:* \`${userRef}\`\n\n` +
                 `👤 *User:* ${playerName}\n` +
                 `👤 *Username:* ${playerUsername}\n` +
                 `📞 *Phone:* ${playerPhone}\n` +
                 `🆔 *Tx ID:* \`${tx.id.slice(0, 8)}...\`\n` +
                 `⏱️ *Date:* ${new Date(tx.created_at || Date.now()).toLocaleString()}`;

    // 5. Call Telegram API
    await fetch(`https://api.telegram.org/bot${adminBotToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: adminChatId,
        text,
        parse_mode: 'Markdown',
      }),
      signal: AbortSignal.timeout(5000),
    });
  } catch (err) {
    console.error('Error sending Telegram admin transaction notification:', err);
  }
}