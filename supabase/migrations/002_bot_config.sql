-- Bot configuration table for editable commands
CREATE TABLE IF NOT EXISTS bot_config (
  id TEXT PRIMARY KEY DEFAULT 'main',
  commands JSONB NOT NULL DEFAULT '{
    "admin_stats": "/admin_stats",
    "admin_users": "/admin_users",
    "admin_pending": "/admin_pending",
    "admin_help": "/admin_help",
    "admin_approve": "/approve_",
    "admin_reject": "/reject_",
    "play": "🎮 Play BINGO",
    "check_balance": "💰 Check Balance",
    "deposit": "💳 Deposit",
    "withdraw": "💸 Withdraw",
    "contact": "📞 Contact Us",
    "instructions": "📜 Game Instruction",
    "transactions": "📒 Transactions",
    "winning_patterns": "🎯 Winning patterns",
    "language": "🌐 Language"
  }'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO bot_config (id, commands) VALUES ('main', '{
  "admin_stats": "/admin_stats",
  "admin_users": "/admin_users",
  "admin_pending": "/admin_pending",
  "admin_help": "/admin_help",
  "admin_approve": "/approve_",
  "admin_reject": "/reject_",
  "play": "🎮 Play BINGO",
  "check_balance": "💰 Check Balance",
  "deposit": "💳 Deposit",
  "withdraw": "💸 Withdraw",
  "contact": "📞 Contact Us",
  "instructions": "📜 Game Instruction",
  "transactions": "📒 Transactions",
  "winning_patterns": "🎯 Winning patterns",
  "language": "🌐 Language"
}'::jsonb) ON CONFLICT (id) DO NOTHING;
