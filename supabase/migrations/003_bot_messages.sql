-- Bot messages table for editable command responses
CREATE TABLE IF NOT EXISTS bot_messages (
  id TEXT PRIMARY KEY DEFAULT 'main',
  messages JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO bot_messages (id, messages) VALUES ('main', '{
  "welcome": "🎰 Welcome to Nile Bingo!\\n\\nThe most exciting BINGO experience on Telegram.\\n\\nTap the button below to start playing!",
  "share_contact": "📱 Please share your phone number to continue.\\n\\nThis helps us identify you and provide better support.",
  "contact_received": "✅ Thank you! Your contact has been shared with our support team.",
  "balance_info": "💰 *Your Balance*\\n\\nMain Wallet: 0 ETB\\nPlay Wallet: 0 ETB\\nTotal: 0 ETB",
  "deposit_choose": "💳 *Choose payment method:*\\n\\nSelect your preferred option below:",
  "deposit_cbe_info": "*CBE Deposit Instructions*\\n\\nAccount: 1000256789123\\nName: Nile Bingo\\nBank: CBE\\n\\nSend amount, then forward SMS confirmation here.",
  "deposit_telebirr_info": "*Telebirr Deposit Instructions*\\n\\nNumber: 0925502345\\nName: Ashe\\n\\nSend up to 1000 ETB, then forward SMS confirmation here.",
  "withdraw_info": "*Withdraw Funds*\\n\\nContact support to withdraw. Min: 50 ETB",
  "contact_info": "*Contact Support*\\n\\nEmail: support@fuabingo.com\\nTelegram: @fua_bingo_support",
  "winning_patterns_info": "*Winning Patterns*\\n\\n1. Horizontal Line\\n2. Vertical Line\\n3. Diagonal Line\\n4. Four Corners\\n5. Blackout\\n\\nFirst to complete a pattern wins!",
  "how_to_play": "*How to Play BINGO:*\\n\\n1. Choose your stake (10/20/50 ETB)\\n2. Select your card (1-300)\\n3. Numbers are drawn\\n4. Mark matching numbers\\n5. Complete a row/column/diagonal to win!\\n\\nGood luck!"
}'::jsonb) ON CONFLICT (id) DO NOTHING;