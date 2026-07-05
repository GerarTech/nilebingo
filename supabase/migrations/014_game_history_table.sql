-- Replace game_history VIEW with a real TABLE so INSERTs work
DROP VIEW IF EXISTS game_history;

CREATE TABLE IF NOT EXISTS game_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  stake NUMERIC(12,2) DEFAULT 0,
  win_amount NUMERIC(12,2) DEFAULT 0,
  numbers_matched INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_game_history_user_id ON game_history(user_id);
CREATE INDEX IF NOT EXISTS idx_game_history_game_id ON game_history(game_id);

-- Re-create as a view for aggregated read queries
CREATE OR REPLACE VIEW game_history_view AS
SELECT
  gh.id,
  gh.game_id,
  gh.user_id,
  gh.stake,
  gh.win_amount,
  gh.numbers_matched,
  gh.created_at,
  g.code AS game_code,
  p.username,
  p.first_name
FROM game_history gh
LEFT JOIN games g ON g.id = gh.game_id
LEFT JOIN profiles p ON p.id = gh.user_id;
