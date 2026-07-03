'use client';

import { useEffect, useState } from 'react';
import { Save, RefreshCw, MessageSquare, Sliders, CreditCard, Trophy, Trash2, Bell } from 'lucide-react';

interface BotCommands {
  admin_stats: string;
  admin_users: string;
  admin_pending: string;
  admin_help: string;
  admin_approve: string;
  admin_reject: string;
  play: string;
  check_balance: string;
  deposit: string;
  withdraw: string;
  contact: string;
  instructions: string;
  transactions: string;
  winning_patterns: string;
  language: string;
  mycode: string;
}

interface BotMessages {
  welcome: string;
  share_contact: string;
  contact_received: string;
  balance_info: string;
  deposit_choose: string;
  deposit_cbe_info: string;
  deposit_telebirr_info: string;
  withdraw_info: string;
  contact_info: string;
  winning_patterns_info: string;
  how_to_play: string;
  bot_description: string;
  invite: string;
}

interface BotBranding {
  bot_name: string;
  appName: string;
  appLogo: string;
  colorScheme: string;
}

interface GameRoom {
  id: string;
  name: string;
  entry: number;
  players: number;
  maxPlayers: number;
}

export default function SettingsPage() {
  const [adminChatId, setAdminChatId] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'commands' | 'messages' | 'game_config' | 'branding' | 'gateways' | 'bias' | 'notifications'>('commands');
  const [commands, setCommands] = useState<BotCommands>({
    admin_stats: '/admin_stats',
    admin_users: '/admin_users',
    admin_pending: '/admin_pending',
    admin_help: '/admin_help',
    admin_approve: '/approve_',
    admin_reject: '/reject_',
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
  });
  const [messages, setMessages] = useState<BotMessages>({
    welcome: '🎰 Welcome to Nile Bingo!\n\nThe most exciting BINGO experience on Telegram.\n\nTap the button below to start playing!',
    share_contact: '📱 Please share your phone number to continue.\n\nThis helps us identify you and provide better support.',
    contact_received: '✅ Thank you! Your contact has been shared with our support team.',
    balance_info: '💰 *Your Balance*\n\nMain Wallet: 0 ETB (Withdrawable)\nPlay Wallet: 0 ETB (Non-withdrawable, Play only)\nTotal: 0 ETB',
    deposit_choose: '💳 *Choose payment method:*\n\nSelect your preferred option below:',
    deposit_cbe_info: '*CBE Deposit Instructions*\n\nAccount: 1000256789123\nName: Nile Bingo\nBank: CBE\n\n1. Send your deposit using CBE Birr\n2. Copy/forward the full SMS confirmation here\n3. Admin will verify and credit your balance\n\nMin deposit: 10 ETB',
    deposit_telebirr_info: '*Telebirr Deposit Instructions*\n\nNumber: 0925502345\nName: Ashe\n\n1. Send up to 1000 ETB using Telebirr\n2. Copy/forward the full SMS confirmation here\n3. Admin will verify and credit your balance\n\nMin deposit: 10 ETB',
    withdraw_info: '*Withdraw Funds*\n\nWithdrawals are processed manually by our team.\n\nRequirements:\n• Main Wallet balance only (Play Wallet cannot be withdrawn)\n• Minimum withdrawal: 50 ETB\n• You must have played at least 5 games\n\nTo request a withdrawal, please contact support with:\n• Amount to withdraw\n• Your preferred receiving method\n\nWe process withdrawals within 24 hours.',
    contact_info: '*Contact Support*\n\nEmail: {support_email}\nTelegram: {support_telegram}',
    winning_patterns_info: '*Winning Patterns*\n\n1. Horizontal Line\n2. Vertical Line\n3. Diagonal Line\n4. Four Corners\n5. Blackout\n\nFirst to complete a pattern wins!',
    how_to_play: '*How to Play BINGO:*\n\n1. Choose your stake (10/20/50 ETB)\n2. Select your card (1-300)\n3. Numbers are drawn\n4. Mark matching numbers\n5. Complete a row/column/diagonal to win!\n\nGood luck!',
    bot_description: '🎮 Play Bingo Game Online (ቢንጎ ጨዋታ)\n\n🎉🔥 እንኳን ወደ Nile BINGO🔥🎱 በሰላም መጡ! 🔥🎉\n\n🎮 ከብዙ ተጫዋቾች ጋር በቀጥታ የቢንጎ ጨዋታ ይጫወቱ\n💰 ሽልማት ያሸንፉ እና የእርስዎን ገንዘብ ያስተዳድሩ\n⚡️ ፈጣን እና በብዙዎች የተወደደ የብዙ ተጫዋቾች ጨዋታ\n\n👉 አሁን ለመጀመር /start ይጫኑ!',
    invite: '🎉 *Invite Friends & Earn!*\n\nHere\'s your exclusive invite link:\n{refLink}\n\n*How it works:*\n• Share your link with friends\n• They join and share their phone number\n• You instantly get *{refBonus} ETB* in your Play Wallet\n\nNo minimum deposit required — just invite and play! 🚀',
  });
  
  // Game config specific state
  const [commission, setCommission] = useState<number>(10);
  const [roomsList, setRoomsList] = useState<GameRoom[]>([
    { id: 'bronze', name: 'Bronze Room', entry: 10, players: 10, maxPlayers: 100 },
    { id: 'silver', name: 'Silver Room', entry: 20, players: 12, maxPlayers: 100 },
    { id: 'gold', name: 'Gold Room', entry: 50, players: 15, maxPlayers: 100 },
    { id: 'diamond', name: 'Diamond Room', entry: 100, players: 20, maxPlayers: 100 },
    { id: 'premium', name: 'Premium Room', entry: 200, players: 5, maxPlayers: 100 },
    { id: 'vip', name: 'VIP Room', entry: 500, players: 2, maxPlayers: 100 }
  ]);
  const [newRoom, setNewRoom] = useState<Omit<GameRoom, 'id'>>({
    name: '',
    entry: 10,
    players: 5,
    maxPlayers: 100
  });
  const [savingGame, setSavingGame] = useState(false);

  // Gateway specific state
  const [withdrawRequiredGames, setWithdrawRequiredGames] = useState<number>(5);
  const [withdrawMinAmount, setWithdrawMinAmount] = useState<number>(50);
  const [cbeAccount, setCbeAccount] = useState<string>('1000256789123');
  const [cbeName, setCbeName] = useState<string>('Nile Bingo');
  const [cbeMax, setCbeMax] = useState<number>(5000);
  const [telebirrNumber, setTelebirrNumber] = useState<string>('0918281072');
  const [telebirrName, setTelebirrName] = useState<string>('Melkie');
  const [telebirrMax, setTelebirrMax] = useState<number>(1000);
  const [referralBonus, setReferralBonus] = useState<number>(10);
  const [referralMinDeposit, setReferralMinDeposit] = useState<number>(50);
  const [signupBonus, setSignupBonus] = useState<number>(0);
  const [rulesText, setRulesText] = useState<string>('');
  const [banks, setBanks] = useState<{id: string; name: string; icon: string; account: string; recipient: string; max: string}[]>([]);
  const [newBank, setNewBank] = useState<{name: string; icon: string; account: string; recipient: string; max: string}>({name: '', icon: '🏦', account: '', recipient: '', max: '5000'});
  const [adminChatIds, setAdminChatIds] = useState<string>('');
  const [notifChannels, setNotifChannels] = useState<{
    id: string; label: string; bot_token: string; chat_ids: string; all_events: boolean; events: string[];
  }[]>([]);

  // Branding specific state
  const [botName, setBotName] = useState('Nile BINGO');
  const [appName, setAppName] = useState('Nile BINGO');
  const [appLogo, setAppLogo] = useState('🎰');
  const [appLogoPng, setAppLogoPng] = useState<string | null>(null);
  const [colorScheme, setColorScheme] = useState('gold');
  const [welcomeImage, setWelcomeImage] = useState<string | null>(null);
  const [adminReferralEnabled, setAdminReferralEnabled] = useState(true);
  const [appointedWinners, setAppointedWinners] = useState<Record<string, {card_number: number, after_balls: number}>>({});

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/data?action=bot_config').then(r => r.json()),
      fetch('/api/admin/data?action=bot_messages').then(r => r.json()),
    ]).then(([config, msgs]) => {
      if (config && typeof config === 'object') {
        const cmdValues: Partial<BotCommands> = {};
        Object.keys(commands).forEach((k) => {
          const key = k as keyof BotCommands;
          cmdValues[key] = config[key] || commands[key];
        });
        setCommands(prev => ({ ...prev, ...cmdValues }));
        
        if (config.appointed_winners) {
          const parsed: Record<string, {card_number: number, after_balls: number}> = {};
          Object.entries(config.appointed_winners).forEach(([key, val]) => {
            if (typeof val === 'number') parsed[key] = { card_number: val, after_balls: 20 };
            else if (typeof val === 'object' && val !== null) parsed[key] = val as {card_number: number, after_balls: number};
          });
          setAppointedWinners(parsed);
        }
        if (typeof config.commission === 'number') {
          setCommission(config.commission);
        }
        if (Array.isArray(config.rooms)) {
          setRoomsList(config.rooms);
        }
        if (config.botName) {
          setBotName(config.botName);
        }
        if (config.appName) {
          setAppName(config.appName);
        }
        if (config.appLogo) {
          setAppLogo(config.appLogo);
        }
        if (config.appLogoPng) {
          setAppLogoPng(config.appLogoPng);
        }
        if (config.colorScheme) {
          setColorScheme(config.colorScheme);
        }
        if (config.welcomeImage) {
          setWelcomeImage(config.welcomeImage);
        }
        if (config.referralEnabled !== undefined) {
          setAdminReferralEnabled(config.referralEnabled !== false);
        }
        
        // Gateways loading
        if (config.withdraw_required_games !== undefined) setWithdrawRequiredGames(Number(config.withdraw_required_games) || 5);
        if (config.withdraw_min_amount !== undefined) setWithdrawMinAmount(Number(config.withdraw_min_amount) || 50);
        if (config.cbe_account !== undefined) setCbeAccount(String(config.cbe_account));
        if (config.cbe_name !== undefined) setCbeName(String(config.cbe_name));
        if (config.cbe_max !== undefined) setCbeMax(Number(config.cbe_max) || 5000);
        if (config.telebirr_number !== undefined) setTelebirrNumber(String(config.telebirr_number));
        if (config.telebirr_name !== undefined) setTelebirrName(String(config.telebirr_name));
        if (config.telebirr_max !== undefined) setTelebirrMax(Number(config.telebirr_max) || 1000);
        if (config.referral_bonus !== undefined) setReferralBonus(Number(config.referral_bonus) || 10);
        if (config.referral_min_deposit !== undefined) setReferralMinDeposit(Number(config.referral_min_deposit) || 50);
        if (config.signup_bonus !== undefined) setSignupBonus(Number(config.signup_bonus) || 0);
        if (config.rules_text !== undefined) setRulesText(String(config.rules_text) || '');
        if (Array.isArray(config.banks)) setBanks(config.banks);
        if (Array.isArray(config.admin_chat_ids)) setAdminChatIds(config.admin_chat_ids.join(', '));
        if (Array.isArray(config.notification_channels)) {
          setNotifChannels(config.notification_channels.map((ch: any) => ({
            id: ch.id, label: ch.label || '', bot_token: ch.bot_token || '',
            chat_ids: Array.isArray(ch.chat_ids) ? ch.chat_ids.join(', ') : '',
            all_events: ch.all_events || false, events: Array.isArray(ch.events) ? ch.events : [],
          })));
        }
      }
      if (msgs && typeof msgs === 'object') {
        setMessages(prev => ({ ...prev, ...msgs }));
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const getMergedConfig = () => {
    return {
      ...commands,
      botName,
      commission,
      rooms: roomsList,
      appName,
      appLogo,
      appLogoPng,
      colorScheme,
      welcomeImage,
      referralEnabled: adminReferralEnabled,
      withdraw_required_games: withdrawRequiredGames,
      withdraw_min_amount: withdrawMinAmount,
      cbe_account: cbeAccount,
      cbe_name: cbeName,
      cbe_max: cbeMax,
      telebirr_number: telebirrNumber,
      telebirr_name: telebirrName,
      telebirr_max: telebirrMax,
      referral_bonus: referralBonus,
      referral_min_deposit: referralMinDeposit,
      signup_bonus: signupBonus,
      rules_text: rulesText,
      appointed_winners: appointedWinners,
      banks,
      admin_chat_ids: adminChatIds.split(/[\s,]+/).filter(Boolean),
      notification_channels: notifChannels.map(ch => ({
        id: ch.id, label: ch.label, bot_token: ch.bot_token,
        chat_ids: ch.chat_ids.split(/[\s,]+/).filter(Boolean),
        all_events: ch.all_events, events: ch.events,
      })),
    };
  };

  const saveConfig = async (merged: any) => {
    await fetch('/api/admin/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_bot_config', commands: merged }),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSaveCommands = async () => {
    await saveConfig(getMergedConfig());
  };

  const handleSaveMessages = async () => {
    await fetch('/api/admin/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_bot_messages', messages }),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSaveGameSettings = async () => {
    setSavingGame(true);
    await saveConfig(getMergedConfig());
    setSavingGame(false);
  };

  const handleSaveBranding = async () => {
    await saveConfig(getMergedConfig());
  };

  const handleSaveGateways = async () => {
    await saveConfig(getMergedConfig());
  };

  const updateCommand = (key: keyof BotCommands, value: string) => {
    setCommands(prev => ({ ...prev, [key]: value }));
  };

  const updateMessage = (key: keyof BotMessages, value: string) => {
    setMessages(prev => ({ ...prev, [key]: value }));
  };

  const addRoom = () => {
    if (!newRoom.name) return;
    const id = newRoom.name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now();
    setRoomsList(prev => [...prev, { ...newRoom, id }]);
    setNewRoom({ name: '', entry: 10, players: 5, maxPlayers: 100 });
  };

  const deleteRoom = (id: string) => {
    setRoomsList(prev => prev.filter(r => r.id !== id));
  };

  const updateRoomField = (index: number, field: keyof Omit<GameRoom, 'id'>, value: any) => {
    setRoomsList(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  if (loading) return <div className="text-gray-400 text-sm">Loading settings...</div>;

  return (
    <div>
      <h1 className="text-xl font-bold text-white mb-4">Settings</h1>

      <div className="glass rounded-xl p-4 max-w-2xl space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-400 uppercase block mb-1">Admin Telegram Chat ID</label>
            <input
              type="text"
              value={adminChatId}
              className="w-full bg-navy border border-white/10 rounded-lg px-4 py-2 text-sm text-gray-400 focus:outline-none"
              disabled
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 uppercase block mb-1">Admin Password</label>
            <input
              type="password"
              value={adminPassword}
              className="w-full bg-navy border border-white/10 rounded-lg px-4 py-2 text-sm text-gray-400 focus:outline-none"
              disabled
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-white/10 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab('commands')}
            className={`px-4 py-2 text-xs font-medium transition-all shrink-0 ${activeTab === 'commands' ? 'text-gold border-b-2 border-gold font-bold' : 'text-gray-400 hover:text-white'}`}
          >
            <RefreshCw size={12} className="inline mr-1" />
            Bot Commands
          </button>
          <button
            onClick={() => setActiveTab('messages')}
            className={`px-4 py-2 text-xs font-medium transition-all shrink-0 ${activeTab === 'messages' ? 'text-gold border-b-2 border-gold font-bold' : 'text-gray-400 hover:text-white'}`}
          >
            <MessageSquare size={12} className="inline mr-1" />
            Bot Messages
          </button>
          <button
            onClick={() => setActiveTab('gateways')}
            className={`px-4 py-2 text-xs font-medium transition-all shrink-0 ${activeTab === 'gateways' ? 'text-gold border-b-2 border-gold font-bold' : 'text-gray-400 hover:text-white'}`}
          >
            <CreditCard size={12} className="inline mr-1" />
            Deposit, Withdraw & Referrals
          </button>
          <button
            onClick={() => setActiveTab('game_config')}
            className={`px-4 py-2 text-xs font-medium transition-all shrink-0 ${activeTab === 'game_config' ? 'text-gold border-b-2 border-gold font-bold' : 'text-gray-400 hover:text-white'}`}
          >
            <Sliders size={12} className="inline mr-1" />
            Game Rules
          </button>
          <button
            onClick={() => setActiveTab('branding')}
            className={`px-4 py-2 text-xs font-medium transition-all shrink-0 ${activeTab === 'branding' ? 'text-gold border-b-2 border-gold font-bold' : 'text-gray-400 hover:text-white'}`}
          >
            <Sliders size={12} className="inline mr-1" />
            Branding
          </button>
          <button
            onClick={() => setActiveTab('bias')}
            className={`px-4 py-2 text-xs font-medium transition-all shrink-0 ${activeTab === 'bias' ? 'text-gold border-b-2 border-gold font-bold' : 'text-gray-400 hover:text-white'}`}
          >
            <Trophy size={12} className="inline mr-1" />
            Biased Draw Engine
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-4 py-2 text-xs font-medium transition-all shrink-0 ${activeTab === 'notifications' ? 'text-gold border-b-2 border-gold font-bold' : 'text-gray-400 hover:text-white'}`}
          >
            <Bell size={12} className="inline mr-1" />
            Notifications
          </button>
        </div>

        {/* Commands Tab */}
        {activeTab === 'commands' && (
          <div className="p-3 bg-navy rounded-xl">
            <h3 className="text-xs font-semibold text-white mb-3">Editable Bot Commands</h3>
            <p className="text-[9px] text-gray-500 mb-3">Change the command triggers. Changes apply within 30 seconds.</p>
            <div className="space-y-2 max-h-[50vh] overflow-y-auto w-full">
              {Object.entries(commands).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-500 w-28 flex-shrink-0">{key}</span>
                  <input
                    type="text"
                    value={value as string}
                    onChange={(e) => updateCommand(key as keyof BotCommands, e.target.value)}
                    className="flex-1 bg-navy-light border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-gold/50"
                  />
                </div>
              ))}
            </div>
            <button onClick={handleSaveCommands} className="w-full mt-3 bg-gold text-navy font-bold py-2.5 rounded-lg text-xs flex items-center justify-center gap-2 cursor-pointer">
              <Save size={14} />
              {saved ? 'Saved!' : 'Save Commands'}
            </button>
          </div>
        )}

        {/* Messages Tab */}
        {activeTab === 'messages' && (
          <div className="p-3 bg-navy rounded-xl">
            <h3 className="text-xs font-semibold text-white mb-3">Editable Bot Message Content</h3>
            <p className="text-[9px] text-gray-500 mb-3">Edit the text content of bot responses. Use \\n for new lines.</p>
            <div className="space-y-3 max-h-[50vh] overflow-y-auto">
              {Object.entries(messages).map(([key, value]) => (
                <div key={key}>
                  <label className="text-[10px] text-gray-500 block mb-1">{key}</label>
                  <textarea
                    value={value as string}
                    onChange={(e) => updateMessage(key as keyof BotMessages, e.target.value)}
                    rows={3}
                    className="w-full bg-navy-light border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-gold/50 resize-y"
                  />
                </div>
              ))}
            </div>
            <button onClick={handleSaveMessages} className="w-full mt-3 bg-gold text-navy font-bold py-2.5 rounded-lg text-xs flex items-center justify-center gap-2 cursor-pointer">
              <Save size={14} />
              {saved ? 'Saved!' : 'Save Messages'}
            </button>
          </div>
        )}

        {/* Gateways Tab */}
        {activeTab === 'gateways' && (
          <div className="p-3 bg-navy rounded-xl space-y-4">
            <h3 className="text-xs font-semibold text-white">Deposit, Withdraw & Referral Gateway Configurations</h3>

            {/* Withdraw lock */}
            <div className="bg-navy-light p-3 rounded-lg border border-white/5 space-y-2">
              <label className="text-xs text-white font-bold uppercase tracking-wider block">🔒 Withdrawal Security Lock</label>
              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 block">Games Required to Play Before Withdrawal Is Allowed</label>
                <input
                  type="number"
                  value={withdrawRequiredGames}
                  onChange={(e) => setWithdrawRequiredGames(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-full bg-navy border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-gold/50"
                  placeholder="e.g. 5"
                />
                <p className="text-[8.5px] text-gray-500">Limits withdrawals so users must engage with the bingo rooms before checking out.</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 block">Minimum Withdrawal Amount (ETB)</label>
                  <input
                    type="number"
                    value={withdrawMinAmount}
                    onChange={(e) => setWithdrawMinAmount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-full bg-navy border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-gold/50"
                    placeholder="e.g. 50"
                  />
                  <p className="text-[8.5px] text-gray-500">Minimum ETB amount users can withdraw per request.</p>
                </div>
              </div>

            {/* Admin Bot Security */}
            <div className="bg-navy-light p-3 rounded-lg border border-white/5 space-y-2">
              <label className="text-xs text-white font-bold uppercase tracking-wider block">🔐 Admin Bot Access</label>
              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 block">Authorized Admin Chat IDs (comma or space separated)</label>
                <input
                  type="text"
                  value={adminChatIds}
                  onChange={(e) => setAdminChatIds(e.target.value)}
                  className="w-full bg-navy border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-gold/50"
                  placeholder="e.g. 123456789, 987654321"
                />
                <p className="text-[8.5px] text-gray-500">Only these Telegram chat IDs can access the admin bot. Add the numeric IDs separated by commas or spaces.</p>
              </div>
            </div>

            {/* Dynamic Banks */}
            <div className="bg-navy-light p-3 rounded-lg border border-white/5 space-y-3">
              <label className="text-xs text-white font-bold uppercase tracking-wider block">🏛️ Payment Gateways (Dynamic Banks)</label>
              <p className="text-[8.5px] text-gray-500">These banks appear as deposit options in the Telegram bot. Add one for each payment method.</p>
              
              {banks.map((bank, idx) => (
                <div key={bank.id} className="bg-navy/50 p-2 rounded-lg border border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white font-medium">{bank.icon} {bank.name}</span>
                    <button onClick={() => setBanks(prev => prev.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-300 cursor-pointer">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] text-gray-400 block">Account / Number</label>
                      <input type="text" value={bank.account} onChange={(e) => { const copy = [...banks]; copy[idx] = {...copy[idx], account: e.target.value}; setBanks(copy); }} className="w-full bg-navy border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white focus:outline-none focus:border-gold/50" />
                    </div>
                    <div>
                      <label className="text-[9px] text-gray-400 block">Recipient Name</label>
                      <input type="text" value={bank.recipient} onChange={(e) => { const copy = [...banks]; copy[idx] = {...copy[idx], recipient: e.target.value}; setBanks(copy); }} className="w-full bg-navy border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white focus:outline-none focus:border-gold/50" />
                    </div>
                    <div>
                      <label className="text-[9px] text-gray-400 block">Max Amount (ETB)</label>
                      <input type="text" value={bank.max} onChange={(e) => { const copy = [...banks]; copy[idx] = {...copy[idx], max: e.target.value}; setBanks(copy); }} className="w-full bg-navy border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white focus:outline-none focus:border-gold/50" />
                    </div>
                    <div>
                      <label className="text-[9px] text-gray-400 block">Icon (emoji)</label>
                      <input type="text" value={bank.icon} onChange={(e) => { const copy = [...banks]; copy[idx] = {...copy[idx], icon: e.target.value}; setBanks(copy); }} className="w-full bg-navy border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white focus:outline-none focus:border-gold/50" />
                    </div>
                  </div>
                </div>
              ))}

              {/* Add new bank form */}
              <div className="bg-navy/30 p-2 rounded-lg border border-dashed border-white/10 space-y-2">
                <span className="text-[10px] text-gray-400 block">Add new payment gateway</span>
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" placeholder="Name (e.g. CBE)" value={newBank.name} onChange={(e) => setNewBank(p => ({...p, name: e.target.value}))} className="w-full bg-navy border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white focus:outline-none focus:border-gold/50" />
                  <input type="text" placeholder="Icon (e.g. 🏦)" value={newBank.icon} onChange={(e) => setNewBank(p => ({...p, icon: e.target.value}))} className="w-full bg-navy border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white focus:outline-none focus:border-gold/50" />
                  <input type="text" placeholder="Account Number" value={newBank.account} onChange={(e) => setNewBank(p => ({...p, account: e.target.value}))} className="w-full bg-navy border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white focus:outline-none focus:border-gold/50" />
                  <input type="text" placeholder="Recipient Name" value={newBank.recipient} onChange={(e) => setNewBank(p => ({...p, recipient: e.target.value}))} className="w-full bg-navy border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white focus:outline-none focus:border-gold/50" />
                  <input type="text" placeholder="Max Amount" value={newBank.max} onChange={(e) => setNewBank(p => ({...p, max: e.target.value}))} className="w-full bg-navy border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white focus:outline-none focus:border-gold/50" />
                </div>
                <button onClick={() => {
                  if (!newBank.name || !newBank.account) return;
                  const id = newBank.name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now();
                  setBanks(prev => [...prev, { id, ...newBank }]);
                  setNewBank({name: '', icon: '🏦', account: '', recipient: '', max: '5000'});
                }} className="w-full bg-gold/20 text-gold border border-gold/30 rounded-lg py-1.5 text-[11px] font-medium hover:bg-gold/30 cursor-pointer transition-all">
                  + Add Payment Gateway
                </button>
              </div>
            </div>

            {/* Referrals */}
            <div className="bg-navy-light p-3 rounded-lg border border-white/5 space-y-3">
              <label className="text-xs text-white font-bold uppercase tracking-wider block">👥 Referral Reward Policy</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-gray-400 block mb-0.5">Referrer Reward (Play Bal)</label>
                  <input
                    type="number"
                    value={referralBonus}
                    onChange={(e) => setReferralBonus(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full bg-navy border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-gold/50"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 block mb-0.5">Min Friend Deposit (ETB)</label>
                  <input
                    type="number"
                    value={referralMinDeposit}
                    onChange={(e) => setReferralMinDeposit(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full bg-navy border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-gold/50"
                  />
                </div>
              </div>
              <p className="text-[8.5px] text-gray-500">The referrer receives the play balance reward once the referred friend completes total deposits of at least the minimum deposit amount.</p>
            </div>

            <button onClick={handleSaveGateways} className="w-full bg-gold text-navy font-bold py-2.5 rounded-lg text-xs flex items-center justify-center gap-2 cursor-pointer transition-all">
              <Save size={14} />
              {saved ? 'Saved!' : 'Save Gateway Configurations'}
            </button>
          </div>
        )}

        {/* Game settings Tab */}
        {activeTab === 'game_config' && (
          <div className="p-3 bg-navy rounded-xl space-y-4">
            <h3 className="text-xs font-semibold text-white">Platform Commission & Rooms Settings</h3>

            {/* Platform Commission input */}
            <div className="p-3 bg-navy-light rounded-xl border border-white/5 space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs text-gray-300 font-bold uppercase tracking-wider">PLATFORM COMMISSION PERCENT (%)</label>
                <span className="text-xs text-gold font-bold font-mono">{commission}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                step="1"
                value={commission}
                onChange={(e) => setCommission(parseInt(e.target.value, 10))}
                className="w-full accent-gold bg-[#141f33]"
              />
              <p className="text-[9px] text-gray-500">How much of the total stake pool goes to the house. The rest is fully paid out to the winner.</p>
            </div>

            {/* Rooms list editor */}
            <div className="space-y-2.5">
              <label className="text-xs text-gray-300 font-bold uppercase tracking-wider">STAKES & ROOMS CONFIGURATION</label>
              
              <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                {roomsList.map((room, idx) => {
                  const maxWin = Math.round((room.entry * room.players) * (1 - commission / 100));
                  return (
                    <div key={room.id} className="p-3 bg-navy-light border border-white/5 rounded-xl space-y-2">
                      <div className="flex justify-between items-center">
                        <input
                          type="text"
                          value={room.name}
                          onChange={(e) => updateRoomField(idx, 'name', e.target.value)}
                          className="bg-transparent border-b border-white/10 text-xs font-bold text-white focus:outline-none focus:border-gold px-1 py-0.5"
                        />
                        <button
                          onClick={() => deleteRoom(room.id)}
                          className="text-red-400 hover:text-red-500 p-1 rounded transition-colors"
                        >
                          Delete
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-[10px]">
                        <div>
                          <label className="text-[9px] text-gray-500 block">Entry Fee (ETB)</label>
                          <input
                            type="number"
                            value={room.entry}
                            onChange={(e) => updateRoomField(idx, 'entry', Math.max(0, parseFloat(e.target.value) || 0))}
                            className="w-full bg-navy border border-white/10 rounded-md px-2 py-1 text-white text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-gray-500 block">Competitors Count</label>
                          <input
                            type="number"
                            value={room.players}
                            onChange={(e) => updateRoomField(idx, 'players', Math.max(1, parseInt(e.target.value, 10) || 1))}
                            className="w-full bg-navy border border-white/10 rounded-md px-2 py-1 text-white text-xs"
                          />
                        </div>
                        <div className="flex flex-col justify-end">
                          <label className="text-[9px] text-gray-500 block">Payout (-{commission}%)</label>
                          <span className="text-[#10b981] font-bold py-1 px-1 text-xs font-mono">{maxWin} ETB</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Add room form */}
            <div className="p-3 bg-navy-light/40 border border-white/5 rounded-xl space-y-2">
              <h4 className="text-[11px] font-bold text-gray-300 uppercase">✙ CREATE NEW ROOM</h4>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div>
                  <label className="text-gray-500 block mb-0.5">Room Name</label>
                  <input
                    type="text"
                    value={newRoom.name}
                    onChange={(e) => setNewRoom(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Ultimate Room"
                    className="w-full bg-navy border border-white/10 rounded-md px-2.5 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-gray-500 block mb-0.5">Entry Fee (ETB)</label>
                  <input
                    type="number"
                    value={newRoom.entry}
                    onChange={(e) => setNewRoom(prev => ({ ...prev, entry: Math.max(0, parseFloat(e.target.value) || 0) }))}
                    className="w-full bg-navy border border-white/10 rounded-md px-2.5 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-gray-500 block mb-0.5">Competitors</label>
                  <input
                    type="number"
                    value={newRoom.players}
                    onChange={(e) => setNewRoom(prev => ({ ...prev, players: Math.max(1, parseInt(e.target.value, 10) || 1) }))}
                    className="w-full bg-navy border border-white/10 rounded-md px-2.5 py-1.5 text-white"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={addRoom}
                    disabled={!newRoom.name}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold py-1.5 rounded-md text-xs flex items-center justify-center transition-colors cursor-pointer"
                  >
                    Add Room
                  </button>
                </div>
              </div>
            </div>

            <button onClick={handleSaveGameSettings} className="w-full bg-gold text-navy font-bold py-2.5 rounded-lg text-xs flex items-center justify-center gap-2 cursor-pointer transition-all">
              <Save size={14} />
              {saved ? 'Saved!' : 'Save Game Configuration'}
            </button>

            <div className="p-3 bg-navy-light rounded-xl border border-white/5 space-y-2">
              <label className="text-[10px] text-gray-400 uppercase block">Game Rules (How to Play)</label>
              <p className="text-[8.5px] text-gray-500">Displayed in the web app Rules modal. Leave empty to use default translated rules.</p>
              <textarea
                rows={8}
                value={rulesText}
                onChange={e => setRulesText(e.target.value)}
                placeholder="Enter custom game rules text (supports basic HTML tags like &lt;br&gt;, &lt;b&gt;, etc.)"
                className="w-full bg-navy border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono leading-relaxed focus:outline-none focus:border-gold/50 resize-y"
              />
            </div>
          </div>
        )}

        {/* Branding Tab */}
        {activeTab === 'branding' && (
          <div className="p-3 bg-navy rounded-xl space-y-4">
            <h3 className="text-xs font-semibold text-white">App Branding Settings</h3>
            <p className="text-[9px] text-gray-500">Customize the client web app name, launcher logo icon, and visual color scheme.</p>

            <div>
              <label className="text-[10px] text-gray-400 uppercase block mb-1">Telegram Bot Name (shown before Start)</label>
              <input
                type="text"
                value={botName}
                onChange={(e) => setBotName(e.target.value)}
                className="w-full bg-navy-light border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-gold/50"
                placeholder="e.g., Nile BINGO"
              />
            </div>

            <div>
              <label className="text-[10px] text-gray-400 uppercase block mb-1">Application Name (Web App Header)</label>
              <input
                type="text"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                className="w-full bg-navy-light border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-gold/50"
                placeholder="e.g., Nile BINGO"
              />
            </div>

            <div>
              <label className="text-[10px] text-gray-400 uppercase block mb-1">Application Logo Icon (Emoji / Character)</label>
              <input
                type="text"
                value={appLogo}
                onChange={(e) => setAppLogo(e.target.value)}
                className="w-full bg-navy-light border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-gold/50"
                placeholder="e.g., 🎰 or 🎮"
              />
            </div>

            <div>
              <label className="text-[10px] text-gray-400 uppercase block mb-1">Application Logo (PNG Image)</label>
              <p className="text-[8.5px] text-gray-500 mb-1.5">Upload a PNG image to use as the app logo (replaces emoji). Max 500KB.</p>
              <input
                type="file"
                accept="image/png,image/jpeg"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 500 * 1024) { alert('File too large. Max 500KB.'); return; }
                  const reader = new FileReader();
                  reader.onload = (ev) => setAppLogoPng(ev.target?.result as string);
                  reader.readAsDataURL(file);
                }}
                className="w-full text-xs text-gray-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-gold file:text-navy file:cursor-pointer hover:file:bg-gold/90"
              />
              {appLogoPng && (
                <div className="mt-2 flex items-center gap-2">
                  <img src={appLogoPng} alt="Logo Preview" className="w-10 h-10 rounded-lg border border-white/10 object-contain bg-navy-light" />
                  <button onClick={() => setAppLogoPng(null)} className="text-[10px] text-red-400 hover:text-red-300">Remove</button>
                </div>
              )}
            </div>

            <div>
              <label className="text-[10px] text-gray-400 uppercase block mb-1">Welcome Image (sent with /start message)</label>
              <p className="text-[8.5px] text-gray-500 mb-1.5">Upload an image that will be sent alongside the welcome message. Max 500KB.</p>
              <input
                type="file"
                accept="image/png,image/jpeg"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 500 * 1024) { alert('File too large. Max 500KB.'); return; }
                  const reader = new FileReader();
                  reader.onload = (ev) => setWelcomeImage(ev.target?.result as string);
                  reader.readAsDataURL(file);
                }}
                className="w-full text-xs text-gray-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-gold file:text-navy file:cursor-pointer hover:file:bg-gold/90"
              />
              {welcomeImage && (
                <div className="mt-2 flex items-center gap-2">
                  <img src={welcomeImage} alt="Welcome Preview" className="w-10 h-10 rounded-lg border border-white/10 object-contain bg-navy-light" />
                  <button onClick={() => setWelcomeImage(null)} className="text-[10px] text-red-400 hover:text-red-300">Remove</button>
                </div>
              )}
            </div>

            <div>
              <label className="text-[10px] text-gray-400 uppercase block mb-1">Color Accent Scheme</label>
              <select
                value={colorScheme}
                onChange={(e) => setColorScheme(e.target.value)}
                className="w-full bg-navy-light border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-gold/50"
              >
                <option value="gold">Gold & Deep Blue (Default)</option>
                <option value="emerald">Emerald Green & Forest</option>
                <option value="ruby">Ruby Red & Crimson</option>
                <option value="sapphire">Sapphire Blue & Ocean</option>
                <option value="amethyst">Amethyst Purple & Royal</option>
              </select>
            </div>

            <div className="bg-navy-light p-3 rounded-lg border border-white/5 space-y-2">
              <label className="text-[10px] text-gray-400 uppercase block">Referral Program Status</label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setAdminReferralEnabled(!adminReferralEnabled)}
                  className={`w-10 h-5 rounded-full transition-colors relative select-none cursor-pointer ${adminReferralEnabled ? 'bg-gold' : 'bg-gray-600'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform absolute top-0.5 ${adminReferralEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
                <span className="text-xs text-white font-medium">{adminReferralEnabled ? 'Referral Program Active' : 'Referral Program Inactive'}</span>
              </div>
            </div>

            <div className="bg-navy-light p-3 rounded-lg border border-white/5 space-y-2">
              <label className="text-[10px] text-gray-400 uppercase block">Signup Bonus (ETB)</label>
              <p className="text-[8.5px] text-gray-500">New users get this amount credited to their play balance on first signup.</p>
              <input type="number" min="0" max="1000" step="1" value={signupBonus}
                onChange={e => setSignupBonus(Number(e.target.value) || 0)}
                className="w-full bg-navy border border-white/10 rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-gold/50"
              />
            </div>

            <button onClick={handleSaveBranding} className="w-full bg-gold text-navy font-bold py-2.5 rounded-lg text-xs flex items-center justify-center gap-2 cursor-pointer transition-all">
              <Save size={14} />
              {saved ? 'Saved!' : 'Save Branding Settings'}
            </button>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="p-3 bg-navy rounded-xl space-y-4">
            <h3 className="text-xs font-semibold text-white">Notification Channels</h3>
            <p className="text-[9px] text-gray-500">
              Route different event notifications to different Telegram bots / groups. Create one channel per department.
              The <strong className="text-white">Super Admin</strong> env fallback (<code>ADMIN_CHAT_ID</code>) always receives everything.
            </p>

            {notifChannels.map((ch, idx) => (
              <div key={ch.id} className="bg-navy-light p-3 rounded-lg border border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const copy = [...notifChannels];
                        copy[idx] = { ...copy[idx], all_events: !copy[idx].all_events };
                        setNotifChannels(copy);
                      }}
                      className={`w-8 h-4 rounded-full transition-colors relative select-none cursor-pointer ${ch.all_events ? 'bg-gold' : 'bg-gray-600'}`}
                    >
                      <div className={`w-3 h-3 bg-white rounded-full transition-transform absolute top-0.5 ${ch.all_events ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                    </button>
                    <span className={`text-[10px] font-bold ${ch.all_events ? 'text-gold' : 'text-gray-400'}`}>
                      {ch.all_events ? 'All Events' : 'Select Events'}
                    </span>
                  </div>
                  <button onClick={() => setNotifChannels(prev => prev.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-300 cursor-pointer">
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] text-gray-400 block">Channel Label</label>
                    <input type="text" value={ch.label} onChange={(e) => { const c = [...notifChannels]; c[idx] = { ...c[idx], label: e.target.value }; setNotifChannels(c); }}
                      className="w-full bg-navy border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white" placeholder="e.g. Finance Dept" />
                  </div>
                  <div>
                    <label className="text-[9px] text-gray-400 block">Bot Token</label>
                    <input type="text" value={ch.bot_token} onChange={(e) => { const c = [...notifChannels]; c[idx] = { ...c[idx], bot_token: e.target.value }; setNotifChannels(c); }}
                      className="w-full bg-navy border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white font-mono" placeholder="123:ABCdef..." />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[9px] text-gray-400 block">Chat IDs (comma / space separated)</label>
                    <input type="text" value={ch.chat_ids} onChange={(e) => { const c = [...notifChannels]; c[idx] = { ...c[idx], chat_ids: e.target.value }; setNotifChannels(c); }}
                      className="w-full bg-navy border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white" placeholder="e.g. 123456789, 987654321" />
                  </div>
                </div>
                {!ch.all_events && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {['deposit_pending','deposit_approved','deposit_rejected','withdraw_pending','withdraw_approved','withdraw_rejected','game_started','game_winner','game_winner_appointed','user_registered','balance_adjustment'].map(ev => (
                      <label key={ev} className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] cursor-pointer select-none transition-colors ${ch.events.includes(ev) ? 'bg-gold/20 text-gold border border-gold/30' : 'bg-navy text-gray-400 border border-white/10'}`}>
                        <input type="checkbox" checked={ch.events.includes(ev)} onChange={() => {
                          const c = [...notifChannels];
                          if (c[idx].events.includes(ev)) c[idx].events = c[idx].events.filter((e: string) => e !== ev);
                          else c[idx].events = [...c[idx].events, ev];
                          setNotifChannels(c);
                        }} className="hidden" />
                        {ev.replace(/_/g, ' ')}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <button
              onClick={() => setNotifChannels(prev => [...prev, {
                id: 'ch_' + Date.now(), label: '', bot_token: '', chat_ids: '',
                all_events: false, events: ['deposit_pending', 'deposit_approved', 'deposit_rejected', 'game_winner_appointed'],
              }])}
              className="w-full border border-dashed border-white/20 text-gray-400 hover:text-white hover:border-white/40 rounded-lg py-2 text-[11px] font-medium transition-all cursor-pointer"
            >
              + Add Notification Channel
            </button>

            <button onClick={() => saveConfig(getMergedConfig())} className="w-full bg-gold text-navy font-bold py-2.5 rounded-lg text-xs flex items-center justify-center gap-2 cursor-pointer transition-all">
              <Save size={14} />
              {saved ? 'Saved!' : 'Save Notification Channels'}
            </button>
          </div>
        )}

        {/* Bias Tab */}
        {activeTab === 'bias' && (
          <div className="p-3 bg-navy rounded-xl space-y-4 text-left">
            <h3 className="text-xs font-semibold text-white">Biased Client-Side Draw Engine</h3>
            <p className="text-[9px] text-gray-500">Configure certain game sessions to draw numbers in favor of a specific card. This seeded randomness forces the designated card to win BINGO.</p>

            <div className="bg-navy-light p-3 rounded-lg border border-white/5 space-y-3">
              <h4 className="text-[10px] font-bold text-gold uppercase">Appoint Winner for Upcoming/Active Game</h4>
              <div className="grid grid-cols-3 gap-2 text-[10px]">
                <div>
                  <label className="text-gray-400 block mb-0.5">Game Session ID / Room ID</label>
                  <input
                    type="text"
                    id="appoint_game_id"
                    placeholder="e.g. bronze"
                    className="w-full bg-navy border border-white/10 rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-gold/50"
                  />
                </div>
                <div>
                  <label className="text-gray-400 block mb-0.5">Appointed Card No (1-200)</label>
                  <input
                    type="number"
                    id="appoint_card_num"
                    min="1"
                    max="200"
                    placeholder="e.g. 58"
                    className="w-full bg-navy border border-white/10 rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-gold/50"
                  />
                </div>
                <div>
                  <label className="text-gray-400 block mb-0.5">Win After Balls</label>
                  <input
                    type="number"
                    id="appoint_after_balls"
                    min="5"
                    max="75"
                    placeholder="e.g. 12"
                    defaultValue="20"
                    className="w-full bg-navy border border-white/10 rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-gold/50"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const gEl = document.getElementById('appoint_game_id') as HTMLInputElement;
                  const cEl = document.getElementById('appoint_card_num') as HTMLInputElement;
                  const bEl = document.getElementById('appoint_after_balls') as HTMLInputElement;
                  const gId = gEl?.value?.trim();
                  const cNum = parseInt(cEl?.value, 10);
                  const aBalls = parseInt(bEl?.value, 10) || 20;
                  if (gId && cNum >= 1 && cNum <= 200) {
                    setAppointedWinners(prev => {
                      const updated = { ...prev, [gId]: { card_number: cNum, after_balls: aBalls } };
                      saveConfig({ ...getMergedConfig(), appointed_winners: updated });
                      return updated;
                    });
                    if (gEl) gEl.value = '';
                    if (cEl) cEl.value = '';
                    if (bEl) bEl.value = '20';
                  } else {
                    alert("Please provide a valid Game Session ID and Card number between 1 and 200.");
                  }
                }}
                className="w-full bg-gold text-navy font-bold py-2 rounded-lg text-xs cursor-pointer transition-all"
              >
                Appoint Winner Card
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-gray-300 font-bold uppercase tracking-wider block">Active Appointed Rules ({Object.keys(appointedWinners).length})</label>
              <div className="space-y-1.5 max-h-[40vh] overflow-y-auto">
                {Object.entries(appointedWinners).map(([gId, rule]) => (
                  <div key={gId} className="flex items-center justify-between p-2.5 bg-navy-light border border-white/5 rounded-lg text-xs">
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold">GAME ID / ROOM:</span> <span className="font-mono text-white ml-1 font-bold">{gId}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div>
                        <span className="text-[10px] text-amber-500 font-bold">CARD:</span> <span className="bg-amber-400/10 border border-amber-500/20 text-gold px-2 py-0.5 rounded font-black font-mono ml-1">#{rule.card_number}</span>
                      </div>
                      <div className="text-[9px] text-gray-400">
                        after {rule.after_balls} balls
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setAppointedWinners(prev => {
                            const copy = { ...prev };
                            delete copy[gId];
                            saveConfig({ ...getMergedConfig(), appointed_winners: copy });
                            return copy;
                          });
                        }}
                        className="text-red-400 hover:text-red-500 font-bold uppercase text-[9px] bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
                {Object.keys(appointedWinners).length === 0 && (
                  <div className="text-gray-500 text-xs italic text-center py-4 bg-navy-light/45 border border-white/5 rounded-lg">No active appointed winner overrides defined. All games currently use fair, un-biased seeded drawing sequences.</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
