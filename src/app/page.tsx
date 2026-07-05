'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useApp, AppProvider } from '@/lib/hooks/useApp';
import { supabase } from '@/lib/supabase';
import TabBar from '@/lib/components/TabBar';
import BingoGrid from '@/lib/components/BingoGrid';
import HomeView from '@/lib/components/HomeView';
import RoomLobby from '@/lib/components/RoomLobby';
import GameView from '@/lib/components/GameView';
import ScoresTab from '@/lib/components/ScoresTab';
import HistoryTab from '@/lib/components/HistoryTab';
import WalletTab from '@/lib/components/WalletTab';
import ProfileTab from '@/lib/components/ProfileTab';
import RulesModal from '@/lib/components/RulesModal';
import { generateCard, getSeededCard, getWinningCells, getColumnLabel, getAvailableCards, drawNumber, checkWin } from '@/lib/server/bingo';

type VirtualPlayer = {
  username: string;
  card: number[][];
  markedCount: number;
  neededToWin: number;
  hasWon: boolean;
};

const VIRTUAL_NAMES = ['Abebe', 'Aster', 'Kebede', 'Almaz', 'Chala', 'Tigist', 'Sintayehu', 'Solomon', 'Marta', 'Biniam'];

function isValidUUID(id: string | undefined): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

type RoomConfig = {
  id: string; name: string; entry: number; players: number;
  maxPlayers: number; winAmount: number; commission: number;
  status: 'playing' | 'starting_soon'; countdown: number;
};

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

function HomePage() {
  const { profile, wallet, language, activeTab, loading, t, setActiveTab, setLanguage, initialize, updateBalance, updateAvatar, refreshWallet } = useApp();

  const [inGame, setInGame] = useState(false);
  const [gameCard, setGameCard] = useState<number[][]>([]);
  const [playerCards, setPlayerCards] = useState<number[][][]>([]);
  const [userMarkedNumbers, setUserMarkedNumbers] = useState<number[]>([]);
  const [drawnNumbers, setDrawnNumbers] = useState<number[]>([]);
  const [showCardPicker, setShowCardPicker] = useState(false);
  const [selectedStake, setSelectedStake] = useState<number | null>(null);
  const [selectedCards, setSelectedCards] = useState<number[]>([]);
  const [autoMark, setAutoMark] = useState(true);
  const [autoWin, setAutoWin] = useState(true);
  const [isWatching, setIsWatching] = useState(false);
  const [recentCalled, setRecentCalled] = useState<{ num: number; label: string }[]>([]);
  const [showRules, setShowRules] = useState(false);
  const [cardPickerCountdown, setCardPickerCountdown] = useState(50);
  const [livePlayerCount, setLivePlayerCount] = useState(1);
  const [prizePool, setPrizePool] = useState(0);
  const [gameId, setGameId] = useState('');
  const [previewCard, setPreviewCard] = useState<number[][]>([]);
  const [showWinModal, setShowWinModal] = useState(false);
  const [resultCountdown, setResultCountdown] = useState<number | null>(null);
  const [winningCard, setWinningCard] = useState<number[][]>([]);
  const [winningCells, setWinningCells] = useState<boolean[][]>([]);
  const drawnRef = useRef<number[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const realtimeChannelRef = useRef<any>(null);
  const [takenCards, setTakenCards] = useState<number[]>([]);
  const [lobbyPlayerCount, setLobbyPlayerCount] = useState<number>(0);

  const [selectedRoom, setSelectedRoom] = useState<RoomConfig | null>(null);
  const [commissionRate, setCommissionRate] = useState<number>(15);
  const [appName, setAppName] = useState<string>('Nile BINGO');
  const [appLogo, setAppLogo] = useState<string>('🎰');
  const [appLogoPng, setAppLogoPng] = useState<string | null>(null);
  const [botUsername, setBotUsername] = useState<string>('yenedating_bot');
  const [colorScheme, setColorScheme] = useState<string>('gold');
  const [rulesText, setRulesText] = useState<string>('');

  const [rooms, setRooms] = useState<RoomConfig[]>([
    { id: 'bronze', name: 'Bronze Room', entry: 10, players: 10, maxPlayers: 100, commission: 15, winAmount: 85, status: 'starting_soon', countdown: 30 },
    { id: 'silver', name: 'Silver Room', entry: 20, players: 12, maxPlayers: 100, commission: 15, winAmount: 204, status: 'starting_soon', countdown: 23 },
    { id: 'gold', name: 'Gold Room', entry: 50, players: 15, maxPlayers: 100, commission: 15, winAmount: 638, status: 'starting_soon', countdown: 40 },
    { id: 'diamond', name: 'Diamond Room', entry: 100, players: 20, maxPlayers: 100, commission: 15, winAmount: 1700, status: 'starting_soon', countdown: 58 },
    { id: 'premium', name: 'Premium Room', entry: 200, players: 5, maxPlayers: 100, commission: 15, winAmount: 850, status: 'starting_soon', countdown: 15 },
    { id: 'vip', name: 'VIP Room', entry: 500, players: 2, maxPlayers: 100, commission: 15, winAmount: 850, status: 'starting_soon', countdown: 95 },
  ]);

  const [dbLeaderboard, setDbLeaderboard] = useState<any[]>([]);
  const [otherPlayers, setOtherPlayers] = useState<VirtualPlayer[]>([]);
  const [opponentWinner, setOpponentWinner] = useState<string | null>(null);
  const [appointedCard, setAppointedCard] = useState<{cardNumber: number, afterBalls: number} | null>(null);

  const [isRegistered, setIsRegistered] = useState<boolean>(false);
  const [isSpectatingReady, setIsSpectatingReady] = useState<boolean>(false);
  const [showLeaveModal, setShowLeaveModal] = useState<boolean>(false);
  const [pendingTab, setPendingTab] = useState<'game' | 'scores' | 'history' | 'wallet' | 'profile' | null>(null);
  const [deterministicSequence, setDeterministicSequence] = useState<number[]>([]);

  const [stakeHistory, setStakeHistory] = useState<{ gameId: string; stake: number; result: 'win' | 'loss'; prize?: number; timestamp: string }[]>([]);
  const [referralCount, setReferralCount] = useState<number>(0);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [showRefToast, setShowRefToast] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');
  const [toastType, setToastType] = useState<'error' | 'success' | 'info'>('error');
  const [referralEnabled, setReferralEnabled] = useState<boolean>(true);
  const [referralBonus, setReferralBonus] = useState<number>(1);
  const [walletView, setWalletView] = useState<'main' | 'deposit' | 'withdraw' | 'transfer'>('main');
  const [withdrawMinAmount, setWithdrawMinAmount] = useState<number>(50);
  const [withdrawRequiredGames, setWithdrawRequiredGames] = useState<number>(5);

  // Refs for values used in the room tick interval to prevent unnecessary re-creation
  const selectedRoomRef = useRef<RoomConfig | null>(null);
  const isRegisteredRef = useRef(false);
  const isSpectatingReadyRef = useRef(false);
  const inGameRef = useRef(false);
  const commissionRateRef = useRef(15);
  const startGameplayRef = useRef<any>(null);
  const tickReadyRef = useRef(false);

  // ============ DETERMINISTIC DRAW SEQUENCE ============
  const getDeterministicDrawSequence = useCallback((gId: string, targetCardNum?: number | null) => {
    let seed = 0;
    for (let i = 0; i < gId.length; i++) seed = (seed * 31 + gId.charCodeAt(i)) & 0xffffffff;
    const rand = () => { seed = (seed * 1664525 + 1013904223) & 0xffffffff; return (seed >>> 0) / 0xffffffff; };
    const allBalls = Array.from({ length: 75 }, (_, i) => i + 1);
    const seq: number[] = [];
    if (targetCardNum && targetCardNum >= 1 && targetCardNum <= 200) {
      const targetCard = getSeededCard(targetCardNum, gId);
      const targetNumbers: number[] = [];
      targetCard.forEach(row => row.forEach(cell => { if (cell > 0) targetNumbers.push(cell); }));
      while (allBalls.length > 0) {
        const remainingTargets = targetNumbers.filter(n => allBalls.includes(n));
        if (remainingTargets.length > 0 && rand() < 0.85) {
          const tIdx = Math.floor(rand() * remainingTargets.length);
          const num = remainingTargets[tIdx];
          const allIdx = allBalls.indexOf(num);
          allBalls.splice(allIdx, 1);
          seq.push(num);
        } else {
          const normalIdx = Math.floor(rand() * allBalls.length);
          seq.push(allBalls.splice(normalIdx, 1)[0]);
        }
      }
    } else {
      while (allBalls.length > 0) { const idx = Math.floor(rand() * allBalls.length); seq.push(allBalls.splice(idx, 1)[0]); }
    }
    return seq;
  }, []);

  // ============ APP POLL WINNER APPOINTMENT ============
  useEffect(() => {
    if (!gameId) { setAppointedCard(null); return; }
    const fetchAppointed = async () => {
      try {
        const { data } = await supabase.from('bot_config').select('commands').eq('id', 'main').single();
        const config = data?.commands || {};
        const appointedObj = config.appointed_winners || {};
        const rule = appointedObj[gameId];
        if (rule) {
          if (typeof rule === 'number') setAppointedCard({ cardNumber: rule, afterBalls: 20 });
          else if (typeof rule === 'object' && rule !== null) setAppointedCard({ cardNumber: Number(rule.card_number) || 1, afterBalls: Number(rule.after_balls) || 20 });
        } else setAppointedCard(null);
      } catch { setAppointedCard(null); }
    };
    fetchAppointed();
    const interval = setInterval(fetchAppointed, 4000);
    return () => clearInterval(interval);
  }, [gameId]);

  // ============ HISTORY PERSISTENCE ============
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try { const saved = localStorage.getItem('nile_bingo_stake_history'); if (saved) setStakeHistory(JSON.parse(saved)); } catch {}
    }
  }, []);

  const addGameToHistory = useCallback((gId: string, stakeAmt: number, outcome: 'win' | 'loss') => {
    if (isWatching || !gId) return;
    // Calculate prize using entry fee × total cards in game × (1 - commission)
    const entryFee = selectedRoom?.entry || 10;
    const numCards = Math.max(1, playerCards.length);
    const totalCards = livePlayerCount - 1 + numCards;
    const effComm = selectedRoom?.commission ?? commissionRate;
    const actualPrize = outcome === 'win' ? entryFee * totalCards * (1 - effComm / 100) : -stakeAmt;
    setStakeHistory(prev => {
      const exists = prev.some(item => item.gameId === gId && item.result === outcome);
      if (exists) return prev;
      const filtered = prev.filter(item => item.gameId !== gId || item.result !== outcome);
      const newHistory = [{ gameId: gId, stake: stakeAmt, result: outcome, prize: actualPrize, timestamp: new Date().toISOString() }, ...filtered].slice(0, 10);
      try { localStorage.setItem('nile_bingo_stake_history', JSON.stringify(newHistory)); } catch {}
      return newHistory;
    });
    if (profile?.id) {
      const pot = entryFee * totalCards * (1 - effComm / 100);
      fetch('/api/public/games/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: gId, userId: profile.id, stakeAmount: stakeAmt, prizePool: pot, outcome, drawnNumbers: drawnRef.current || [], roomName: selectedRoom?.name || 'Quick Lobby' })
      }).catch(() => {});
    }
  }, [isWatching, profile?.id, selectedRoom, livePlayerCount, commissionRate, playerCards]);

  // ============ CONFIG FETCH ============
  const fetchConfig = useCallback(() => {
    fetch('/api/public/config', { cache: 'no-store' }).then(r => r.json()).then(data => {
      if (!data) return;
      if (typeof data.commission === 'number') setCommissionRate(data.commission);
      else setCommissionRate(15);
      if (data.appName) setAppName(data.appName);
      if (data.appLogo) setAppLogo(data.appLogo);
      if (data.appLogoPng) setAppLogoPng(data.appLogoPng);
      if (data.botUsername) setBotUsername(data.botUsername);
      if (data.colorScheme) setColorScheme(data.colorScheme);
      if (data.referralEnabled !== undefined) setReferralEnabled(data.referralEnabled !== false);
      if (data.referralBonus !== undefined) setReferralBonus(Number(data.referralBonus) || 1);
      if (data.rulesText) setRulesText(data.rulesText);
      if (typeof data.withdrawMinAmount === 'number') setWithdrawMinAmount(data.withdrawMinAmount);
      if (typeof data.withdrawRequiredGames === 'number') setWithdrawRequiredGames(data.withdrawRequiredGames);
      if (Array.isArray(data.rooms)) {
        setRooms(data.rooms.map((room: any, i: number) => {
          const roomComm = typeof room.commission === 'number' ? room.commission : (data.commission ?? 15);
          return {
            id: room.id || `room_${i}`, name: room.name || 'Room', entry: Number(room.entry) || 10,
            players: Number(room.players) || 10, maxPlayers: Number(room.maxPlayers) || 100,
            commission: roomComm,
            winAmount: (Number(room.entry) * Number(room.players)) * (1 - roomComm / 100),
            status: 'starting_soon' as const, countdown: 15 + i * 7,
          };
        }));
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    fetchConfig();
    const onVisibility = () => { if (document.visibilityState === 'visible') fetchConfig(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [fetchConfig]);

  // ============ LEADERBOARD FETCH ============
  useEffect(() => {
    if (activeTab === 'scores') {
      fetch('/api/public/leaderboard').then(r => r.json()).then(data => {
        if (data && Array.isArray(data.leaderboard)) setDbLeaderboard(data.leaderboard);
      }).catch(() => {});
    }
  }, [activeTab]);

  // ============ REALTIME RESERVATIONS ============
  const refreshGameState = useCallback(async (gId: string) => {
    if (!gId || !profile || !isValidUUID(profile.id)) return;
    try {
      const res = await fetch(`/api/public/game/lobby?gameId=${gId}&userId=${profile.id}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.success) {
        const reservations = data.reservations || [];
        const otherCards = reservations.filter((r: any) => r.user_id !== profile.id).map((r: any) => r.card_number);
        setTakenCards(otherCards.filter((n: number) => n > 0));

        const uniqueUserIds = new Set(reservations.map((r: any) => r.user_id));
        setLobbyPlayerCount(Math.max(uniqueUserIds.size, data.livePlayerCount || 0));

        const myRes = reservations.filter((r: any) => r.user_id === profile.id).map((r: any) => r.card_number);
        const activeMyRes = myRes.filter((n: number) => n > 0);
        setSelectedCards(activeMyRes);
        setPreviewCard(activeMyRes.length > 0 ? getSeededCard(activeMyRes[activeMyRes.length - 1], gId) : []);
      }
    } catch (e) {
      console.error('Failed to refresh game state:', e);
    }
  }, [profile?.id]);

  useEffect(() => { if (!selectedRoom || !gameId || inGame) return; refreshGameState(gameId); }, [selectedRoom?.id, gameId, inGame, refreshGameState]);

  // Light polling that only updates takenCards and lobbyPlayerCount
  // Does NOT overwrite selectedCards to avoid flicker during card selection
  const refreshTakenCards = useCallback(async (gId: string) => {
    if (!gId || !profile || !isValidUUID(profile.id)) return;
    try {
      const res = await fetch(`/api/public/game/lobby?gameId=${gId}&userId=${profile.id}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.success) {
        const reservations = data.reservations || [];
        const otherCards = reservations.filter((r: any) => r.user_id !== profile.id).map((r: any) => r.card_number);
        setTakenCards(otherCards.filter((n: number) => n > 0));
        const uniqueUserIds = new Set(reservations.map((r: any) => r.user_id));
        setLobbyPlayerCount(Math.max(uniqueUserIds.size, data.livePlayerCount || 0));
      }
    } catch (e) {
      // Silent fail for polling
    }
  }, [profile?.id]);

  useEffect(() => {
    if (!selectedRoom || !gameId || inGame) return;
    const channel = supabase.channel(`game-${gameId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_card_reservations', filter: `game_code=eq.${gameId}` }, () => refreshTakenCards(gameId))
      .subscribe();
    realtimeChannelRef.current = channel;
    return () => { if (realtimeChannelRef.current) { supabase.removeChannel(realtimeChannelRef.current); realtimeChannelRef.current = null; } };
  }, [selectedRoom?.id, gameId, inGame, refreshTakenCards]);

  // ============ INIT & VOICE ============
  useEffect(() => { if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.getVoices(); }, []);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const tg = (window as any).Telegram?.WebApp;
      const telegramUser = tg?.initDataUnsafe?.user;
      const telegramId = telegramUser?.id ? String(telegramUser.id) : null;
      if (telegramId) {
        tg?.ready();
        tg?.expand();
        initialize(telegramId, telegramUser?.first_name, telegramUser?.username);
      } else {
        const guestId = (() => {
          try {
            let id = localStorage.getItem('fallback_user_id');
            if (!id) {
              id = `guest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
              localStorage.setItem('fallback_user_id', id);
            }
            return id;
          } catch {
            return `guest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
          }
        })();
        initialize(guestId);
      }
    }
  }, [initialize]);

  // ============ REGISTER GAME ============
  const registerLiveGame = useCallback(async (gId: string, stakeAmt: number, isSpec: boolean, cardsToPlay: number[][][]) => {
    if (!profile || !isValidUUID(profile.id)) return;
    try {
      await fetch('/api/public/game/lobby', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register_game',
          gameId: gId,
          userId: profile.id,
          stakeAmount: stakeAmt,
          isSpectator: isSpec,
          autoMark,
          selectedCards,
        }),
      });
    } catch (e) {
      console.error('Failed to register live game on server:', e);
    }
  }, [profile, autoMark, selectedCards]);

  // ============ CARD TOGGLE ============
  const toggleCard = useCallback(async (num: number) => {
    if (!gameId || !profile?.id || !isValidUUID(profile.id)) return;
    const uid = profile.id;

    const isSelected = selectedCards.includes(num);

    // Limit check on client side
    if (!isSelected && selectedCards.length >= 2) {
      showToast(t ? t('max_2_cards') : 'Maximum of 2 cards allowed', 'error');
      return;
    }

    // Capture previous states for optimistic fallback
    const prevSelected = [...selectedCards];
    const prevPreview = [...previewCard];
    const prevTaken = [...takenCards];

    // 1. Optimistic state updates
    const nextSelected = isSelected
      ? prevSelected.filter(c => c !== num)
      : [...prevSelected, num];

    setSelectedCards(nextSelected);
    setPreviewCard(nextSelected.length > 0 ? getSeededCard(nextSelected[nextSelected.length - 1], gameId) : []);

    try {
      const res = await fetch('/api/public/game/lobby', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_card',
          gameId,
          userId: uid,
          cardNumber: num,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        // Revert to previous states
        setSelectedCards(prevSelected);
        setPreviewCard(prevPreview);
        setTakenCards(prevTaken);

        if (res.status === 409 || data.error?.includes('taken') || data.error?.includes('unique') || data.error?.includes('23505')) {
          showToast(t ? t('card_taken') : 'This card was just taken by another player. Please choose a different one.', 'error');
        } else if (res.status === 400 && data.error?.includes('Maximum')) {
          showToast(t ? t('max_2_cards') : 'Maximum of 2 cards allowed', 'error');
        } else {
          console.error('Failed to toggle card:', data.error);
          showToast(t ? t('something_went_wrong') : 'Something went wrong. Please try again.', 'error');
        }
        await refreshGameState(gameId);
        return;
      }

      if (data.success) {
        const reservations = data.reservations || [];
        // Only update server-side data that can't be determined optimistically
        const otherCards = reservations.filter((r: any) => r.user_id !== uid).map((r: any) => r.card_number);
        setTakenCards(otherCards.filter((n: number) => n > 0));
        setLobbyPlayerCount(new Set(reservations.map((r: any) => r.user_id)).size);
      }
    } catch (e) {
      console.error('Error toggling card:', e);
      // Revert to previous states
      setSelectedCards(prevSelected);
      setPreviewCard(prevPreview);
      setTakenCards(prevTaken);
      await refreshGameState(gameId);
    }
  }, [gameId, profile?.id, selectedCards, previewCard, takenCards, refreshGameState]);

  // ============ START GAMEPLAY ============
  const startGameplay = useCallback(async (isSpectateMode: boolean) => {
    if (!selectedRoom) return;
    const activeGameId = gameId || generateDeterministicGameId(selectedRoom.id, Math.floor(Date.now() / 1000 / getRoomPeriod(selectedRoom.id)));
    const entryFee = selectedRoom.entry;

    // Set stake to total amount paid (entry fee × number of cards)
    const totalStake = isSpectateMode ? entryFee : entryFee * Math.max(1, selectedCards.length);

    let cardsToPlay: number[][][] = [];
    if (isSpectateMode) {
      const randomCard = generateCard(undefined, activeGameId); cardsToPlay = [randomCard];
      setGameCard(randomCard); setPlayerCards([randomCard]); setSelectedStake(totalStake); setIsWatching(true);
    } else {
      cardsToPlay = selectedCards.map(num => getSeededCard(num, activeGameId));
      setPlayerCards(cardsToPlay); setGameCard(cardsToPlay[0] || []); setSelectedStake(totalStake); setIsWatching(false);
    }

    setUserMarkedNumbers([0]); setGameId(activeGameId); setDrawnNumbers([]); drawnRef.current = [];
    setRecentCalled([]); setOpponentWinner(null);

    // IMMEDIATELY transition to active gameplay screen to eliminate ANY network-related lag
    const virtualCompetitors: VirtualPlayer[] = [];
    let seed = 0;
    for (let i = 0; i < activeGameId.length; i++) seed = (seed * 31 + activeGameId.charCodeAt(i)) & 0xffffffff;
    const vRand = () => { seed = (seed * 1664525 + 1013904223) & 0xffffffff; return (seed >>> 0) / 0xffffffff; };
    for (let i = 0; i < selectedRoom.players - (isSpectateMode ? 0 : 1); i++) {
      const cardSeed = Math.floor(vRand() * 200) + 1;
      virtualCompetitors.push({ username: VIRTUAL_NAMES[i % VIRTUAL_NAMES.length] + ` (#${cardSeed})`, card: getSeededCard(cardSeed, activeGameId), markedCount: 0, neededToWin: 5, hasWon: false });
    }
    setOtherPlayers(virtualCompetitors);
    setShowCardPicker(false); setInGame(true);

    const sequence = getDeterministicDrawSequence(activeGameId, appointedCard?.cardNumber);
    setDeterministicSequence(sequence);

    setIsRegistered(false); setIsSpectatingReady(false);

    // Perform game registration and statistics fetching asynchronously in the background
    (async () => {
      try {
        await registerLiveGame(activeGameId, entryFee, isSpectateMode, cardsToPlay);
        const { data: existingGame } = await supabase.from('games').select('id, prize_pool').eq('code', activeGameId).maybeSingle();
        if (existingGame) {
          const { count } = await supabase.from('game_players').select('*', { count: 'exact', head: true }).eq('game_id', existingGame.id);
          setLivePlayerCount(count || 1);
          if (existingGame.prize_pool) setPrizePool(Number(existingGame.prize_pool));
        } else {
          const { data: reservations } = await supabase.from('game_card_reservations').select('user_id').eq('game_code', activeGameId);
          if (reservations) {
            setLivePlayerCount(new Set(reservations.map(r => r.user_id)).size || 1);
          } else {
            setLivePlayerCount(selectedRoom.players);
          }
        }
      } catch (err) {
        console.warn('Background registration or stats fetch failed:', err);
        setLivePlayerCount(selectedRoom.players);
      }
    })();
  }, [selectedRoom, selectedCards, registerLiveGame, appointedCard, getDeterministicDrawSequence, gameId]);

  // Sync refs for tick interval to avoid stale closure issues
  useEffect(() => {
    startGameplayRef.current = startGameplay;
    isRegisteredRef.current = isRegistered;
    isSpectatingReadyRef.current = isSpectatingReady;
    inGameRef.current = inGame;
    selectedRoomRef.current = selectedRoom;
    commissionRateRef.current = commissionRate;
  }, [startGameplay, isRegistered, isSpectatingReady, inGame, selectedRoom, commissionRate]);

  // ============ ROOM COUNTDOWN TICK ============
  useEffect(() => {
    const tick = setInterval(() => {
      const currentSec = Math.floor(Date.now() / 1000);
      const sr = selectedRoomRef.current;
      const ig = inGameRef.current;
      const ir = isRegisteredRef.current;
      const isr = isSpectatingReadyRef.current;
      const sg = startGameplayRef.current;
      const cr = commissionRateRef.current;
      setRooms(prevRooms => prevRooms.map(r => {
        const period = getRoomPeriod(r.id);
        const elapsed = currentSec % period;
        const remaining = period - elapsed;
        if (remaining === period && sr && sr.id === r.id && !ig) {
          if (ir) sg(false);
          else if (isr) sg(true);
        }
        const roomComm = r.commission ?? cr;
        return { ...r, status: 'starting_soon' as const, countdown: remaining, winAmount: (r.entry * r.players) * (1 - roomComm / 100) };
      }));
      // Update game ID every tick based on the current cycle so the lobby always
      // shows the correct game ID for the upcoming round (not just at the 1-second
      // boundary which is easily missed).
      if (sr && !ig && !ir) {
        const period = getRoomPeriod(sr.id);
        const newCycle = Math.floor(currentSec / period);
        const newGameId = generateDeterministicGameId(sr.id, newCycle);
        setGameId(prevId => {
          if (prevId !== newGameId) {
            // Clear all game-cycle state when game ID changes (new game cycle)
            setSelectedCards([]);
            setPreviewCard([]);
            setTakenCards([]);
            setLobbyPlayerCount(0);
            setIsRegistered(false);
            setIsSpectatingReady(false);
            return newGameId;
          }
          return prevId;
        });
      }
    }, 1000);
    return () => clearInterval(tick);
  }, [inGame, selectedRoom]);

  // ============ DRAW INTERVAL ============
  useEffect(() => {
    if (!inGame || opponentWinner || deterministicSequence.length === 0) {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      return;
    }
    intervalRef.current = setInterval(() => {
      const currentDrawn = drawnRef.current;
      const nextIndex = currentDrawn.length;
      if (nextIndex >= 75) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        addGameToHistory(gameId, selectedStake || 10, 'loss');
        return;
      }
      const num = deterministicSequence[nextIndex];
      if (num === undefined) return;
      const newDrawn = [...currentDrawn, num];
      drawnRef.current = newDrawn;
      setDrawnNumbers(newDrawn);
      setRecentCalled(prev => [{ num, label: `${getColumnLabel(num)}-${num}` }, ...prev].slice(0, 10));

      if (autoWin && !isWatching && playerCards.length > 0) {
        const wonCard = playerCards.find(c => checkWin(c, newDrawn));
        if (wonCard) {
          if (autoWin && !autoMark) {
            const allMatches = [0];
            playerCards.forEach(card => { card.forEach(row => { row.forEach(n => { if (newDrawn.includes(n)) allMatches.push(n); }); }); });
            setUserMarkedNumbers(allMatches);
          }
          triggerWin(wonCard, newDrawn);
          return;
        }
      }

      // Appointed winner: force win after N balls
      if (appointedCard && newDrawn.length >= appointedCard.afterBalls && !isWatching && playerCards.length > 0) {
        const appointedGrid = getSeededCard(appointedCard.cardNumber, gameId);
        const playerHasAppointed = playerCards.some(c => JSON.stringify(c) === JSON.stringify(appointedGrid));
        if (playerHasAppointed) {
          let allMatches = [0];
          playerCards.forEach(card => { card.forEach(row => { row.forEach(n => { if (newDrawn.includes(n)) allMatches.push(n); }); }); });
          setUserMarkedNumbers(allMatches);
          triggerWin(appointedGrid, newDrawn);
          return;
        }
        // Virtual players no longer trigger loss — game continues
      }

      if (!isWatching) {
        setOtherPlayers(prev => {
          const updated = prev.map(p => {
            const markedMatrix = p.card.map(row => row.map(cell => cell === 0 || newDrawn.includes(cell)));
            let maxRowMarked = 0, maxColMarked = 0;
            markedMatrix.forEach(row => { const rowCount = row.filter(cell => cell).length; if (rowCount > maxRowMarked) maxRowMarked = rowCount; });
            for (let col = 0; col < 5; col++) { let colCount = 0; for (let row = 0; row < markedMatrix.length; row++) if (markedMatrix[row]?.[col]) colCount++; if (colCount > maxColMarked) maxColMarked = colCount; }
            const neededToWin = Math.min(Math.max(0, 5 - maxRowMarked), Math.max(0, 5 - maxColMarked));
            return { ...p, markedCount: Math.max(maxRowMarked, maxColMarked), neededToWin, hasWon: neededToWin === 0 };
          });
          // Virtual players no longer trigger loss — game continues until real player wins or all balls drawn
          return updated;
        });
      }
    }, 2000);
    return () => { if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; } };
  }, [inGame, opponentWinner, language, isWatching, gameId, selectedStake, addGameToHistory, playerCards, autoMark, autoWin, deterministicSequence, appointedCard]);

  // ============ REF SYNC ============
  useEffect(() => { drawnRef.current = drawnNumbers; }, [drawnNumbers]);

  // ============ LIVE PLAYER COUNT POLLING ============
  const liveCountRef = useRef<number>(1);
  useEffect(() => {
    if (!inGame || !gameId) return;
    liveCountRef.current = livePlayerCount;
  }, [livePlayerCount]);
  useEffect(() => {
    if (!inGame || !gameId) return;
    const poll = setInterval(async () => {
      try {
        const { data: g } = await supabase.from('games').select('id, prize_pool').eq('code', gameId).maybeSingle();
        if (g) {
          const { count } = await supabase.from('game_players').select('*', { count: 'exact', head: true }).eq('game_id', g.id).eq('is_watching', false);
          if (count !== null && count !== liveCountRef.current) { liveCountRef.current = count; setLivePlayerCount(count); }
          if (g.prize_pool) setPrizePool(Number(g.prize_pool));
        }
      } catch {}
    }, 1000);
    return () => clearInterval(poll);
  }, [inGame, gameId]);

  // ============ CARD RESERVATION POLLING (1s fallback) ============
  const reservationPollRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (!selectedRoom || !gameId || inGame) {
      if (reservationPollRef.current) { clearInterval(reservationPollRef.current); reservationPollRef.current = null; }
      return;
    }
    reservationPollRef.current = setInterval(() => { refreshTakenCards(gameId); }, 1000);
    return () => { if (reservationPollRef.current) { clearInterval(reservationPollRef.current); reservationPollRef.current = null; } };
  }, [selectedRoom?.id, gameId, inGame, refreshTakenCards]);

  // ============ AUTO-MARK ============
  useEffect(() => {
    if (autoMark && inGame && playerCards.length > 0) {
      const allMatches = [0];
      playerCards.forEach(card => { card.forEach(row => { row.forEach(num => { if (drawnNumbers.includes(num)) allMatches.push(num); }); }); });
      setUserMarkedNumbers(allMatches);
    }
  }, [autoMark, drawnNumbers, inGame, playerCards]);

  // ============ AUTO-WIN ============
  useEffect(() => {
    if (autoWin && inGame && !isWatching && playerCards.length > 0) {
      const wonCard = playerCards.find(c => checkWin(c, drawnNumbers));
      if (wonCard) {
        const allMatches = [0];
        playerCards.forEach(card => { card.forEach(row => { row.forEach(num => { if (drawnNumbers.includes(num)) allMatches.push(num); }); }); });
        setUserMarkedNumbers(allMatches);
        triggerWin(wonCard, drawnNumbers);
      }
    }
  }, [autoWin, inGame, isWatching, playerCards, drawnNumbers]);

  // ============ TRIGGER WIN ============
  const triggerWin = useCallback(async (card: number[][], drawn: number[]) => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setWinningCard(card);
    setWinningCells(getWinningCells(card, drawn));
    setShowWinModal(true);

    if (profile?.id) {
      try {
        const res = await fetch('/api/public/game/engine', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'validate_win', gameId, userId: profile.id, drawnNumbers: drawn }),
        });
        const data = await res.json();
        if (data.success) {
          addGameToHistory(gameId, selectedStake || 10, 'win');
          await refreshWallet();
        } else if (data.error === 'Game already finished') {
          if (data.winner_id === profile.id) {
            addGameToHistory(gameId, selectedStake || 10, 'win');
            await refreshWallet();
          } else {
            setShowWinModal(false);
            setOpponentWinner(data.winner_id ? 'Another Player' : null);
            if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
            await refreshWallet();
          }
        } else {
          await refreshWallet();
        }
      } catch {}
    }
  }, [gameId, selectedStake, addGameToHistory, refreshWallet, profile?.id]);

  // ============ SELECT STAKE / ROOM ============
  const selectStake = useCallback((stake: number) => {
    setSelectedStake(stake); setSelectedCards([]); setPreviewCard([]); setCardPickerCountdown(50); setShowCardPicker(true);
  }, []);

  const handleJoinRoom = useCallback((room: RoomConfig) => {
    const period = getRoomPeriod(room.id);
    const currentSec = Math.floor(Date.now() / 1000);
    const elapsed = currentSec % period;
    const remaining = period - elapsed;
    const targetCycle = elapsed === 0 ? Math.floor(currentSec / period) : Math.floor((currentSec + remaining) / period);
    const nextGameId = generateDeterministicGameId(room.id, targetCycle);
    setSelectedRoom(room);
    setSelectedStake(room.entry);
    setSelectedCards([]);
    setPreviewCard([]);
    setTakenCards([]);
    setLobbyPlayerCount(0);
    setIsRegistered(false);
    setIsSpectatingReady(false);
    setGameId(nextGameId);
  }, []);

  // ============ PLAY / REGISTER / LEAVE ============
  const watchGame = useCallback(async () => {
    setIsSpectatingReady(true);
    const uid = profile?.id;
    if (gameId && isValidUUID(uid)) {
      try {
        await fetch('/api/public/game/lobby', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'watch_game', gameId, userId: uid }),
        });
      } catch (e) {
        console.error('Failed to register watch:', e);
      }
    }
  }, [gameId, profile?.id]);

  const playWithCard = useCallback(async () => {
    if (selectedCards.length === 0) return;
    const fee = selectedRoom ? selectedRoom.entry : 10;
    const stakeAmount = fee * selectedCards.length;
    const totalBal = (wallet?.main_balance || 0) + (wallet?.play_balance || 0);
    if (totalBal < stakeAmount) return;
    const playBal = wallet?.play_balance || 0;
    // Deduct from play balance first, then main balance if needed
    // Both wallets can be used together to cover the stake
    if (playBal >= stakeAmount) {
      await updateBalance(-stakeAmount, 'play_balance');
    } else {
      // Use all play balance first, then remainder from main balance
      await updateBalance(-playBal, 'play_balance');
      await updateBalance(-(stakeAmount - playBal), 'main_balance');
    }
    // Refresh wallet from server to ensure accurate balance after both deductions
    await refreshWallet();
    setIsRegistered(true);
  }, [selectedCards, selectedRoom, wallet, updateBalance, refreshWallet]);

  const unregisterLobby = useCallback(async () => {
    if (isRegistered) {
      const fee = selectedRoom ? selectedRoom.entry : 10;
      const refundAmount = fee * selectedCards.length;
      // Refund to play balance (gameplay wallet) since that's where game funds belong
      await updateBalance(refundAmount, 'play_balance');
      await refreshWallet();
      setIsRegistered(false);
    }
    const uid = profile?.id;
    if (gameId && isValidUUID(uid)) {
      try {
        await fetch('/api/public/game/lobby', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'leave_game', gameId, userId: uid }),
        });
      } catch (e) {
        console.error('Failed to leave game on server:', e);
      }
    }
    setIsSpectatingReady(false); setTakenCards([]); setLobbyPlayerCount(0);
  }, [isRegistered, selectedCards, selectedRoom, updateBalance, refreshWallet, gameId, profile?.id]);

  const leaveGame = useCallback(async () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (inGame && !isWatching && gameId && !showWinModal && !opponentWinner) addGameToHistory(gameId, selectedStake || 10, 'loss');
    const uid = profile?.id;
    if (gameId && isValidUUID(uid)) {
      try {
        await fetch('/api/public/game/lobby', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'leave_game', gameId, userId: uid }),
        });
      } catch (e) {
        console.error('Failed to leave game on server:', e);
      }
    }
    setInGame(false); setIsWatching(false); setGameCard([]); setDrawnNumbers([]);
    drawnRef.current = []; setSelectedStake(null); setSelectedCards([]); setRecentCalled([]);
    setShowWinModal(false); setWinningCard([]); setWinningCells([]);
    setOtherPlayers([]); setOpponentWinner(null);
    await refreshWallet();
    setTakenCards([]); setLobbyPlayerCount(0);
    if (realtimeChannelRef.current) { supabase.removeChannel(realtimeChannelRef.current); realtimeChannelRef.current = null; }
  }, [inGame, isWatching, gameId, showWinModal, opponentWinner, selectedStake, addGameToHistory, profile?.id, refreshWallet]);

  const handleLeaveAttempt = useCallback(() => {
    if (isWatching) leaveGame();
    else { setPendingTab(null); setShowLeaveModal(true); }
  }, [isWatching, leaveGame]);

  // ============ MANUAL DRAW ============
   const manualDraw = useCallback(() => {
    const currentDrawn = drawnRef.current;
    if (currentDrawn.length >= 75) return;
    const rem = Array.from({ length: 75 }, (_, i) => i + 1).filter(n => !currentDrawn.includes(n));
    const num = rem[Math.floor(Math.random() * rem.length)];
    const newDrawn = [...currentDrawn, num];
    drawnRef.current = newDrawn; setDrawnNumbers(newDrawn);
    setRecentCalled(prev => [{ num, label: `${getColumnLabel(num)}-${num}` }, ...prev].slice(0, 10));
    if (autoWin && gameCard.length > 0 && !isWatching && checkWin(gameCard, newDrawn)) triggerWin(gameCard, newDrawn);
  }, [autoWin, language, gameCard, isWatching]);

  // ============ BINGO CLAIM ============
  const handleBingo = useCallback(() => {
    if (playerCards.length > 0) {
      const checkAgainst = autoMark ? drawnRef.current : userMarkedNumbers;
      const wonCard = playerCards.find(c => checkWin(c, checkAgainst));
      if (wonCard) { triggerWin(wonCard, drawnRef.current); }
      else { showToast(language === 'en' ? 'Not a valid BINGO yet!' : 'ትክክለኛ ቢንጎ የለም!', 'error'); }
    }
  }, [playerCards, autoMark, userMarkedNumbers, language]);

  // ============ RESULT COUNTDOWN ============
  useEffect(() => { setResultCountdown(showWinModal || opponentWinner ? 5 : null); }, [showWinModal, opponentWinner]);
  useEffect(() => {
    if (resultCountdown === null) return;
    if (resultCountdown <= 0) {
      if (showWinModal) setShowWinModal(false);
      if (opponentWinner) setOpponentWinner(null);
      leaveGame(); return;
    }
    const timer = setTimeout(() => setResultCountdown(prev => (prev !== null ? prev - 1 : null)), 1000);
    return () => clearTimeout(timer);
  }, [resultCountdown, showWinModal, opponentWinner, leaveGame]);

  // ============ REFERRAL ============
  useEffect(() => {
    if (typeof window !== 'undefined') { try { const saved = localStorage.getItem('nile_bingo_referrals'); if (saved) setReferralCount(parseInt(saved, 10)); } catch {} }
  }, []);

  const inviteLink = `https://t.me/${botUsername}?start=ref_${profile?.telegram_id || 'player'}`;

  const copyRefLink = useCallback(() => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) { navigator.clipboard.writeText(inviteLink); setCopiedLink(true); setTimeout(() => setCopiedLink(false), 2000); }
  }, [inviteLink]);

  const simulateReferralJoin = useCallback(() => {
    const nextCount = referralCount + 1;
    setReferralCount(nextCount);
    if (typeof window !== 'undefined') localStorage.setItem('nile_bingo_referrals', nextCount.toString());
    updateBalance(referralBonus, 'play_balance');
    setToastMessage(`${t('friend_registered') || 'Friend Registered!'} +${referralBonus} ${t('birr')}`);
    setToastType('success');
    setShowRefToast(true); setTimeout(() => setShowRefToast(false), 3500);
  }, [referralCount, updateBalance, referralBonus, t]);

  const showToast = useCallback((message: string, type: 'error' | 'success' | 'info' = 'error') => {
    setToastMessage(message);
    setToastType(type);
    setShowRefToast(true);
    setTimeout(() => setShowRefToast(false), 3500);
  }, []);

  const navigateToWallet = useCallback(() => { setWalletView('main'); setActiveTab('wallet'); }, [setActiveTab]);

  // ============ TAB HANDLING ============
  const handleTabChange = useCallback((tab: 'game' | 'scores' | 'history' | 'wallet' | 'profile') => {
    if (inGame && !isWatching) { setPendingTab(tab); setShowLeaveModal(true); }
    else { setActiveTab(tab); }
  }, [inGame, isWatching, setActiveTab]);

  const handleMarkNumber = useCallback((num: number) => {
    setUserMarkedNumbers(prev => prev.includes(num) ? prev.filter(n => n !== num) : [...prev, num]);
  }, []);

  // ============ RENDER ============
  const renderContent = () => {
    if (activeTab === 'scores') return <ScoresTab profile={profile} wallet={wallet} dbLeaderboard={dbLeaderboard} t={t} />;
    if (activeTab === 'history') return <HistoryTab stakeHistory={stakeHistory} t={t} />;
    if (activeTab === 'wallet') return <WalletTab wallet={wallet} botUsername={botUsername} referralEnabled={referralEnabled} referralBonus={referralBonus} referralCount={referralCount} inviteLink={inviteLink} copiedLink={copiedLink} withdrawMinAmount={withdrawMinAmount} withdrawRequiredGames={withdrawRequiredGames} t={t} onCopyRefLink={copyRefLink} onSimulateReferral={simulateReferralJoin} />;
    if (activeTab === 'profile') return <ProfileTab profile={profile} wallet={wallet} stakeHistory={stakeHistory} language={language} t={t} onSetLanguage={setLanguage} onUpdateAvatar={updateAvatar} />;

    // Game tab
    if (inGame) {
      const resultMode = showWinModal ? 'win' : opponentWinner ? 'loss' : null;
      const roomForCommission = rooms.find(r => r.entry === (selectedStake || 10));
      const effectiveComm = roomForCommission?.commission ?? commissionRate;
      return (
        <>
          <GameView
            profile={profile} gameCard={gameCard} playerCards={playerCards} selectedCards={selectedCards}
            drawnNumbers={drawnNumbers} gameId={gameId} selectedStake={selectedStake || 10}
            inGame={inGame} isWatching={isWatching} autoMark={autoMark} autoWin={autoWin}
            userMarkedNumbers={userMarkedNumbers}
            language={language} livePlayerCount={livePlayerCount}
            recentCalled={recentCalled} opponentWinner={opponentWinner}
            showWinModal={showWinModal} showLossModal={opponentWinner !== null} showLeaveModal={showLeaveModal}
            winningCard={winningCard} winningCells={winningCells} commissionRate={effectiveComm}
            prizePool={prizePool} resultCountdown={resultCountdown} t={t}
            onSetAutoMark={setAutoMark} onSetAutoWin={setAutoWin}
            onManualDraw={manualDraw} onBingo={handleBingo} onLeave={leaveGame}
            onLeaveAttempt={handleLeaveAttempt}
            onForfeitExit={() => { setShowLeaveModal(false); leaveGame(); if (pendingTab) { setActiveTab(pendingTab); setPendingTab(null); } }}
            onCancelLeave={() => setShowLeaveModal(false)}
            onSkipResult={() => { setShowWinModal(false); setOpponentWinner(null); leaveGame(); }}
            onMarkNumber={handleMarkNumber}
          />
        </>
      );
    }

    if (selectedRoom) {
      const roomTick = rooms.find(r => r.id === selectedRoom.id) || selectedRoom;
      return (
        <RoomLobby
          room={roomTick} gameId={gameId}
          selectedCards={selectedCards} takenCards={takenCards}
          lobbyPlayerCount={lobbyPlayerCount} previewCard={previewCard}
          isRegistered={isRegistered} walletBalance={(wallet?.main_balance || 0) + (wallet?.play_balance || 0)}
          wallet={wallet} t={t}
          onBack={() => { setSelectedRoom(null); setSelectedCards([]); setPreviewCard([]); }}
          onToggleCard={toggleCard}
          onPlay={playWithCard}
          onUnregister={unregisterLobby}
          onDeposit={() => { setSelectedCards([]); setPreviewCard([]); setSelectedRoom(null); setWalletView('deposit'); setActiveTab('wallet'); }}
          commissionRate={selectedRoom.commission ?? commissionRate}
        />
      );
    }

    return (
      <>
        <HomeView
          rooms={rooms} selectedStake={selectedStake} wallet={wallet}
          appName={appName} appLogo={appLogo} appLogoPng={appLogoPng} commissionRate={commissionRate}
          themeColor={getThemeColor()} themeColorDark={getThemeColorDark()}
          t={t}
          onSelectStake={selectStake}
          onPlay={() => {
            if (selectedStake !== null) {
              const matchedRoom = rooms.find(r => r.entry === selectedStake) || rooms[0];
              handleJoinRoom(matchedRoom);
            }
          }}
          onShowRules={() => setShowRules(true)}
          onGoToWallet={navigateToWallet}
        />
        <RulesModal show={showRules} onClose={() => setShowRules(false)} t={t} rulesText={rulesText} />
      </>
    );
  };

  // ============ THEME ============
  const getThemeColor = () => {
    const map: Record<string, string> = { emerald: '#10b981', ruby: '#ef4444', sapphire: '#3b82f6', amethyst: '#a855f7' };
    return map[colorScheme] || '#FEE800';
  };
  const getThemeColorDark = () => {
    const map: Record<string, string> = { emerald: '#059669', ruby: '#991b1b', sapphire: '#1d4ed8', amethyst: '#6b21a8' };
    return map[colorScheme] || '#e5d100';
  };
  const getThemeGlow = () => {
    const map: Record<string, string> = { emerald: 'rgba(16,185,129,0.3)', ruby: 'rgba(239,68,68,0.3)', sapphire: 'rgba(59,130,246,0.3)', amethyst: 'rgba(168,85,247,0.3)' };
    return map[colorScheme] || 'rgba(254,232,0,0.3)';
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="text-center">{appLogoPng ? <img src={appLogoPng} alt="Logo" className="h-12 w-12 object-contain mx-auto mb-4" /> : <div className="text-4xl font-black mb-4 animate-pulse" style={{ color: getThemeColor() }}>{appLogo}</div>}<div className="text-4xl font-black mb-4 animate-pulse" style={{ color: getThemeColor() }}>{appName}</div><div className="text-gray-400 text-sm">{t('loading')}</div></div></div>;

  return (
    <div className="min-h-screen pb-20">
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --theme-gold: ${getThemeColor()};
          --theme-gold-dark: ${getThemeColorDark()};
          --theme-gold-glow: ${getThemeGlow()};
        }
        .text-gold { color: var(--theme-gold) !important; }
        .bg-gold { background-color: var(--theme-gold) !important; }
        .border-gold { border-color: var(--theme-gold) !important; }
      ` }} />
      {renderContent()}
      <TabBar activeTab={activeTab} onTabChange={handleTabChange} inGame={inGame} themeColor={getThemeColor()} />

      {showRefToast && (
        <div className={`fixed bottom-24 left-4 right-4 z-50 backdrop-blur border-2 py-3 px-4 rounded-2xl font-bold flex items-center justify-between text-xs shadow-2xl animate-bounce ${
          toastType === 'success'
            ? 'bg-[#162a45]/95 border-emerald-500/40 text-emerald-300'
            : toastType === 'info'
              ? 'bg-[#1a2b4b]/95 border-blue-500/40 text-blue-300'
              : 'bg-[#2a1620]/95 border-red-500/40 text-red-300'
        }`}>
          <div className="flex items-center gap-2.5">
            <span className="text-base">{toastType === 'success' ? '🎉' : toastType === 'info' ? 'ℹ️' : '⚠️'}</span>
            <div>
              <p className={`text-white font-black text-[12px] ${toastType === 'error' ? 'text-red-200' : ''}`}>{toastMessage}</p>
            </div>
          </div>
          <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-black tracking-wide border ${
            toastType === 'success'
              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
              : toastType === 'info'
                ? 'bg-blue-500/10 text-blue-300 border-blue-500/20'
                : 'bg-red-500/10 text-red-300 border-red-500/20'
          }`}>{toastType}</span>
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return <AppProvider><HomePage /></AppProvider>;
}
