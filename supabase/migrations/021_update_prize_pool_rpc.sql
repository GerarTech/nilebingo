-- Migration 021: Update prize pool RPC to accept optional commission parameter
-- This allows Happy Hour overrides to be passed from the application layer

CREATE OR REPLACE FUNCTION update_game_prize_pool(p_game_code TEXT, p_stake_amt NUMERIC, p_commission NUMERIC DEFAULT NULL)
RETURNS NUMERIC AS $$
DECLARE
  v_game_id UUID;
  v_total_cards INTEGER;
  v_commission NUMERIC;
  v_new_prize NUMERIC;
  v_player_count INTEGER;
BEGIN
  SELECT id INTO v_game_id FROM games WHERE code = p_game_code LIMIT 1;

  IF v_game_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Use provided commission, or read from bot_config, or fall back to game record, or default 15
  IF p_commission IS NOT NULL THEN
    v_commission := p_commission;
  ELSE
    BEGIN
      -- Try game record first (most accurate per-game override)
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
