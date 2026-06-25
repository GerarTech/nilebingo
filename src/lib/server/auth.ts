import { createHash, createHmac } from 'crypto';
import { supabase } from '../supabase';
import type { Profile } from '../types';

// Verify Telegram Mini App initData
export function verifyTelegramInitData(initData: string, botToken: string): boolean {
  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get('hash');
  
  if (!hash) return false;
  
  urlParams.delete('hash');
  
  // Sort parameters alphabetically
  const sortedParams = Array.from(urlParams.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  
  // Create HMAC-SHA256 hash
  const secretKey = createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest();
  
  const computedHash = createHmac('sha256', secretKey)
    .update(sortedParams)
    .digest('hex');
  
  return computedHash === hash;
}

// Parse initData to get user info
export function parseInitData(initData: string): {
  userId: number;
  username?: string;
  firstName?: string;
  photoUrl?: string;
} | null {
  try {
    const urlParams = new URLSearchParams(initData);
    const userStr = urlParams.get('user');
    
    if (!userStr) return null;
    
    const user = JSON.parse(decodeURIComponent(userStr));
    
    return {
      userId: user.id,
      username: user.username,
      firstName: user.first_name,
      photoUrl: user.photo_url,
    };
  } catch {
    return null;
  }
}

// Create or get user profile
export async function getOrCreateProfile(telegramId: string): Promise<Profile | null> {
  // Check if profile exists
  const { data: existing } = await supabase
    .from('profiles')
    .select('*')
    .eq('telegram_id', telegramId)
    .single();
  
  if (existing) return existing as Profile;
  
  // Create new profile
  const { data: newProfile, error } = await supabase
    .from('profiles')
    .insert({
      telegram_id: telegramId,
      language: 'en',
      sound_on: true,
      verified: false,
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error creating profile:', error);
    return null;
  }
  
  // Create wallet for new user
  await supabase.from('wallets').insert({
    user_id: (newProfile as any).id,
    main_balance: 0,
    play_balance: 0,
  });
  
  return newProfile as Profile;
}

// Get user wallet
export async function getWallet(userId: string) {
  const { data } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  return data;
}

// Update profile language
export async function updateLanguage(userId: string, language: 'en' | 'am') {
  const { error } = await supabase
    .from('profiles')
    .update({ language })
    .eq('id', userId);
  
  return !error;
}

// Update sound setting
export async function updateSoundSetting(userId: string, soundOn: boolean) {
  const { error } = await supabase
    .from('profiles')
    .update({ sound_on: soundOn })
    .eq('id', userId);
  
  return !error;
}