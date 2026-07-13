import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const { telegramId, firstName, username } = await request.json();

    if (!telegramId) {
      return NextResponse.json({ error: 'telegramId is required' }, { status: 400 });
    }

    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('telegram_id', telegramId)
      .maybeSingle();

    let profile = existingProfile;

    if (!profile) {
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          telegram_id: telegramId,
          first_name: firstName || 'Player',
          username: username || 'Player',
          language: 'en',
          verified: false,
        })
        .select()
        .single();

      if (createError) {
        console.error('Init profile creation error:', createError);
        return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 });
      }

      if (newProfile) {
        profile = newProfile;
        await supabase.from('wallets').insert({
          user_id: profile.id,
          main_balance: 0,
          play_balance: 0,
        });
      }
    } else {
      const updates: Record<string, string> = {};
      // Only update username, never overwrite first_name on init — name is user-controlled via profile tab
      if (username && profile.username !== username) updates.username = username;
      if (Object.keys(updates).length > 0) {
        const { data: updatedProfile } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', profile.id)
          .select()
          .single();
        if (updatedProfile) profile = updatedProfile;
      }
    }

    let wallet = null;
    if (profile) {
      const { data: walletData } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', profile.id)
        .maybeSingle();
      wallet = walletData;

      if (!wallet) {
        const { data: newWallet } = await supabase
          .from('wallets')
          .insert({ user_id: profile.id, main_balance: 0, play_balance: 0 })
          .select()
          .single();
        wallet = newWallet;
      }
    }

    return NextResponse.json({ profile, wallet });
  } catch (error) {
    console.error('Init API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { userId, language, avatar, firstName } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const updates: Record<string, string> = {};
    if (language) updates.language = language;
    if (avatar) updates.photo_url = avatar;
    if (firstName) updates.first_name = firstName;

    if (Object.keys(updates).length > 0) {
      const { data: profile, error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (updateError) {
        console.error('Init PATCH error:', updateError);
        return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
      }

      return NextResponse.json({ profile });
    }

    return NextResponse.json({ profile: null });
  } catch (error) {
    console.error('Init PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
