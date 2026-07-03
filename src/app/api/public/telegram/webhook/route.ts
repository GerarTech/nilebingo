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

async function safeUpdateState(telegramId: string, state: string, data?: any) {
  try {
    const update: any = { telegram_state: state };
    if (data !== undefined) update.telegram_state_data = data;
    await supabase.from('profiles').update(update).eq('telegram_id', telegramId);
  } catch (e) {
    console.error('safeUpdateState failed (column may not exist):', e);
  }
}

async function createDraftDeposit(userId: string, amount: number, bankName?: string) {
  try {
    await supabase.from('transactions').insert({
      user_id: userId,
      type: 'deposit',
      amount,
      status: 'pending',
      reference: '__DRAFT__',
      details: bankName ? { bank_name: bankName } : {},
    });
  } catch (e) {
    console.error('createDraftDeposit failed:', e);
  }
}

const DRAFT_REF = '__DRAFT__';

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
      referral_min_deposit: '50',
      banks: []
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
      referral_min_deposit: '50',
      banks: []
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

const BOT_COMMANDS = [
  { command: 'start', description: 'Start the bot and open the main menu' },
  { command: 'play', description: 'Open BINGO game' },
  { command: 'balance', description: 'Check your wallet balances' },
  { command: 'deposit', description: 'Deposit funds to your wallet' },
  { command: 'withdraw', description: 'Withdraw funds from your wallet' },
  { command: 'invite', description: 'Get your referral link' },
  { command: 'transactions', description: 'View recent transactions' },
  { command: 'instructions', description: 'Learn how to play BINGO' },
  { command: 'patterns', description: 'View winning patterns' },
  { command: 'support', description: 'Contact support team' },
  { command: 'language', description: 'Change your language setting' },
  { command: 'stats', description: 'View your game statistics' },
];

async function registerBotCommands() {
  try {
    await tgCall('setMyCommands', { commands: BOT_COMMANDS });
  } catch (e) {
    console.error('setMyCommands error:', e);
  }
}

function getUserLang(from: any): 'en' | 'am' {
  return (from?.language_code === 'am' || from?.language_code === 'ar') ? 'am' : 'en';
}

const EN = {
  welcome: '🎰 *Welcome to Nile BINGO!*\n\nExperience the thrill of real-time BINGO right here on Telegram. Quick matches, fair play, and real prizes await!\n\n👇 Tap the button below to jump in!',
  share_contact: '📱 *Let\'s get started!*\n\nPlease share your phone number so we can set up your account. Your number is kept private and used only for account verification.',
  share_contact_btn: '📱 Share Phone Number',
  contact_received: '✅ *Welcome aboard!* Your phone number has been verified and your account is ready to go.',
  contact_already: '✅ Your phone number is already on file — you\'re all set!',
  play: '🎮 Play BINGO',
  check_balance: '💰 Check Balance',
  deposit: '💳 Deposit',
  withdraw: '💸 Withdraw',
  contact: '📞 Contact Us',
  instructions: '📜 How to Play',
  transactions: '📒 Transactions',
  winning_patterns: '🎯 Winning Patterns',
  language: '🌐 Language',
  balance_info: '💰 *Your Wallet*\n\n• Main Balance: *{main} ETB* (withdrawable)\n• Play Balance: *{play} ETB* (gameplay only)\n• Total: *{total} ETB*\n\n💡 *Tip:* Main balance is for withdrawals. Play balance is for entering games and cannot be withdrawn.',
  how_to_play: '*🎯 How to Play BINGO*\n\n1️⃣ Pick a room — Bronze (10 ETB) up to VIP (500 ETB)\n2️⃣ Choose 1–2 card numbers (each has a unique 5×5 grid)\n3️⃣ Wait for the game to auto-start when the timer hits zero\n4️⃣ Numbers 1–75 are drawn every 2 seconds — cards mark automatically\n5️⃣ First to complete a full row or column wins the prize pool\n6️⃣ Prize = total stakes × players minus commission\n\nGood luck and have fun! 🍀',
  deposit_choose: '💳 *Deposit Funds*\n\nSelect your preferred payment method below:',
  deposit_cbe: 'CBE (Commercial Bank of Ethiopia)',
  deposit_telebirr: 'Telebirr',
  deposit_amount_prompt: '💵 *Enter Amount*\n\nHow much would you like to deposit?\n\nMinimum: *{min} ETB*\nMaximum: *{max} ETB*\n\nPlease reply with the amount only (e.g., `200`).',
  deposit_txid_prompt: '📝 *Transaction Reference*\n\nSend your payment to the account below, then reply with the transaction/reference ID:\n\n🏦 *{bank_name}*\nAccount: `{account}`\nRecipient: {recipient}\nAmount: *{amount} ETB*\n\nOnce you\'ve sent the payment, type the transaction ID you received.',
  deposit_submitted: '⏳ *Deposit Submitted*\n\nYour deposit of *{amount} ETB* via *{bank}* has been received and is pending review.\n\n🆔 Reference: `{txid}`\n\nOur team will verify and approve it shortly. You\'ll receive a notification once credited! ✅',
  withdraw_info: '💸 *Withdraw Funds*\n\nOnly your *Main Balance* can be withdrawn. Play balance is for gameplay only.\n\n📋 *Requirements:*\n• Play at least {required_games} games first\n• Minimum withdrawal: {min_amount} ETB\n\nTo request a withdrawal, please contact support with your amount and preferred method.',
  withdraw_required: '🚫 *Withdrawal Locked*\n\nYou need to play at least *{required} games* before you can withdraw.\n\n✅ Games played: *{played}*\n❌ Remaining: *{remaining}*\n\nKeep playing — you\'re almost there! 💪',
  contact_info: '*📬 Contact Support*\n\nHave a question or need help?\n\n📧 Email: support@nilebingo.com\n💬 Telegram: @nile_bingo_support\n\nWe typically respond within 24 hours.',
  winning_patterns_info: '*🏆 Winning Patterns*\n\nComplete any of these to win:\n\n1️⃣ *Horizontal Row* — Mark all 5 numbers in any row\n2️⃣ *Vertical Column* — Mark all 5 numbers in any column\n\nWin detection is automatic — no need to shout BINGO! The game instantly checks after every draw.',
  language_menu: '🌍 *Select Language / ቋንቋ ምረጥ*',
  transactions_prompt: '📒 *Recent Transactions*\n\n{transactions}\n\nFor full history, open the Mini App Wallet tab.',
  transactions_empty: '📒 *Transactions*\n\nNo transactions yet. Start playing to see your history here!',
  broadcast_usage: '📢 *Broadcast*\n\nUsage: `/broadcast Your message here`\n\nSends a message to all registered users.',
  broadcast_done: '✅ Broadcast sent to {count} users.',
  // Admin commands
  admin_stats: '*📊 Admin Dashboard*\n\n👥 Users: {users}\n🎮 Total Games: {games}\n🟢 Active Now: {active}\n💰 Total Deposits: {deposits} ETB\n💸 Total Withdrawals: {withdrawals} ETB\n📈 Revenue: {revenue} ETB\n⏳ Pending Deposits: {pendingDep}\n⏳ Pending Withdrawals: {pendingWit}',
  admin_users: '*👥 Recent Users (Last 10)*\n\n{users}',
  admin_pending: '*⏳ Pending Transactions*\n\n{transactions}',
  admin_approved: '✅ Transaction {id} approved. Amount: {amount} ETB.',
  admin_rejected: '❌ Transaction {id} rejected.',
  admin_no_pending: 'No pending transactions at the moment.',
  admin_no_users: 'No users found yet.',
  admin_help: '*🔐 Admin Commands*\n\n/admin_stats — Dashboard statistics\n/admin_users — Recent 10 users\n/admin_pending — View pending transactions\n/approve_<tx_id> — Approve a transaction\n/reject_<tx_id> — Reject a transaction\n/broadcast <message> — Send message to all users\n/admin_help — Show this help',
  invite: '🎉 *Invite Friends & Earn!*\n\nHere\'s your exclusive invite link:\n{refLink}\n\n*How it works:*\n• Share your link with friends\n• They join and share their phone number\n• You instantly get *{refBonus} ETB* in your Play Wallet\n\nNo minimum deposit required — just invite and play! 🚀',
};

const AM = {
  welcome: '🎰 *እንኳን ወደ Nile BINGO በደህና መጡ!*\n\nቀጥታ የቢንጎ ደስታ በቴሌግራም ላይ! ፈጣን ጨዋታዎች፣ ፍትሃዊ ውድድር፣ እና እውነተኛ ሽልማቶች ይጠብቃሉ።\n\n👇 ለመጀመር ከታች ያለውን ቁልፍ ይጫኑ!',
  share_contact: '📱 *እንጀምር!*\n\nእባክዎ መለያዎን ለማዘጋጀት ስልክ ቁጥርዎን ያጋሩ። ቁጥርዎ ሚስጥራዊ ነው እና ለማረጋገጫ ብቻ ያገለግላል።',
  share_contact_btn: '📱 ስልክ ቁጥር አጋራ',
  contact_received: '✅ *እንኳን ደህና መጡ!* ስልክ ቁጥርዎ ተረጋግጧል። መለያዎ ዝግጁ ነው!',
  contact_already: '✅ ስልክ ቁጥርዎ ቀደም ሲል ተመዝግቧል — ሁሉም ዝግጁ ነው!',
  play: '🎮 ቢንጎ ተጫወት',
  check_balance: '💰 ቀሪ ሂሳብ',
  deposit: '💳 ተቀማጭ',
  withdraw: '💸 አውጣ',
  contact: '📞 ያግኙን',
  instructions: '📜 እንዴት እንደሚጫወት',
  transactions: '📒 ግብይቶች',
  winning_patterns: '🎯 የማሸነፊያ ዘዴዎች',
  language: '🌐 ቋንቋ',
  balance_info: '💰 *የእርስዎ ዋሌት*\n\n• ዋና ቀሪ: *{main} ETB* (ማውጣት የሚቻል)\n• የጨዋታ ቀሪ: *{play} ETB* (ለጨዋታ ብቻ)\n• ጠቅላላ: *{total} ETB*\n\n💡 ዋና ቀሪ ለማውጣት፣ የጨዋታ ቀሪ ለመጫወት የሚያገለግል ነው።',
  how_to_play: '*🎯 እንዴት ቢንጎ እንደሚጫወት*\n\n1️⃣ ክፍል ምረጥ — ነሐስ (10 ETB) እስከ ቪአይፒ (500 ETB)\n2️⃣ 1–2 ካርዶች ምረጥ (እያንዳንዱ ልዩ 5×5 ሰንጠረዥ አለው)\n3️⃣ ጨዋታው በራስ-ሰር እስኪጀመር ጠብቅ\n4️⃣ ቁጥሮች 1–75 በየ2 ሰከንድ ይመረጣሉ\n5️⃣ መጀመሪያ ሙሉ ረድፍ ወይም አምድ ያጠናቀቀ ሰው ያሸንፋል\n6️⃣ ሽልማት = ጠቅላላ ውርርድ ሲቀነስ ኮሚሽን\n\nመልካም ጨዋታ! 🍀',
  deposit_choose: '💳 *ገንዘብ ማስገቢያ*\n\nየሚፈልጉትን የክፍያ ዘዴ ይምረጡ:',
  deposit_cbe: 'CBE ባንክ',
  deposit_telebirr: 'ቴሌብር',
  deposit_amount_prompt: '💵 *መጠን ያስገቡ*\n\nምን ያህል ማስገባት ይፈልጋሉ?\n\nዝቅተኛ: *{min} ETB*\nከፍተኛ: *{max} ETB*\n\nእባክዎ መጠኑን ብቻ ይፃፉ (ለምሳሌ `200`)።',
  deposit_txid_prompt: '📝 *የግብይት ማረጋገጫ*\n\nገንዘቡን ከታች ወደተመለከተው ሂሳብ ከላኩ በኋላ፣ የግብይት መለያ ቁጥሩን (Transaction ID) ይላኩ:\n\n🏦 *{bank_name}*\nሂሳብ: `{account}`\nተቀባይ: {recipient}\nመጠን: *{amount} ETB*\n\nገንዘቡን ከላኩ በኋላ የተቀበሉትን የግብይት መለያ ቁጥር ይላኩ።',
  deposit_submitted: '⏳ *ገንዘብ ማስገቢያ ተልኳል*\n\nየ *{amount} ETB* ገንዘብ ማስገቢያዎ በ*{bank}* በኩል ደርሷል እና በመገምገም ላይ ነው።\n\n🆔 ማመሳከሪያ: `{txid}`\n\nቡድናችን በቅርቡ ያረጋግጠዋል። ሲፀድቅ ማሳወቂያ ያገኛሉ! ✅',
  withdraw_info: '💸 *ገንዘብ ማውጣት*\n\nየ*ዋና ቀሪ* ሂሳብዎ ውስጥ ያለው ገንዘብ ብቻ ነው ማውጣት የሚቻለው። የጨዋታ ቀሪ ለጨዋታ ብቻ ነው።\n\n📋 *መስፈርቶች:*\n• ቢያንስ {required_games} ጨዋታዎችን ይጫወቱ\n• ዝቅተኛ ማውጫ: {min_amount} ETB\n\nለማውጣት እባክዎ ድጋፍን ያግኙ።',
  withdraw_required: '🚫 *ማውጣት አይቻልም*\n\nማውጣት ከመቻልዎ በፊት ቢያንስ *{required} ጨዋታዎችን* መጫወት ያስፈልጋል።\n\n✅ የተጫወቷቸው: *{played}*\n❌ የቀሩ: *{remaining}*\n\nመጫወትዎን ይቀጥሉ — ቅርብ ነዎት! 💪',
  contact_info: '*📬 ድጋፍ*\n\nጥያቄ ወይም እርዳታ ይፈልጋሉ?\n\n📧 ኢሜይል: support@nilebingo.com\n💬 ቴሌግራም: @nile_bingo_support',
  winning_patterns_info: '*🏆 የማሸነፊያ ዘዴዎች*\n\nከነዚህ ውስጥ አንዱን ሙሉ ያድርጉ እና ያሸንፉ:\n\n1️⃣ *አግዳሚ ረድፍ* — በማንኛውም ረድፍ 5 ቁጥሮች ሙሉ\n2️⃣ *አቀባዊ አምድ* — በማንኛውም አምድ 5 ቁጥሮች ሙሉ\n\nማሸነፍዎ በራስ-ሰር ይታወቃል — ቢንጎ ማለት አያስፈልግም!',
  language_menu: '🌍 *ቋንቋ ምረጥ / Select Language*',
  transactions_prompt: '📒 *የቅርብ ግብይቶች*\n\n{transactions}\n\nሙሉ ታሪክ ለማየት ወደ ሚኒ አፕ ዋሌት ይሂዱ።',
  transactions_empty: '📒 *ግብይቶች*\n\nእስካሁን ምንም ግብይት የለም። መጫወት ይጀምሩ!',
  broadcast_usage: '📢 *መልእክት ማሰራጫ*\n\nአጠቃቀም: `/broadcast መልእክትዎ`\n\nለሁሉም ተመዝጋቢዎች መልእክት ይላኩ።',
  broadcast_done: '✅ መልእክት ለ{count} ተጠቃሚዎች ተልኳል።',
  invite: '🎉 *Invite Friends & Earn!*\n\nHere\'s your exclusive invite link:\n{refLink}\n\n*How it works:*\n• Share your link with friends\n• They join and share their phone number\n• You instantly get *{refBonus} ETB* in your Play Wallet\n\nNo minimum deposit required — just invite and play! 🚀',
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
  if (t.toLowerCase() === 'cancel' || t === 'Cancel ❌' || t === '❌ Cancel') return true;
  if (t === '👥 Invite Friends') return true;

  // Only check against known UI command labels — NOT config values like
  // telebirr_max, cbe_max, referral_bonus, etc. which are also in userCommands
  // and would falsely match numeric deposit amounts (e.g. "50", "1000").
  const commandKeys = ['play', 'check_balance', 'deposit', 'withdraw', 'contact', 'instructions', 'transactions', 'winning_patterns', 'language', 'mycode', 'stats'];
  for (const key of commandKeys) {
    const val = userCommands[key];
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

          if (prof.referred_by) {
            await supabase.rpc('adjust_play_balance', { p_user_id: prof.referred_by, p_amount: refBonus });

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
      return getText(lang, fallbackKey) || messages[key] || fallbackKey;
    };
    
    const defaultCommands = {
      play: '🎮 Play BINGO',
      check_balance: '💰 Check Balance',
      deposit: '💳 Deposit',
      withdraw: '💸 Withdraw',
      contact: '📞 Contact Us',
      instructions: '📜 How to Play',
      transactions: '📒 Transactions',
      winning_patterns: '🎯 Winning Patterns',
      language: '🌐 Language',
      mycode: '🔗 My Invite Code',
      stats: '📊 Stats',
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
      stats: 'stats',
    };
    
    const userCommands = { ...defaultCommands, ...commands };
    const SLASH_TO_KEY: Record<string, string> = {
      '/play': 'play',
      '/balance': 'check_balance',
      '/deposit': 'deposit',
      '/withdraw': 'withdraw',
      '/instructions': 'instructions',
      '/transactions': 'transactions',
      '/patterns': 'winning_patterns',
      '/language': 'language',
      '/support': 'contact',
      '/stats': 'stats',
    };
    const matchesCommand = (cmdText: string, plainText: string) => {
      if (SLASH_TO_KEY[text] === plainText) return true;
      if (text === cmdText || text === plainText) return true;
      const dicts = [EN as Record<string, string>, AM as Record<string, string>];
      const localized = dicts.map(d => d[plainText]).filter(Boolean);
      if (localized.includes(text)) return true;
      if (text.startsWith(cmdText.split(' ')[0])) return true;
      return false;
    };

    // Handle callback queries
    if (callbackQuery) {
      const data = callbackQuery.data;
      if (data === 'deposit_cbe') {
        await answerCallbackQuery(callbackQuery.id);
        await safeUpdateState(String(from.id), 'waiting_deposit_amount', { bank_id: 'cbe' });
        const cbeMax = commands.cbe_max || '5000';
        const msgText = getText(lang, 'deposit_amount_prompt').replace('{min}', '50').replace('{max}', cbeMax);
        await sendMessage(chatId, msgText, { parse_mode: 'Markdown', reply_markup: { keyboard: [[{ text: 'Cancel ❌' }]], resize_keyboard: true, one_time_keyboard: false } });
      } else if (data === 'deposit_telebirr') {
        await answerCallbackQuery(callbackQuery.id);
        await safeUpdateState(String(from.id), 'waiting_deposit_amount', { bank_id: 'telebirr' });
        const telebirrMax = commands.telebirr_max || '1000';
        const msgText = getText(lang, 'deposit_amount_prompt').replace('{min}', '10').replace('{max}', telebirrMax);
        await sendMessage(chatId, msgText, { parse_mode: 'Markdown', reply_markup: { keyboard: [[{ text: 'Cancel ❌' }]], resize_keyboard: true, one_time_keyboard: false } });
      } else if (data === 'lang_en') {
        await answerCallbackQuery(callbackQuery.id, 'Language set to English');
        await sendMessage(chatId, 'Use the buttons below:', getMainKeyboard('en'));
      } else if (data === 'lang_am') {
        await answerCallbackQuery(callbackQuery.id, 'Language set to Amharic');
        await sendMessage(chatId, 'Use the buttons below:', getMainKeyboard('am'));
      } else if (data.startsWith('deposit_bank_')) {
        const bankId = data.replace('deposit_bank_', '');
        await answerCallbackQuery(callbackQuery.id);
        await safeUpdateState(String(from.id), 'waiting_deposit_amount', { bank_id: bankId });
        const banks: any[] = commands.banks || [];
        const bank = banks.find((b: any) => b.id === bankId);
        const maxAmt = bank?.max || '5000';
        const msgText = getText(lang, 'deposit_amount_prompt').replace('{min}', '50').replace('{max}', maxAmt);
        await sendMessage(chatId, msgText, { parse_mode: 'Markdown', reply_markup: { keyboard: [[{ text: 'Cancel ❌' }]], resize_keyboard: true, one_time_keyboard: false } });
      } else if (data.startsWith('deposit_cbe_amount_')) {
        const amount = parseFloat(data.replace('deposit_cbe_amount_', ''));
        if (!isNaN(amount) && amount > 0) {
          await answerCallbackQuery(callbackQuery.id, 'CBE selected');
          await safeUpdateState(String(from.id), 'waiting_deposit_txid', { bank_id: 'cbe', amount });
          const { data: cprof } = await supabase.from('profiles').select('id').eq('telegram_id', String(from.id)).maybeSingle();
          if (cprof) await createDraftDeposit(cprof.id, amount, 'CBE');
          const bankName = commands.cbe_name || 'Nile Bingo';
          const account = commands.cbe_account || '1000256789123';
          const msgText = getText(lang, 'deposit_txid_prompt').replace('{bank_name}', bankName).replace('{account}', account).replace('{recipient}', bankName).replace('{amount}', String(amount));
          await sendMessage(chatId, `✅ *Amount confirmed: ${amount.toLocaleString()} ETB*\n\n${msgText}`, { parse_mode: 'Markdown', reply_markup: { keyboard: [[{ text: 'Cancel ❌' }]], resize_keyboard: true, one_time_keyboard: false } });
        }
      } else if (data.startsWith('deposit_telebirr_amount_')) {
        const amount = parseFloat(data.replace('deposit_telebirr_amount_', ''));
        if (!isNaN(amount) && amount > 0) {
          await answerCallbackQuery(callbackQuery.id, 'Telebirr selected');
          await safeUpdateState(String(from.id), 'waiting_deposit_txid', { bank_id: 'telebirr', amount });
          const { data: tprof } = await supabase.from('profiles').select('id').eq('telegram_id', String(from.id)).maybeSingle();
          if (tprof) await createDraftDeposit(tprof.id, amount, 'Telebirr');
          const telebirrNumber = commands.telebirr_number || '0918281072';
          const telebirrName = commands.telebirr_name || 'Melkie';
          const msgText = getText(lang, 'deposit_txid_prompt').replace('{bank_name}', 'Telebirr').replace('{account}', telebirrNumber).replace('{recipient}', telebirrName).replace('{amount}', String(amount));
          await sendMessage(chatId, `✅ *Amount confirmed: ${amount.toLocaleString()} ETB*\n\n${msgText}`, { parse_mode: 'Markdown', reply_markup: { keyboard: [[{ text: 'Cancel ❌' }]], resize_keyboard: true, one_time_keyboard: false } });
        }
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

      {
        const name = firstName || 'Unknown';
        const user = username ? `@${username}` : 'N/A';
        const msg = `📱 *New User Contact Shared*\n\n👤 User: ${name}\n🆔 ID: ${telegramId}\n📞 Phone: ${phone}\n👤 Username: ${user}`;
        // Route through notification channels
        try { const { notifyEvent } = await import('@/lib/server/admin'); notifyEvent('user_registered', msg); } catch {}
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

      // Register bot commands for menu
      await registerBotCommands();

      // Create or update profile
      const { data: existing } = await supabase
        .from('profiles')
        .select('*')
        .eq('telegram_id', telegramId)
        .maybeSingle();

      if (!existing) {
        // Insert with only guaranteed columns (telegram_state/referred_by may not exist yet)
        await supabase.from('profiles').insert({
          telegram_id: telegramId,
          first_name: firstName || null,
          username: username || null,
          language: 'en',
          verified: false,
        });
        // Best-effort set optional columns
        if (referredByUUID) {
          try { await supabase.from('profiles').update({ referred_by: referredByUUID }).eq('telegram_id', telegramId); } catch {}
        }
        await safeUpdateState(telegramId, 'idle');
        
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

          // Referral bonus: credit referrer immediately on new user signup
          if (referredByUUID) {
            const refBonus = Number(commands.referral_bonus || 10);
            if (refBonus > 0) {
              await supabase.from('profiles').update({ referral_claimed: true }).eq('id', newProfile.id);
              await supabase.rpc('adjust_play_balance', { p_user_id: referredByUUID, p_amount: refBonus });
              await supabase.from('transactions').insert({
                user_id: referredByUUID,
                type: 'deposit',
                amount: refBonus,
                status: 'completed',
                reference: `REFERRAL_BONUS_${newProfile.id}_${Date.now()}`,
              });
              const { data: refProfile } = await supabase.from('profiles').select('telegram_id, first_name').eq('id', referredByUUID).single();
              if (refProfile?.telegram_id) {
                await sendMessage(refProfile.telegram_id, `🎉 *Referral Bonus Received!*\n\nYour friend *${firstName || 'Player'}* joined Nile BINGO! You earned *${refBonus} ETB* as a referral bonus added to your Play Wallet.\n\nKeep sharing your invite link to earn more! 💰`, { parse_mode: 'Markdown' });
              }
            }
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

    // Intercept normal messages if phone is missing and they are not the admin,
    // BUT allow users through if they have an active state flow (e.g., deposit)
    const inActiveState = userProfile?.telegram_state && userProfile.telegram_state !== 'idle';
    if (telegramIdCheck && !isAdmin && !inActiveState && (!userProfile || !userProfile.phone)) {
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
        await safeUpdateState(String(from.id), 'idle');
        
        if (text.toLowerCase() !== 'cancel') {
          await sendMessage(chatId, 'Previous flow cancelled. Starting new command.');
          stateCancelledMessageSent = true;
        } else {
          await sendMessage(chatId, 'Flow cancelled.', getMainKeyboard(lang));
          return NextResponse.json({ ok: true });
        }
      }
    }

    // State Handler: If they send non-command text while in a waiting state
    if (userProfile && userProfile.telegram_state && userProfile.telegram_state !== 'idle' && !stateCancelledMessageSent) {
      const state = userProfile.telegram_state;
      const stateData: any = userProfile.telegram_state_data || {};

      if (state === 'waiting_deposit_amount') {
        // User sent an amount to deposit
        const amount = parseFloat(text.replace(/,/g, ''));
        if (isNaN(amount) || amount <= 0) {
          await sendMessage(chatId, '❌ Invalid amount. Please enter a valid number (e.g., `200`).', { parse_mode: 'Markdown' });
          return NextResponse.json({ ok: true });
        }

        const banks: any[] = commands.banks || [];
        const bankId = stateData.bank_id || 'cbe';
        const bank = banks.find((b: any) => b.id === bankId);
        const minDeposit = bank?.min ?? (bankId === 'telebirr' ? 10 : 50);
        const maxDeposit = bank?.max ?? (bankId === 'telebirr' ? Number(commands.telebirr_max || 1000) : Number(commands.cbe_max || 5000));

        if (amount < minDeposit) {
          await sendMessage(chatId, `❌ Minimum deposit is *${minDeposit} ETB*. Please enter a larger amount.`, { parse_mode: 'Markdown', reply_markup: { keyboard: [[{ text: 'Cancel ❌' }]], resize_keyboard: true, one_time_keyboard: false } });
          return NextResponse.json({ ok: true });
        }
        if (amount > maxDeposit) {
          await sendMessage(chatId, `❌ Maximum deposit is *${maxDeposit} ETB*. Please enter a smaller amount.`, { parse_mode: 'Markdown', reply_markup: { keyboard: [[{ text: 'Cancel ❌' }]], resize_keyboard: true, one_time_keyboard: false } });
          return NextResponse.json({ ok: true });
        }

        // Look up bank details
        const depositBankName = bank?.name || (bankId === 'cbe' ? 'CBE' : 'Telebirr');
        const account = bank?.account || (bankId === 'cbe' ? (commands.cbe_account || '1000256789123') : (commands.telebirr_number || '0918281072'));
        const recipient = bank?.recipient || (bankId === 'cbe' ? (commands.cbe_name || 'Nile Bingo') : (commands.telebirr_name || 'Melkie'));

        // Update state to waiting for tx ID
        await safeUpdateState(String(from.id), 'waiting_deposit_txid', { ...stateData, amount });

        // Create draft deposit for catch-all fallback
        await createDraftDeposit(userProfile.id, amount, depositBankName);

        const msgText = getText(lang, 'deposit_txid_prompt')
          .replace('{bank_name}', depositBankName)
          .replace('{account}', account)
          .replace('{recipient}', recipient)
          .replace('{amount}', String(amount));

        await sendMessage(chatId, msgText, { parse_mode: 'Markdown', reply_markup: { keyboard: [[{ text: 'Cancel ❌' }]], resize_keyboard: true, one_time_keyboard: false } });
        return NextResponse.json({ ok: true });
      }

      if (state === 'waiting_deposit_txid') {
        // User sent a transaction ID
        const txId = text.trim();
        if (!txId || txId.length < 3) {
          await sendMessage(chatId, '❌ Please enter a valid transaction/reference ID.', { parse_mode: 'Markdown', reply_markup: { keyboard: [[{ text: 'Cancel ❌' }]], resize_keyboard: true, one_time_keyboard: false } });
          return NextResponse.json({ ok: true });
        }

        const amount = Number(stateData.amount) || 0;
        const bankId = stateData.bank_id || 'cbe';
        const banks: any[] = commands.banks || [];
        const bank = banks.find((b: any) => b.id === bankId);
        const bankName = bank?.name || (bankId === 'cbe' ? 'CBE' : 'Telebirr');

        // Double spent protection
        const { data: existingTx } = await supabase
          .from('transactions')
          .select('id')
          .eq('reference', txId)
          .maybeSingle();

        if (existingTx) {
          await sendMessage(chatId, `❌ *Duplicate Transaction*\n\nThis transaction reference ID (\`${txId}\`) has already been submitted or processed.`, { parse_mode: 'Markdown', ...getMainKeyboard(lang) });
          await safeUpdateState(String(from.id), 'idle');
          return NextResponse.json({ ok: true });
        }

        // Reset state
        await safeUpdateState(String(from.id), 'idle');

        // Check for existing draft deposit first (fallback path)
        const { data: draftTx } = await supabase
          .from('transactions')
          .select('id')
          .eq('user_id', userProfile.id)
          .eq('reference', DRAFT_REF)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        let txId_full: string | null = null;
        if (draftTx) {
          // Update draft with actual TX ID and bank info
          await supabase.from('transactions').update({ reference: txId, details: { bank_name: bankName } }).eq('id', draftTx.id);
          txId_full = draftTx.id;
        } else {
          // Normal path: insert new pending deposit
          const { data: tx } = await supabase
            .from('transactions')
            .insert({
              user_id: userProfile.id,
              type: 'deposit',
              amount,
              status: 'pending',
              reference: txId,
              details: { bank_name: bankName }
            })
            .select()
            .single();
          txId_full = tx?.id || null;
        }

        if (txId_full) {
          const msgText = getText(lang, 'deposit_submitted')
            .replace('{amount}', amount.toLocaleString())
            .replace('{bank}', bankName)
            .replace('{txid}', txId);
          await sendMessage(chatId, msgText, { parse_mode: 'Markdown', ...getMainKeyboard(lang) });

          if (adminChatId) {
            await sendMessage(adminChatId, `⏳ *New Deposit Request*\n\n👤 User: ${userProfile.first_name || 'Unknown'}${userProfile.username ? ` (@${userProfile.username})` : ''}\n📞 Phone: ${userProfile.phone || 'N/A'}\n💰 Amount: *${amount} ETB*\n🏦 Bank: *${bankName}*\n🆔 TX ID: \`${txId}\`\n\nApprove: /approve_${txId_full.slice(0, 8)}\nReject: /reject_${txId_full.slice(0, 8)}`, { parse_mode: 'Markdown' });
          }
          // Route to notification channels
          try {
            const { notifyEvent } = await import('@/lib/server/admin');
            const userName = userProfile.first_name || userProfile.username || 'Unknown';
            const channelMsg = `⏳ *NEW DEPOSIT REQUEST*\n\n👤 *User:* ${userName}\n📞 *Phone:* ${userProfile.phone || 'N/A'}\n💰 *Amount:* ${amount} ETB\n🏦 *Bank:* ${bankName}\n🆔 *TX ID:* \`${txId}\`\n🆔 *Tx ID:* \`${txId_full.slice(0, 8)}...\``;
            notifyEvent('deposit_pending', channelMsg);
          } catch (e) { /* ignore */ }
        }
        return NextResponse.json({ ok: true });
      }

      // Legacy SMS parse states (backward compat)
      if (state === 'waiting_deposit_cbe' || state === 'waiting_deposit_telebirr') {
        const method = state === 'waiting_deposit_cbe' ? 'cbe' : 'telebirr';
        const smsBankName = method === 'cbe' ? 'CBE' : 'Telebirr';
        const parsed = parseDepositSMS(text, method);

        await safeUpdateState(String(from.id), 'idle');

        if (parsed) {
          const { data: existingTx } = await supabase.from('transactions').select('id').eq('reference', parsed.txId).maybeSingle();
          if (existingTx) {
            await sendMessage(chatId, `❌ *Duplicate Transaction*\n\nThis transaction reference ID (\`${parsed.txId}\`) has already been submitted.`, { parse_mode: 'Markdown', ...getMainKeyboard(lang) });
            return NextResponse.json({ ok: true });
          }

          const { data: tx } = await supabase.from('transactions').insert({ user_id: userProfile.id, type: 'deposit', amount: parsed.amount, status: 'pending', reference: parsed.txId, details: { bank_name: smsBankName } }).select().single();
          if (tx) {
            await sendMessage(chatId, `⏳ *Deposit Submitted for Review*\n\nTransaction ID: \`${parsed.txId}\`\nAmount: *${parsed.amount.toLocaleString()} ETB*\n\nAn admin will verify and approve your deposit shortly.`, { parse_mode: 'Markdown', ...getMainKeyboard(lang) });
            if (adminChatId) {
              await sendMessage(adminChatId, `⏳ *Pending Deposit (SMS Auto)*\n\n👤 ${userProfile.first_name || 'Unknown'}${userProfile.username ? ` (@${userProfile.username})` : ''}\n💰 *${parsed.amount} ETB*\n🆔 \`${parsed.txId}\`\n🏦 ${smsBankName}\n\n/approve_${tx.id.slice(0, 8)}`, { parse_mode: 'Markdown' });
            }
            // Route to channels
            try {
              const { notifyEvent } = await import('@/lib/server/admin');
              const userName = userProfile.first_name || userProfile.username || 'Unknown';
              const channelMsg = `⏳ *NEW DEPOSIT REQUEST (SMS Auto)*\n\n👤 *User:* ${userName}\n💰 *Amount:* ${parsed.amount.toLocaleString()} ETB\n🏦 *Bank:* ${smsBankName}\n🆔 *TX ID:* \`${parsed.txId}\`\n🆔 *ID:* \`${tx.id.slice(0, 8)}...\``;
              notifyEvent('deposit_pending', channelMsg);
            } catch (e) { /* ignore */ }
          }
        } else {
          const smsLabel = method === 'cbe' ? 'CBE' : 'Telebirr';
          const { data: tx } = await supabase.from('transactions').insert({ user_id: userProfile.id, type: 'deposit', amount: 0, status: 'pending', reference: text, details: { bank_name: smsLabel } }).select().single();
          if (tx) {
            await sendMessage(chatId, `⏳ *Deposit Pending Review*\n\nWe couldn't auto-verify your SMS. An admin will review it manually.`, { parse_mode: 'Markdown', ...getMainKeyboard(lang) });
            if (adminChatId) {
              await sendMessage(adminChatId, `⏳ *Manual Deposit*\n\n👤 ${userProfile.first_name || 'Unknown'}${userProfile.username ? ` (@${userProfile.username})` : ''}\n📝 \`${text}\`\n🏦 ${smsLabel}\n\n/approve_${tx.id.slice(0, 8)}`, { parse_mode: 'Markdown' });
            }
            // Route to channels
            try {
              const { notifyEvent } = await import('@/lib/server/admin');
              const userName = userProfile.first_name || userProfile.username || 'Unknown';
              const channelMsg = `⏳ *MANUAL DEPOSIT REVIEW*\n\n👤 *User:* ${userName}\n📝 *Raw:* \`${text}\`\n🏦 *Bank:* ${smsLabel}\n🆔 *ID:* \`${tx.id.slice(0, 8)}...\``;
              notifyEvent('deposit_pending', channelMsg);
            } catch (e) { /* ignore */ }
          }
        }
        return NextResponse.json({ ok: true });
      }
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
      if (text.startsWith('/broadcast ')) {
        const message = text.replace('/broadcast ', '').trim();
        if (!message) {
          await sendMessage(chatId, getText('en', 'broadcast_usage'), { parse_mode: 'Markdown' });
          return NextResponse.json({ ok: true });
        }
        const { data: profiles } = await supabase.from('profiles').select('telegram_id').not('telegram_id', 'is', null);
        if (!profiles || profiles.length === 0) {
          await sendMessage(chatId, 'No users to broadcast to.');
          return NextResponse.json({ ok: true });
        }
        let sent = 0;
        const header = '📢 *Announcement*\n\n';
        for (const p of profiles) {
          try {
            await sendMessage(p.telegram_id, header + message, { parse_mode: 'Markdown' });
            sent++;
          } catch (e) { /* skip failed sends */ }
        }
        const doneText = getText('en', 'broadcast_done').replace('{count}', String(sent));
        await sendMessage(chatId, doneText, { parse_mode: 'Markdown' });
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

      // Ensure we have a valid profile — look up by telegram_id if not already loaded
      let balanceProfile = userProfile;
      if (!balanceProfile && telegramIdCheck) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('id')
          .eq('telegram_id', telegramIdCheck)
          .maybeSingle();
        balanceProfile = prof;
      }

      if (balanceProfile) {
        const { data: wall } = await supabase
          .from('wallets')
          .select('main_balance, play_balance')
          .eq('user_id', balanceProfile.id)
          .maybeSingle();
        if (wall) {
          mainBal = Number(wall.main_balance) || 0;
          playBal = Number(wall.play_balance) || 0;
        } else {
          // Create wallet if it doesn't exist (matches webapp init behavior)
          await supabase.from('wallets').insert({
            user_id: balanceProfile.id,
            main_balance: 0,
            play_balance: 0,
          });
        }
      }

      let msgText = getMsg('balance_info', 'balance_info');
      msgText = msgText
        .replace('{main}', mainBal.toLocaleString())
        .replace('{play}', playBal.toLocaleString())
        .replace('{total}', (mainBal + playBal).toLocaleString());

      await sendMessage(chatId, msgText, { parse_mode: 'Markdown' });
    } else if (matchesCommand(userCommands.deposit, plainCommands.deposit)) {
      const banks: any[] = commands.banks || [];
      const inlineKeyboard: any[][] = [];
      if (banks.length > 0) {
        for (const bank of banks) {
          inlineKeyboard.push([{ text: `${bank.icon || '🏦'} ${bank.name}`, callback_data: `deposit_bank_${bank.id}` }]);
        }
      } else {
        inlineKeyboard.push(
          [{ text: '🏦 ' + getText(lang, 'deposit_cbe'), callback_data: 'deposit_cbe' }],
          [{ text: '📱 ' + getText(lang, 'deposit_telebirr'), callback_data: 'deposit_telebirr' }],
        );
      }
      await sendMessage(chatId, getMsg('deposit_choose', 'deposit_choose'), {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: inlineKeyboard }
      });
    } else if (matchesCommand(userCommands.withdraw, plainCommands.withdraw)) {
      let playedCount = 0;
      let mainBal = 0;
      let playBal = 0;

      // Ensure we have a valid profile - look up by telegram_id if not already loaded
      let withdrawProfile = userProfile;
      if (!withdrawProfile && telegramIdCheck) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('id')
          .eq('telegram_id', telegramIdCheck)
          .maybeSingle();
        withdrawProfile = prof;
      }

      if (withdrawProfile) {
        const { count } = await supabase
          .from('game_players')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', withdrawProfile.id)
          .eq('is_watching', false);
        playedCount = count || 0;

        // Fetch actual wallet balance (same source as webapp)
        const { data: wall } = await supabase
          .from('wallets')
          .select('main_balance, play_balance')
          .eq('user_id', withdrawProfile.id)
          .maybeSingle();
        if (wall) {
          mainBal = Number(wall.main_balance) || 0;
          playBal = Number(wall.play_balance) || 0;
        }
      }

      const reqGames = Number(commands.withdraw_required_games || 5);
      const minAmount = Number(commands.withdraw_min_amount || 50);

      if (playedCount < reqGames) {
        const remaining = reqGames - playedCount;
        const lockMsg = getText(lang, 'withdraw_required')
          .replace('{required}', String(reqGames))
          .replace('{played}', String(playedCount))
          .replace('{remaining}', String(remaining));
        await sendMessage(chatId, lockMsg, { parse_mode: 'Markdown' });
      } else {
        const withdrawText = getText(lang, 'withdraw_info')
          .replace('{required_games}', String(reqGames))
          .replace('{min_amount}', String(minAmount));
        // Show actual balances so user knows what's withdrawable (matches webapp)
        const balanceLine = `\n\n*Your Balances:*\n• Main (withdrawable): *${mainBal.toLocaleString()} ETB*\n• Play (gameplay only): *${playBal.toLocaleString()} ETB*`;
        await sendMessage(chatId, withdrawText + balanceLine, { parse_mode: 'Markdown' });
      }
    } else if (matchesCommand(userCommands.contact, plainCommands.contact)) {
      await sendMessage(chatId, getMsg('contact_info', 'contact_info'), { parse_mode: 'Markdown' });
    } else if (matchesCommand(userCommands.instructions, plainCommands.instructions)) {
      await sendMessage(chatId, getMsg('how_to_play', 'how_to_play'), { parse_mode: 'Markdown' });
    } else if (matchesCommand(userCommands.transactions, plainCommands.transactions)) {
      // Ensure we have a valid profile - look up by telegram_id if not already loaded
      let txProfile = userProfile;
      if (!txProfile && telegramIdCheck) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('id')
          .eq('telegram_id', telegramIdCheck)
          .maybeSingle();
        txProfile = prof;
      }

      if (txProfile) {
        // Fetch transactions from the same table the webapp uses
        const { data: txs } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', txProfile.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (!txs || txs.length === 0) {
          await sendMessage(chatId, getText(lang, 'transactions_empty'), { parse_mode: 'Markdown' });
        } else {
          // Build a single consolidated message with all transactions (matches webapp data)
          let txList = '';
          for (const t of txs) {
            const typeLabel = t.type === 'deposit' ? 'DEPOSIT' : t.type === 'withdraw' ? 'WITHDRAWAL' : t.type === 'win' ? 'GAME WIN' : t.type === 'bet' ? 'GAME PLAY' : t.type === 'transfer_to_play' ? 'TO PLAY' : t.type === 'transfer_to_main' ? 'TO MAIN' : t.type.toUpperCase();
            const statusLabel = t.status.charAt(0).toUpperCase() + t.status.slice(1);
            const statusIcon = t.status === 'completed' ? '\u2705' : t.status === 'pending' ? '\u23f3' : '\u274c';
            const dateStr = new Date(t.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + new Date(t.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
            const ref = t.reference && t.reference !== '__DRAFT__' ? '\n   Ref: ' + t.reference : '';
            const amount = Number(t.amount) || 0;
            const sign = (t.type === 'deposit' || t.type === 'win') ? '+' : (t.type === 'withdraw' || t.type === 'bet') ? '-' : '';
            txList += statusIcon + ' ' + typeLabel + ' | ' + sign + amount.toFixed(2) + ' ETB | ' + statusLabel + '\n   ' + dateStr + ref + '\n\n';
          }
          const msgText = getText(lang, 'transactions_prompt').replace('{transactions}', txList.trim());
          await sendMessage(chatId, msgText, { parse_mode: 'Markdown' });
        }
      } else {
        await sendMessage(chatId, getText(lang, 'transactions_empty'), { parse_mode: 'Markdown' });
      }
    } else if (text === '/invite' || text.toLowerCase() === 'invite' || text === '👥 Invite Friends' || text.includes('invite') || matchesCommand(userCommands.mycode, plainCommands.mycode)) {
      const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'fuabingobot';
      const refLink = `https://t.me/${botUsername}?start=ref_${from.id}`;
      const refBonus = commands.referral_bonus || 10;
      const refMinDep = commands.referral_min_deposit || 50;

      const inviteMsg = getMsg('invite', 'invite')
        .replace(/{refLink}/g, refLink)
        .replace(/{refBonus}/g, String(refBonus))
        .replace(/{refMinDep}/g, String(refMinDep));

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
    } else if (matchesCommand(userCommands.stats, plainCommands.stats)) {
      let playedCount = 0, totalWins = 0, totalSpent = 0;
      if (userProfile) {
        const { count: gpCount } = await supabase
          .from('game_players')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userProfile.id)
          .eq('is_watching', false);
        playedCount = gpCount || 0;
        const { data: txs } = await supabase
          .from('transactions')
          .select('type, amount')
          .eq('user_id', userProfile.id)
          .in('type', ['bet', 'win']);
        if (txs) {
          for (const t of txs) {
            if (t.type === 'bet') totalSpent += Number(t.amount) || 0;
            if (t.type === 'win') totalWins += Number(t.amount) || 0;
          }
        }
      }
      const statsMsg = `*📊 Your Game Stats*\n\n🎮 Games Played: *${playedCount}*\n💰 Total Bet: *${totalSpent.toLocaleString()} ETB*\n🏆 Total Won: *${totalWins.toLocaleString()} ETB*`;
      await sendMessage(chatId, statsMsg, { parse_mode: 'Markdown' });
      } else {
        const trimmed = text.trim();
        const parsed = parseFloat(trimmed.replace(/,/g, ''));
        if (!isNaN(parsed) && parsed > 0 && userProfile) {
          const cbeMax = Number(commands.cbe_max) || 5000;
          const telebirrMax = Number(commands.telebirr_max) || 1000;
          const maxAllowed = Math.max(cbeMax, telebirrMax);
          if (parsed > maxAllowed) {
            await sendMessage(chatId, `❌ Maximum deposit is ${maxAllowed.toLocaleString()} ETB. Please enter a smaller amount.`, { parse_mode: 'Markdown', reply_markup: getMainKeyboard(lang) });
          } else {
            const msgText = getText(lang, 'deposit_choose').replace('{min}', '10').replace('{max}', String(maxAllowed));
            await sendMessage(chatId, `💵 *Amount Received: ${parsed.toLocaleString()} ETB*\n\nNow select your payment method below:`, {
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🏦 CBE Birr', callback_data: `deposit_cbe_amount_${parsed}` }],
                  [{ text: '📱 Telebirr', callback_data: `deposit_telebirr_amount_${parsed}` }],
                ]
              }
            });
          }
        } else if (userProfile && text.length > 2) {
          // Fallback: check for a draft deposit awaiting TX ID
          const { data: draftTx } = await supabase
            .from('transactions')
            .select('id, amount')
            .eq('user_id', userProfile.id)
            .eq('reference', DRAFT_REF)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (draftTx) {
            const txId = text.trim();
            // Double spent protection
            const { data: dupTx } = await supabase
              .from('transactions')
              .select('id')
              .eq('reference', txId)
              .neq('reference', DRAFT_REF)
              .maybeSingle();

            if (dupTx) {
              await sendMessage(chatId, `❌ *Duplicate Transaction*\n\nThis reference ID has already been used.`, { parse_mode: 'Markdown', ...getMainKeyboard(lang) });
            } else {
              // Update draft with actual TX ID
              await supabase.from('transactions').update({ reference: txId }).eq('id', draftTx.id);
              const bankName = 'CBE';
              const msgText = getText(lang, 'deposit_submitted')
                .replace('{amount}', Number(draftTx.amount).toLocaleString())
                .replace('{bank}', bankName)
                .replace('{txid}', txId);
              await sendMessage(chatId, msgText, { parse_mode: 'Markdown', ...getMainKeyboard(lang) });
              if (adminChatId) {
                await sendMessage(adminChatId, `⏳ *New Deposit Request*\n\n👤 User: ${userProfile.first_name || 'Unknown'}${userProfile.username ? ` (@${userProfile.username})` : ''}\n💰 Amount: *${Number(draftTx.amount)} ETB*\n🆔 TX ID: \`${txId}\`\n\nApprove: /approve_${draftTx.id.slice(0, 8)}\nReject: /reject_${draftTx.id.slice(0, 8)}`, { parse_mode: 'Markdown' });
              }
            }
          } else {
            await sendMessage(chatId, 'Use the buttons below:', getMainKeyboard(lang));
          }
        } else {
          await sendMessage(chatId, 'Use the buttons below:', getMainKeyboard(lang));
        }
      }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ ok: true, warning: 'handled' });
  }
}
