import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSeededCard } from '@/lib/server/bingo';
import { getEffectiveCommission, type HappyHourConfig } from '@/lib/server/promotions';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

function getRoomPeriod(_roomId: string): number {
  return 45;
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

      // Check if any game with the same stake is already active (one-at-a-time per stake)
      let gameLocked = false;
      let activeGameCode: string | null = null;
      try {
        // Look up the room's entry amount from bot_config
        const { data: configData } = await supabase.from('bot_config').select('commands').eq('id', 'main').single();
        const config = configData?.commands || {};
        const rooms = Array.isArray(config.rooms) ? config.rooms : [];
        const matchingRoom = rooms.find((r: any) => r.id === roomId);
        if (matchingRoom && typeof matchingRoom.entry === 'number') {
          const entryAmount = Number(matchingRoom.entry);
          // Find the stake ID for this entry amount
          const { data: stakeData } = await supabase
            .from('stakes')
            .select('id')
            .eq('amount', entryAmount)
            .limit(1);
          if (stakeData && stakeData.length > 0) {
            // Check if there's an active game with this stake
            const { data: activeGame } = await supabase
              .from('games')
              .select('code')
              .eq('stake_id', stakeData[0].id)
              .eq('status', 'active')
              .limit(1)
              .maybeSingle();
            if (activeGame) {
              gameLocked = true;
              activeGameCode = activeGame.code;
            }
          }
        }
      } catch (e) {
        console.warn('Failed to check stake lock:', e);
      }

      // If stake is locked, return the active game's code so clients see the locked game
      const returnGameId = gameLocked && activeGameCode ? activeGameCode : sharedGameId;

      return NextResponse.json({
        success: true,
        gameId: returnGameId,
        roomId,
        cycle,
        period,
        countdown: remaining,
        gameLocked,
        serverTime: new Date().toISOString(),
      });
    }

    if (!gameId) {
      return NextResponse.json({ error: 'gameId is required' }, { status: 400 });
    }

    // Clean up old reservations only for FINISHED games to keep database tidy
    // Never delete reservations for lobby/active games as they are needed for Total Bet display
    try {
      const { data: finishedGameCodes } = await supabase
        .from('games')
        .select('code')
        .eq('status', 'finished');
      if (finishedGameCodes && finishedGameCodes.length > 0) {
        const codes = finishedGameCodes.map((g: any) => g.code);
        await supabase
          .from('game_card_reservations')
          .delete()
          .in('game_code', codes)
          .lt('created_at', new Date(Date.now() - 300000).toISOString());
      }
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
        // Limit to max 5 selected cards
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

      // Reject if another game with the same stake is already active (one-at-a-time per stake)
      try {
        const { data: currentGame } = await supabase
          .from('games')
          .select('stake_id')
          .eq('code', gameId)
          .maybeSingle();
        if (currentGame?.stake_id) {
          const { data: activeConflict } = await supabase
            .from('games')
            .select('id, code')
            .eq('stake_id', currentGame.stake_id)
            .eq('status', 'active')
            .neq('code', gameId)
            .limit(1)
            .maybeSingle();
          if (activeConflict) {
            return NextResponse.json({ error: 'Another game with the same stake is already in progress. Please wait for it to finish.' }, { status: 409 });
          }
        }
      } catch (e) {
        console.warn('Stake lock check in reserve_cards failed:', e);
      }

      // Verify ALL selected cards are not taken by OTHER users
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
      // Insert any selected cards that aren't yet reserved (e.g. if toggle_card ran but reservation expired)
      // Using insert (not upsert) so a conflict with another user's reservation is rejected, not overwritten.
      const existingCards = new Set((existing || []).map((r: any) => r.card_number));
      for (const cardNum of selectedCards) {
        if (!existingCards.has(cardNum)) {
          const { error } = await supabase.from('game_card_reservations').insert({
            game_code: gameId,
            user_id: userId,
            card_number: cardNum,
          });
          if (error && error.code === '23505') {
            return NextResponse.json({
              error: `Card ${cardNum} was just taken by another player. Please choose a different one.`,
            }, { status: 409 });
          }
        }
      }
      return NextResponse.json({ success: true });
    }

    if (action === 'finish_game') {
      const gameCode = body.gameCode || gameId;
      if (!gameCode) {
        return NextResponse.json({ error: 'gameCode is required' }, { status: 400 });
      }
      const finishUpdate: any = { status: 'finished' };
      if (body.winnerId && isValidUUID(body.winnerId)) {
        finishUpdate.winner_id = body.winnerId;
      }
      await supabase
        .from('games')
        .update(finishUpdate)
        .eq('code', gameCode)
        .eq('status', 'active');
      await supabase
        .from('game_card_reservations')
        .delete()
        .eq('game_code', gameCode);
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

    if (action === 'finish_stale') {
      const staleMinutes = body.staleMinutes || 10;
      const cutoff = new Date(Date.now() - staleMinutes * 60 * 1000).toISOString();
      const { data: staleGames } = await supabase
        .from('games')
        .select('id, code')
        .eq('status', 'active')
        .lt('created_at', cutoff);
      if (staleGames && staleGames.length > 0) {
        const codes = staleGames.map((g: any) => g.code);
        const ids = staleGames.map((g: any) => g.id);
        await supabase.from('games').update({ status: 'finished' }).in('id', ids);
        await supabase.from('game_card_reservations').delete().in('game_code', codes);
        return NextResponse.json({ success: true, finished: staleGames.length });
      }
      return NextResponse.json({ success: true, finished: 0 });
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

      // Reject registration if another game with the same stake is already active (one-at-a-time per stake)
      try {
        const { data: currentGame } = await supabase
          .from('games')
          .select('stake_id')
          .eq('code', gameId)
          .maybeSingle();
        if (currentGame?.stake_id) {
          const { data: activeConflict } = await supabase
            .from('games')
            .select('id, code')
            .eq('stake_id', currentGame.stake_id)
            .eq('status', 'active')
            .neq('code', gameId)
            .limit(1)
            .maybeSingle();
          if (activeConflict) {
            return NextResponse.json({ error: 'Another game with the same stake is already in progress. Please wait for it to finish.' }, { status: 409 });
          }
        }
      } catch (e) {
        console.warn('Stake lock check failed:', e);
      }

      // Look up room-specific commission from bot_config
      let roomCommission: number | null = null;
      let effectiveCommission = 15;
      try {
        const { data: configData } = await supabase.from('bot_config').select('commands').eq('id', 'main').single();
        const config = configData?.commands || {};
        if (typeof config.commission === 'number') effectiveCommission = config.commission;
        const rooms = Array.isArray(config.rooms) ? config.rooms : [];
        const matchingRoom = rooms.find((r: any) => Number(r.entry) === Number(stakeAmount));
        if (matchingRoom && typeof matchingRoom.commission === 'number') {
          roomCommission = matchingRoom.commission;
          effectiveCommission = matchingRoom.commission;
        }
        // Apply Happy Hour commission override if active
        const hhConfig = config.happy_hour as HappyHourConfig | undefined;
        if (hhConfig?.enabled) {
          const roomId = matchingRoom?.name?.toLowerCase() || 'all';
          effectiveCommission = getEffectiveCommission(effectiveCommission, hhConfig, roomId);
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
          gameInsert.commission = effectiveCommission;
        }
        const { data: newGame, error: err } = await supabase
          .from('games')
          .insert(gameInsert)
          .select('id')
          .maybeSingle();

        if (err) {
          if (err.code === '23505') {
            // Unique violation — another request inserted the same code between our SELECT and INSERT.
            // Fetch the existing row atomically.
            const { data: existing } = await supabase
              .from('games')
              .select('id, status')
              .eq('code', gameId)
              .maybeSingle();
            if (!existing) {
              return NextResponse.json({ error: 'Failed to create game session' }, { status: 500 });
            }
            dbGameId = existing.id;
          } else {
            console.error('Error creating game in registration:', err);
            return NextResponse.json({ error: 'Failed to create game session' }, { status: 500 });
          }
        } else if (!newGame) {
          return NextResponse.json({ error: 'Failed to create game session' }, { status: 500 });
        } else {
          dbGameId = newGame.id;
        }
      }

      // Prepare cards to play
      const cardsToStore = selectedCards && selectedCards.length > 0
        ? selectedCards.map((num: number) => getSeededCard(num))
        : [];

      if (cardsToStore.length === 0) {
        const fallbackNum = Math.floor(Math.random() * 300) + 1;
        cardsToStore.push(getSeededCard(fallbackNum));
      }

      // Upsert the game player with all selected cards
      // Store first card as primary, all cards available in the player's selectedCards
      for (let i = 0; i < Math.min(cardsToStore.length, 5); i++) {
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

      // Ensure card reservations exist for this user's selected cards.
      // Cards were already reserved via toggle_card; this is a safety check.
      // Use insert so a conflict with another user's reservation is rejected, not silently overwritten.
      if (selectedCards && selectedCards.length > 0) {
        const existingRes = await supabase
          .from('game_card_reservations')
          .select('card_number')
          .eq('game_code', gameId)
          .eq('user_id', userId);
        const existingCards = new Set((existingRes.data || []).map((r: any) => r.card_number));
        const toInsert = selectedCards.filter((n: number) => !existingCards.has(n));
        for (const cardNum of toInsert) {
          const { error } = await supabase.from('game_card_reservations').insert({
            game_code: gameId,
            user_id: userId,
            card_number: cardNum,
          });
          if (error && error.code === '23505') {
            // Another user claimed this card between our check and insert
            console.warn(`Card ${cardNum} already taken by another user during register_game`);
          }
        }
      }

      // Update prize pool — p_stake_amt is the PER-CARD entry fee (already correct, stakeAmount is per card).
      // Formula: p_stake_amt * total_cards * (1 - commission/100)
      try {
        await supabase.rpc('update_game_prize_pool', { p_game_code: gameId, p_stake_amt: stakeAmount, p_commission: effectiveCommission });
      } catch (poolErr) {
        console.warn('Prize pool update failed:', poolErr);
      }

      // Deduct stake from player's wallet server-side (play_balance first, then main_balance)
      // Total deduction = per-card stake × number of cards
      if (!isSpectator) {
        const cardCount = cardsToStore.length || 1;
        const totalDeduction = stakeAmount * cardCount;
        try {
          const { data: wallet } = await supabase
            .from('wallets')
            .select('play_balance, main_balance')
            .eq('user_id', userId)
            .maybeSingle();
          if (wallet) {
            const playBal = Number(wallet.play_balance) || 0;
            if (playBal >= totalDeduction) {
              await supabase.rpc('adjust_play_balance', { p_user_id: userId, p_amount: -totalDeduction });
            } else {
              if (playBal > 0) {
                await supabase.rpc('adjust_play_balance', { p_user_id: userId, p_amount: -playBal });
              }
              const remaining = totalDeduction - playBal;
              if (remaining > 0) {
                await supabase.rpc('adjust_main_balance', { p_user_id: userId, p_amount: -remaining });
              }
            }
          }
        } catch (deductionErr) {
          console.warn('Server-side stake deduction failed:', deductionErr);
        }
      }

      return NextResponse.json({ success: true, dbGameId });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    console.error('Lobby POST error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
