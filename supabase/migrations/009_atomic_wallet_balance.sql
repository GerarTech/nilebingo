-- Atomic wallet balance adjustment functions to prevent race conditions
CREATE OR REPLACE FUNCTION adjust_main_balance(p_user_id UUID, p_amount NUMERIC)
RETURNS NUMERIC AS $$
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
RETURNS NUMERIC AS $$
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
