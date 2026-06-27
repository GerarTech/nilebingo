-- Atomic function to update game prize pool based on actual player count
CREATE OR REPLACE FUNCTION update_game_prize_pool(p_game_code TEXT, p_stake_amt NUMERIC)
RETURNS NUMERIC AS $$
DECLARE
  v_game_id UUID;
  v_player_count INTEGER;
  v_new_prize NUMERIC;
BEGIN
  SELECT id INTO v_game_id FROM games WHERE code = p_game_code LIMIT 1;

  IF v_game_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT COUNT(*) INTO v_player_count FROM game_players WHERE game_id = v_game_id;

  UPDATE games
  SET prize_pool = ROUND(p_stake_amt * v_player_count)
  WHERE id = v_game_id
  RETURNING prize_pool INTO v_new_prize;

  RETURN v_new_prize;
END;
$$ LANGUAGE plpgsql;
