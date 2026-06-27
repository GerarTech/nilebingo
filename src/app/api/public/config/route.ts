import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  try {
    const { data } = await supabase
      .from('bot_config')
      .select('commands')
      .eq('id', 'main')
      .single();

    const config = data?.commands || {};
    
    // Provide sensible fallbacks for commission, rooms, and branding
    const commission = typeof config.commission === 'number' ? config.commission : 10;
    const appName = config.appName || 'Nile BINGO';
    const appLogo = config.appLogo || '🎰';
    const appLogoPng = config.appLogoPng || null;
    const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'yenedating_bot';
    const colorScheme = config.colorScheme || 'gold';
    const referralEnabled = config.referralEnabled !== false;
    const referralBonus = typeof config.referralBonus === 'number' ? config.referralBonus : 1;
    const rooms = Array.isArray(config.rooms) ? config.rooms : [
      { id: 'bronze', name: 'Bronze Room', entry: 10, players: 10, maxPlayers: 100 },
      { id: 'silver', name: 'Silver Room', entry: 20, players: 12, maxPlayers: 100 },
      { id: 'gold', name: 'Gold Room', entry: 50, players: 15, maxPlayers: 100 },
      { id: 'diamond', name: 'Diamond Room', entry: 100, players: 20, maxPlayers: 100 },
      { id: 'premium', name: 'Premium Room', entry: 200, players: 5, maxPlayers: 100 },
      { id: 'vip', name: 'VIP Room', entry: 500, players: 2, maxPlayers: 100 }
    ];

    return NextResponse.json({ commission, rooms, appName, appLogo, appLogoPng, botUsername, colorScheme, referralEnabled, referralBonus }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0'
      }
    });
  } catch (error) {
    console.error('Error fetching public config:', error);
    return NextResponse.json({ 
      commission: 10, 
      appName: 'Nile BINGO',
      appLogo: '🎰',
      appLogoPng: null,
      colorScheme: 'gold',
      referralEnabled: true,
      referralBonus: 1,
      rooms: [
        { id: 'bronze', name: 'Bronze Room', entry: 10, players: 10, maxPlayers: 100 },
        { id: 'silver', name: 'Silver Room', entry: 20, players: 12, maxPlayers: 100 },
        { id: 'gold', name: 'Gold Room', entry: 50, players: 15, maxPlayers: 100 },
        { id: 'diamond', name: 'Diamond Room', entry: 100, players: 20, maxPlayers: 100 },
        { id: 'premium', name: 'Premium Room', entry: 200, players: 5, maxPlayers: 100 },
        { id: 'vip', name: 'VIP Room', entry: 500, players: 2, maxPlayers: 100 }
      ]
    });
  }
}
