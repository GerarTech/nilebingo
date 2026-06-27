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
let cachedCommands: Record<string, any> = {};
let cachedMessages: Record<string, string> = {};
let commandsCacheTime = 0;
let messagesCacheTime = 0;
const COMMANDS_CACHE_TTL = 30000; // 30 seconds
const MESSAGES_CACHE_TTL = 30000; // 30 seconds

async function getBotCommands(): Promise<Record<string, any>> {
  const now = Date.now();
  if (cachedCommands && (now - commandsCacheTime) < COMMANDS_CACHE_TTL && Object.keys(cachedCommands).length > 0) {
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
      telebirr_number: '0918281072',
      telebirr_name: 'Melkie',
      telebirr_max: '1000',
      cbe_account: '1000256789123',
      cbe_name: 'Nile Bingo',
      cbe_max: '5000',
      withdraw_required_games: '5',
      referral_bonus: '10',
      referral_min_deposit: '50'
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
      telebirr_number: '0918281072',
      telebirr_name: 'Melkie',
      telebirr_max: '1000',
      cbe_account: '1000256789123',
      cbe_name: 'Nile Bingo',
      cbe_max: '5000',
      withdraw_required_games: '5',
      referral_bonus: '10',
      referral_min_deposit: '50'
    };
  }
}

async function getBotMessages(): Promise<Record<string, string>> {
  const now = Date.now();
  if (cachedMessages && (now - messagesCacheTime) < MESSAGES_CACHE_TTL && Object.keys(cachedMessages).length > 0) {
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
  how_to_play: '*How to Play BINGO:*\n\n1. Choose a room (Bronze 10 ETB / Silver 20 / Gold 50 / Diamond 100 / Premium 200 / VIP 500)\n2. Select up to 2 card numbers (1-100) — each card is a unique 5x5 grid\n3. Wait for game to start (auto-starts on room timer)\n4. Numbers 1-75 are drawn every 2 seconds — cards auto-mark\n5. First to complete a row, column, or diagonal wins the prize pool\n6. Prize = stakes × players minus commission (%)\n\nGood luck!',
  deposit_choose: '💳 *Choose payment method:*\n\nSelect your preferred option below:',
  deposit_cbe: 'CBE (Commercial Bank of Ethiopia)',
  deposit_telebirr: 'Telebirr',
  deposit_cbe_info: '*CBE Deposit Instructions*\n\nAccount: 1000256789123\nName: Nile Bingo\nBank: CBE\n\nSend amount, then forward SMS confirmation here.',
  deposit_telebirr_info: '*Telebirr Deposit Instructions*\n\nNumber: 0925502345\nName: Ashe\n\nSend up to 1000 ETB, then forward SMS confirmation here.',
  withdraw_info: '*Withdraw Funds*\n\nOnly Main Wallet funds can be withdrawn. Play Wallet (Referral bonus) is for gameplay only and cannot be withdrawn.\n\nContact support to withdraw. Min: 50 ETB',
  contact_info: '*Contact Support*\n\nEmail: support@fuabingo.com\nTelegram: @fua_bingo_support',
  winning_patterns_info: '*Winning Patterns*\n\n1. Horizontal Row — 5 numbers in a row\n2. Vertical Column — 5 numbers in a column\n3. Diagonal Line — 5 numbers diagonally\n\nComplete any one of these to win! The game auto-detects your BINGO instantly.',
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
  how_to_play: '*እንዴት እንደሚጫወት:*\n\n1. ክፍል ምረጥ (ነሐስ 10 / ብር 20 / ወርቅ 50 / አልማዝ 100 / ፕሪሚየም 200 / ቪአይፒ 500)\n2. እስከ 2 ካርዶች ምረጥ (1-100) — እያንዳንዱ ካርድ ልዩ 5×5 ሰንጠረዥ ነው\n3. ጨዋታው እስኪጀመር ጠብቅ (በራስ-ሰር ይጀምራል)\n4. ቁጥሮች 1-75 በየ2 ሰከንድ ይመረጣሉ — ካርዶች በራስ-ሰር ምልክት ያደርጋሉ\n5. መጀመሪያ ረድፍ/አምድ/ሰያፍ ሙሉ ያደረገ ሰው ያሸንፋል\n6. ሽልማት = ውርርድ × ተጫዋቾች ሲቀነስ ኮሚሽን (%)\n\nመልካም ጨዋታ!',
  deposit_choose: '💳 *የክፍያ ዘዴ ምረጥ:*',
  deposit_cbe: 'CBE ባንክ',
  deposit_telebirr: 'ቴሌብር',
  deposit_cbe_info: '*CBE መመሪያ*\n\nአካውንት: 1000256789123\nስም: Nile Bingo\nባንክ: CBE',
  deposit_telebirr_info: '*ቴሌብር መመሪያ*\n\nቁጥር: 0925502345\nስም: አሸ',
  withdraw_info: '*ገንዘብ ማውጣት*\n\nዋና ዋሌት ውስጥ ያለው ገንዘብ ብቻ ነው ማውጣት የሚቻለው። የጨዋታ ዋሌት (የሪፈራል ቦነስ) ለጨዋታ ብቻ የሚያገለግል ሲሆን ማውጣት አይቻልም።\n\nድጋፍ ያግኙ። ዝቅተኛ: 50 ETB',
  contact_info: '*ድጋፍ*\n\nEmail: support@fuabingo.com\nTelegram: @fua_bingo_support',
  winning_patterns_info: '*የማሸነፊያ ዘዴዎች*\n\n1. አግዳሚ ረድፍ — 5 ቁጥሮች በአንድ ረድፍ\n2. አቀባዊ አምድ — 5 ቁጥሮች በአንድ አምድ\n3. ሰያፍ መስመር — 5 ቁጥሮች በሰያፍ\n\nከነዚህ ውስጥ አንዱን ሙሉ ያድርጉ እና ያሸንፉ! ጨዋታው ቢንጎዎን ወዲያውኑ ያውቃል።',
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
    reply_markup: {
      keyboard: [
        [{ text: bt('play') }],
        [{ text: bt('check_balance') }, { text: bt('deposit') }],
        [{ text: bt('withdraw') }, { text: bt('contact') }],
        [{ text: bt('instructions') }, { text: bt('transactions') }],
        [{ text: '👥 Invite Friends' }, { text: bt('language') }],
      ],
      resize_keyboard: true,
    }
  };
}

// CBE & Telebirr SMS Parser for auto-verification
interface ParsedSMS {
  amount: number;
  txId: string;
}

function parseDepositSMS(text: string, method: 'cbe' | 'telebirr'): ParsedSMS | null {
  try {
    const cleanedText = text.trim();
    if (!cleanedText) return null;

    let amount = 0;
    let txId = '';

    if (method === 'telebirr') {
      // Telebirr receipts typically contain patterns like:
      // "credited with ETB 100.00"
      // "Transaction of ETB 100.00"
      // "ብር 100.00 ተቀብለዋል"
      // "የግብይት ቁጥር TX12345678" or "Transaction ID: TX12345678"
      
      const amtRegexes = [
        /(?:ETB|ብር)\s*([\d,]+\.?\d*)/i,
        /([\d,]+\.?\d*)\s*(?:ETB|ብር)/i,
        /amount:\s*([\d,]+\.?\d*)/i,
        /sent\s*([\d,]+\.?\d*)/i
      ];

      for (const regex of amtRegexes) {
        const match = cleanedText.match(regex);
        if (match && match[1]) {
          amount = parseFloat(match[1].replace(/,/g, ''));
          break;
        }
      }

      const txRegexes = [
        /(?:Transaction\s*ID|Transaction\s*No|TXN\s*ID|Ref|የግብይት\s*መለያ|የግብይት\s*ቁጥር)[:\s]+([A-Z0-9]{8,16})/i,
        /\b(TX\d{8,14}[A-Z0-9]*)\b/i,
        /\b(T\d{8,14}[A-Z0-9]*)\b/i
      ];

      for (const regex of txRegexes) {
        const match = cleanedText.match(regex);
        if (match && match[1]) {
          txId = match[1].toUpperCase();
          break;
        }
      }
    } else {
      // CBE Birr / Bank Transfer receipts
      const amtRegexes = [
        /(?:ETB|ብር)\s*([\d,]+\.?\d*)/i,
        /([\d,]+\.?\d*)\s*(?:ETB|ብር)/i,
        /amount:\s*([\d,]+\.?\d*)/i,
        /transfer\s*of\s*([\d,]+\.?\d*)/i
      ];

      for (const regex of amtRegexes) {
        const match = cleanedText.match(regex);
        if (match && match[1]) {
          amount = parseFloat(match[1].replace(/,/g, ''));
          break;
        }
      }

      const txRegexes = [
        /(?:Transaction\s*Ref|Ref|FT|Reference)[:\s]*([A-Z0-9]{8,16})/i,
        /\b(FT\d{8,14}[A-Z0-9]*)\b/i,
        /\b(CBE\d{8,14}[A-Z0-9]*)\b/i
      ];

      for (const regex of txRegexes) {
        const match = cleanedText.match(regex);
        if (match && match[1]) {
          txId = match[1].toUpperCase();
          break;
        }
      }
    }

    if (txId && amount > 0) {
      return { amount, txId };
    }

    // Generic fallback
    const genericTxMatch = cleanedText.match(/\b((?:TX|FT)\d{6,14}[A-Z0-9]*)\b/i);
    const genericAmtMatch = cleanedText.match(/\b(\d+(?:\.\d{1,2})?)\s*(?:ETB|Birr|ብር)\b/i) || cleanedText.match(/(?:ETB|Birr|ብር)\s*(\d+(?:\.\d{1,2})?)\b/i);
    
    if (genericTxMatch && genericTxMatch[1] && genericAmtMatch && genericAmtMatch[1]) {
      return {
        amount: parseFloat(genericAmtMatch[1]),
        txId: genericTxMatch[1].toUpperCase()
      };
    }

    return null;
  } catch (err) {
    console.error('parseDepositSMS error:', err);
    return null;
  }
}

function isCommandText(text: string, userCommands: any, plainCommands: any): boolean {
  const t = text.trim();
  if (t.startsWith('/')) return true;
  if (t.toLowerCase() === 'cancel') return true;
  if (t === '👥 Invite Friends') return true;
  
  for (const val of Object.values(userCommands)) {
    if (typeof val === 'string' && t.startsWith(val.split(' ')[0])) return true;
  }
  for (const val of Object.values(plainCommands)) {
    if (typeof val === 'string' && t.toLowerCase() === val.toLowerCase()) return true;
  }
  return false;
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
    .select('*, profiles!inner(first_name, username, phone, telegram_id)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(20);

  if (!txs || txs.length === 0) {
    await sendMessage(chatId, EN.admin_no_pending);
    return;
  }

  const list = txs.map((tx: any) => {
    const prof = tx.profiles || {};
    const name = prof.first_name || prof.username || 'Unknown';
    const phone = prof.phone ? `📞 ${prof.phone}` : '';
    const userLink = prof.username ? `@${prof.username}` : `#${String(prof.telegram_id).slice(-4)}`;
    return `• *${tx.type.toUpperCase()}* | ${Number(tx.amount).toLocaleString()} ETB\n  👤 ${name} (${userLink}) ${phone}\n  🆔 \`${tx.id.slice(0, 8)}...\` | /approve_${tx.id.slice(0, 8)} | /reject_${tx.id.slice(0, 8)}`;
  }).join('\n\n');

  await sendMessage(chatId, EN.admin_pending.replace('{transactions}', list), { parse_mode: 'Markdown' });
}

async function executeApprove(chatId: number, tx: any, finalAmount: number) {
  await supabase.from('transactions').update({ status: 'completed', amount: finalAmount }).eq('id', tx.id);

  if (tx.type === 'deposit') {
    const newMain = await supabase.rpc('adjust_main_balance', { p_user_id: tx.user_id, p_amount: finalAmount });
    if (newMain.error) console.error('adjust_main_balance error:', newMain.error);

    const { data: prof } = await supabase.from('profiles').select('telegram_id, language, referred_by, referral_claimed, first_name').eq('id', tx.user_id).single();
    if (prof?.telegram_id) {
      await sendMessage(prof.telegram_id, `✅ *Deposit Approved!*\n\nYour deposit of *${finalAmount.toLocaleString()} ETB* has been approved and credited to your Main Wallet. Enjoy! 🎮`, { parse_mode: 'Markdown' });

      if (prof.referred_by && !prof.referral_claimed) {
        const commands = await getBotCommands();
        const refBonus = Number(commands.referral_bonus || 10);
        const refMinDep = Number(commands.referral_min_deposit || 50);

        const { data: allDeps } = await supabase
          .from('transactions')
          .select('amount')
          .eq('user_id', tx.user_id)
          .eq('type', 'deposit')
          .eq('status', 'completed');
        
        const totalDepsAmt = allDeps ? allDeps.reduce((acc, curr) => acc + Number(curr.amount), 0) : 0;

        if (totalDepsAmt >= refMinDep) {
          await supabase.from('profiles').update({ referral_claimed: true }).eq('id', tx.user_id);

          const { data: referrerWallet } = await supabase.from('wallets').select('play_balance').eq('user_id', prof.referred_by).single();
          if (referrerWallet) {
            await supabase.from('wallets').update({ play_balance: Number(referrerWallet.play_balance) + refBonus }).eq('user_id', prof.referred_by);

            const { data: refProfile } = await supabase.from('profiles').select('telegram_id').eq('id', prof.referred_by).single();
            if (refProfile?.telegram_id) {
              await sendMessage(refProfile.telegram_id, `🎉 *Referral Bonus Received!*\n\nYour friend *${prof.first_name || 'Player'}* completed their first deposit. You received *${refBonus} ETB* in your Play Wallet! 💰`, { parse_mode: 'Markdown' });
            }
          }
        }
      }
    }
  }

  await sendMessage(chatId, `✅ Transaction approved. Amount: ${finalAmount} ETB.`);
}

async function handleAdminApprove(chatId: number, txId: string, customAmount: number | null = null) {
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
  const amount = (customAmount !== null ? customAmount : Number(tx.amount)).toLocaleString();
  const msg = [
    `*🔄 Confirm Approval*`,
    ``,
    `*Type:* ${tx.type.toUpperCase()}`,
    `*Amount:* ${amount} ETB`,
    `*User:* ${prof.first_name || prof.username || 'Unknown'}`,
    prof.phone ? `*Phone:* ${prof.phone}` : null,
    prof.username ? `*Username:* @${prof.username}` : null,
    `*Telegram ID:* ${prof.telegram_id || 'N/A'}`,
    ``,
    `Are you sure you want to approve?`
  ].filter(Boolean).join('\n');

  await sendMessage(chatId, msg, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '✅ Approve', callback_data: `pub_approve_${tx.id}` },
          { text: '❌ Cancel', callback_data: `pub_cancel_${tx.id}` },
        ]
      ]
    }
  });
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
    const text = (body.message?.text || '').trim();
    const lang = getUserLang(from);

    if (!chatId) {
      return NextResponse.json({ ok: true });
    }

    const commands = await getBotCommands();
    const messages = await getBotMessages();
    
    const getMsg = (key: string, fallbackKey: string) => {
      return messages[key] || getText(lang, fallbackKey);
    };
    
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
      mycode: '🔗 My Invite Code',
    };
    
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
      mycode: 'mycode',
    };
    
    const userCommands = { ...defaultCommands, ...commands };
    const matchesCommand = (cmdText: string, plainText: string) => {
      return text === cmdText || text === plainText || text.startsWith(cmdText.split(' ')[0]);
    };

    // Handle callback queries
    if (callbackQuery) {
      const data = callbackQuery.data;
      if (data === 'deposit_cbe') {
        await answerCallbackQuery(callbackQuery.id);
        const { data: prof } = await supabase.from('profiles').select('id').eq('telegram_id', String(from.id)).maybeSingle();
        if (prof) {
          await supabase.from('profiles').update({ telegram_state: 'waiting_deposit_cbe' }).eq('id', prof.id);
        }
        
        const cbeAcc = commands.cbe_account || '1000256789123';
        const cbeName = commands.cbe_name || 'Nile Bingo';
        const cbeMax = commands.cbe_max || '5000';
        const msgText = `💰 *Manual Deposit Instructions - CBE*\n\nAccount: \`${cbeAcc}\`\nRecipient name: *${cbeName}*\n\n1. Send up to ${cbeMax} ETB using CBE Birr\n2. Copy the full SMS confirmation from the wallet\n3. Send that confirmation message here\n\nNow send your transaction ID or payment confirmation text.\nType *Cancel* any time to stop.`;
        await sendMessage(chatId, msgText, { parse_mode: 'Markdown' });
      } else if (data === 'deposit_telebirr') {
        await answerCallbackQuery(callbackQuery.id);
        const { data: prof } = await supabase.from('profiles').select('id').eq('telegram_id', String(from.id)).maybeSingle();
        if (prof) {
          await supabase.from('profiles').update({ telegram_state: 'waiting_deposit_telebirr' }).eq('id', prof.id);
        }

        const telebirrNum = commands.telebirr_number || '0918281072';
        const telebirrName = commands.telebirr_name || 'Melkie';
        const telebirrMax = commands.telebirr_max || '1000';
        const msgText = `💰 *Manual Deposit Instructions - Telebirr*\n\nNumber: \`${telebirrNum}\`\nRecipient name: *${telebirrName}*\n\n1. Send up to ${telebirrMax} ETB using Telebirr\n2. Copy the full SMS confirmation from the wallet\n3. Send that confirmation message here\n\nNow send your transaction ID or payment confirmation text.\nType *Cancel* any time to stop.`;
        await sendMessage(chatId, msgText, { parse_mode: 'Markdown' });
      } else if (data === 'lang_en') {
        await answerCallbackQuery(callbackQuery.id, 'Language set to English');
        await sendMessage(chatId, 'Use the buttons below:', getMainKeyboard('en'));
      } else if (data === 'lang_am') {
        await answerCallbackQuery(callbackQuery.id, 'Language set to Amharic');
        await sendMessage(chatId, 'Use the buttons below:', getMainKeyboard('am'));
      } else if (data.startsWith('pub_approve_')) {
        const txId = data.replace('pub_approve_', '');
        await answerCallbackQuery(callbackQuery.id, 'Processing...');

        const { data: tx } = await supabase.from('transactions').select('*').eq('id', txId).single();
        if (!tx || tx.status !== 'pending') {
          await sendMessage(chatId, 'Transaction already processed.');
          return NextResponse.json({ ok: true });
        }

        await executeApprove(chatId, tx, Number(tx.amount));

        // Edit original confirmation message
        try {
          await fetch(`${TG_API}/editMessageText`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              message_id: callbackQuery.message?.message_id,
              text: `✅ *Approved*\n\n${tx.type.toUpperCase()} ${Number(tx.amount).toLocaleString()} ETB has been approved.`,
              parse_mode: 'Markdown',
            }),
          });
        } catch (e) { /* ignore */ }
      } else if (data.startsWith('pub_cancel_')) {
        const txId = data.replace('pub_cancel_', '');
        await answerCallbackQuery(callbackQuery.id, 'Cancelled');

        try {
          await fetch(`${TG_API}/editMessageText`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              message_id: callbackQuery.message?.message_id,
              text: `❌ *Cancelled*\n\nApproval for ${txId.slice(0, 8)} was cancelled.`,
              parse_mode: 'Markdown',
            }),
          });
        } catch (e) { /* ignore */ }
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
    if (text === '/start' || text.startsWith('/start')) {
      const telegramId = String(from.id);
      const firstName = from.first_name;
      const username = from.username;

      // Extract deep linked referrer if present
      let referredByUUID: string | null = null;
      if (text.includes('ref_')) {
        const refParts = text.split('ref_');
        const referrerTelegramId = refParts[1]?.trim();
        if (referrerTelegramId) {
          const { data: refProf } = await supabase
            .from('profiles')
            .select('id')
            .eq('telegram_id', referrerTelegramId)
            .maybeSingle();
          if (refProf) {
            referredByUUID = refProf.id;
          }
        }
      }

      // Sync bot profile (description, name, photo) from DB config
      try {
        const [cfgRes, msgRes] = await Promise.allSettled([
          supabase.from('bot_config').select('commands').eq('id', 'main').single(),
          supabase.from('bot_messages').select('messages').eq('id', 'main').single(),
        ]);
        const cmds = (cfgRes.status === 'fulfilled' ? cfgRes.value.data?.commands : {}) || {};
        const botMessages = (msgRes.status === 'fulfilled' ? msgRes.value.data?.messages : {}) || {};
        const bio = cmds.bot_description || botMessages.bot_description || getText(lang, 'welcome');
        const botName = cmds.botName || 'Nile BINGO';

        await Promise.allSettled([
          tgCall('setMyDescription', { description: bio }),
          tgCall('setMyShortDescription', { short_description: bio.substring(0, 120) }),
          tgCall('setMyName', { name: botName }),
          tgCall('setChatMenuButton', {
            menu_button: { type: 'commands', text: 'Menu' }
          }),
        ]);
      } catch (e) {
        console.error('Error setting bot profile:', e);
      }

      // Create or update profile
      const { data: existing } = await supabase
        .from('profiles')
        .select('*')
        .eq('telegram_id', telegramId)
        .maybeSingle();

      if (!existing) {
        await supabase.from('profiles').insert({
          telegram_id: telegramId,
          first_name: firstName || null,
          username: username || null,
          language: 'en',
          verified: false,
          referred_by: referredByUUID,
          telegram_state: 'idle'
        });
        
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
          // Signup bonus
          const signupAmt = Number(commands.signup_bonus) || 0;
          if (signupAmt > 0) {
            await supabase.rpc('adjust_play_balance', { p_user_id: newProfile.id, p_amount: signupAmt });
            await supabase.from('transactions').insert({
              user_id: newProfile.id,
              type: 'deposit',
              amount: signupAmt,
              status: 'completed',
              reference: `SIGNUP_BONUS_${Date.now()}`,
            });
          }
        }
      } else {
        // Always update existing user's name/username from latest Telegram data
        const updates: any = {};
        if (firstName && existing.first_name !== firstName) updates.first_name = firstName;
        if (username && existing.username !== username) updates.username = username;
        if (Object.keys(updates).length > 0) {
          await supabase.from('profiles').update(updates).eq('id', existing.id);
        }
      }

      // Always show share contact on first /start (if no phone on record)
      const hasPhone = existing?.phone || false;
      if (!hasPhone) {
        await sendMessage(chatId, getText(lang, 'share_contact'), {
          reply_markup: {
            keyboard: [
              [{ text: getText(lang, 'share_contact_btn'), request_contact: true }]
            ],
            resize_keyboard: true,
            one_time_keyboard: true,
          }
        });
        return NextResponse.json({ ok: true });
      }

      await sendMessage(chatId, getText(lang, 'welcome'), {
        reply_markup: {
          inline_keyboard: [[{ text: getText(lang, 'play'), web_app: { url: miniAppUrl } }]]
        }
      });
      
      await sendMessage(chatId, 'Menu:', getMainKeyboard(lang));
      return NextResponse.json({ ok: true });
    }

    // Lookup user profile once to check states & phone missing
    const telegramIdCheck = String(from?.id || '');
    const isAdmin = adminChatId && String(chatId) === adminChatId;
    let userProfile: any = null;

    if (telegramIdCheck && !isAdmin) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('telegram_id', telegramIdCheck)
        .maybeSingle();
      userProfile = prof;
    }

    // Intercept normal messages if phone is missing and they are not the admin
    if (telegramIdCheck && !isAdmin && (!userProfile || !userProfile.phone)) {
      await sendMessage(chatId, getText(lang, 'share_contact'), {
        reply_markup: {
          keyboard: [
            [{ text: getText(lang, 'share_contact_btn'), request_contact: true }]
          ],
          resize_keyboard: true,
          one_time_keyboard: true,
        }
      });
      return NextResponse.json({ ok: true });
    }

    // State Interceptor: If user has active waiting state and type a new command
    let stateCancelledMessageSent = false;
    if (userProfile && userProfile.telegram_state && userProfile.telegram_state !== 'idle') {
      if (isCommandText(text, userCommands, plainCommands)) {
        await supabase
          .from('profiles')
          .update({ telegram_state: 'idle', telegram_state_data: {} })
          .eq('id', userProfile.id);
        
        if (text.toLowerCase() !== 'cancel') {
          await sendMessage(chatId, 'Previous flow cancelled. Starting new command.');
          stateCancelledMessageSent = true;
        } else {
          await sendMessage(chatId, 'Flow cancelled.', getMainKeyboard(lang));
          return NextResponse.json({ ok: true });
        }
      }
    }

    // State Handler: If they send non-command text while waiting for CBE/Telebirr SMS
    if (userProfile && userProfile.telegram_state && userProfile.telegram_state !== 'idle' && !stateCancelledMessageSent) {
      const state = userProfile.telegram_state;
      const method = state === 'waiting_deposit_cbe' ? 'cbe' : 'telebirr';
      const parsed = parseDepositSMS(text, method);

      // Reset state to idle
      await supabase
        .from('profiles')
        .update({ telegram_state: 'idle', telegram_state_data: {} })
        .eq('id', userProfile.id);

      if (parsed) {
        // Double spent protection
        const { data: existingTx } = await supabase
          .from('transactions')
          .select('id')
          .eq('reference', parsed.txId)
          .maybeSingle();

        if (existingTx) {
          await sendMessage(chatId, `❌ *Duplicate Transaction*\n\nThis transaction reference ID (\`${parsed.txId}\`) has already been submitted or processed. If you believe this is an error, please contact support.`, { parse_mode: 'Markdown', ...getMainKeyboard(lang) });
          return NextResponse.json({ ok: true });
        }

        // Insert as pending — admin must approve before credit
        const { data: tx } = await supabase
          .from('transactions')
          .insert({
            user_id: userProfile.id,
            type: 'deposit',
            amount: parsed.amount,
            status: 'pending',
            reference: parsed.txId
          })
          .select()
          .single();

        if (tx) {
          await sendMessage(chatId, `⏳ *Deposit Submitted for Review*\n\nWe received your SMS confirmation:\n- Transaction ID: \`${parsed.txId}\`\n- Amount: *${parsed.amount.toLocaleString()} ETB*\n\nAn admin will verify and approve your deposit shortly. You'll get a notification once credited!`, { parse_mode: 'Markdown', ...getMainKeyboard(lang) });

          if (adminChatId) {
            await sendMessage(adminChatId, `⏳ *Pending Deposit - SMS Auto-Detected*\n\n👤 User: ${userProfile.first_name || 'Unknown'}${userProfile.username ? ` (@${userProfile.username})` : ''}\n💰 Amount: *${parsed.amount} ETB*\n🆔 ID: \`${parsed.txId}\`\n🏦 Method: *${method.toUpperCase()}*\n\nApprove: /approve_${tx.id.slice(0, 8)}\nReject: /reject_${tx.id.slice(0, 8)}`, { parse_mode: 'Markdown' });
          }
        }
      } else {
        // Fallback to manual verification
        const referenceText = text;
        const { data: tx } = await supabase
          .from('transactions')
          .insert({
            user_id: userProfile.id,
            type: 'deposit',
            amount: 0,
            status: 'pending',
            reference: referenceText
          })
          .select()
          .single();

        if (tx) {
          await sendMessage(chatId, `⏳ *Deposit Pending Review*\n\nWe couldn't automatically verify your SMS pattern, but our team has received it.\n\nAn admin will review and approve your deposit manually shortly! Thank you for your patience.`, getMainKeyboard(lang));

          if (adminChatId) {
            await sendMessage(adminChatId, `⏳ *Manual Deposit Submission*\n\n👤 User: ${userProfile.first_name || 'Unknown'}${userProfile.username ? ` (@${userProfile.username})` : ''}\n📞 Phone: ${userProfile.phone || 'N/A'}\n📝 Submitted Text:\n\`\`\`\n${referenceText}\n\`\`\`\n\nApprove: /approve_${tx.id.slice(0, 8)}\nReject: /reject_${tx.id.slice(0, 8)}`, { parse_mode: 'Markdown' });
          }
        }
      }
      return NextResponse.json({ ok: true });
    }

    // Admin commands (dynamic from DB)
    if (adminChatId && String(chatId) === adminChatId) {
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
        const rest = text.replace(commands.admin_approve, '').split('_');
        const shortId = rest[0];
        const customAmount = rest[1] ? parseFloat(rest[1]) : null;

        const { data: txs } = await supabase
          .from('transactions')
          .select('id')
          .eq('status', 'pending');
        if (txs) {
          const match = txs.find((tx: any) => tx.id.startsWith(shortId));
          if (match) {
            await handleAdminApprove(chatId, match.id, customAmount);
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

    // Process normal commands
    if (matchesCommand(userCommands.play, plainCommands.play)) {
      await sendMessage(chatId, getMsg('welcome', 'welcome'), {
        reply_markup: {
          inline_keyboard: [[{ text: getText(lang, 'play'), web_app: { url: miniAppUrl } }]]
        }
      });
    } else if (matchesCommand(userCommands.check_balance, plainCommands.check_balance)) {
      let mainBal = 0;
      let playBal = 0;
      
      if (userProfile) {
        const { data: wall } = await supabase
          .from('wallets')
          .select('main_balance, play_balance')
          .eq('user_id', userProfile.id)
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

      await sendMessage(chatId, msgText, { parse_mode: 'Markdown' });
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
      let playedCount = 0;
      if (userProfile) {
        const { count } = await supabase
          .from('game_players')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userProfile.id)
          .eq('is_watching', false);
        playedCount = count || 0;
      }

      const reqGames = Number(commands.withdraw_required_games || 5);
      if (playedCount < reqGames) {
        const remaining = reqGames - playedCount;
        const lockMsg = `🚨 *Withdrawal not available yet.*\n\nYou need to play at least *${reqGames} games* before you can withdraw.\nGames played so far: *${playedCount}*\nGames remaining: *${remaining}*\n\nKeep playing — you're getting closer! 💪`;
        await sendMessage(chatId, lockMsg, { parse_mode: 'Markdown' });
      } else {
        await sendMessage(chatId, getMsg('withdraw_info', 'withdraw_info'), { parse_mode: 'Markdown' });
      }
    } else if (matchesCommand(userCommands.contact, plainCommands.contact)) {
      await sendMessage(chatId, getMsg('contact_info', 'contact_info'), { parse_mode: 'Markdown' });
    } else if (matchesCommand(userCommands.instructions, plainCommands.instructions)) {
      await sendMessage(chatId, getMsg('how_to_play', 'how_to_play'), { parse_mode: 'Markdown' });
    } else if (matchesCommand(userCommands.transactions, plainCommands.transactions)) {
      if (userProfile) {
        const { data: txs } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', userProfile.id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (!txs || txs.length === 0) {
          await sendMessage(chatId, 'No transactions found.');
        } else {
          for (const t of txs) {
            const typeLabel = t.type === 'deposit' ? 'PURCHASE' : t.type === 'withdraw' ? 'WITHDRAWAL' : t.type === 'win' ? 'GAME WIN' : t.type === 'bet' ? 'GAME PLAY' : t.type.toUpperCase();
            const statusLabel = t.status.charAt(0).toUpperCase() + t.status.slice(1);
            const dateStr = new Date(t.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' + new Date(t.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
            
            const blockText = `\`\`\`\nType: ${typeLabel}\nAmount: ETB ${Number(t.amount).toFixed(2)}\nStatus: ${statusLabel}\nDate: ${dateStr}\n\`\`\``;
            await sendMessage(chatId, blockText, { parse_mode: 'Markdown' });
          }
        }
      } else {
        await sendMessage(chatId, 'No transactions found.');
      }
    } else if (text === '/invite' || text.toLowerCase() === 'invite' || text === '👥 Invite Friends' || text.includes('invite') || matchesCommand(userCommands.mycode, plainCommands.mycode)) {
      const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'fuabingobot';
      const refLink = `https://t.me/${botUsername}?start=ref_${from.id}`;
      const refBonus = commands.referral_bonus || 10;
      const refMinDep = commands.referral_min_deposit || 50;

      const inviteMsg = `Hello ${from.first_name || 'Abel'}!\n\nHere is your invite link to share with friends:\n${refLink}\n\nReferral rule: You earn a one-time ${refBonus} ETB bonus for each person you invite after they deposit at least ${refMinDep} ETB.`;

      await sendMessage(chatId, inviteMsg, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            {
              text: '🔗 Share Invite Link',
              url: `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent(`Play Nile BINGO with me! Use my link to join and get free play bonus!`)}`
            }
          ]]
        }
      });
    } else if (matchesCommand(userCommands.winning_patterns, plainCommands.winning_patterns)) {
      await sendMessage(chatId, getMsg('winning_patterns_info', 'winning_patterns_info'), { parse_mode: 'Markdown' });
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
      await sendMessage(chatId, 'Use the buttons below:', getMainKeyboard(lang));
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ ok: true, warning: 'handled' });
  }
}
