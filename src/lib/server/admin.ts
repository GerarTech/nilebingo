import { createClient } from '@supabase/supabase-js';
import type { Profile, Wallet, Transaction, Game, GamePlayer, Stake } from '../types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Verify admin access
export function verifyAdmin(password: string): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  return password === adminPassword;
}

// Dashboard stats
export async function getDashboardStats() {
  const [profiles, wallets, transactions, games, activeGames] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('wallets').select('main_balance, play_balance'),
    supabase.from('transactions').select('type, amount, status, created_at'),
    supabase.from('games').select('id', { count: 'exact', head: true }),
    supabase.from('games').select('id', { count: 'exact', head: true }).eq('status', 'active'),
  ]);

  const totalUsers = profiles.count || 0;
  const totalGames = games.count || 0;
  const activeGamesCount = activeGames.count || 0;

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
  let totalWithdrawals = 0;
  let totalBets = 0;
  let totalWins = 0;
  let pendingDeposits = 0;
  let pendingWithdrawals = 0;

  if (transactions.data) {
    for (const t of transactions.data) {
      const amt = Number(t.amount) || 0;
      if (t.type === 'deposit' && t.status === 'completed') totalDeposits += amt;
      if (t.type === 'withdraw' && t.status === 'completed') totalWithdrawals += amt;
      if (t.type === 'bet') totalBets += amt;
      if (t.type === 'win') totalWins += amt;
      if (t.type === 'deposit' && t.status === 'pending') pendingDeposits++;
      if (t.type === 'withdraw' && t.status === 'pending') pendingWithdrawals++;
    }
  }

  return {
    totalUsers,
    totalGames,
    activeGamesCount,
    totalMainBalance,
    totalPlayBalance,
    totalDeposits,
    totalWithdrawals,
    totalBets,
    totalWins,
    pendingDeposits,
    pendingWithdrawals,
    revenue: totalBets - totalWins,
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
}) {
  let query = supabase
    .from('transactions')
    .select('*, profiles!inner(telegram_id, username, first_name)')
    .order('created_at', { ascending: false });

  if (options.type) query = query.eq('type', options.type);
  if (options.status) query = query.eq('status', options.status);
  if (options.limit) query = query.limit(options.limit);
  if (options.offset) query = query.range(options.offset, options.offset + (options.limit || 50) - 1);

  const { data, count } = await query;
  return { transactions: data || [], total: count || 0 };
}

// Approve transaction (deposit/withdraw)
export async function approveTransaction(transactionId: string, adminId: string) {
  const { data: tx } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', transactionId)
    .single();

  if (!tx) return { error: 'Transaction not found' };
  if (tx.status !== 'pending') return { error: 'Transaction already processed' };

  // Update transaction status
  const { error: updateError } = await supabase
    .from('transactions')
    .update({ status: 'completed' })
    .eq('id', transactionId);

  if (updateError) return { error: updateError.message };

  // Update wallet balance
  if (tx.type === 'deposit') {
    await supabase.rpc('add_to_main_balance', {
      user_id: tx.user_id,
      amount: tx.amount,
    });
  } else if (tx.type === 'withdraw') {
    await supabase.rpc('subtract_from_main_balance', {
      user_id: tx.user_id,
      amount: tx.amount,
    });
  }

  // Trigger real-time notification
  await notifyAdminTransactionCompleted(transactionId);

  return { success: true };
}

// Reject transaction
export async function rejectTransaction(transactionId: string) {
  const { error } = await supabase
    .from('transactions')
    .update({ status: 'failed' })
    .eq('id', transactionId);

  if (error) return { error: error.message };

  // Trigger real-time notification
  await notifyAdminTransactionCompleted(transactionId);

  return { success: true };
}

// Get all games
export async function getGames() {
  const { data } = await supabase
    .from('games')
    .select('*, stakes(amount), profiles!winner_id(username, first_name)')
    .order('created_at', { ascending: false })
    .limit(50);

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

// Get bot messages
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
    // Notify in background
    notifyAdminTransactionCompleted(insertedTx.id).catch(err => {
      console.error('Error triggering admin notification for balance adjustment:', err);
    });
  }

  return { success: true };
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

    // 4. Construct message
    const text = `💰 *TRANSACTION RECORDED / UPDATED*\n\n` +
                 `🏷️ *Type:* ${tx.type.toUpperCase()}\n` +
                 `💵 *Amount:* ${Number(tx.amount).toLocaleString()} ETB\n` +
                 `🚦 *Status:* ${statusIcon}\n\n` +
                 `👤 *User:* ${playerName}\n` +
                 `👤 *Username:* ${playerUsername}\n` +
                 `📞 *Phone:* ${playerPhone}\n` +
                 `🆔 *Tx ID:* \`${tx.id.slice(0, 8)}...\`\n` +
                 `🔗 *Reference:* \`${tx.reference || 'N/A'}\`\n` +
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