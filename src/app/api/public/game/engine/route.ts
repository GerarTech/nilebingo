import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

    // Calculate commission earned
    let commission = 0;
    if (game.stake_id) {
      const { data: stake } = await supabase.from('stakes').select('amount').eq('id', game.stake_id).single();
      if (stake) {
        const { count: cards } = await supabase.from('game_card_reservations').select('id', { count: 'exact', head: true }).eq('game_code', game.code).gt('card_number', 0);
        const totalEntities = Math.max(playerCount, cards || 0);
        commission = Math.max(0, (Number(stake.amount) * totalEntities) - prize);
      }
    }
    if (commission === 0) {
      // Back-calculate from commission rate
      const { data: configData } = await supabase.from('bot_config').select('commands').eq('id', 'main').single();
      const rate = Number(configData?.commands?.commission || 15);
      commission = prize * rate / (100 - rate);
    }

    let statsMsg = `*🏁 GAME FINISHED*\n\n`;
    statsMsg += `🆔 Game ID: \`${game.code}\`\n`;
    statsMsg += `👥 Players: ${playerCount}\n`;
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
      const allNumbers = Array.from({ length: 75 }, (_, i) => i + 1);
      const remaining = allNumbers.filter(n => !drawnNumbers.includes(n));

      if (remaining.length === 0) {
        return NextResponse.json({ error: 'All numbers drawn' }, { status: 400 });
      }

      const nextNumber = remaining[Math.floor(Math.random() * remaining.length)];
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

      // Look up game by code (gameId from client is the code, not UUID)
      const { data: gameByCode } = await supabase
        .from('games')
        .select('id, status, prize_pool, code, winner_id')
        .eq('code', gameId)
        .maybeSingle();

      if (!gameByCode) {
        return NextResponse.json({ error: 'Game not found' }, { status: 404 });
      }

      // If game already finished, return the winner
      if (gameByCode.status === 'finished') {
        return NextResponse.json({
          win: false,
          error: 'Game already finished',
          winner_id: gameByCode.winner_id,
        }, { status: 400 });
      }

      // Get the player's card
      const { data: gamePlayer } = await supabase
        .from('game_players')
        .select('card, is_watching')
        .eq('game_id', gameByCode.id)
        .eq('user_id', userId)
        .maybeSingle();

      if (!gamePlayer) {
        return NextResponse.json({ error: 'Player not found in this game' }, { status: 404 });
      }

      if (gamePlayer.is_watching) {
        return NextResponse.json({ error: 'Spectators cannot win' }, { status: 400 });
      }

      // Get drawn numbers
      const { data: gameData } = await supabase
        .from('games')
        .select('drawn_numbers')
        .eq('id', gameByCode.id)
        .single();

      const drawnNumbers: number[] = gameData?.drawn_numbers || [];
      const card: number[][] = gamePlayer.card || [];

      if (!card || card.length === 0) {
        return NextResponse.json({ error: 'No card found' }, { status: 400 });
      }

      // Validate win: check if any row, column, or diagonal is fully marked
      let hasWin = false;

      // Check rows
      for (let row = 0; row < card.length; row++) {
        let complete = true;
        for (let col = 0; col < card[row].length; col++) {
          const cell = card[row][col];
          if (cell === 0) continue; // Free space
          if (!drawnNumbers.includes(cell)) {
            complete = false;
            break;
          }
        }
        if (complete) { hasWin = true; break; }
      }

      // Check columns
      if (!hasWin) {
        for (let col = 0; col < 5; col++) {
          let complete = true;
          for (let row = 0; row < card.length; row++) {
            const cell = card[row]?.[col];
            if (cell === 0) continue; // Free space
            if (cell === undefined || !drawnNumbers.includes(cell)) {
              complete = false;
              break;
            }
          }
          if (complete) { hasWin = true; break; }
        }
      }

      // Check main diagonal (top-left to bottom-right)
      if (!hasWin) {
        let complete = true;
        for (let i = 0; i < 5; i++) {
          const cell = card[i]?.[i];
          if (cell === 0) continue;
          if (cell === undefined || !drawnNumbers.includes(cell)) {
            complete = false;
            break;
          }
        }
        if (complete) hasWin = true;
      }

      // Check anti diagonal (top-right to bottom-left)
      if (!hasWin) {
        let complete = true;
        for (let i = 0; i < 5; i++) {
          const cell = card[i]?.[4 - i];
          if (cell === 0) continue;
          if (cell === undefined || !drawnNumbers.includes(cell)) {
            complete = false;
            break;
          }
        }
        if (complete) hasWin = true;
      }

      if (!hasWin) {
        return NextResponse.json({ win: false, error: 'No winning pattern found' }, { status: 400 });
      }

      // Count players
      const { count: playerCount } = await supabase
        .from('game_players')
        .select('id', { count: 'exact', head: true })
        .eq('game_id', gameByCode.id)
        .eq('is_watching', false);

      const winAmount = Number(gameByCode.prize_pool) || 0;

      const { data: profile } = await supabase.from('profiles').select('telegram_id, first_name').eq('id', userId).single();

      const newMain = await supabase.rpc('adjust_main_balance', { p_user_id: userId, p_amount: winAmount });
      if (newMain.error) console.error('adjust_main_balance error:', newMain.error);

      await supabase.from('transactions').insert({
        user_id: userId,
        type: 'win',
        amount: winAmount,
        status: 'completed',
        reference: `WIN-${gameId}`,
      });

      // Mark game as finished with winner
      await supabase.from('games').update({ status: 'finished', winner_id: userId }).eq('id', gameByCode.id);

      // Clean up card reservations
      await supabase.from('game_card_reservations').delete().eq('game_code', gameByCode.code);

      await supabase.from('game_players').update({ auto_mark: true }).eq('game_id', gameByCode.id).eq('user_id', userId);

      if (profile?.telegram_id && botToken) {
        await tgSend(botToken, profile.telegram_id, `🎉 *BINGO WIN!*\n\nCongratulations ${profile.first_name || 'Player'}! You won *${winAmount.toLocaleString()} ETB*!\n\nKeep playing and winning! 🍀`);
      }

      if (botToken) {
        await sendGameStats(botToken, gameByCode.id);
      }

      return NextResponse.json({
        success: true,
        win: true,
        winAmount,
        numbersMatched: 0,
        message: `You won ${winAmount.toLocaleString()} ETB!`,
      });
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

      if (game.status !== 'finished') {
        await supabase.from('games').update({ status: 'finished' }).eq('id', game.id);
      }

      await supabase.from('game_card_reservations').delete().eq('game_code', game.code);

      const { data: gamePlayer } = await supabase
        .from('game_players')
        .select('*')
        .eq('game_id', game.id)
        .eq('user_id', userId)
        .maybeSingle();

      const drawnNumbers: number[] = game?.drawn_numbers || [];
      const card: number[][] = gamePlayer?.card || [];
      const numbersMatched = card
        .flat()
        .filter(cell => cell !== 0 && drawnNumbers.includes(cell))
        .length;

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
          stake: 0,
          win_amount: 0,
          numbers_matched: numbersMatched,
        });
      }

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

      const cardsList: number[][][] = cardNumbers.map((cardNum: number) => {
        const columns: number[][] = [];
        const seed = cardNum * 7919;
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
      });

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

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    console.error('Game engine error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}