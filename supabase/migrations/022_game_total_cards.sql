-- Persist total cards sold per game so prize pool stays correct after reservations are cleaned up
ALTER TABLE games ADD COLUMN IF NOT EXISTS total_cards INTEGER DEFAULT 0;

CREATE OR REPLACE FUNCTION update_game_prize_pool(p_game_code TEXT, p_stake_amt NUMERIC, p_commission NUMERIC DEFAULT NULL)
RETURNS NUMERIC AS $$
DECLARE
  v_game_id UUID;
  v_total_cards INTEGER;
  v_stored_cards INTEGER;
  v_commission NUMERIC;
  v_new_prize NUMERIC;
  v_player_count INTEGER;
BEGIN
  SELECT id INTO v_game_id FROM games WHERE code = p_game_code LIMIT 1;

  IF v_game_id IS NULL THEN
    RETURN NULL;
  END IF;

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

  SELECT COUNT(*) INTO v_player_count FROM game_players WHERE game_id = v_game_id AND is_watching = false;
  SELECT COUNT(*) INTO v_total_cards FROM game_card_reservations WHERE game_code = p_game_code AND card_number > 0;

  SELECT COALESCE(total_cards, 0) INTO v_stored_cards FROM games WHERE id = v_game_id;
  IF v_total_cards < v_stored_cards THEN
    v_total_cards := v_stored_cards;
  END IF;

  IF v_total_cards < v_player_count THEN
    v_total_cards := v_player_count;
  END IF;

  UPDATE games
  SET prize_pool = ROUND(p_stake_amt * v_total_cards * (1 - v_commission / 100)),
      total_cards = v_total_cards
  WHERE id = v_game_id
  RETURNING prize_pool INTO v_new_prize;

  RETURN v_new_prize;
END;
$$ LANGUAGE plpgsql;
