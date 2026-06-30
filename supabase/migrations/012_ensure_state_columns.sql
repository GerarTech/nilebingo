-- ==========================================================
-- Migration 012: Ensure telegram_state, referral columns exist
-- (Idempotent — safe to run multiple times)
-- ==========================================================

-- 1. Phone column (from 002, idempotent)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;

-- 2. Telegram state & referral columns (from 004, idempotent)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_claimed BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS telegram_state TEXT DEFAULT 'idle';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS telegram_state_data JSONB DEFAULT '{}'::jsonb;

-- 3. Add details column to transactions (used by withdraw flow)
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}'::jsonb;

-- 4. Make balance RPCs SECURITY DEFINER (from 010, idempotent)
CREATE OR REPLACE FUNCTION adjust_main_balance(p_user_id UUID, p_amount NUMERIC)
RETURNS NUMERIC SECURITY DEFINER AS $$
DECLARE
  v_new_balance NUMERIC;
BEGIN
  UPDATE wallets
  SET main_balance = GREATEST(0, main_balance + p_amount)
  WHERE user_id = p_user_id
  RETURNING main_balance INTO v_new_balance;
  IF v_new_balance IS NULL THEN
    RAISE EXCEPTION 'Wallet not found for user %', p_user_id;
  END IF;
  RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION adjust_play_balance(p_user_id UUID, p_amount NUMERIC)
RETURNS NUMERIC SECURITY DEFINER AS $$
DECLARE
  v_new_balance NUMERIC;
BEGIN
  UPDATE wallets
  SET play_balance = GREATEST(0, play_balance + p_amount)
  WHERE user_id = p_user_id
  RETURNING play_balance INTO v_new_balance;
  IF v_new_balance IS NULL THEN
    RAISE EXCEPTION 'Wallet not found for user %', p_user_id;
  END IF;
  RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql;
