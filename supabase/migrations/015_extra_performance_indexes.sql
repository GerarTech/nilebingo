-- Additional performance indexes for fast reservation counts
CREATE INDEX IF NOT EXISTS idx_gcr_game_code_card_number
  ON game_card_reservations (game_code, card_number);

CREATE INDEX IF NOT EXISTS idx_gcr_game_code_user_id
  ON game_card_reservations (game_code, user_id);

CREATE INDEX IF NOT EXISTS idx_gcr_created_at
  ON game_card_reservations (created_at);

-- Ensure games.code is indexed for fast lookups
CREATE INDEX IF NOT EXISTS idx_games_code
  ON games (code);
