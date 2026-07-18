-- Migration 024: Update update_game_prize_pool to round to 2 decimal places instead of whole integers.
-- This ensures precise prize pools like 8.50 birr instead of rounding to 9.00 or 8.00.

CREATE OR REPLACE FUNCTION update_game_prize_pool(p_game_code TEXT, p_stake_amt NUMERIC, p_commission NUMERIC DEFAULT NULL)
RETURNS NUMERIC AS $$
DECLARE
  v_game_id UUID;
  v_total_cards INTEGER;
  v_stored_cards INTEGER;
  v_commission NUMERIC;
  v_new_prize NUMERIC;
  v_player_count INTEGER;
  v_total_stake NUMERIC;
BEGIN
  SELECT id INTO v_game_id FROM games WHERE code = p_game_code LIMIT 1;

  IF v_game_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Use provided commission, or read from game record, or read from bot_config, or default to 15
  IF p_commission IS NOT NULL THEN
    v_commission := p_commission;
  ELSE
    BEGIN
      SELECT commission INTO v_commission FROM games WHERE id = v_game_id;
      IF v_commission IS NULL THEN
        SELECT COALESCE((commands->>'commission')::NUMERIC, 15) INTO v_commission
        FROM bot_config WHERE id = 'main' LIMIT 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_commission := 15;
    END;
  END IF;

  -- Count total unique players (exclude watchers) and total cards sold
  SELECT COUNT(*) INTO v_player_count FROM game_players WHERE game_id = v_game_id AND is_watching = false;
  SELECT COUNT(*) INTO v_total_cards FROM game_card_reservations WHERE game_code = p_game_code AND card_number > 0;

  -- Fetch existing stored cards count as safety
  SELECT COALESCE(total_cards, 0) INTO v_stored_cards FROM games WHERE id = v_game_id;
  IF v_total_cards < v_stored_cards THEN
    v_total_cards := v_stored_cards;
  END IF;

  IF v_total_cards < v_player_count THEN
    v_total_cards := v_player_count;
  END IF;

  -- Calculate total stake
  v_total_stake := p_stake_amt * v_total_cards;

  -- Update games with prize pool, total cards, and total stake
  UPDATE games
  SET prize_pool = ROUND(v_total_stake * (1 - v_commission / 100), 2),
      total_cards = v_total_cards,
      total_stake = v_total_stake
  WHERE id = v_game_id
  RETURNING prize_pool INTO v_new_prize;

  RETURN v_new_prize;
END;
$$ LANGUAGE plpgsql;
