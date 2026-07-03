-- Bot messages table for editable command responses
CREATE TABLE IF NOT EXISTS bot_messages (
  id TEXT PRIMARY KEY DEFAULT 'main',
  messages JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO bot_messages (id, messages) VALUES ('main', '{
  "welcome": "🎰 *Welcome to Nile BINGO!*\\n\\nExperience the thrill of real-time BINGO right here on Telegram. Quick matches, fair play, and real prizes await!\\n\\n👇 Tap the button below to jump in!",
  "share_contact": "📱 *Let\\'s get started!*\\n\\nPlease share your phone number so we can set up your account. Your number is kept private and used only for account verification.",
  "contact_received": "✅ *Welcome aboard!* Your phone number has been verified and your account is ready to go.",
  "balance_info": "💰 *Your Wallet*\\n\\n• Main Balance: *{main} ETB* (withdrawable)\\n• Play Balance: *{play} ETB* (gameplay only)\\n• Total: *{total} ETB*\\n\\n💡 *Tip:* Main balance is for withdrawals. Play balance is for entering games and cannot be withdrawn.",
  "deposit_choose": "💳 *Deposit Funds*\\n\\nSelect your preferred payment method below:",
  "deposit_cbe_info": "*CBE Deposit Instructions*\\n\\nAccount: 1000256789123\\nName: Nile Bingo\\nBank: CBE\\n\\nSend amount, then forward SMS confirmation here.",
  "deposit_telebirr_info": "*Telebirr Deposit Instructions*\\n\\nNumber: 0918281072\\nName: Melkie\\n\\nSend up to 1000 ETB, then forward SMS confirmation here.",
  "withdraw_info": "💸 *Withdraw Funds*\\n\\nOnly your *Main Balance* can be withdrawn. Play balance is for gameplay only.\\n\\n📋 *Requirements:*\\n• Play at least {required_games} games first\\n• Minimum withdrawal: {min_amount} ETB\\n\\nTo request a withdrawal, please contact support with your amount and preferred method.",
  "contact_info": "*📬 Contact Support*\\n\\nHave a question or need help?\\n\\n📧 Email: support@nilebingo.com\\n💬 Telegram: @nile_bingo_support\\n\\nWe typically respond within 24 hours.",
  "winning_patterns_info": "*🏆 Winning Patterns*\\n\\nComplete any of these to win:\\n\\n1️⃣ *Horizontal Row* — Mark all 5 numbers in any row\\n2️⃣ *Vertical Column* — Mark all 5 numbers in any column\\n\\nWin detection is automatic — no need to shout BINGO! The game instantly checks after every draw.",
  "how_to_play": "*🎯 How to Play BINGO*\\n\\n1️⃣ Pick a room — Bronze (10 ETB) up to VIP (500 ETB)\\n2️⃣ Choose 1–2 card numbers (each has a unique 5×5 grid)\\n3️⃣ Wait for the game to auto-start when the timer hits zero\\n4️⃣ Numbers 1–75 are drawn every 2 seconds — cards mark automatically\\n5️⃣ First to complete a full row or column wins the prize pool\\n6️⃣ Prize = total stakes × players minus commission\\n\\nGood luck and have fun! 🍀",
  "invite": "🎉 *Invite Friends & Earn!*\\n\\nHere's your exclusive invite link:\\n{refLink}\\n\\n*How it works:*\\n• Share your link with friends\\n• They join and share their phone number\\n• You instantly get *{refBonus} ETB* in your Play Wallet\\n\\nNo minimum deposit required — just invite and play! 🚀"
}'::jsonb) ON CONFLICT (id) DO NOTHING;