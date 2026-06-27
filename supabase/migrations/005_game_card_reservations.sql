-- Game card reservations table to ensure one card per user per game
CREATE TABLE IF NOT EXISTS game_card_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_code TEXT NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  card_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(game_code, card_number)
);

ALTER TABLE game_card_reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view game card reservations"
  ON game_card_reservations FOR SELECT
  USING (auth.uid() = user_id OR auth.role() = 'authenticated');

CREATE POLICY "Users can insert their own reservations"
  ON game_card_reservations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reservations"
  ON game_card_reservations FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own reservations"
  ON game_card_reservations FOR UPDATE
  USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE game_card_reservations;
