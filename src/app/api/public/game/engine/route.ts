import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';
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

      const { data: game, error: gameError } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single();

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
        .eq('id', gameId)
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

      const { data: game, error: gameError } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single();

      if (gameError || !game) {
        return NextResponse.json({ error: 'Game not found' }, { status: 404 });
      }

      if (game.status === 'finished') {
        return NextResponse.json({ error: 'Game already finished' }, { status: 400 });
      }

      const { data: gamePlayer, error: playerError } = await supabase
        .from('game_players')
        .select('*')
        .eq('game_id', gameId)
        .eq('user_id', userId)
        .single();

      if (playerError || !gamePlayer) {
        return NextResponse.json({ error: 'Player not found in this game' }, { status: 404 });
      }

      const card: number[][] = gamePlayer.card;
      const drawnNumbers: number[] = game.drawn_numbers || [];

      const marked = card.map(row =>
        row.map(cell => cell === 0 || drawnNumbers.includes(cell))
      );

      const rowWin = marked.some(row => row.every(cell => cell));
      const colWin = marked[0].some((_, colIdx) => marked.every(row => row[colIdx]));

      if (!rowWin && !colWin) {
        return NextResponse.json({ win: false, message: 'No winning pattern found' });
      }

      const numbersMatched = card
        .flat()
        .filter(cell => cell !== 0 && drawnNumbers.includes(cell))
        .length;

      const { data: gamePlayers } = await supabase
        .from('game_players')
        .select('user_id')
        .eq('game_id', gameId)
        .eq('is_watching', false);

      const playerCount = gamePlayers ? gamePlayers.length : 1;
      const winAmount = Math.floor(game.prize_pool / playerCount);

      await supabase
        .from('games')
        .update({
          status: 'finished',
          winner_id: userId,
        })
        .eq('id', gameId);

      const { data: wallet } = await supabase
        .from('wallets')
        .select('main_balance')
        .eq('user_id', userId)
        .single();

      if (wallet) {
        await supabase
          .from('wallets')
          .update({ main_balance: Number(wallet.main_balance) + winAmount })
          .eq('user_id', userId);
      }

      await supabase.from('transactions').insert({
        user_id: userId,
        type: 'win',
        amount: winAmount,
        status: 'completed',
        reference: `WIN-${game.code}`,
      });

      await supabase.from('game_players').update({ auto_mark: true }).eq('game_id', gameId).eq('user_id', userId);

      await supabase.from('game_history').insert({
        game_id: gameId,
        user_id: userId,
        stake: 0,
        win_amount: winAmount,
        numbers_matched: numbersMatched,
      });

      const { data: profile } = await supabase
        .from('profiles')
        .select('telegram_id, first_name')
        .eq('id', userId)
        .single();

      if (profile?.telegram_id && botToken) {
        await tgSend(
          botToken,
          profile.telegram_id,
          `🎉 *BINGO WIN!*\n\nCongratulations ${profile.first_name || 'Player'}! You won *${winAmount.toLocaleString()} ETB* in game #${game.code}!\n\nKeep playing and winning! 🍀`,
        );
      }

      return NextResponse.json({
        success: true,
        win: true,
        winAmount,
        numbersMatched,
        message: `You won ${winAmount.toLocaleString()} ETB!`,
      });
    }

    if (action === 'record_loss') {
      if (!gameId || !userId) {
        return NextResponse.json({ error: 'gameId and userId are required' }, { status: 400 });
      }

      const { data: game } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single();

      if (game && game.status !== 'finished') {
        await supabase.from('games').update({ status: 'finished' }).eq('id', gameId);
      }

      const { data: gamePlayer } = await supabase
        .from('game_players')
        .select('*')
        .eq('game_id', gameId)
        .eq('user_id', userId)
        .single();

      const drawnNumbers: number[] = game?.drawn_numbers || [];
      const card: number[][] = gamePlayer?.card || [];
      const numbersMatched = card
        .flat()
        .filter(cell => cell !== 0 && drawnNumbers.includes(cell))
        .length;

      const existingHistory = await supabase
        .from('game_history')
        .select('id')
        .eq('game_id', gameId)
        .eq('user_id', userId)
        .maybeSingle();

      if (!existingHistory.data) {
        await supabase.from('game_history').insert({
          game_id: gameId,
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
      const prizePool = (stakeAmount || 10) * cardNumbers.length * 8;

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

      const { data: game, error: gameError } = await supabase
        .from('games')
        .insert({
          stake_id: stakeIdResolved,
          code,
          status: 'active',
          drawn_numbers: [],
          current_number: null,
          prize_pool: prizePool,
          called_count: 0,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (gameError) {
        console.error('Error creating game:', gameError);
        return NextResponse.json({ error: 'Failed to create game' }, { status: 500 });
      }

      const deductFromMain = Math.min(totalFee, Number(wallet.main_balance));
      const deductFromPlay = totalFee - deductFromMain;

      if (deductFromMain > 0) {
        await supabase
          .from('wallets')
          .update({ main_balance: Math.max(0, Number(wallet.main_balance) - deductFromMain) })
          .eq('user_id', userId);
      }
      if (deductFromPlay > 0) {
        await supabase
          .from('wallets')
          .update({ play_balance: Math.max(0, Number(wallet.play_balance) - deductFromPlay) })
          .eq('user_id', userId);
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
