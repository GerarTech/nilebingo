// Database types
export interface Profile {
  id: string;
  telegram_id: string;
  username?: string;
  first_name?: string;
  photo_url?: string;
  phone?: string;
  language: 'en' | 'am';
  verified: boolean;
  created_at: string;
}

export interface Wallet {
  id: string;
  user_id: string;
  main_balance: number;
  play_balance: number;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: 'deposit' | 'withdraw' | 'bet' | 'win' | 'transfer_to_play' | 'transfer_to_main';
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  reference?: string;
  created_at: string;
}

export interface Stake {
  id: string;
  amount: number;
  lobby_open_until: string;
  status: 'open' | 'closed';
  created_at: string;
}

export interface Game {
  id: string;
  stake_id: string;
  code: string;
  status: 'lobby' | 'active' | 'finished';
  drawn_numbers: number[];
  current_number?: number;
  prize_pool: number;
  called_count: number;
  winner_id?: string;
  created_at: string;
}

export interface GamePlayer {
  id: string;
  game_id: string;
  user_id: string;
  card: number[][];
  marked: boolean[][];
  auto_mark: boolean;
  is_watching: boolean;
  created_at: string;
}

export interface GameHistory {
  id: string;
  game_id: string;
  user_id: string;
  stake: number;
  win_amount: number;
  numbers_matched: number;
  created_at: string;
}

// BINGO columns
export const BINGO_COLUMNS = {
  B: { min: 1, max: 15 },
  I: { min: 16, max: 30 },
  N: { min: 31, max: 45 },
  G: { min: 46, max: 60 },
  O: { min: 61, max: 75 },
} as const;

export const COLUMN_LABELS = ['B', 'I', 'N', 'G', 'O'] as const;
export type ColumnLabel = (typeof COLUMN_LABELS)[number];

// Tab navigation
export type TabType = 'game' | 'scores' | 'history' | 'wallet' | 'profile';