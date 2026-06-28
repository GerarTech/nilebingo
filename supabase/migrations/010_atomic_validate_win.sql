CREATE OR REPLACE FUNCTION atomic_validate_win(p_game_id UUID, p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_game RECORD;
  v_game_player RECORD;
  v_card INTEGER[][];
  v_drawn INTEGER[];
  v_marked BOOL[][];
  v_row_win BOOL;
  v_col_win BOOL;
  v_player_count INTEGER;
  v_win_amount NUMERIC;
BEGIN
  SELECT * INTO v_game FROM games WHERE id = p_game_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Game not found');
  END IF;
  IF v_game.status = 'finished' THEN
    RETURN json_build_object('success', false, 'error', 'Game already finished', 'winner_id', v_game.winner_id);
  END IF;

  SELECT * INTO v_game_player FROM game_players WHERE game_id = p_game_id AND user_id = p_user_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Player not found');
  END IF;

  v_card := v_game_player.card;
  v_drawn := COALESCE(v_game.drawn_numbers, '{}');

  IF v_card IS NULL OR array_length(v_card, 1) = 0 THEN
    RETURN json_build_object('success', false, 'error', 'No card found');
  END IF;

  v_marked := ARRAY[
    (SELECT ARRAY_AGG(row) FROM unnest(v_card) AS row WHERE row IS NOT NULL)
  ];

  SELECT ARRAY_AGG(
    (SELECT BOOL_AND(cell) FROM unnest(row) AS cell WHERE cell IS NOT NULL)
  ) INTO v_marked
  FROM unnest(v_card) AS row;

  SELECT EXISTS (
    SELECT 1 FROM unnest(v_marked) AS r WHERE r = true
  ) INTO v_row_win;

  SELECT EXISTS (
    SELECT 1 FROM generate_series(1, 5) AS col_idx
    WHERE NOT EXISTS (
      SELECT 1 FROM generate_series(1, 5) AS row_idx
      WHERE v_marked[row_idx] IS NULL OR v_marked[row_idx][col_idx] = false
    )
  ) INTO v_col_win;

  IF NOT v_row_win AND NOT v_col_win THEN
    RETURN json_build_object('success', false, 'error', 'No winning pattern found');
  END IF;

  SELECT COUNT(*) INTO v_player_count FROM game_players WHERE game_id = p_game_id AND is_watching = false;
  IF v_player_count < 1 THEN v_player_count := 1; END IF;
  v_win_amount := FLOOR(v_game.prize_pool / v_player_count);

  UPDATE games SET status = 'finished', winner_id = p_user_id WHERE id = p_game_id;

  DELETE FROM game_card_reservations WHERE game_code = v_game.code;

  RETURN json_build_object(
    'success', true,
    'winner_id', p_user_id,
    'win_amount', v_win_amount,
    'player_count', v_player_count
  );
END;
$$ LANGUAGE plpgsql;
