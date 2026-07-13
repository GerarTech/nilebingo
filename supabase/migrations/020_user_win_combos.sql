-- Migration 020: Win combo tracking table for 3-Win Combo Bonus promotion

CREATE TABLE IF NOT EXISTS user_win_combos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  consecutive_wins INTEGER NOT NULL DEFAULT 0,
  last_win_at TIMESTAMPTZ,
  total_bonuses_claimed INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_win_combos ENABLE ROW LEVEL SECURITY;

-- RLS: service role bypasses, but create policies for safety
CREATE POLICY "Service role full access on user_win_combos" ON user_win_combos
  FOR ALL USING (true) WITH CHECK (true);
