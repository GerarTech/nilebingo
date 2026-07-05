import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseServiceKey) throw new Error('Missing Supabase environment variables');
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code: providedCode, userId, stakeAmount, prizePool, outcome, drawnNumbers, roomName } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // 1. Locate a stake from database with matching amount, or create one if missing
    let stakeId: string | null = null;
    try {
      const { data: stakeData } = await supabase
        .from('stakes')
        .select('id')
        .eq('amount', stakeAmount)
        .limit(1);

      if (stakeData && stakeData.length > 0) {
        stakeId = stakeData[0].id;
      } else {
        const { data: newStake } = await supabase
          .from('stakes')
          .insert({
            amount: stakeAmount,
            status: 'open',
            lobby_open_until: new Date(Date.now() + 3600000).toISOString()
          })
          .select()
          .single();
        if (newStake) {
          stakeId = newStake.id;
        }
      }
    } catch (e) {
      console.error('Error finding/creating stake record:', e);
    }

    const isWin = outcome === 'win';

    // 2. Use existing game if code is provided, otherwise create a new one
    let game;
    let code = providedCode;

    if (providedCode) {
      const { data: existing } = await supabase
        .from('games')
        .select('id')
        .eq('code', providedCode)
        .maybeSingle();

      if (existing) {
        const { data: updated, error: updateError } = await supabase
          .from('games')
          .update({
            status: 'finished',
            drawn_numbers: Array.isArray(drawnNumbers) ? drawnNumbers : [],
            current_number: Array.isArray(drawnNumbers) && drawnNumbers.length > 0 ? drawnNumbers[drawnNumbers.length - 1] : null,
            prize_pool: Number(prizePool) || 0,
            called_count: Array.isArray(drawnNumbers) ? drawnNumbers.length : 0,
            winner_id: isWin ? userId : null,
          })
          .eq('id', existing.id)
          .select()
          .single();
        game = updated;
      } else {
        code = providedCode;
      }
    }

    if (!game) {
      if (!code) {
        code = 'BG-' + Math.floor(100000 + Math.random() * 900000);
      }
      const { data: created, error: createError } = await supabase
        .from('games')
        .insert({
          stake_id: stakeId,
          code,
          status: 'finished',
          drawn_numbers: Array.isArray(drawnNumbers) ? drawnNumbers : [],
          current_number: Array.isArray(drawnNumbers) && drawnNumbers.length > 0 ? drawnNumbers[drawnNumbers.length - 1] : null,
          prize_pool: Number(prizePool) || 0,
          called_count: Array.isArray(drawnNumbers) ? drawnNumbers.length : 0,
          winner_id: isWin ? userId : null,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        throw createError;
      }
      game = created;
    }

    // 3. Send notification for wins only
    if (game && isWin) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, username, phone')
          .eq('id', userId)
          .single();

        const playerName = profile?.first_name || 'Player';
        const identifier = profile?.username
          ? `@${profile.username}`
          : profile?.phone
            ? profile.phone
            : '';

        const { data: totalPlayersData } = await supabase
          .from('game_players')
          .select('id')
          .eq('game_id', game.id);
        const totalPlayers = totalPlayersData?.length || 0;

        const totalPlayersCount = totalPlayers || 1;
        const commissionWon = Math.max(0, (Number(stakeAmount) * totalPlayersCount) - Number(prizePool));

        const text = `🏆 *BINGO WINNER*\n\n` +
                     `🎫 Game: \`${code}\`\n` +
                     `👤 *Player:* ${playerName}${identifier ? ` (${identifier})` : ''}\n` +
                     `🏠 *Room:* ${roomName || 'Quick Lobby'}\n` +
                     `👥 *Total Players:* ${totalPlayersCount}\n` +
                     `💰 *Stake:* ${stakeAmount} ETB\n` +
                     `🏆 *Prize Pool:* ${Number(prizePool).toLocaleString()} ETB\n` +
                     `💵 *Commission Won:* ${commissionWon.toLocaleString()} ETB\n` +
                     `🔢 *Called Numbers:* ${Array.isArray(drawnNumbers) ? drawnNumbers.length : 0}\n` +
                     `⏱️ *Date:* ${new Date().toLocaleString()}`;

        const { notifyEvent } = await import('@/lib/server/admin');
        notifyEvent('game_winner', text);
      } catch (tgErr) {
        console.error('Error sending game winner notification:', tgErr);
      }
    }

    return NextResponse.json({ success: true, gameId: game?.id, code });
  } catch (error: any) {
    console.error('Error recording game match:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
