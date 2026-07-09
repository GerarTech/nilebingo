-- Add winners support to games table for multiple winner / shared prize
ALTER TABLE games ADD COLUMN IF NOT EXISTS winners JSONB DEFAULT '[]'::jsonb;
ALTER TABLE games ADD COLUMN IF NOT EXISTS winner_collect_until TIMESTAMPTZ;
