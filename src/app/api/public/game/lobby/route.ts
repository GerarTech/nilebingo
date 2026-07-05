import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper function to generate seeded BINGO card
function getSeededCard(cardNum: number, gameId: string): number[][] {
  const columns: number[][] = [];
  let gameSeed = 0;
  for (let i = 0; i < gameId.length; i++) {
    gameSeed = ((gameSeed * 31 + gameId.charCodeAt(i)) >>> 0);
  }
  const seed = ((cardNum * 7919 + gameSeed) >>> 0);

  for (let col = 0; col < 5; col++) {
    const min = [1, 16, 31, 46, 61][col];
    const max = [15, 30, 45, 60, 75][col];
    const nums = Array.from({ length: max - min + 1 }, (_, i) => min + i);
    
    // Seeded random generator
    let s = ((seed + col) >>> 0) % 2147483647;
    if (s <= 0) s = 1;
    const random = () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };

    const shuffled = [...nums];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      if (j >= 0 && j < shuffled.length) {
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
    }
    columns.push(shuffled.slice(0, 5));
  }
  const rows: number[][] = [];
  for (let row = 0; row < 5; row++) {
    const rowData: number[] = [];
    for (let col = 0; col < 5; col++) {
      rowData.push(row === 2 && col === 2 ? 0 : columns[col][row]);
    }
    rows.push(rowData);
  }
  return rows;
}

// Helper function to validate UUID
function isValidUUID(id: string | null | undefined): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

// Helper function to hash UUID to a unique negative card number (presence identifier)
function hashUUIDToInteger(uuid: string): number {
  let hash = 0;
  for (let i = 0; i < uuid.length; i++) {
    hash = (hash * 31 + uuid.charCodeAt(i)) & 0xffffffff;
  }
  return -((Math.abs(hash) % 900000) + 100000);
}

function getRoomPeriod(roomId: string): number {
  const periods: Record<string, number> = { bronze: 30, silver: 40, gold: 50, diamond: 60, premium: 75 };
  return periods[roomId] || 90;
}

function generateDeterministicGameId(roomId: string, cycle: number): string {
  let seed = 0;
  for (let i = 0; i < roomId.length; i++) seed = ((seed << 5) - seed) + roomId.charCodeAt(i);
  seed = ((seed << 5) - seed) + cycle;
  seed = seed & 0x7fffffff;
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    seed = (seed * 1664525 + 1013904223) & 0x7fffffff;
    result += chars[seed % chars.length];
  }
  return result;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get('gameId');
    const roomId = searchParams.get('roomId');
    const userId = searchParams.get('userId');

    if (!gameId && roomId) {
      const period = getRoomPeriod(roomId);
      const currentSec = Math.floor(Date.now() / 1000);
      const cycle = Math.floor(currentSec / period);
      const sharedGameId = generateDeterministicGameId(roomId, cycle);
      const remaining = period - (currentSec % period) || period;
      return NextResponse.json({
        success: true,
        gameId: sharedGameId,
        roomId,
        cycle,
        period,
        countdown: remaining,
        serverTime: new Date().toISOString(),
      });
    }

    if (!gameId) {
      return NextResponse.json({ error: 'gameId is required' }, { status: 400 });
    }

    // Clean up old reservations (>5 minutes old) to keep database tidy
    try {
      await supabase
        .from('game_card_reservations')
        .delete()
        .lt('created_at', new Date(Date.now() - 300000).toISOString());
    } catch (e) {
      console.warn('Failed to prune old reservations:', e);
    }

    // Auto-register user presence in lobby if userId is provided and valid
    if (userId && isValidUUID(userId)) {
      try {
        const presenceCardNumber = hashUUIDToInteger(userId);
        const { data: userCurrent } = await supabase
          .from('game_card_reservations')
          .select('card_number')
          .eq('game_code', gameId)
          .eq('user_id', userId);

        if (!userCurrent || userCurrent.length === 0) {
          // No reservation yet, insert the placeholder presence reservation
          await supabase
            .from('game_card_reservations')
            .insert({
              game_code: gameId,
              user_id: userId,
              card_number: presenceCardNumber,
            });
        }
      } catch (e) {
        console.warn('Failed to register presence on GET:', e);
      }
    }

    // Retrieve active reservations for the game
    const { data: reservations, error: resError } = await supabase
      .from('game_card_reservations')
      .select('card_number, user_id')
      .eq('game_code', gameId);

    if (resError) {
      console.error('Failed to select reservations:', resError);
      return NextResponse.json({ error: 'Failed to retrieve reservations' }, { status: 500 });
    }

    // Retrieve live player count for this game code from game_players table
    let livePlayerCount = 0;
    const { data: existingGame } = await supabase
      .from('games')
      .select('id')
      .eq('code', gameId)
      .maybeSingle();

    if (existingGame) {
      const { data: countData } = await supabase
        .from('game_players')
        .select('id')
        .eq('game_id', existingGame.id);
      const count = countData?.length || 0;
      livePlayerCount = count || 0;
    }

    return NextResponse.json({
      success: true,
      reservations: reservations || [],
      livePlayerCount,
    });
  } catch (err: any) {
    console.error('Lobby GET error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, gameId, userId, cardNumber, isSpectator, autoMark, selectedCards, stakeAmount } = body;

    if (!action) {
      return NextResponse.json({ error: 'action is required' }, { status: 400 });
    }

    if (action === 'toggle_card') {
      if (!gameId || !userId || !cardNumber) {
        return NextResponse.json({ error: 'gameId, userId, and cardNumber are required' }, { status: 400 });
      }

      // Check if user has already selected this card
      const { data: existing } = await supabase
        .from('game_card_reservations')
        .select('id')
        .eq('game_code', gameId)
        .eq('user_id', userId)
        .eq('card_number', cardNumber)
        .maybeSingle();

      if (existing) {
        // Delete reservation
        const { error: delError } = await supabase
          .from('game_card_reservations')
          .delete()
          .eq('game_code', gameId)
          .eq('user_id', userId)
          .eq('card_number', cardNumber);

        if (delError) {
          console.error('Failed to delete reservation:', delError);
          return NextResponse.json({ error: 'Failed to toggle card off' }, { status: 500 });
        }
        // Recompute prize pool after reservation removed
        try {
          // determine stake amount for this game
          const { data: g } = await supabase.from('games').select('stake_id').eq('code', gameId).maybeSingle();
          let stakeAmt = 0;
          if (g?.stake_id) {
            const { data: s } = await supabase.from('stakes').select('amount').eq('id', g.stake_id).maybeSingle();
            stakeAmt = Number(s?.amount) || 0;
          }
          await supabase.rpc('update_game_prize_pool', { p_game_code: gameId, p_stake_amt: stakeAmt });
        } catch (e) {
          console.warn('Prize pool update after delete failed:', e);
        }
      } else {
        // Limit to max 2 selected cards
        const { data: userCurrent } = await supabase
          .from('game_card_reservations')
          .select('card_number')
          .eq('game_code', gameId)
          .eq('user_id', userId);

        const currentActiveCount = (userCurrent || []).filter(r => r.card_number > 0).length;
        if (currentActiveCount >= 2) {
          return NextResponse.json({ error: 'Maximum of 2 cards allowed' }, { status: 400 });
        }

        // Try to insert new reservation
        const { error: insError } = await supabase
          .from('game_card_reservations')
          .insert({
            game_code: gameId,
            user_id: userId,
            card_number: cardNumber,
          });

        if (insError) {
          console.error('Failed to insert reservation:', insError);
          const errMsg = insError.message || '';
          if (errMsg.includes('unique') || insError.code === '23505') {
            return NextResponse.json({ error: 'This card was just taken by another player. Please choose a different one.' }, { status: 409 });
          }
          return NextResponse.json({ error: 'Failed to reserve card' }, { status: 500 });
        }
        // Recompute prize pool after reservation inserted
        try {
          const { data: g } = await supabase.from('games').select('stake_id').eq('code', gameId).maybeSingle();
          let stakeAmt = 0;
          if (g?.stake_id) {
            const { data: s } = await supabase.from('stakes').select('amount').eq('id', g.stake_id).maybeSingle();
            stakeAmt = Number(s?.amount) || 0;
          }
          await supabase.rpc('update_game_prize_pool', { p_game_code: gameId, p_stake_amt: stakeAmt });
        } catch (e) {
          console.warn('Prize pool update after insert failed:', e);
        }
      }

      // Get updated reservations
      const { data: reservations } = await supabase
        .from('game_card_reservations')
        .select('card_number, user_id')
        .eq('game_code', gameId);

      return NextResponse.json({
        success: true,
        reservations: reservations || [],
      });
    }

    if (action === 'watch_game') {
      if (!gameId || !userId) {
        return NextResponse.json({ error: 'gameId and userId are required' }, { status: 400 });
      }

      const specCardNumber = -(Math.floor(Date.now() / 1000) % 100000);
      await supabase
        .from('game_card_reservations')
        .insert({
          game_code: gameId,
          user_id: userId,
          card_number: specCardNumber,
        });

      return NextResponse.json({ success: true });
    }

    if (action === 'reserve_cards') {
      if (!gameId || !userId || !Array.isArray(selectedCards) || selectedCards.length === 0) {
        return NextResponse.json({ error: 'gameId, userId, and selectedCards array are required' }, { status: 400 });
      }
      // Check for conflicts — cards already reserved by OTHER users
      const { data: existing } = await supabase
        .from('game_card_reservations')
        .select('card_number, user_id')
        .eq('game_code', gameId)
        .in('card_number', selectedCards);
      const conflicts = (existing || []).filter((r: any) => r.user_id !== userId);
      if (conflicts.length > 0) {
        return NextResponse.json({
          error: 'Some selected cards are already taken',
          conflicts: conflicts.map((r: any) => r.card_number),
        }, { status: 409 });
      }
      // Bulk upsert reservations for this user
      const inserts = selectedCards.map((cardNum: number) =>
        supabase.from('game_card_reservations').upsert({
          game_code: gameId,
          user_id: userId,
          card_number: cardNum,
        }, { onConflict: 'game_code,user_id,card_number' })
      );
      await Promise.all(inserts);
      return NextResponse.json({ success: true });
    }

    if (action === 'leave_game') {
      if (!gameId || !userId) {
        return NextResponse.json({ error: 'gameId and userId are required' }, { status: 400 });
      }

      await supabase
        .from('game_card_reservations')
        .delete()
        .eq('game_code', gameId)
        .eq('user_id', userId);

      return NextResponse.json({ success: true });
    }

    if (action === 'register_game') {
      if (!gameId || !userId || !stakeAmount) {
        return NextResponse.json({ error: 'gameId, userId, and stakeAmount are required' }, { status: 400 });
      }

      // Reject registration for an already-finished game cycle
      const { data: existingFinished } = await supabase
        .from('games')
        .select('id')
        .eq('code', gameId)
        .eq('status', 'finished')
        .maybeSingle();

      if (existingFinished) {
        return NextResponse.json({ error: 'This game cycle has already finished. Please wait for the next round.' }, { status: 409 });
      }

      // Look up room-specific commission from bot_config
      let roomCommission: number | null = null;
      try {
        const { data: configData } = await supabase.from('bot_config').select('commands').eq('id', 'main').single();
        const config = configData?.commands || {};
        const rooms = Array.isArray(config.rooms) ? config.rooms : [];
        const matchingRoom = rooms.find((r: any) => Number(r.entry) === Number(stakeAmount));
        if (matchingRoom && typeof matchingRoom.commission === 'number') {
          roomCommission = matchingRoom.commission;
        }
      } catch {}

      let stakeId: string | null = null;
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
          .insert({ amount: stakeAmount, status: 'open' })
          .select('id')
          .single();
        if (newStake) stakeId = newStake.id;
      }

      let dbGameId: string;
      const { data: existingGame } = await supabase
        .from('games')
        .select('id, status')
        .eq('code', gameId)
        .maybeSingle();

      if (existingGame) {
        dbGameId = existingGame.id;
        if (existingGame.status !== 'active') {
          await supabase
            .from('games')
            .update({ status: 'active' })
            .eq('id', dbGameId);
        }
      } else {
        const gameInsert: any = {
          stake_id: stakeId,
          code: gameId,
          status: 'active',
          prize_pool: 0,
          called_count: 0,
          drawn_numbers: [],
        };
        if (roomCommission !== null) {
          gameInsert.commission = roomCommission;
        }
        const { data: newGame, error: err } = await supabase
          .from('games')
          .insert(gameInsert)
          .select('id')
          .single();

        if (err || !newGame) {
          console.error('Error creating game in registration:', err);
          return NextResponse.json({ error: 'Failed to create game session' }, { status: 500 });
        }
        dbGameId = newGame.id;
      }

      // Prepare cards to play
      const cardsToStore = selectedCards && selectedCards.length > 0
        ? selectedCards.map((num: number) => getSeededCard(num, gameId))
        : [];

      if (cardsToStore.length === 0) {
        // Fallback random card
        const colSeed: number[][] = [];
        const seed = Math.floor(Math.random() * 100000);
        for (let col = 0; col < 5; col++) {
          const min = [1, 16, 31, 46, 61][col];
          const max = [15, 30, 45, 60, 75][col];
          const nums = Array.from({ length: max - min + 1 }, (_, i) => min + i);
          let s = seed + col;
          const shuffled = [...nums];
          for (let i = shuffled.length - 1; i > 0; i--) {
            s = (s * 16807) % 2147483647;
            const j = Math.floor(((s - 1) / 2147483646) * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
          }
          colSeed.push(shuffled.slice(0, 5));
        }
        const rowsSeed: number[][] = [];
        for (let row = 0; row < 5; row++) {
          const rowData: number[] = [];
          for (let col = 0; col < 5; col++) {
            rowData.push(row === 2 && col === 2 ? 0 : colSeed[col][row]);
          }
          rowsSeed.push(rowData);
        }
        cardsToStore.push(rowsSeed);
      }

      // Upsert the game player
      for (let i = 0; i < Math.min(cardsToStore.length, 1); i++) {
        await supabase
          .from('game_players')
          .upsert({
            game_id: dbGameId,
            user_id: userId,
            card: cardsToStore[i],
            card_number: selectedCards ? selectedCards[i] || 0 : 0,
            is_watching: isSpectator || false,
            auto_mark: autoMark || false,
          }, { onConflict: 'game_id,user_id' });
      }

      // Ensure card reservations exist for this user's selected cards
      if (selectedCards && selectedCards.length > 0) {
        const existingRes = await supabase
          .from('game_card_reservations')
          .select('card_number')
          .eq('game_code', gameId)
          .eq('user_id', userId);
        const existingCards = new Set((existingRes.data || []).map((r: any) => r.card_number));
        const toInsert = selectedCards.filter((n: number) => !existingCards.has(n));
        for (const cardNum of toInsert) {
          await supabase.from('game_card_reservations').upsert({
            game_code: gameId,
            user_id: userId,
            card_number: cardNum,
          }, { onConflict: 'game_code,user_id,card_number' });
        }
      }

      // Update prize pool — commission is already stored on the game row (if set), so don't pass
      // it as a separate RPC param. The new RPC reads from games.commission; the old RPC reads
      // from bot_config. Skipping p_commission avoids parameter mismatch errors.
      try {
        await supabase.rpc('update_game_prize_pool', { p_game_code: gameId, p_stake_amt: stakeAmount });
      } catch (poolErr) {
        console.warn('Prize pool update failed:', poolErr);
      }

      return NextResponse.json({ success: true, dbGameId });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    console.error('Lobby POST error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
