import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const botToken = process.env.TELEGRAM_BOT_TOKEN || '';
const hostUrl = process.env.HOST_URL || 'http://localhost:3002';
const miniAppUrl = hostUrl;
const adminChatId = process.env.ADMIN_CHAT_ID || '';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Cache for bot commands and messages
let cachedCommands: Record<string, string> = {};
let cachedMessages: Record<string, string> = {};
let commandsCacheTime = 0;
let messagesCacheTime = 0;
const COMMANDS_CACHE_TTL = 30000; // 30 seconds
const MESSAGES_CACHE_TTL = 30000; // 30 seconds

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
      admin_help: '/admin_help',
      admin_approve: '/approve_',
      admin_reject: '/reject_',
    };
  }
}

async function getBotMessages(): Promise<Record<string, string>> {
  const now = Date.now();
  if (cachedMessages && (now - messagesCacheTime) < MESSAGES_CACHE_TTL) {
    return cachedMessages;
  }
  
  try {
    const { data } = await supabase
      .from('bot_messages')
      .select('messages')
      .eq('id', 'main')
      .single();
    
    cachedMessages = data?.messages || {};
    messagesCacheTime = now;
    return cachedMessages;
  } catch {
    return {};
  }
}

// Direct Telegram API call (no Telegraf - avoids getMe timeout)
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
    console.error(`Telegram API ${method} error:`, err);
    return { ok: false };
  }
}

async function sendMessage(chatId: string | number, text: string, extra: any = {}) {
  return tgCall('sendMessage', { chat_id: chatId, text, ...extra });
}

async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  return tgCall('answerCallbackQuery', { callback_query_id: callbackQueryId, text });
}

function getUserLang(from: any): 'en' | 'am' {
  return (from?.language_code === 'am' || from?.language_code === 'ar') ? 'am' : 'en';
}

const EN = {
  welcome: '🎰 Welcome to Nile Bingo!\n\nThe most exciting BINGO experience on Telegram.\n\nTap the button below to start playing!',
  share_contact: '📱 Please share your phone number to continue.\n\nThis helps us identify you and provide better support.',
  share_contact_btn: '📱 Share Phone Number',
  contact_received: '✅ Thank you! Your contact has been shared with our support team.',
  contact_already: '✅ Your phone number is already shared with us.',
  play: '🎮 Play BINGO',
  check_balance: '💰 Check Balance',
  deposit: '💳 Deposit',
  withdraw: '💸 Withdraw',
  contact: '📞 Contact Us',
  instructions: '📜 Game Instruction',
  transactions: '📒 Transactions',
  winning_patterns: '🎯 Winning patterns',
  language: '🌐 Language',
  balance_info: '💰 *Your Balance*\n\nMain Wallet: {main} ETB (Withdrawable)\nPlay Wallet: {play} ETB (Non-withdrawable, Play only)\nTotal: {total} ETB',
  how_to_play: '*How to Play BINGO:*\n\n1. Choose your stake (10/20/50 ETB)\n2. Select your card (1-300)\n3. Numbers are drawn\n4. Mark matching numbers\n5. Complete a row/column/diagonal to win!\n\nGood luck!',
  deposit_choose: '💳 *Choose payment method:*\n\nSelect your preferred option below:',
  deposit_cbe: 'CBE (Commercial Bank of Ethiopia)',
  deposit_telebirr: 'Telebirr',
  deposit_cbe_info: '*CBE Deposit Instructions*\n\nAccount: 1000256789123\nName: Nile Bingo\nBank: CBE\n\nSend amount, then forward SMS confirmation here.',
  deposit_telebirr_info: '*Telebirr Deposit Instructions*\n\nNumber: 0925502345\nName: Ashe\n\nSend up to 1000 ETB, then forward SMS confirmation here.',
  withdraw_info: '*Withdraw Funds*\n\nOnly Main Wallet funds can be withdrawn. Play Wallet (Referral bonus) is for gameplay only and cannot be withdrawn.\n\nContact support to withdraw. Min: 50 ETB',
  contact_info: '*Contact Support*\n\nEmail: support@fuabingo.com\nTelegram: @fua_bingo_support',
  winning_patterns_info: '*Winning Patterns*\n\n1. Horizontal Line\n2. Vertical Line\n3. Diagonal Line\n4. Four Corners\n5. Blackout\n\nFirst to complete a pattern wins!',
  language_menu: 'Choose your language / Select your language:',
  transactions_prompt: 'Open the Mini App Wallet tab to view transactions.',
  // Admin commands
  admin_stats: '*📊 Admin Dashboard*\n\n👥 Users: {users}\n🎮 Games: {games}\n🟢 Active: {active}\n💰 Deposits: {deposits} ETB\n💸 Withdrawals: {withdrawals} ETB\n📈 Revenue: {revenue} ETB\n⏳ Pending Deposits: {pendingDep}\n⏳ Pending Withdrawals: {pendingWit}',
  admin_users: '*👥 Recent Users*\n\n{users}',
  admin_pending: '*⏳ Pending Transactions*\n\n{transactions}',
  admin_approved: '✅ Transaction {id} approved.',
  admin_rejected: '❌ Transaction {id} rejected.',
  admin_no_pending: 'No pending transactions.',
  admin_no_users: 'No users found.',
  admin_help: '*🔐 Admin Commands*\n\n/admin_stats - View dashboard stats\n/admin_users - List recent users\n/admin_pending - View pending transactions\n/admin_approve <tx_id> - Approve a transaction\n/admin_reject <tx_id> - Reject a transaction\n/admin_help - Show this help',
};

const AM = {
  welcome: '🎰 እንኳን ወደ Nile Bingo በደህና መጡ!\n\nመጫወት ለመጀመር ከታች ያለውን ቁልፍ ይጫኑ!',
  share_contact: '📱 እባክዎ ለመቀጠል ስልክ ቁጥርዎን ያጋሩ።',
  share_contact_btn: '📱 ስልክ ቁጥር አጋራ',
  contact_received: '✅ እናመሰግናለን! ስልክ ቁጥርዎ ደርሷል።',
  contact_already: '✅ ስልክ ቁጥርዎ ቀደም ሲል ተጋርቷል።',
  play: '🎮 ቢንጎ ተጫወት',
  check_balance: '💰 ቀሪ ሂሳብ',
  deposit: '💳 ተቀማጭ',
  withdraw: '💸 አውጣ',
  contact: '📞 ያግኙን',
  instructions: '📜 መመሪያ',
  transactions: '📒 ግብይቶች',
  winning_patterns: '🎯 የማሸነፊያ ዘዴዎች',
  language: '🌐 ቋንቋ',
  balance_info: '💰 *ቀሪ ሂሳብ*\n\nዋና ዋሌት: {main} ETB (ማውጣት የሚቻል)\nየጨዋታ ዋሌት: {play} ETB (ማውጣት የማይቻል፣ ለጨዋታ ብቻ)\nጠቅላላ: {total} ETB',
  how_to_play: '*እንዴት እንደሚጫወት:*\n\n1. ውርርድ ምረጥ (10/20/50 ETB)\n2. ካርድ ምረጥ (1-300)\n3. ቁጥሮች ይመረጣሉ\n4. የተጣመሩ ቁጥሮች ላይ ምልክት አድርግ\n5. ረድፍ/አምድ/ሰያፍ ሙሉ ሲሆን አሸንፈሃል!',
  deposit_choose: '💳 *የክፍያ ዘዴ ምረጥ:*',
  deposit_cbe: 'CBE ባንክ',
  deposit_telebirr: 'ቴሌብር',
  deposit_cbe_info: '*CBE መመሪያ*\n\nአካውንት: 1000256789123\nስም: Nile Bingo\nባንክ: CBE',
  deposit_telebirr_info: '*ቴሌብር መመሪያ*\n\nቁጥር: 0925502345\nስም: አሸ',
  withdraw_info: '*ገንዘብ ማውጣት*\n\nዋና ዋሌት ውስጥ ያለው ገንዘብ ብቻ ነው ማውጣት የሚቻለው። የጨዋታ ዋሌት (የሪፈራል ቦነስ) ለጨዋታ ብቻ የሚያገለግል ሲሆን ማውጣት አይቻልም።\n\nድጋፍ ያግኙ። ዝቅተኛ: 50 ETB',
  contact_info: '*ድጋፍ*\n\nEmail: support@fuabingo.com\nTelegram: @fua_bingo_support',
  winning_patterns_info: '*የማሸነፊያ ዘዴዎች*\n\n1. አግዳሚ ረድፍ\n2. አቀባዊ አምድ\n3. ሰያፍ መስመር\n4. አራት ማዕዘኖች\n5. ሙሉ ካርድ',
  language_menu: 'ቋንቋ ምረጥ:',
  transactions_prompt: 'ወደ ሚኒ አፕ ዋሌት ትር ይሂዱ።',
};

function getText(lang: 'en' | 'am', key: string): string {
  const dict = lang === 'am' ? AM as any : EN as any;
  const fallback = EN as any;
  return dict[key] || fallback[key] || key;
}

function getMainKeyboard(lang: 'en' | 'am') {
  const bt = (k: string) => getText(lang, k);
  return {
    keyboard: [
      [{ text: bt('play') }],
      [{ text: bt('check_balance') }, { text: bt('deposit') }],
      [{ text: bt('withdraw') }, { text: bt('contact') }],
      [{ text: bt('instructions') }, { text: bt('transactions') }],
      [{ text: bt('winning_patterns') }, { text: bt('language') }],
    ],
    resize_keyboard: true,
  };
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

  const msg = EN.admin_stats
    .replace('{users}', String(profiles?.length || 0))
    .replace('{games}', String(games?.length || 0))
    .replace('{active}', String(activeGames?.length || 0))
    .replace('{deposits}', totalDeposits.toLocaleString())
    .replace('{withdrawals}', totalWithdrawals.toLocaleString())
    .replace('{revenue}', (totalBets - totalWins).toLocaleString())
    .replace('{pendingDep}', String(pendingDep))
    .replace('{pendingWit}', String(pendingWit));

  await sendMessage(chatId, msg, { parse_mode: 'Markdown' });
}

async function handleAdminUsers(chatId: number) {
  const { data: users } = await supabase
    .from('profiles')
    .select('first_name, username, telegram_id, phone, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  if (!users || users.length === 0) {
    await sendMessage(chatId, EN.admin_no_users);
    return;
  }

  const list = users.map((u, i) => 
    `${i + 1}. ${u.first_name || 'Unknown'}${u.username ? ` (@${u.username})` : ''}\n   ID: ${u.telegram_id}${u.phone ? ` | 📞 ${u.phone}` : ''}`
  ).join('\n');

  await sendMessage(chatId, EN.admin_users.replace('{users}', list), { parse_mode: 'Markdown' });
}

async function handleAdminPending(chatId: number) {
  const { data: txs } = await supabase
    .from('transactions')
    .select('*, profiles!inner(first_name, username)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(20);

  if (!txs || txs.length === 0) {
    await sendMessage(chatId, EN.admin_no_pending);
    return;
  }

  const list = txs.map((tx: any) => 
    `• ${tx.type.toUpperCase()} | ${Number(tx.amount).toLocaleString()} ETB | ${tx.profiles?.first_name || 'Unknown'}\n  ID: \`${tx.id.slice(0, 8)}...\` | /approve_${tx.id.slice(0, 8)}`
  ).join('\n');

  await sendMessage(chatId, EN.admin_pending.replace('{transactions}', list), { parse_mode: 'Markdown' });
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

  await sendMessage(chatId, EN.admin_approved.replace('{id}', txId.slice(0, 8)));
}

async function handleAdminReject(chatId: number, txId: string) {
  await supabase.from('transactions').update({ status: 'failed' }).eq('id', txId);
  await sendMessage(chatId, EN.admin_rejected.replace('{id}', txId.slice(0, 8)));
}

// Main webhook handler
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const message = body.message || body.callback_query?.message;
    const callbackQuery = body.callback_query;
    const chatId = message?.chat?.id || callbackQuery?.message?.chat?.id;
    const from = body.message?.from || body.callback_query?.from;
    const text = body.message?.text || '';
    const lang = getUserLang(from);

    if (!chatId) {
      return NextResponse.json({ ok: true });
    }

    // Handle callback queries
    if (callbackQuery) {
      const data = callbackQuery.data;
      if (data === 'deposit_cbe') {
        await answerCallbackQuery(callbackQuery.id);
        await sendMessage(chatId, getText(lang, 'deposit_cbe_info'), { parse_mode: 'Markdown' });
      } else if (data === 'deposit_telebirr') {
        await answerCallbackQuery(callbackQuery.id);
        await sendMessage(chatId, getText(lang, 'deposit_telebirr_info'), { parse_mode: 'Markdown' });
      } else if (data === 'lang_en') {
        await answerCallbackQuery(callbackQuery.id, 'Language set to English');
        await sendMessage(chatId, 'Use the buttons below:', getMainKeyboard('en'));
      } else if (data === 'lang_am') {
        await answerCallbackQuery(callbackQuery.id, 'Language set to Amharic');
        await sendMessage(chatId, 'Use the buttons below:', getMainKeyboard('am'));
      }
      return NextResponse.json({ ok: true });
    }

    // Handle contact sharing
    if (body.message?.contact) {
      const phone = body.message.contact.phone_number;
      const telegramId = String(from.id);
      const firstName = from.first_name;
      const username = from.username;

      await supabase
        .from('profiles')
        .update({ phone, first_name: firstName || null, username: username || null })
        .eq('telegram_id', telegramId);

      await sendMessage(chatId, getText(lang, 'contact_received'));

      // Notify admin
      if (adminChatId) {
        const name = firstName || 'Unknown';
        const user = username ? `@${username}` : 'N/A';
        await sendMessage(adminChatId, 
          `📱 *New User Contact Shared*\n\n👤 User: ${name}\n🆔 ID: ${telegramId}\n📞 Phone: ${phone}\n👤 Username: ${user}`,
          { parse_mode: 'Markdown' }
        );
      }

      await sendMessage(chatId, getText(lang, 'welcome'), {
        reply_markup: {
          inline_keyboard: [[{ text: getText(lang, 'play'), web_app: { url: miniAppUrl } }]]
        }
      });
      await sendMessage(chatId, 'Use the buttons below:', getMainKeyboard(lang));
      return NextResponse.json({ ok: true });
    }

    // Handle /start command
    if (text === '/start') {
      const telegramId = String(from.id);
      const firstName = from.first_name;
      const username = from.username;

      // Create/ensure profile
      const { data: existing } = await supabase
        .from('profiles')
        .select('phone')
        .eq('telegram_id', telegramId)
        .maybeSingle();

      if (!existing) {
        await supabase.from('profiles').insert({
          telegram_id: telegramId,
          first_name: firstName || null,
          username: username || null,
          language: 'en',
          sound_on: true,
          verified: false,
        });
        // Create wallet
        const { data: newProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('telegram_id', telegramId)
          .single();
        if (newProfile) {
          await supabase.from('wallets').insert({
            user_id: newProfile.id,
            main_balance: 0,
            play_balance: 0,
          });
        }
      }

      // Send welcome message with play button inline
      await sendMessage(chatId, getText(lang, 'welcome'), {
        reply_markup: {
          inline_keyboard: [[{ text: getText(lang, 'play'), web_app: { url: miniAppUrl } }]],
        },
      });
      
      // Send main menu keyboard as separate message (reply keyboard)
      await sendMessage(chatId, '📋 *Main Menu*', {
        parse_mode: 'Markdown',
        reply_markup: getMainKeyboard(lang),
      });
      
      return NextResponse.json({ ok: true });
    }

    // Admin commands (dynamic from DB)
    if (adminChatId && String(chatId) === adminChatId) {
      const commands = await getBotCommands();
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
      if (text === commands.admin_help) {
        await sendMessage(chatId, EN.admin_help, { parse_mode: 'Markdown' });
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
    }

    // Handle menu buttons by emoji prefix (dynamic from commands config)
    const commands = await getBotCommands();
    const messages = await getBotMessages();
    
    // Helper to get message from DB or fallback to hardcoded
    const getMsg = (key: string, fallbackKey: string) => {
      return messages[key] || getText(lang, fallbackKey);
    };
    
    // Default user commands (used if not in database)
    const defaultCommands = {
      play: '🎮 Play BINGO',
      check_balance: '💰 Check Balance',
      deposit: '💳 Deposit',
      withdraw: '💸 Withdraw',
      contact: '📞 Contact Us',
      instructions: '📜 Game Instruction',
      transactions: '📒 Transactions',
      winning_patterns: '🎯 Winning patterns',
      language: '🌐 Language',
    };
    
    // Plain text commands (without emojis) for manual typing
    const plainCommands = {
      play: 'play',
      check_balance: 'check_balance',
      deposit: 'deposit',
      withdraw: 'withdraw',
      contact: 'contact',
      instructions: 'instructions',
      transactions: 'transactions',
      winning_patterns: 'winning_patterns',
      language: 'language',
    };
    
    // Merge DB commands with defaults
    const userCommands = { ...defaultCommands, ...commands };
    
    // Helper to check if text matches a command (with or without emoji)
    const matchesCommand = (cmdText: string, plainText: string) => {
      return text === cmdText || text === plainText || text.startsWith(cmdText.split(' ')[0]);
    };
    
    if (matchesCommand(userCommands.play, plainCommands.play)) {
      await sendMessage(chatId, getMsg('welcome', 'welcome'), {
        reply_markup: {
          inline_keyboard: [[{ text: getText(lang, 'play'), web_app: { url: miniAppUrl } }]]
        }
      });
    } else if (matchesCommand(userCommands.check_balance, plainCommands.check_balance)) {
      // Get the profile and wallet for the user:
      const telegramId = String(from.id);
      const { data: prof } = await supabase
        .from('profiles')
        .select('id')
        .eq('telegram_id', telegramId)
        .maybeSingle();
      
      let mainBal = 0;
      let playBal = 0;
      
      if (prof) {
        const { data: wall } = await supabase
          .from('wallets')
          .select('main_balance, play_balance')
          .eq('user_id', prof.id)
          .maybeSingle();
        if (wall) {
          mainBal = Number(wall.main_balance) || 0;
          playBal = Number(wall.play_balance) || 0;
        }
      }
      
      let msgText = getMsg('balance_info', 'balance_info');
      msgText = msgText
        .replace('{main}', mainBal.toLocaleString())
        .replace('{play}', playBal.toLocaleString())
        .replace('{total}', (mainBal + playBal).toLocaleString());

      await sendMessage(chatId, msgText, { parse_mode: 'Markdown', reply_markup: getMainKeyboard(lang) });
    } else if (matchesCommand(userCommands.deposit, plainCommands.deposit)) {
      await sendMessage(chatId, getMsg('deposit_choose', 'deposit_choose'), {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🏦 ' + getText(lang, 'deposit_cbe'), callback_data: 'deposit_cbe' }],
            [{ text: '📱 ' + getText(lang, 'deposit_telebirr'), callback_data: 'deposit_telebirr' }],
          ]
        }
      });
    } else if (matchesCommand(userCommands.withdraw, plainCommands.withdraw)) {
      await sendMessage(chatId, getMsg('withdraw_info', 'withdraw_info'), { parse_mode: 'Markdown', reply_markup: getMainKeyboard(lang) });
    } else if (matchesCommand(userCommands.contact, plainCommands.contact)) {
      await sendMessage(chatId, getMsg('contact_info', 'contact_info'), { parse_mode: 'Markdown', reply_markup: getMainKeyboard(lang) });
    } else if (matchesCommand(userCommands.instructions, plainCommands.instructions)) {
      await sendMessage(chatId, getMsg('how_to_play', 'how_to_play'), { parse_mode: 'Markdown', reply_markup: getMainKeyboard(lang) });
    } else if (matchesCommand(userCommands.transactions, plainCommands.transactions)) {
      await sendMessage(chatId, getMsg('transactions_prompt', 'transactions_prompt'), {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[{ text: '📂 Open Mini App', web_app: { url: miniAppUrl } }]]
        }
      });
    } else if (matchesCommand(userCommands.winning_patterns, plainCommands.winning_patterns)) {
      await sendMessage(chatId, getMsg('winning_patterns_info', 'winning_patterns_info'), { parse_mode: 'Markdown', reply_markup: getMainKeyboard(lang) });
    } else if (matchesCommand(userCommands.language, plainCommands.language)) {
      await sendMessage(chatId, getText('en', 'language_menu'), {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🇺🇸 English', callback_data: 'lang_en' }],
            [{ text: '🇪🇹 Amharic', callback_data: 'lang_am' }],
          ]
        }
      });
    } else {
      await sendMessage(chatId, 'Use the buttons below:', { reply_markup: getMainKeyboard(lang) });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ ok: true, warning: 'handled' });
  }
}