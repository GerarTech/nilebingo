-- Migration 019: All feature additions
-- Includes: admin_users, user_win_streaks, jackpot_pool, mini_games, multi-card config

-- 1. Admin users table for RBAC
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'moderator', 'support')),
  created_at TIMESTAMPTZ DEFAULT now(),
  last_login TIMESTAMPTZ
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- 2. User win streaks for 3-win combo bonus
CREATE TABLE IF NOT EXISTS user_win_streaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  consecutive_wins INTEGER NOT NULL DEFAULT 0,
  last_win_at TIMESTAMPTZ,
  combo_claimed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_win_streaks ENABLE ROW LEVEL SECURITY;

-- 3. Jackpot pool and configuration columns
-- Add jackpot fields to bot_config (stored in commands JSONB)
-- We'll create a dedicated table for the jackpot pool value
CREATE TABLE IF NOT EXISTS jackpot_pool (
  id TEXT PRIMARY KEY DEFAULT 'main',
  pool_amount NUMERIC(20,8) NOT NULL DEFAULT 0,
  contributed_count INTEGER NOT NULL DEFAULT 0,
  last_paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE jackpot_pool ENABLE ROW LEVEL SECURITY;

-- 4. Mini-games table
CREATE TABLE IF NOT EXISTS mini_games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_type TEXT NOT NULL DEFAULT 'pick_box',
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  room_code TEXT,
  stake NUMERIC(20,8) NOT NULL DEFAULT 0,
  payout NUMERIC(20,8) NOT NULL DEFAULT 0,
  won BOOLEAN DEFAULT false,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE mini_games ENABLE ROW LEVEL SECURITY;

-- 5. Add referral_claimed column to profiles (ensure it exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'referral_claimed'
  ) THEN
    ALTER TABLE profiles ADD COLUMN referral_claimed BOOLEAN DEFAULT false;
  END IF;
END $$;

-- 6. Add max_cards column to bot_config default (we use commands JSONB)
-- Default max_cards = 5 in the bot_config commands

-- 7. Add referral_enabled flag to bot_config commands
-- This will be stored in bot_config.commands JSONB

-- 8. Refresh the materialized schema cache
NOTIFY pgrst, 'reload schema';
