-- Index for game_card_reservations.game_code lookups and realtime filters
CREATE INDEX IF NOT EXISTS idx_game_card_reservations_game_code
  ON game_card_reservations (game_code);

-- Index for game_players.card_number if needed for queries
CREATE INDEX IF NOT EXISTS idx_game_players_card_number
  ON game_players (card_number);
