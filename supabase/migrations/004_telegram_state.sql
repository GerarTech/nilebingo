-- Create telegram state and referral columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_claimed BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS telegram_state TEXT DEFAULT 'idle';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS telegram_state_data JSONB DEFAULT '{}'::jsonb;
