export interface HappyHourConfig {
  enabled?: boolean;
  room_id?: string;
  commission_override?: number;
  label?: string;
  start_hour?: number;
  end_hour?: number;
}

export interface DailyStreakConfig {
  enabled?: boolean;
  rewards?: number[];
}

export interface WinComboConfig {
  enabled?: boolean;
  required_wins?: number;
  bonus_amount?: number;
}

const DEFAULT_STREAK_REWARDS = [5, 5, 5, 10, 10, 15, 25];

/** Ethiopia local hour (UTC+3) */
export function getEthiopiaHour(date = new Date()): number {
  return (date.getUTCHours() + 3) % 24;
}

/** Today as YYYY-MM-DD in Ethiopia timezone */
export function getEthiopiaDateString(date = new Date()): string {
  const eth = new Date(date.getTime() + 3 * 60 * 60 * 1000);
  return eth.toISOString().slice(0, 10);
}

export function isHappyHourActive(config: HappyHourConfig | null | undefined, roomId?: string): boolean {
  if (!config?.enabled) return false;
  if (config.room_id && config.room_id !== 'all' && roomId && config.room_id !== roomId) return false;
  const hour = getEthiopiaHour();
  const start = typeof config.start_hour === 'number' ? config.start_hour : 18;
  const end = typeof config.end_hour === 'number' ? config.end_hour : 22;
  if (start <= end) return hour >= start && hour < end;
  return hour >= start || hour < end;
}

export function getEffectiveCommission(
  baseCommission: number,
  happyHour: HappyHourConfig | null | undefined,
  roomId?: string
): number {
  if (isHappyHourActive(happyHour, roomId) && typeof happyHour?.commission_override === 'number') {
    return happyHour.commission_override;
  }
  return baseCommission;
}

export function getStreakRewards(config: DailyStreakConfig | null | undefined): number[] {
  if (config?.rewards && Array.isArray(config.rewards) && config.rewards.length > 0) {
    return config.rewards.map(r => Number(r) || 0);
  }
  return DEFAULT_STREAK_REWARDS;
}

export function getStreakRewardForDay(streakDay: number, config: DailyStreakConfig | null | undefined): number {
  const rewards = getStreakRewards(config);
  const idx = Math.min(Math.max(streakDay, 1), rewards.length) - 1;
  return rewards[idx] ?? rewards[rewards.length - 1] ?? 5;
}

export function getComboConfig(config: WinComboConfig | null | undefined): { enabled: boolean; requiredWins: number; bonusAmount: number } {
  return {
    enabled: config?.enabled !== false,
    requiredWins: config?.required_wins ?? 3,
    bonusAmount: config?.bonus_amount ?? 10,
  };
}
