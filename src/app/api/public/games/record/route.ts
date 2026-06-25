import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, stakeAmount, prizePool, outcome, drawnNumbers, roomName, gameSessionId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // 0. If a gameSessionId is provided, try to find an existing active/lobby game with that session code
    let existingGame: any = null;
    let isNewGame = false;

    if (gameSessionId) {
      const { data: foundGames } = await supabase
        .from('games')
        .select('*')
        .eq('code', gameSessionId)
        .in('status', ['lobby', 'active'])
        .limit(1);

      if (foundGames && foundGames.length > 0) {
        existingGame = foundGames[0];
      }
    }

    // 1. Locate a stake from database with matching amount, or create one if missing
    let stakeId: string | null = null;
    try {
      // If we found an existing game, use its stake_id
      if (existingGame?.stake_id) {
        stakeId = existingGame.stake_id;
      } else {
        const { data: stakeData } = await supabase
          .from('stakes')
          .select('id')
          .eq('amount', stakeAmount)
          .limit(1);

        if (stakeData && stakeData.length > 0) {
          stakeId = stakeData[0].id;
        } else {
          // Insert new stake dynamically
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
      }
    } catch (e) {
      console.error('Error finding/creating stake record:', e);
    }

    const isWin = outcome === 'win';

    // 2. Insert or update game record
    let game: any = existingGame;

    if (!existingGame) {
      // Create a new game record
      const code = gameSessionId || 'BG-' + Math.floor(100000 + Math.random() * 900000);
      
      const { data: newGame, error: gameError } = await supabase
        .from('games')
        .insert({
          stake_id: stakeId,
          code,
          status: isWin ? 'finished' : 'active',
          drawn_numbers: Array.isArray(drawnNumbers) ? drawnNumbers : [],
          current_number: Array.isArray(drawnNumbers) && drawnNumbers.length > 0 ? drawnNumbers[drawnNumbers.length - 1] : null,
          prize_pool: Number(prizePool) || 0,
          called_count: Array.isArray(drawnNumbers) ? drawnNumbers.length : 0,
          winner_id: isWin ? userId : null,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (gameError) {
        throw gameError;
      }
      game = newGame;
      isNewGame = true;
    } else if (isWin) {
      // Update existing game with winner info
      const { data: updatedGame, error: updateError } = await supabase
        .from('games')
        .update({
          status: 'finished',
          winner_id: userId,
          drawn_numbers: Array.isArray(drawnNumbers) ? drawnNumbers : [],
          current_number: Array.isArray(drawnNumbers) && drawnNumbers.length > 0 ? drawnNumbers[drawnNumbers.length - 1] : null,
          prize_pool: Number(prizePool) || 0,
          called_count: Array.isArray(drawnNumbers) ? drawnNumbers.length : 0,
        })
        .eq('id', existingGame.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating game with winner:', updateError);
      } else {
        game = updatedGame;
      }
    }

    // 3. Insert user into game_players table (avoid duplicates)
    if (game) {
      // Check if player already exists
      const { data: existingPlayer } = await supabase
        .from('game_players')
        .select('id')
        .eq('game_id', game.id)
        .eq('user_id', userId)
        .maybeSingle();

      if (!existingPlayer) {
        await supabase.from('game_players').insert({
          game_id: game.id,
          user_id: userId
        });
      }
    }

    // 4. If winner, add prize to main wallet
    if (isWin && game) {
      const prizeAmt = Number(prizePool) || 0;
      if (prizeAmt > 0) {
        // Get current wallet
        const { data: wallet } = await supabase
          .from('wallets')
          .select('main_balance')
          .eq('user_id', userId)
          .single();

        if (wallet) {
          const currentMain = Number(wallet.main_balance) || 0;
          await supabase
            .from('wallets')
            .update({ main_balance: currentMain + prizeAmt })
            .eq('user_id', userId);
        }

        // Record win transaction
        await supabase.from('transactions').insert({
          user_id: userId,
          type: 'win',
          amount: prizeAmt,
          status: 'completed',
          reference: `game_win_${game.code}_${Date.now()}`,
        });
      }
    }

    // 5. Send notification to Admin Telegram Bot
    const adminBotToken = process.env.ADMIN_BOT_TOKEN;
    const adminChatId = process.env.ADMIN_CHAT_ID;
    
    if (adminBotToken && adminChatId && game) {
      try {
        // Fetch player profile info
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, username')
          .eq('id', userId)
          .single();

        const playerName = profile 
          ? (profile.first_name || (profile.username ? `@${profile.username}` : 'Unknown Player'))
          : 'Unknown Player';

        const outcomeIcon = isWin ? '🏆 WIN' : '❌ LOSS';

        const text = `🎮 *BINGO GAME (Session: #${game.code})*\n\n` +
                     `👤 *Player:* ${playerName}\n` +
                     `🏠 *Room:* ${roomName || 'Quick Lobby'}\n` +
                     `💰 *Stake:* ${stakeAmount} ETB\n` +
                     `📢 *Result:* ${outcomeIcon}\n` +
                     `💰 *Prize Pool:* ${Number(prizePool).toLocaleString()} ETB\n` +
                     `🔢 *Called Numbers:* ${Array.isArray(drawnNumbers) ? drawnNumbers.length : 0} calls\n` +
                     `👥 *Total Players in Session:* ${existingGame ? 'Multi-player' : 'Single player'}\n` +
                     `⏱️ *Date:* ${new Date().toLocaleString()}`;

        await fetch(`https://api.telegram.org/bot${adminBotToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: adminChatId,
            text,
            parse_mode: 'Markdown'
          })
        });
      } catch (tgErr) {
        console.error('Error sending Telegram admin notification:', tgErr);
      }
    }

    return NextResponse.json({ 
      success: true, 
      gameId: game?.id, 
      code: game?.code,
      isNewGame,
      isExistingGame: !!existingGame
    });
  } catch (error: any) {
    console.error('Error recording game match:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}