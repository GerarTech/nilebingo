-- Atomic function to update game prize pool based on actual total cards sold (commission applied)
CREATE OR REPLACE FUNCTION update_game_prize_pool(p_game_code TEXT, p_stake_amt NUMERIC)
RETURNS NUMERIC AS $
DECLARE
  v_game_id UUID;
  v_total_cards INTEGER;
  v_commission NUMERIC := 15;
  v_new_prize NUMERIC;
  v_player_count INTEGER;
BEGIN
  SELECT id INTO v_game_id FROM games WHERE code = p_game_code LIMIT 1;

  IF v_game_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Read commission rate from bot_config (matches admin setting); default to 15 when unset
  BEGIN
    SELECT COALESCE((commands->>'commission')::NUMERIC, 15) INTO v_commission
    FROM bot_config WHERE id = 'main' LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_commission := 10;
  END;

  -- Count total unique players and total cards sold
  SELECT COUNT(*) INTO v_player_count FROM game_players WHERE game_id = v_game_id;
  SELECT COUNT(*) INTO v_total_cards FROM game_card_reservations WHERE game_code = p_game_code AND card_number > 0;

  -- Use at least the player count (each player has at least 1 card)
  IF v_total_cards < v_player_count THEN
    v_total_cards := v_player_count;
  END IF;

  UPDATE games
  SET prize_pool = ROUND(p_stake_amt * v_total_cards * (1 - v_commission / 100))
  WHERE id = v_game_id
  RETURNING prize_pool INTO v_new_prize;

  RETURN v_new_prize;
END;
$$ LANGUAGE plpgsql;
