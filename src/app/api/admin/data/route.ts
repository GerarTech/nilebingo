import { NextRequest, NextResponse } from 'next/server';
import { Telegraf } from 'telegraf';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

import {
  verifyAdmin,
  getDashboardStats,
  getAnalytics,
  getUsers,
  getUserDetail,
  getTransactions,
  getCommissionReport,
  approveTransaction,
  rejectTransaction,
  getGames,
  getGameDetail,
  getStakes,
  updateStake,
  createStake,
  getContacts,
  adjustBalance,
  setBalance,
  deleteUser,
  bulkDeleteUsers,
  bulkAdjustBalance,
  bulkSetBalance,
  getBotConfig,
  updateBotConfig,
  getBotMessages,
  updateBotMessages,
} from '@/lib/server/admin';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseServiceKey) throw new Error('Missing Supabase environment variables');
const supabase = createClient(supabaseUrl, supabaseServiceKey);

function checkAuth(request: NextRequest): boolean {
  const cookie = request.cookies.get('admin_token')?.value;
  return !!cookie && verifyAdmin(cookie);
}

export async function GET(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const userId = searchParams.get('userId');
  const gameId = searchParams.get('gameId');

  try {
    switch (action) {
      case 'dashboard': {
        const stats = await getDashboardStats();
        return NextResponse.json(stats);
      }
      case 'analytics': {
        const analytics = await getAnalytics();
        return NextResponse.json(analytics);
      }
      case 'users': {
        const users = await getUsers();
        return NextResponse.json(users);
      }
      case 'user': {
        if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });
        const user = await getUserDetail(userId);
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
        return NextResponse.json(user);
      }
      case 'transactions': {
        const type = searchParams.get('type') || undefined;
        const status = searchParams.get('status') || undefined;
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');
        const bankName = searchParams.get('bankName') || undefined;
        const dateFrom = searchParams.get('dateFrom') || undefined;
        const dateTo = searchParams.get('dateTo') || undefined;
        const search = searchParams.get('search') || undefined;
        const result = await getTransactions({ type, status, limit, offset, bankName, dateFrom, dateTo, search });
        return NextResponse.json(result);
      }
      case 'commission': {
        const dateFrom = searchParams.get('dateFrom') || undefined;
        const dateTo = searchParams.get('dateTo') || undefined;
        const result = await getCommissionReport({ dateFrom, dateTo });
        return NextResponse.json(result);
      }
      case 'games': {
        const search = searchParams.get('search') || undefined;
        const games = await getGames(search);
        return NextResponse.json(games);
      }
      case 'game': {
        if (!gameId) return NextResponse.json({ error: 'gameId required' }, { status: 400 });
        const game = await getGameDetail(gameId);
        if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 });
        return NextResponse.json(game);
      }
      case 'stakes': {
        const stakes = await getStakes();
        return NextResponse.json(stakes);
      }
      case 'contacts': {
        const contacts = await getContacts();
        return NextResponse.json(contacts);
      }
      case 'bot_config': {
        const config = await getBotConfig();
        return NextResponse.json(config);
      }
      case 'bot_messages': {
        const messages = await getBotMessages();
        return NextResponse.json(messages);
      }
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Admin API error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN || '';

  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'approve_transaction': {
        const result = await approveTransaction(body.transactionId, 'admin');
        return NextResponse.json(result);
      }
      case 'reject_transaction': {
        const result = await rejectTransaction(body.transactionId);
        return NextResponse.json(result);
      }
      case 'update_stake': {
        const result = await updateStake(body.stakeId, body.updates);
        return NextResponse.json(result);
      }
      case 'create_stake': {
        const result = await createStake(body.amount);
        return NextResponse.json(result);
      }
      case 'adjust_balance': {
        const result = await adjustBalance(body.userId, body.amount, body.walletType, body.reason);
        return NextResponse.json(result);
      }
      case 'broadcast': {
        const bot = new Telegraf(botToken);
        const { data: users } = await supabase
          .from('profiles')
          .select('telegram_id');
        
        let sent = 0;
        let failed = 0;
        if (users) {
          for (const user of users) {
            try {
              if (body.media_url && body.media_type === 'photo') {
                await bot.telegram.sendPhoto(user.telegram_id, body.media_url, {
                  caption: body.message || undefined,
                  parse_mode: 'Markdown',
                });
              } else if (body.media_url && body.media_type === 'video') {
                await bot.telegram.sendVideo(user.telegram_id, body.media_url, {
                  caption: body.message || undefined,
                  parse_mode: 'Markdown',
                });
              } else {
                await bot.telegram.sendMessage(user.telegram_id, body.message, {
                  parse_mode: 'Markdown',
                });
              }
              sent++;
            } catch {
              failed++;
            }
          }
        }
        return NextResponse.json({ sent, failed });
      }
      case 'set_balance': {
        const result = await setBalance(body.userId, body.walletType, body.value);
        return NextResponse.json(result);
      }
      case 'delete_user': {
        const result = await deleteUser(body.userId);
        return NextResponse.json(result);
      }
      case 'bulk_delete_users': {
        const result = await bulkDeleteUsers(body.userIds);
        return NextResponse.json(result);
      }
      case 'bulk_adjust_balance': {
        const result = await bulkAdjustBalance(body.userIds, body.amount, body.walletType, body.reason);
        return NextResponse.json(result);
      }
      case 'bulk_set_balance': {
        const result = await bulkSetBalance(body.userIds, body.walletType, body.value);
        return NextResponse.json(result);
      }
      case 'update_bot_config': {
        const result = await updateBotConfig(body.commands);
        return NextResponse.json(result);
      }
      case 'update_bot_messages': {
        const result = await updateBotMessages(body.messages);
        return NextResponse.json(result);
      }
      case 'cleanup_guest_users': {
        const { data: allProfiles } = await supabase
          .from('profiles')
          .select('id, telegram_id');
        let deleted = 0;
        if (allProfiles) {
          for (const p of allProfiles) {
            if (!/^\d+$/.test(String(p.telegram_id || ''))) {
              await deleteUser(p.id);
              deleted++;
            }
          }
        }
        return NextResponse.json({ success: true, deleted });
      }
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Admin API error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}