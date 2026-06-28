-- ==========================================================
-- Migration 010: RLS fixes, SECURITY DEFINER RPCs, state columns
-- ==========================================================

-- 1. Ensure telegram_state, referral columns exist (from 004, idempotent)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_claimed BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS telegram_state TEXT DEFAULT 'idle';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS telegram_state_data JSONB DEFAULT '{}'::jsonb;

-- 2. Make balance RPCs SECURITY DEFINER so they work when called
--    from the web app (anon key). SECURITY INVOKER (the default)
--    causes them to fail because RLS blocks the underlying table.
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

-- 3. Relax wallet RLS so the anon key can read wallets directly
--    (defence-in-depth — the web app now uses API endpoints with
--     service_role, but this covers any missed direct queries)
DROP POLICY IF EXISTS "Users can view their own wallet" ON wallets;
CREATE POLICY "Users can view their own wallet"
  ON wallets FOR SELECT
  USING (auth.uid() = user_id OR auth.role() = 'anon');

-- 4. Allow anon key to insert wallets (needed if the web app's
--    initialize() creates a profile+wallet before /start runs)
DROP POLICY IF EXISTS "Users can insert their own wallet" ON wallets;
CREATE POLICY "Users can insert their own wallet"
  ON wallets FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.role() = 'anon');
