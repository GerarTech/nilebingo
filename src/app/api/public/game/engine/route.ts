import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSeededCard } from '@/lib/server/bingo';
import { getEffectiveCommission, getComboConfig, type HappyHourConfig, type WinComboConfig } from '@/lib/server/promotions';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseServiceKey) throw new Error('Missing Supabase environment variables');
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const TG_API = (botToken: string) => `https://api.telegram.org/bot${botToken}`;

async function tgSend(botToken: string, chatId: string | number, text: string, parseMode = 'Markdown') {
  try {
    await fetch(`${TG_API(botToken)}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: parseMode }),
      signal: AbortSignal.timeout(10000),
    });
  } catch (err) {
    console.error('tgSend error:', err);
  }
}

async function sendGameStats(botToken: string, gameId: string) {
  try {
    const { data: game } = await supabase.from('games').select('*, winner:profiles(first_name, username)').eq('id', gameId).single();
    if (!game) return;

    const { data: players } = await supabase.from('game_players').select('*, profiles(first_name, username)').eq('game_id', gameId);
    const playerCount = players ? players.filter((p: any) => !p.is_watching).length : 0;
    const winnerName = game.winner?.first_name || game.winner?.username || 'N/A';
    const prize = Number(game.prize_pool || 0);
    const drawnCount = (game.drawn_numbers || []).length;

    let commission = 0;
    let totalBet = 0;
    // Calculate commission earned from prize pool and rate
    // commission = prize * rate / (100 - rate)  i.e., prize_pool = stake * cards * (1 - rate/100)
    const rate = Number(game.commission ?? 15);
    commission = prize * rate / (100 - rate);
    if (commission <= 0 && game.stake_id) {
      // Fallback: read from revenue - prize
      const { data: stake } = await supabase.from('stakes').select('amount').eq('id', game.stake_id).single();
      if (stake) {
        const { data: cardsData } = await supabase.from('game_card_reservations').select('id').eq('game_code', game.code).gt('card_number', 0);
        const totalCards = Math.max(cardsData?.length || 0, playerCount, 1);
        commission = Math.max(0, (Number(stake.amount) * totalCards) - prize);
      }
    }
    // Calculate exact total amount betted (stake per card × total cards)
    if (game.stake_id) {
      const { data: st } = await supabase.from('stakes').select('amount').eq('id', game.stake_id).maybeSingle();
      if (st) {
        const { data: cd } = await supabase.from('game_card_reservations').select('id').eq('game_code', game.code).gt('card_number', 0);
        totalBet = Number(st.amount) * Math.max(cd?.length || 0, 1);
      }
    }
    if (totalBet <= 0) totalBet = prize + commission;

    let statsMsg = `*🏁 GAME FINISHED*\n\n`;
    statsMsg += `🆔 Game ID: \`${game.code}\`\n`;
    statsMsg += `👥 Players: ${playerCount}\n`;
    statsMsg += `💸 Total Bet: ${totalBet.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB\n`;
    statsMsg += `💰 Prize Pool: ${prize.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB\n`;
    statsMsg += `💵 Commission: ${commission.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB\n`;
    statsMsg += `🎱 Numbers Drawn: ${drawnCount}/75\n`;
    statsMsg += `🏆 Winner: ${winnerName}\n`;

    if (game.winner_id && players) {
      const winnerPlayer = players.find((p: any) => p.user_id === game.winner_id);
      if (winnerPlayer?.card) {
        const cardNums = winnerPlayer.card.flat().filter((n: number) => n > 0).slice(0, 5).join(', ');
        statsMsg += `🎴 Winning Card (sample): ${cardNums}...\n`;
      }
    }

    if (players) {
      const names = players.filter((p: any) => !p.is_watching).map((p: any) => p.profiles?.first_name || 'Player').join(', ');
      statsMsg += `\nParticipants: ${names || 'None'}`;
    }

    const adminChatIdEnv = process.env.ADMIN_CHAT_ID || '';
    if (adminChatIdEnv) {
      await tgSend(botToken, adminChatIdEnv, statsMsg, 'Markdown');
    }
    // Notification handled by record route — remove duplicate
  } catch (e) {
    console.error('sendGameStats error:', e);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, gameId, userId, cardNumbers } = body;

    if (!action) {
      return NextResponse.json({ error: 'action is required' }, { status: 400 });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN || '';

    if (action === 'draw') {
      if (!gameId) {
        return NextResponse.json({ error: 'gameId is required' }, { status: 400 });
      }

      // Look up game by code (gameId from client is the code, not UUID)
      const { data: game, error: gameError } = await supabase
        .from('games')
        .select('*')
        .eq('code', gameId)
        .maybeSingle();

      if (gameError || !game) {
        return NextResponse.json({ error: 'Game not found' }, { status: 404 });
      }

      if (game.status !== 'active') {
        return NextResponse.json({ error: 'Game is not active' }, { status: 400 });
      }

      const drawnNumbers: number[] = game.drawn_numbers || [];

      // Generate deterministic sequence from game code (unique per game)
      let seed = 0;
      for (let i = 0; i < gameId.length; i++) seed = ((seed << 5) - seed + gameId.charCodeAt(i)) | 0;
      if (seed === 0) seed = 12345;
      const rand = () => { seed = (seed * 1664525 + 1013904223) & 0xffffffff; return (seed >>> 0) / 0xffffffff; };
      const allBallsSorted = Array.from({ length: 75 }, (_, i) => i + 1);
      const seq: number[] = [];
      const pool = [...allBallsSorted];
      while (pool.length > 0) { const idx = Math.floor(rand() * pool.length); seq.push(pool.splice(idx, 1)[0]); }

      const remaining = seq.filter(n => !drawnNumbers.includes(n));

      if (remaining.length === 0) {
        return NextResponse.json({ error: 'All numbers drawn' }, { status: 400 });
      }

      const nextNumber = remaining[0];
      const newDrawnNumbers = [...drawnNumbers, nextNumber];

      const { data: updatedGame, error: updateError } = await supabase
        .from('games')
        .update({
          drawn_numbers: newDrawnNumbers,
          current_number: nextNumber,
          called_count: newDrawnNumbers.length,
        })
        .eq('id', game.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating game draws:', updateError);
        return NextResponse.json({ error: 'Failed to update game' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        number: nextNumber,
        drawnNumbers: newDrawnNumbers,
        game: updatedGame,
      });
    }

    if (action === 'validate_win') {
      if (!gameId || !userId) {
        return NextResponse.json({ error: 'gameId and userId are required' }, { status: 400 });
      }

      const isAppointed = body.isAppointed === true;
      const finalizeRequested = body.finalize === true;

      // Look up game by code (gameId from client is the code, not UUID)
      const { data: allGamesByCode } = await supabase
        .from('games')
        .select('id, status, prize_pool, code, winner_id, stake_id, winners, winner_collect_until')
        .eq('code', gameId);

      if (!allGamesByCode || allGamesByCode.length === 0) {
        return NextResponse.json({ error: 'Game not found' }, { status: 404 });
      }

      let gameByCode = allGamesByCode[0];
      if (allGamesByCode.length > 1) {
        const gameIds = allGamesByCode.map(g => g.id);
        const { data: userGame } = await supabase
          .from('game_players')
          .select('game_id')
          .eq('user_id', userId)
          .in('game_id', gameIds)
          .maybeSingle();
        if (userGame) {
          const found = allGamesByCode.find(g => g.id === userGame.game_id);
          if (found) gameByCode = found;
        }
      }

      // Fetch commission
      let effectiveCommission: number | null = null;
      try {
        const { data: commRow } = await supabase
          .from('games')
          .select('commission')
          .eq('id', gameByCode.id)
          .maybeSingle();
        if (commRow && typeof (commRow as any).commission === 'number') {
          effectiveCommission = (commRow as any).commission;
        }
      } catch {}
      if (effectiveCommission === null) {
        try {
          const { data: cfg } = await supabase.from('bot_config').select('commands').eq('id', 'main').single();
          effectiveCommission = cfg?.commands?.commission ?? 15;
        } catch {
          effectiveCommission = 15;
        }
      }

      // If game already finished and NOT a finalize request, return winner info
      // If finalize IS requested, allow it to proceed so prize can still be credited
      if (gameByCode.status === 'finished' && !finalizeRequested) {
        const gameWinners: any[] = (gameByCode as any).winners || [];
        const firstWinner = gameWinners[0];
        const winnerId = gameByCode.winner_id || firstWinner?.user_id;
        let winnerName: string | null = null;
        if (winnerId) {
          const { data: wp } = await supabase.from('profiles').select('first_name, username').eq('id', winnerId).maybeSingle();
          winnerName = wp?.first_name || wp?.username || null;
        }
        return NextResponse.json({
          win: false,
          error: 'Game already finished',
          winner_id: winnerId,
          winner_name: winnerName,
          winners: gameWinners,
        }, { status: 400 });
      }

      // Get the player's card
      const { data: gamePlayer } = await supabase
        .from('game_players')
        .select('card, is_watching')
        .eq('game_id', gameByCode.id)
        .eq('user_id', userId)
        .maybeSingle();

      // During finalize, be more lenient — if player record is missing (e.g. race with leave_game),
      // fall back to the card already stored in the winners list from the initial call
      let card: number[][] = [];
      if (gamePlayer) {
        if (gamePlayer.is_watching) {
          return NextResponse.json({ error: 'Spectators cannot win' }, { status: 400 });
        }
        card = gamePlayer.card || [];
      } else if (finalizeRequested) {
        const recordedWinner = ((gameByCode as any).winners || []).find((w: any) => w.user_id === userId);
        if (recordedWinner?.card) {
          card = recordedWinner.card;
        } else {
          return NextResponse.json({ error: 'Player not found in this game' }, { status: 404 });
        }
      } else {
        return NextResponse.json({ error: 'Player not found in this game' }, { status: 404 });
      }

      // Accept drawn numbers from client or fall back to DB
      const clientDrawn: number[] | undefined = body.drawnNumbers;
      let drawnNumbers: number[] = [];
      if (clientDrawn && Array.isArray(clientDrawn) && clientDrawn.length > 0) {
        drawnNumbers = clientDrawn;
        await supabase.from('games').update({ drawn_numbers: clientDrawn }).eq('id', gameByCode.id);
      } else {
        const { data: gameData } = await supabase.from('games').select('drawn_numbers').eq('id', gameByCode.id).single();
        drawnNumbers = gameData?.drawn_numbers || [];
      }
      if (!card || card.length === 0) {
        return NextResponse.json({ error: 'No card found' }, { status: 400 });
      }

      // Skip pattern validation for appointed wins and for finalize requests
      // (the initial validate_win call already confirmed the pattern — re-validating
      //  during finalize can fail if drawn numbers state diverged slightly)
      if (!isAppointed && !finalizeRequested) {
        let hasWin = false;
        for (let row = 0; row < card.length; row++) {
          let complete = true;
          for (let col = 0; col < card[row].length; col++) {
            const cell = card[row][col];
            if (cell === 0) continue;
            if (!drawnNumbers.includes(cell)) { complete = false; break; }
          }
          if (complete) { hasWin = true; break; }
        }
        if (!hasWin) {
          for (let col = 0; col < 5; col++) {
            let complete = true;
            for (let row = 0; row < card.length; row++) {
              const cell = card[row]?.[col];
              if (cell === 0) continue;
              if (cell === undefined || !drawnNumbers.includes(cell)) { complete = false; break; }
            }
            if (complete) { hasWin = true; break; }
          }
        }
        if (!hasWin) {
          let complete = true;
          for (let i = 0; i < 5; i++) {
            const cell = card[i]?.[i];
            if (cell === 0) continue;
            if (cell === undefined || !drawnNumbers.includes(cell)) { complete = false; break; }
          }
          if (complete) hasWin = true;
        }
        if (!hasWin) {
          let complete = true;
          for (let i = 0; i < 5; i++) {
            const cell = card[i]?.[4 - i];
            if (cell === 0) continue;
            if (cell === undefined || !drawnNumbers.includes(cell)) { complete = false; break; }
          }
          if (complete) hasWin = true;
        }
        if (!hasWin) {
          return NextResponse.json({ win: false, error: 'No winning pattern found' }, { status: 400 });
        }
      }

      // Calculate prize pool
      const { data: stakeRow } = await supabase.from('stakes').select('amount').eq('id', gameByCode.stake_id).maybeSingle();
      const perCardStake = Number(stakeRow?.amount) || 10;
      const { data: cardCountData } = await supabase.from('game_card_reservations').select('id').eq('game_code', gameByCode.code).gt('card_number', 0);
      const totalCardCount = Math.max(cardCountData?.length || 1, 1);
      const totalBet = perCardStake * totalCardCount;

      // Apply Happy Hour commission override if active
      try {
        const { data: hhCfg } = await supabase.from('bot_config').select('commands').eq('id', 'main').single();
        const hhConfig = hhCfg?.commands?.happy_hour as HappyHourConfig | undefined;
        if (hhConfig?.enabled) {
          const rooms = Array.isArray(hhCfg?.commands?.rooms) ? hhCfg.commands.rooms : [];
          const matchingRoom = rooms.find((r: any) => Number(r.entry) === Number(perCardStake));
          const roomId = matchingRoom?.name?.toLowerCase() || 'all';
          effectiveCommission = getEffectiveCommission(effectiveCommission ?? 15, hhConfig, roomId);
        }
      } catch {}

      try {
        await supabase.rpc('update_game_prize_pool', { p_game_code: gameByCode.code, p_stake_amt: perCardStake, p_commission: effectiveCommission ?? 15 });
      } catch {
        try { await supabase.rpc('update_game_prize_pool', { p_game_code: gameByCode.code, p_stake_amt: perCardStake }); } catch {}
      }
      const { data: freshGame } = await supabase.from('games').select('prize_pool').eq('id', gameByCode.id).maybeSingle();
      const winAmount = Number(freshGame?.prize_pool) || (totalBet * (1 - (effectiveCommission ?? 15) / 100));

      // ------- MULTI-WINNER LOGIC -------
      const existingWinners: any[] = (gameByCode as any).winners || [];
      const isAlreadyWinner = existingWinners.some((w: any) => w.user_id === userId);

      if (!isAlreadyWinner) {
        const { data: profile } = await supabase.from('profiles').select('first_name, username').eq('id', userId).single();
        const winnerEntry = {
          user_id: userId,
          name: profile?.first_name || profile?.username || 'Player',
          card: card,
          won_at: new Date().toISOString(),
        };
        existingWinners.push(winnerEntry);
      }

      const winnerCollectUntil = (gameByCode as any).winner_collect_until;
      const now = new Date();
      const collectionExpired = winnerCollectUntil && now >= new Date(winnerCollectUntil);
      const shouldFinalize = finalizeRequested || (existingWinners.length > 0 && collectionExpired);

      if (shouldFinalize) {
        // If game is already finished, check if prize was already credited to avoid double-paying
        if (gameByCode.status === 'finished') {
          const { data: existingTx } = await supabase
            .from('transactions')
            .select('id')
            .eq('type', 'win')
            .like('reference', `WIN-${gameId}`)
            .limit(1);
          if (existingTx && existingTx.length > 0) {
            // Prize already credited — just return the existing winner info
            return NextResponse.json({
              success: true,
              win: false,
              error: 'Game already finished',
              winner_id: gameByCode.winner_id || existingWinners[0]?.user_id,
              winner_name: existingWinners[0]?.name || null,
              winners: existingWinners,
            }, { status: 400 });
          }
          // Game is finished but no win tx — fall through to try crediting
        }

        // Finalize: split prize equally among all recorded winners and finish game
        const realWinners = existingWinners.filter((w: any) => w.user_id);
        const winnerCount = Math.max(realWinners.length, 1);
        const baseShare = Math.floor(winAmount / winnerCount);
        const remainder = winAmount - (baseShare * winnerCount);

        // Track credit results — only finalize the game if ALL credits succeed
        let allCreditsSucceeded = true;
        const creditedWinners: any[] = [];

        for (let i = 0; i < realWinners.length; i++) {
          const w = realWinners[i];
          const uid = w.user_id;
          // Give the first winner any remainder from the split so total is exact
          const sharePerWinner = i === 0 ? baseShare + remainder : baseShare;
          const bal = await supabase.rpc('adjust_main_balance', { p_user_id: uid, p_amount: sharePerWinner });
          if (bal.error) {
            console.error(`adjust_main_balance error for ${uid}:`, bal.error);
            allCreditsSucceeded = false;
            break;
          }
          // Record transaction
          const txResult = await supabase.from('transactions').insert({
            user_id: uid,
            type: 'win',
            amount: sharePerWinner,
            status: 'completed',
            reference: `WIN-${gameId}`,
          });
          if (txResult.error) {
            console.error(`Transaction insert error for ${uid}:`, txResult.error);
            allCreditsSucceeded = false;
            break;
          }
          const { data: existingHistory } = await supabase.from('game_history').select('id').eq('game_id', gameByCode.id).eq('user_id', uid).maybeSingle();
          const historyPayload = { game_id: gameByCode.id, user_id: uid, stake: totalBet, win_amount: sharePerWinner, numbers_matched: drawnNumbers.filter((n: number) => n > 0).length };
          if (existingHistory) {
            await supabase.from('game_history').update(historyPayload).eq('id', existingHistory.id);
          } else {
            await supabase.from('game_history').insert(historyPayload);
          }
          await supabase.from('game_players').update({ auto_mark: true }).eq('game_id', gameByCode.id).eq('user_id', uid);

          creditedWinners.push({ ...w, share: sharePerWinner });

          // TG notification for this winner
          if (botToken && uid === userId) {
            try {
              const { data: p2 } = await supabase.from('profiles').select('telegram_id, first_name').eq('id', uid).single();
              if (p2?.telegram_id) {
                const shareText = winnerCount > 1 ? ` (shared with ${winnerCount - 1} other winner${winnerCount > 2 ? 's' : ''})` : '';
                await tgSend(botToken, p2.telegram_id, `🎉 *BINGO WIN!*\n\nCongratulations ${p2.first_name || 'Player'}! You won *${sharePerWinner.toLocaleString()} ETB*${shareText}!\n\nKeep playing and winning! 🍀`);
              }
            } catch {}
          }

          // Track combo wins — increment consecutive win counter
          try {
            const { data: comboRow } = await supabase.from('user_win_combos').select('consecutive_wins').eq('user_id', uid).maybeSingle();
            const newComboCount = (comboRow?.consecutive_wins || 0) + 1;
            await supabase.from('user_win_combos').upsert({
              user_id: uid,
              consecutive_wins: newComboCount,
              last_win_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id' });
          } catch {}
        }

        if (!allCreditsSucceeded) {
          // Credit failed — return error so client retries. Game stays 'active'.
          console.error(`Finalize credit failed for game ${gameId} — game will remain active for retry`);
          return NextResponse.json({
            success: false,
            win: false,
            error: 'Prize credit failed — please retry',
          }, { status: 500 });
        }

        // All credits succeeded — finalize the game
        const finalWinnerId = realWinners.length === 1 ? realWinners[0].user_id : null;
        const updateData: any = { status: 'finished', winners: existingWinners };
        if (finalWinnerId) updateData.winner_id = finalWinnerId;
        await supabase.from('games').update(updateData).eq('id', gameByCode.id);

        if (botToken) {
          await sendGameStats(botToken, gameByCode.id);
        }
        await supabase.from('game_card_reservations').delete().eq('game_code', gameByCode.code);

        // Return this caller's share
        const callerIdx = realWinners.findIndex((w: any) => w.user_id === userId);
        const callerShare = callerIdx >= 0 ? (callerIdx === 0 ? baseShare + remainder : baseShare) : 0;

        return NextResponse.json({
          success: true,
          win: true,
          winAmount: callerShare,
          totalWinAmount: winAmount,
          winnerCount,
          winners: existingWinners,
          message: winnerCount > 1
            ? `You won ${callerShare.toLocaleString()} ETB (shared with ${winnerCount - 1} other winner${winnerCount > 2 ? 's' : ''})!`
            : `You won ${callerShare.toLocaleString()} ETB!`,
        });
      } else {
        // Not finalizing yet — record this winner, set collection window, keep game active
        if (!winnerCollectUntil || existingWinners.length === 0) {
          const collectUntil = new Date(Date.now() + 5000).toISOString();
          await supabase.from('games').update({ winners: existingWinners, winner_collect_until: collectUntil }).eq('id', gameByCode.id);
        } else {
          await supabase.from('games').update({ winners: existingWinners }).eq('id', gameByCode.id);
        }

        return NextResponse.json({
          success: true,
          win: true,
          winAmount: 0,
          pending: true,
          winnerCount: existingWinners.length,
          winners: existingWinners,
          collectUntil: winnerCollectUntil || new Date(Date.now() + 5000).toISOString(),
          message: `Winner recorded! Prize will be finalized shortly.`,
        });
      }
    }

    if (action === 'record_loss') {
      if (!gameId || !userId) {
        return NextResponse.json({ error: 'gameId and userId are required' }, { status: 400 });
      }

      // Look up game by code (gameId from client is the code, not UUID)
      const { data: game } = await supabase
        .from('games')
        .select('*')
        .eq('code', gameId)
        .maybeSingle();

      if (!game) {
        return NextResponse.json({ error: 'Game not found' }, { status: 404 });
      }

      const { data: gamePlayer } = await supabase
        .from('game_players')
        .select('*')
        .eq('game_id', game.id)
        .eq('user_id', userId)
        .maybeSingle();

      // Accept drawn numbers from client (fall back to DB)
      const clientDrawnLoss: number[] | undefined = body.drawnNumbers;
      const drawnNumbers: number[] =
        (clientDrawnLoss && Array.isArray(clientDrawnLoss) && clientDrawnLoss.length > 0)
          ? clientDrawnLoss
          : (game?.drawn_numbers || []);
      const card: number[][] = gamePlayer?.card || [];
      const numbersMatched = card
        .flat()
        .filter(cell => cell !== 0 && drawnNumbers.includes(cell))
        .length;

      const { data: stakeRow } = await supabase
        .from('stakes')
        .select('amount')
        .eq('id', game.stake_id)
        .maybeSingle();
      const perCardStake = Number(stakeRow?.amount) || 10;
      // Count user's own cards BEFORE deleting reservations
      const { data: myCards } = await supabase
        .from('game_card_reservations')
        .select('id')
        .eq('game_code', game.code)
        .eq('user_id', userId)
        .gt('card_number', 0);
      const myCardCount = Math.max(myCards?.length || 0, 1);
      const totalStake = perCardStake * myCardCount;

      if (game.status !== 'finished') {
        await supabase.from('games').update({ status: 'finished' }).eq('id', game.id);
      }

      await supabase.from('game_card_reservations').delete().eq('game_code', game.code);

      const existingHistory = await supabase
        .from('game_history')
        .select('id')
        .eq('game_id', game.id)
        .eq('user_id', userId)
        .maybeSingle();

      if (!existingHistory.data) {
        await supabase.from('game_history').insert({
          game_id: game.id,
          user_id: userId,
          stake: totalStake,
          win_amount: -totalStake,
          numbers_matched: numbersMatched,
        });
      } else {
        await supabase.from('game_history').update({
          stake: totalStake,
          win_amount: -totalStake,
          numbers_matched: numbersMatched,
        }).eq('id', existingHistory.data.id);
      }

      // Reset combo counter on loss
      try {
        await supabase.from('user_win_combos').upsert({
          user_id: userId,
          consecutive_wins: 0,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
      } catch {}

      return NextResponse.json({
        success: true,
        win: false,
        numbersMatched,
      });
    }

    if (action === 'create') {
      if (!userId || !cardNumbers || !Array.isArray(cardNumbers) || cardNumbers.length === 0) {
        return NextResponse.json({ error: 'userId and cardNumbers array are required' }, { status: 400 });
      }

      const { stakeId, stakeAmount } = body;
      const code = 'BG-' + Math.floor(100000 + Math.random() * 900000);

      // Fetch commission rate from bot_config (room-specific if available, falling back to global)
      let commission = 15;
      let roomCommission: number | null = null;
      try {
        const { data: configData } = await supabase.from('bot_config').select('commands').eq('id', 'main').single();
        const config = configData?.commands || {};
        if (typeof config.commission === 'number') commission = config.commission;
        const rooms = Array.isArray(config.rooms) ? config.rooms : [];
        const matchingRoom = rooms.find((r: any) => Number(r.entry) === Number(stakeAmount));
        if (matchingRoom && typeof matchingRoom.commission === 'number') {
          roomCommission = matchingRoom.commission;
          commission = matchingRoom.commission;
        }
        // Apply Happy Hour commission override if active
        const hhConfig = config.happy_hour as HappyHourConfig | undefined;
        if (hhConfig?.enabled) {
          const roomId = matchingRoom?.name?.toLowerCase() || 'all';
          commission = getEffectiveCommission(commission, hhConfig, roomId);
        }
      } catch {}

      const prizePool = (stakeAmount || 10) * cardNumbers.length * (1 - commission / 100);

      const { data: wallet } = await supabase
        .from('wallets')
        .select('main_balance, play_balance')
        .eq('user_id', userId)
        .single();

      if (!wallet) {
        return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
      }

      const totalBalance = Number(wallet.main_balance) + Number(wallet.play_balance);
      const totalFee = (stakeAmount || 10) * cardNumbers.length;

      if (totalBalance < totalFee) {
        return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
      }

      let stakeIdResolved = stakeId;
      if (!stakeIdResolved) {
        const { data: existingStake } = await supabase
          .from('stakes')
          .select('id')
          .eq('amount', stakeAmount)
          .limit(1);
        if (existingStake && existingStake.length > 0) {
          stakeIdResolved = existingStake[0].id;
        } else {
          const { data: newStake } = await supabase
            .from('stakes')
            .insert({
              amount: stakeAmount,
              status: 'open',
              lobby_open_until: new Date(Date.now() + 3600000).toISOString(),
            })
            .select()
            .single();
          if (newStake) stakeIdResolved = newStake.id;
        }
      }

      const gameInsert: any = {
        stake_id: stakeIdResolved,
        code,
        status: 'active',
        drawn_numbers: [],
        current_number: null,
        prize_pool: prizePool,
        called_count: 0,
        created_at: new Date().toISOString(),
      };
      if (roomCommission !== null) {
        gameInsert.commission = roomCommission;
      }
      const { data: game, error: gameError } = await supabase
        .from('games')
        .insert(gameInsert)
        .select()
        .single();

      if (gameError) {
        console.error('Error creating game:', gameError);
        return NextResponse.json({ error: 'Failed to create game' }, { status: 500 });
      }

      const deductFromMain = Math.min(totalFee, Number(wallet.main_balance));
      const deductFromPlay = totalFee - deductFromMain;

      if (deductFromMain > 0) {
        await supabase.rpc('adjust_main_balance', { p_user_id: userId, p_amount: -deductFromMain });
      }
      if (deductFromPlay > 0) {
        await supabase.rpc('adjust_play_balance', { p_user_id: userId, p_amount: -deductFromPlay });
      }

      await supabase.from('transactions').insert({
        user_id: userId,
        type: 'bet',
        amount: totalFee,
        status: 'completed',
        reference: `BET-${code}`,
      });

      const cardsList: number[][][] = cardNumbers.map((cardNum: number) => getSeededCard(cardNum));

      const playerInserts = cardsList.map(card =>
        supabase.from('game_players').insert({
          game_id: game.id,
          user_id: userId,
          card,
          marked: card.map(row => row.map(() => false)),
          auto_mark: true,
          is_watching: false,
        })
      );
      await Promise.all(playerInserts);

      const { data: profile } = await supabase
        .from('profiles')
        .select('telegram_id, first_name')
        .eq('id', userId)
        .single();

      if (profile?.telegram_id && botToken) {
        await tgSend(
          botToken,
          profile.telegram_id,
          `🎮 *Game Started!*\n\nGame #${code}\nStake: ${(stakeAmount || 10).toLocaleString()} ETB\nCards: ${cardNumbers.length}\nPrize Pool: ${prizePool.toLocaleString()} ETB\n\nGood luck ${profile.first_name || 'Player'}! 🍀`,
        );
      }

      // Notify game_ops / super admin channels
      try {
        const { notifyEvent } = await import('@/lib/server/admin');
        const playerName = profile?.first_name || 'Player';
        notifyEvent('game_started', `🎮 *GAME STARTED*\n\n🆔 Game: \`${code}\`\n👤 Player: ${playerName}\n🎫 Cards: ${cardNumbers.length}\n💰 Stake: ${(stakeAmount || 10).toLocaleString()} ETB\n🏆 Prize Pool: ${prizePool.toLocaleString()} ETB`);
      } catch (e) { /* ignore */ }

      return NextResponse.json({
        success: true,
        gameId: game.id,
        code,
        prizePool,
      });
    }

    // ============ RECOVER WIN — credit prize for a game that finished without crediting ============
    if (action === 'recover_win') {
      const { gameId: gameCode } = body;
      if (!gameCode || !userId) {
        return NextResponse.json({ error: 'gameId and userId are required' }, { status: 400 });
      }

      const { data: game } = await supabase
        .from('games')
        .select('id, code, status, prize_pool, stake_id, winners, winner_id, commission')
        .eq('code', gameCode)
        .maybeSingle();

      if (!game) {
        return NextResponse.json({ error: 'Game not found' }, { status: 404 });
      }

      // Check if a win transaction already exists
      const { data: existingTx } = await supabase
        .from('transactions')
        .select('id')
        .eq('type', 'win')
        .like('reference', `WIN-${gameCode}`)
        .limit(1);

      if (existingTx && existingTx.length > 0) {
        return NextResponse.json({ success: true, message: 'Prize already credited' });
      }

      const winners: any[] = game.winners || [];
      if (winners.length === 0) {
        return NextResponse.json({ error: 'No winners recorded for this game' }, { status: 400 });
      }

      // Calculate prize pool
      let effectiveCommission = Number(game.commission) || 15;
      try {
        const { data: hhCfg } = await supabase.from('bot_config').select('commands').eq('id', 'main').single();
        const hhConfig = hhCfg?.commands?.happy_hour as HappyHourConfig | undefined;
        if (hhConfig?.enabled) {
          const { data: stake } = await supabase.from('stakes').select('amount').eq('id', game.stake_id).maybeSingle();
          const perCardStake = Number(stake?.amount) || 10;
          const rooms = Array.isArray(hhCfg?.commands?.rooms) ? hhCfg.commands.rooms : [];
          const matchingRoom = rooms.find((r: any) => Number(r.entry) === perCardStake);
          const roomId = matchingRoom?.name?.toLowerCase() || 'all';
          effectiveCommission = getEffectiveCommission(effectiveCommission, hhConfig, roomId);
        }
      } catch {}

      try {
        await supabase.rpc('update_game_prize_pool', { p_game_code: gameCode, p_stake_amt: 0, p_commission: effectiveCommission });
      } catch {}
      const { data: freshGame } = await supabase.from('games').select('prize_pool').eq('id', game.id).maybeSingle();
      const winAmount = Number(freshGame?.prize_pool) || 0;

      if (winAmount <= 0) {
        return NextResponse.json({ error: 'Prize pool is zero' }, { status: 400 });
      }

      const realWinners = winners.filter((w: any) => w.user_id);
      const winnerCount = Math.max(realWinners.length, 1);
      const baseShare = Math.floor(winAmount / winnerCount);
      const remainder = winAmount - (baseShare * winnerCount);

      let credited = 0;
      for (let i = 0; i < realWinners.length; i++) {
        const w = realWinners[i];
        const share = i === 0 ? baseShare + remainder : baseShare;
        const bal = await supabase.rpc('adjust_main_balance', { p_user_id: w.user_id, p_amount: share });
        if (bal.error) {
          console.error(`recover_win: adjust_main_balance error for ${w.user_id}:`, bal.error);
          continue;
        }
        await supabase.from('transactions').insert({
          user_id: w.user_id,
          type: 'win',
          amount: share,
          status: 'completed',
          reference: `WIN-${gameCode}`,
        });
        credited++;
      }

      if (credited === 0) {
        return NextResponse.json({ error: 'Failed to credit any winners' }, { status: 500 });
      }

      // Ensure game is properly finished
      if (game.status !== 'finished') {
        const finalWinnerId = realWinners.length === 1 ? realWinners[0].user_id : null;
        const updateData: any = { status: 'finished', winners };
        if (finalWinnerId) updateData.winner_id = finalWinnerId;
        await supabase.from('games').update(updateData).eq('id', game.id);
      }

      return NextResponse.json({
        success: true,
        credited,
        winAmount,
        message: `Credited ${credited} winner(s) with ${winAmount.toLocaleString()} ETB total`,
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    console.error('Game engine error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}