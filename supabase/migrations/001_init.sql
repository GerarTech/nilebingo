-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id TEXT UNIQUE NOT NULL,
  username TEXT,
  first_name TEXT,
  photo_url TEXT,
  language TEXT DEFAULT 'en' CHECK (language IN ('en', 'am')),
  sound_on BOOLEAN DEFAULT true,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create wallets table
CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  main_balance NUMERIC(12,2) DEFAULT 0,
  play_balance NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdraw', 'bet', 'win', 'transfer_to_play', 'transfer_to_main')),
  amount NUMERIC(12,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  reference TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create stakes table
CREATE TABLE IF NOT EXISTS stakes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount NUMERIC(12,2) NOT NULL,
  lobby_open_until TIMESTAMPTZ,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create games table
CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stake_id UUID REFERENCES stakes(id) ON DELETE SET NULL,
  code TEXT NOT NULL,
  status TEXT DEFAULT 'lobby' CHECK (status IN ('lobby', 'active', 'finished')),
  drawn_numbers INTEGER[] DEFAULT '{}',
  current_number INTEGER,
  prize_pool NUMERIC(12,2) DEFAULT 0,
  called_count INTEGER DEFAULT 0,
  winner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create game_players table
CREATE TABLE IF NOT EXISTS game_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  card INTEGER[][] NOT NULL,
  marked BOOLEAN[][] DEFAULT ARRAY[ARRAY[false,false,false,false,false],ARRAY[false,false,false,false,false],ARRAY[false,false,false,false,false],ARRAY[false,false,false,false,false],ARRAY[false,false,false,false,false]],
  auto_mark BOOLEAN DEFAULT true,
  is_watching BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(game_id, user_id)
);

-- Create game_history view
CREATE OR REPLACE VIEW game_history AS
SELECT 
  gh.id,
  gh.game_id,
  gh.user_id,
  gh.stake,
  gh.win_amount,
  gh.numbers_matched,
  gh.created_at,
  g.code as game_code,
  p.username
FROM (
  SELECT 
    gp.id,
    gp.game_id,
    gp.user_id,
    s.amount as stake,
    CASE WHEN g.winner_id = gp.user_id THEN g.prize_pool ELSE 0 END as win_amount,
    (SELECT COUNT(*) FROM unnest(gp.card) WITH ORDINALITY AS c(num, idx) WHERE num = ANY(g.drawn_numbers)) as numbers_matched,
    gp.created_at
  FROM game_players gp
  JOIN games g ON g.id = gp.game_id
  LEFT JOIN stakes s ON s.id = g.stake_id
) gh
JOIN games g ON g.id = gh.game_id
LEFT JOIN profiles p ON p.id = gh.user_id;

-- Add RLS policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_players ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Wallets policies
CREATE POLICY "Users can view their own wallet"
  ON wallets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallet"
  ON wallets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own wallet"
  ON wallets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Transactions policies
CREATE POLICY "Users can view their own transactions"
  ON transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions"
  ON transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Stakes policies (public readable)
CREATE POLICY "Anyone can view stakes"
  ON stakes FOR SELECT
  USING (true);

-- Games policies
CREATE POLICY "Anyone can view games"
  ON games FOR SELECT
  USING (true);

-- Game players policies
CREATE POLICY "Users can view their own game entries"
  ON game_players FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own game entries"
  ON game_players FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Enable Realtime for games and game_players
ALTER PUBLICATION supabase_realtime ADD TABLE games;
ALTER PUBLICATION supabase_realtime ADD TABLE game_players;

-- Seed initial stakes
INSERT INTO stakes (amount, lobby_open_until, status) VALUES
  (10, now() + interval '1 hour', 'open'),
  (50, now() + interval '1 hour', 'open'),
  (100, now() + interval '1 hour', 'open');