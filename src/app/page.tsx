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

const VIRTUAL_NAMES = ['Abdu', 'Aster', 'Kebede', 'Almaz', 'Chala', 'Tigist', 'Sintayehu', 'Solomon', 'Marta', 'Biniam'];

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

function hasActiveCurrentCycle(roomId: string, activeCodes: Set<string>): boolean {
  const currentSec = Math.floor(Date.now() / 1000);
  const period = getRoomPeriod(roomId);
  const currentCycle = Math.floor(currentSec / period);
  return activeCodes.has(generateDeterministicGameId(roomId, currentCycle));
}

// Old function kept for backward reference but now only checks current cycle
function hasAnyActiveGameForRoom(roomId: string, activeCodes: Set<string>): boolean {
  return hasActiveCurrentCycle(roomId, activeCodes);
}

function HomePage() {
  const { profile, wallet, language, activeTab, loading, t, setActiveTab, setLanguage, initialize, updateBalance, updateAvatar, updateName, refreshWallet } = useApp();

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
  const [livePlayerCount, setLivePlayerCount] = useState(1);
  const [reservedCardCount, setReservedCardCount] = useState(0);
  const [prizePool, setPrizePool] = useState(0);
  const [gameId, setGameId] = useState('');
  const [previewCard, setPreviewCard] = useState<number[][]>([]);
  const [serverTimeOffset, setServerTimeOffset] = useState<number | null>(null);
  const serverTimeOffsetRef = useRef<number | null>(null);
  const [showWinModal, setShowWinModal] = useState(false);
  const [resultCountdown, setResultCountdown] = useState<number | null>(null);
  const [winningCards, setWinningCards] = useState<number[][][]>([]);
  const [winningCells, setWinningCells] = useState<boolean[][]>([]);
  const [allWinners, setAllWinners] = useState<any[]>([]);
  const [isPendingWin, setIsPendingWin] = useState(false);
  const [winMessage, setWinMessage] = useState('');
  const [finalWinAmount, setFinalWinAmount] = useState(0);
  const [totalWinAmount, setTotalWinAmount] = useState(0);
  const [winnerCount, setWinnerCount] = useState(1);
  const drawnRef = useRef<number[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const realtimeChannelRef = useRef<any>(null);
  const [takenCards, setTakenCards] = useState<number[]>([]);
  const [lobbyPlayerCount, setLobbyPlayerCount] = useState<number>(0);
  const winInProgressRef = useRef(false);
  const leaveGameRef = useRef<(() => Promise<void>) | null>(null);

  const [selectedRoom, setSelectedRoom] = useState<RoomConfig | null>(null);
  const [commissionRate, setCommissionRate] = useState<number>(15);
  const [appName, setAppName] = useState<string>('Nile BINGO');
  const [appLogo, setAppLogo] = useState<string>('');
  const [appLogoPng, setAppLogoPng] = useState<string | null>('/logo.png');
  const [botUsername, setBotUsername] = useState<string>('yenedating_bot');
  const [colorScheme, setColorScheme] = useState<string>('gold');
  const [rulesText, setRulesText] = useState<string>('');
  const [selectedRoomActive, setSelectedRoomActive] = useState(false);
  const [telegramAvailable, setTelegramAvailable] = useState<boolean | null>(null);

  const [rooms, setRooms] = useState<RoomConfig[]>([
    { id: 'bronze', name: 'Bronze Room', entry: 10, players: 10, maxPlayers: 100, commission: 15, winAmount: 85, status: 'starting_soon', countdown: 50 },
    { id: 'silver', name: 'Silver Room', entry: 20, players: 12, maxPlayers: 100, commission: 15, winAmount: 204, status: 'starting_soon', countdown: 50 },
    { id: 'gold', name: 'Gold Room', entry: 50, players: 15, maxPlayers: 100, commission: 15, winAmount: 638, status: 'starting_soon', countdown: 50 },
    { id: 'diamond', name: 'Diamond Room', entry: 100, players: 20, maxPlayers: 100, commission: 15, winAmount: 1700, status: 'starting_soon', countdown: 50 },
    { id: 'premium', name: 'Premium Room', entry: 200, players: 5, maxPlayers: 100, commission: 15, winAmount: 850, status: 'starting_soon', countdown: 50 },
    { id: 'vip', name: 'VIP Room', entry: 500, players: 2, maxPlayers: 100, commission: 15, winAmount: 850, status: 'starting_soon', countdown: 50 },
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
  const [walletView, setWalletView] = useState<'main' | 'deposit' | 'withdraw' | 'transfer' | 'transactions'>('main');
  const [withdrawMinAmount, setWithdrawMinAmount] = useState<number>(50);
  const [withdrawRequiredGames, setWithdrawRequiredGames] = useState<number>(5);

  // Refs for values used in the room tick interval to prevent unnecessary re-creation
  const selectedRoomRef = useRef<RoomConfig | null>(null);
  const isRegisteredRef = useRef(false);
  const isSpectatingReadyRef = useRef(false);
  const inGameRef = useRef(false);
  const selectedCardsRef = useRef<number[]>([]);
  const commissionRateRef = useRef(15);
  const startGameplayRef = useRef<any>(null);
  const startGameplayLockRef = useRef(false);
  const refreshGameStateRef = useRef<any>(null);
  const refreshTakenCardsRef = useRef<any>(null);
  const tickReadyRef = useRef(false);
  const gameRealtimeRef = useRef<any>(null);
  const lockedGameIdRef = useRef<string | null>(null);
  const gameIdRef = useRef('');
  const gameStatusChannelRef = useRef<any>(null);
  const opponentWinnerRef = useRef<string | null>(null);
  const activeGameCodesRef = useRef<Set<string>>(new Set());
  const activeStakesRef = useRef<Set<number>>(new Set());
  const gameEndTimersRef = useRef<Record<string, number>>({});
  const prevIsPlayingRef = useRef<Record<string, boolean>>({});

  // ============ DETERMINISTIC DRAW SEQUENCE ============

  const getDeterministicDrawSequence = useCallback((gId: string, targetCardNum?: number | null) => {
    // Derive seed from game code so every game has a unique draw order
    let seed = 0;
    for (let i = 0; i < gId.length; i++) seed = ((seed << 5) - seed + gId.charCodeAt(i)) | 0;
    if (seed === 0) seed = 12345;
    const rand = () => { seed = (seed * 1664525 + 1013904223) & 0xffffffff; return (seed >>> 0) / 0xffffffff; };
    const allBalls = Array.from({ length: 75 }, (_, i) => i + 1);
    const seq: number[] = [];
      if (targetCardNum && targetCardNum >= 1 && targetCardNum <= 400) {
      const targetCard = getSeededCard(targetCardNum);
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

  const getCurrentLobbyGameId = useCallback(async (roomId: string) => {
    if (!roomId) return null;
    try {
      const query = new URLSearchParams({ roomId });
      if (profile?.id) query.set('userId', profile.id);
      const res = await fetch(`/api/public/game/lobby?${query.toString()}`);
      const data = await res.json();
      if (data?.success && data.gameId) {
        if (data.serverTime) {
          const serverMs = new Date(data.serverTime).getTime();
          const offset = serverMs - Date.now();
          setServerTimeOffset(offset);
          serverTimeOffsetRef.current = offset;
        }
        return data.gameId as string;
      }
    } catch {}
    const currentSec = Math.floor(Date.now() / 1000);
    const period = getRoomPeriod(roomId);
    const cycle = Math.floor(currentSec / period);
    return generateDeterministicGameId(roomId, cycle);
  }, [profile?.id]);

  const getRoomCountdown = useCallback((period: number) => {
    const offset = serverTimeOffsetRef.current ?? 0;
    const now = Date.now() + offset;
    const currentSec = Math.floor(now / 1000);
    const remaining = period - (currentSec % period);
    return remaining <= 0 ? period : remaining;
  }, []);

  const addGameToHistory = useCallback((gId: string, totalStakeAmt: number, outcome: 'win' | 'loss', actualPrizeAmount?: number) => {
    if (isWatching || !gId) return;

    const totalStake = Number(totalStakeAmt || selectedStake || (selectedRoom?.entry || 10) * Math.max(1, selectedCardsRef.current.length || playerCards.length || 1));
    const cardCount = Math.max(1, selectedCardsRef.current.length || playerCards.length || 1);
    const stakePerCard = totalStake / cardCount;
    const actualPrize = actualPrizeAmount !== undefined
      ? actualPrizeAmount
      : outcome === 'win'
        ? Math.max(0, totalStake * (1 - commissionRate / 100))
        : -totalStake;

    setStakeHistory(prev => {
      const exists = prev.some(item => item.gameId === gId && item.result === outcome);
      if (exists) return prev;
      const filtered = prev.filter(item => item.gameId !== gId || item.result !== outcome);
      const newHistory = [{ gameId: gId, stake: totalStake, result: outcome, prize: actualPrize, timestamp: new Date().toISOString() }, ...filtered].slice(0, 10);
      try { localStorage.setItem('nile_bingo_stake_history', JSON.stringify(newHistory)); } catch {}
      return newHistory;
    });
    if (profile?.id) {
      fetch('/api/public/games/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: gId,
            userId: profile.id,
            stakeAmount: stakePerCard,
            cardCount,
            outcome,
            drawnNumbers: drawnRef.current || [],
            roomName: selectedRoom?.name || 'Quick Lobby',
            prize: outcome === 'win' ? actualPrize : undefined,
          })
      }).catch(() => {});
    }
  }, [isWatching, profile?.id, selectedRoom, selectedStake, commissionRate]);

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
            status: 'starting_soon' as const, countdown: 50,
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
      const params = profile?.id ? `?userId=${profile.id}` : '';
      fetch(`/api/public/leaderboard${params}`).then(r => r.json()).then(data => {
        if (data && Array.isArray(data.leaderboard)) setDbLeaderboard(data.leaderboard);
      }).catch(() => {});
    }
  }, [activeTab, profile?.id]);

  // ============ GAME HISTORY FETCH ============
  useEffect(() => {
    if ((activeTab === 'profile' || activeTab === 'history') && profile?.id && isValidUUID(profile.id)) {
      fetch(`/api/public/history?userId=${profile.id}`).then(r => r.json()).then(data => {
        if (data && Array.isArray(data.history) && data.history.length > 0) {
          setStakeHistory(prev => {
            const serverEntries = data.history.map((h: any) => ({
              gameId: h.gameCode,
              stake: h.stake,
              result: h.result,
              prize: h.winAmount,
              timestamp: h.createdAt,
            }));
            const merged = [...serverEntries];
            for (const s of prev) {
              if (!merged.some(m => m.gameId === s.gameId && m.result === s.result)) {
                merged.push(s);
              }
            }
            return merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 50);
          });
        }
      }).catch(() => {});
    }
  }, [activeTab, profile?.id]);

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
        const reservedCount = reservations.filter((r: any) => Number(r.card_number) > 0).length;
        setLobbyPlayerCount(Math.max(uniqueUserIds.size, data.livePlayerCount || 0));
        setReservedCardCount(Math.max(reservedCount, selectedCardsRef.current.length));

        const myRes = reservations.filter((r: any) => r.user_id === profile.id).map((r: any) => r.card_number);
        const activeMyRes = myRes.filter((n: number) => n > 0);
        setSelectedCards(activeMyRes);
        setPreviewCard(activeMyRes.length > 0 ? getSeededCard(activeMyRes[activeMyRes.length - 1]) : []);
      }
    } catch (e) {
      console.error('Failed to refresh game state:', e);
    }
  }, [profile?.id]);

  useEffect(() => {
    if (!selectedRoom || !gameId || inGame) return;
    refreshGameStateRef.current = refreshGameState;
    refreshGameState(gameId);
  }, [selectedRoom?.id, gameId, inGame]);

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
        const reservedCount = reservations.filter((r: any) => Number(r.card_number) > 0).length;
        setTakenCards(otherCards.filter((n: number) => n > 0));
        const uniqueUserIds = new Set(reservations.map((r: any) => r.user_id));
        setLobbyPlayerCount(Math.max(uniqueUserIds.size, data.livePlayerCount || 0));
        setReservedCardCount(Math.max(reservedCount, selectedCardsRef.current.length));
      }
    } catch (e) {
      // Silent fail for polling
    }
  }, [profile?.id]);

  useEffect(() => {
    if (!selectedRoom || !gameId || inGame) return;
    refreshTakenCardsRef.current = refreshTakenCards;
    const channel = supabase.channel(`game-${gameId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_card_reservations', filter: `game_code=eq.${gameId}` }, () => refreshTakenCards(gameId))
      .subscribe();
    realtimeChannelRef.current = channel;
    return () => { if (realtimeChannelRef.current) { supabase.removeChannel(realtimeChannelRef.current); realtimeChannelRef.current = null; } };
  }, [selectedRoom?.id, gameId, inGame]);

  // ============ INIT & VOICE ============
  useEffect(() => { if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.getVoices(); }, []);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const tryTelegram = () => {
      const tg = (window as any).Telegram?.WebApp;
      if (!tg) return false;
      const telegramUser = tg?.initDataUnsafe?.user;
      const telegramId = telegramUser?.id ? String(telegramUser.id) : null;
      if (telegramId) {
        setTelegramAvailable(true);
        tg?.ready();
        tg?.expand();
        initialize(telegramId, telegramUser?.first_name, telegramUser?.username);
        return true;
      }
      return false;
    };
    if (!tryTelegram()) {
      // Script loads asynchronously — poll for up to 5s
      let attempts = 0;
      const iv = setInterval(() => {
        attempts++;
        if (tryTelegram() || attempts >= 10) {
          clearInterval(iv);
          if (!(window as any).Telegram?.WebApp) setTelegramAvailable(false);
        }
      }, 500);
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

  // ============ CARD TOGGLE (local-only — no server reservation until bet) ============
  const toggleCard = useCallback((num: number) => {
    if (!gameId || !profile?.id || !isValidUUID(profile.id)) return;

    const isSelected = selectedCards.includes(num);

    if (!isSelected && selectedCards.length >= 2) {
      showToast(t ? t('max_2_cards') : 'Maximum of 2 cards allowed', 'error');
      return;
    }

    const nextSelected = isSelected
      ? selectedCards.filter(c => c !== num)
      : [...selectedCards, num];

    setSelectedCards(nextSelected);
    setPreviewCard(nextSelected.length > 0 ? getSeededCard(nextSelected[nextSelected.length - 1]) : []);
  }, [gameId, profile?.id, selectedCards]);

  // ============ START GAMEPLAY ============
  const startGameplay = useCallback(async (isSpectateMode: boolean) => {
    if (!selectedRoom) return;
    if (startGameplayLockRef.current) { console.log('[startGameplay] already in progress, skipping'); return; }
    startGameplayLockRef.current = true;
    try {
      const activeGameId = lockedGameIdRef.current || gameIdRef.current || await getCurrentLobbyGameId(selectedRoom.id) || generateDeterministicGameId(selectedRoom.id, Math.floor(Date.now() / 1000 / getRoomPeriod(selectedRoom.id)));
    const entryFee = selectedRoom.entry;

    // Set stake to total amount paid (entry fee × number of cards)
    const totalStake = isSpectateMode ? entryFee : entryFee * Math.max(1, selectedCards.length);

    let cardsToPlay: number[][][] = [];
    if (isSpectateMode) {
      const randomCard = generateCard(); cardsToPlay = [randomCard];
      setGameCard(randomCard); setPlayerCards([randomCard]); setSelectedStake(totalStake); setIsWatching(true);
    } else {
      cardsToPlay = selectedCards.map(num => getSeededCard(num));
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
      virtualCompetitors.push({ username: VIRTUAL_NAMES[i % VIRTUAL_NAMES.length] + ` (#${cardSeed})`, card: getSeededCard(cardSeed), markedCount: 0, neededToWin: 5, hasWon: false });
    }
    setOtherPlayers(virtualCompetitors);
    setShowCardPicker(false); setInGame(true);
    // Pre-set prize pool from local estimate so the display doesn't flash 0
    // Use same formula as waiting screen: fee * totalCards * (1 - commission/100)
    const effComm = selectedRoom.commission ?? commissionRate;
    const totalCards = Math.max(reservedCardCount, selectedCards.length, 1);
    setPrizePool(entryFee * totalCards * (1 - effComm / 100));

    const sequence = getDeterministicDrawSequence(activeGameId, appointedCard?.cardNumber);
    setDeterministicSequence(sequence);

    setIsRegistered(false); setIsSpectatingReady(false);

    // Perform game registration and statistics fetching asynchronously in the background
    // Prize pool uses same formula as waiting screen: fee * totalCards * (1 - commission/100)
    (async () => {
      try {
        await registerLiveGame(activeGameId, entryFee, isSpectateMode, cardsToPlay);
        // Always query actual card reservation count for consistent prize calculation
        const { count: actualCardCount } = await supabase.from('game_card_reservations').select('*', { count: 'exact', head: true }).eq('game_code', activeGameId).gt('card_number', 0);
        const totalCards = Math.max(actualCardCount || 0, selectedCardsRef.current.length || 1, 1);
        const { data: existingGame } = await supabase.from('games').select('id, prize_pool').eq('code', activeGameId).maybeSingle();
        if (existingGame) {
          const { count } = await supabase.from('game_players').select('*', { count: 'exact', head: true }).eq('game_id', existingGame.id);
          setLivePlayerCount(count || 1);
          setPrizePool(Number(existingGame.prize_pool) || entryFee * totalCards * (1 - effComm / 100));
        } else {
          const { data: reservations } = await supabase.from('game_card_reservations').select('user_id, card_number').eq('game_code', activeGameId);
          const totalPlayerCount = reservations ? new Set(reservations.map(r => r.user_id)).size : 0;
          setLivePlayerCount(Math.max(totalPlayerCount || 0, selectedCardsRef.current.length || 1, 1));
          setPrizePool(entryFee * totalCards * (1 - effComm / 100));
        }
      } catch (err) {
        console.warn('Background registration or stats fetch failed:', err);
        setLivePlayerCount(selectedRoom.players);
      }
    })();
    } finally { startGameplayLockRef.current = false; }
  }, [selectedRoom, selectedCards, registerLiveGame, appointedCard, getDeterministicDrawSequence, getCurrentLobbyGameId]);

  // Sync refs for tick interval to avoid stale closure issues
  useEffect(() => {
    startGameplayRef.current = startGameplay;
    isRegisteredRef.current = isRegistered;
    isSpectatingReadyRef.current = isSpectatingReady;
    inGameRef.current = inGame;
    selectedCardsRef.current = selectedCards;
    selectedRoomRef.current = selectedRoom;
    commissionRateRef.current = commissionRate;
    gameIdRef.current = gameId;
    opponentWinnerRef.current = opponentWinner;
  }, [startGameplay, isRegistered, isSpectatingReady, inGame, selectedCards, selectedRoom, commissionRate, gameId, opponentWinner]);

  // ============ CONNECTION STATUS ============
  const [isOnline, setIsOnline] = useState(true);
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    setIsOnline(navigator.onLine);
    return () => { window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline); };
  }, []);

  // ============ ACTIVE GAME POLLING & STALE CLEANUP ============
  useEffect(() => {
    const fetchActive = async () => {
      try {
        const { data } = await supabase.from('games').select('code, stake_id').eq('status', 'active');
        if (data) {
          activeGameCodesRef.current = new Set(data.map(g => g.code));
          // Track which stake amounts currently have active games
          const activeStakeIds = data.map(g => g.stake_id).filter(Boolean);
          if (activeStakeIds.length > 0) {
            const { data: stakes } = await supabase
              .from('stakes')
              .select('amount')
              .in('id', activeStakeIds);
            activeStakesRef.current = new Set(stakes?.map(s => Number(s.amount)) || []);
          } else {
            activeStakesRef.current = new Set();
          }
        }
      } catch {}
    };
    fetchActive();
    const interval = setInterval(fetchActive, 500);
    return () => clearInterval(interval);
  }, []);

  // ============ STALE GAME CLEANUP (every 30s via server API) ============
  useEffect(() => {
    const finishStale = async () => {
      try {
        await fetch('/api/public/game/lobby', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'finish_stale', staleMinutes: 10 }),
        });
      } catch {}
    };
    finishStale();
    const interval = setInterval(finishStale, 30000);
    return () => clearInterval(interval);
  }, []);

  // ============ ROOM COUNTDOWN TICK ============
  useEffect(() => {
    const tick = setInterval(() => {
      const sr = selectedRoomRef.current;
      const ig = inGameRef.current;
      const ir = isRegisteredRef.current;
      const isr = isSpectatingReadyRef.current;
      const sg = startGameplayRef.current;
      const cr = commissionRateRef.current;
      const activeCodes = activeGameCodesRef.current;
      const activeStakes = activeStakesRef.current;
      // Check if this room's stake has an active game (one-at-a-time per stake)
      const isSrLocked = sr ? activeStakes.has(sr.entry) : false;
      const isSrPlaying = sr ? hasAnyActiveGameForRoom(sr.id, activeCodes) : false;
      if (sr) setSelectedRoomActive(isSrPlaying || isSrLocked);
      const now = Date.now();
      const timers = gameEndTimersRef.current;
      const prev = prevIsPlayingRef.current;
      setRooms(prevRooms => prevRooms.map(r => {
        const period = getRoomPeriod(r.id);
        const isPlaying = hasAnyActiveGameForRoom(r.id, activeCodes);
        // Stake is locked if another game with same entry fee is active
        const isLocked = activeStakes.has(r.entry);

        // Detect active→inactive transition: start 50s card selection timer
        // Only start timer when stake is NOT locked by another game
        // Don't start timer if user is still in-game for this room (leaveGame will set it when they return)
        if (prev[r.id] === true && !isPlaying && !isLocked && !(ig && sr && sr.id === r.id)) {
          timers[r.id] = now + 50000;
        }
        prev[r.id] = isPlaying;

        // Compute countdown: use forced timer if active, else cycle-based
        let remaining: number;
        const timerEnd = timers[r.id];
        if (timerEnd && timerEnd > now) {
          remaining = Math.max(1, Math.ceil((timerEnd - now) / 1000));
        } else {
          if (timerEnd) delete timers[r.id];
          remaining = getRoomCountdown(period);
        }

        // Don't auto-start if stake is locked by another active game
        if (!isPlaying && !isLocked && remaining <= 1 && sr && sr.id === r.id && !ig) {
          if (ir) sg(false);
          else if (isr) sg(true);
        }
        const roomComm = r.commission ?? cr;
        // Show as 'playing' if either this room's cycle game is active OR the stake is locked
        const displayStatus = (isPlaying || isLocked) ? 'playing' : 'starting_soon';
        return { ...r, status: displayStatus, countdown: remaining, winAmount: (r.entry * r.players) * (1 - roomComm / 100) };
      }));
      // Update game ID every tick — when user is in lobby (not playing, not registered) and room has a locked stake or no active game
      if (sr && !ig && !ir && !isr) {
        void (async () => {
          const serverGameId = await getCurrentLobbyGameId(sr.id);
          if (serverGameId) {
            setGameId(prevId => {
              if (prevId !== serverGameId) {
                setSelectedCards([]);
                setPreviewCard([]);
                setTakenCards([]);
                setLobbyPlayerCount(0);
                setReservedCardCount(0);
                setIsRegistered(false);
                setIsSpectatingReady(false);
                return serverGameId;
              }
              return prevId;
            });
            return;
          }
          const period = getRoomPeriod(sr.id);
          const currentSec = Math.floor((Date.now() + (serverTimeOffsetRef.current ?? 0)) / 1000);
          const newCycle = Math.floor(currentSec / period);
          const newGameId = generateDeterministicGameId(sr.id, newCycle);
          setGameId(prevId => {
            if (prevId !== newGameId) {
              setSelectedCards([]);
              setPreviewCard([]);
              setTakenCards([]);
              setLobbyPlayerCount(0);
              setReservedCardCount(0);
              setIsRegistered(false);
              setIsSpectatingReady(false);
              return newGameId;
            }
            return prevId;
          });
        })();
      }
    }, 1000);
    return () => clearInterval(tick);
  }, [inGame, selectedRoom, getCurrentLobbyGameId, getRoomCountdown]);

  // ============ DRAW INTERVAL ============
  useEffect(() => {
    if (!inGame || opponentWinner || showWinModal || deterministicSequence.length === 0) {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      return;
    }
    intervalRef.current = setInterval(() => {
      // Bail out immediately if another player already won (prevents any further draws)
      if (opponentWinnerRef.current) {
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
        return;
      }
      const currentDrawn = drawnRef.current;
      const nextIndex = currentDrawn.length;
      if (nextIndex >= 75) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        activeGameCodesRef.current.delete(gameId);
        addGameToHistory(gameId, selectedStake || 10, 'loss');
        fetch('/api/public/game/lobby', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'finish_game', gameCode: gameId }),
        }).catch(() => {});
        return;
      }
      const num = deterministicSequence[nextIndex];
      if (num === undefined) return;
      const newDrawn = [...currentDrawn, num];
      drawnRef.current = newDrawn;
      setDrawnNumbers(newDrawn);
      setRecentCalled(prev => [{ num, label: `${getColumnLabel(num)}-${num}` }, ...prev].slice(0, 10));

      if (autoWin && !isWatching && playerCards.length > 0 && !winInProgressRef.current && !opponentWinnerRef.current) {
        const wonCards = playerCards.filter(c => checkWin(c, newDrawn));
        if (wonCards.length > 0) {
          if (autoWin && !autoMark) {
            const allMatches = [0];
            playerCards.forEach(card => { card.forEach(row => { row.forEach(n => { if (newDrawn.includes(n)) allMatches.push(n); }); }); });
            setUserMarkedNumbers(allMatches);
          }
          triggerWin(wonCards, newDrawn);
          return;
        }
      }

      // Appointed winner: force win after N balls
      if (appointedCard && newDrawn.length >= appointedCard.afterBalls && !isWatching && playerCards.length > 0 && !opponentWinnerRef.current) {
        const appointedGrid = getSeededCard(appointedCard.cardNumber);
        const playerHasAppointed = playerCards.some(c => JSON.stringify(c) === JSON.stringify(appointedGrid));
        if (playerHasAppointed) {
          let allMatches = [0];
          playerCards.forEach(card => { card.forEach(row => { row.forEach(n => { if (newDrawn.includes(n)) allMatches.push(n); }); }); });
          setUserMarkedNumbers(allMatches);
          triggerWin([appointedGrid], newDrawn, true);
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
    }, 3000);
    return () => { if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; } };
  }, [inGame, opponentWinner, showWinModal, language, isWatching, gameId, selectedStake, addGameToHistory, playerCards, autoMark, autoWin, deterministicSequence, appointedCard]);

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
        const { data: gamesData } = await supabase.from('games').select('id, prize_pool, status, winner_id, stake_id').eq('code', gameId);
        const gamesList = gamesData || [];
        if (gamesList.length > 0) {
          const g = gamesList[0];
          const { count } = await supabase.from('game_players').select('*', { count: 'exact', head: true }).eq('game_id', g.id).eq('is_watching', false);
          if (count !== null && count !== liveCountRef.current) { liveCountRef.current = count; setLivePlayerCount(count); }
          // Use same prize formula as waiting screen: fee * totalCards * (1 - commission/100)
          const { count: cardCount } = await supabase.from('game_card_reservations').select('*', { count: 'exact', head: true }).eq('game_code', gameId).gt('card_number', 0);
          const totalCards = Math.max(cardCount || 0, selectedCardsRef.current.length || 1, 1);
          setPrizePool(Number(g.prize_pool) || (selectedRoomRef.current?.entry || 10) * totalCards * (1 - (commissionRateRef.current || 15) / 100));
        }
      } catch {}
    }, 1000);
    return () => clearInterval(poll);
  }, [inGame, gameId, profile?.id]);

  // ============ CROSS-DEVICE DETECTION POLL (uses service-role API for reliability) ============
  useEffect(() => {
    if (!inGame || !gameId || opponentWinner) return;
    const poll = setInterval(async () => {
      if (opponentWinnerRef.current) {
        clearInterval(poll);
        return;
      }
      try {
        const res = await fetch(`/api/public/game/status?gameCode=${gameId}`);
        const data = await res.json();
        if (data.winner_id && data.winner_id !== profile?.id) {
          if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
          setOpponentWinner(data.winner_name || 'Opponent');
        }
      } catch {}
    }, 1000);
    return () => clearInterval(poll);
  }, [inGame, gameId, opponentWinner, profile?.id]);

  // ============ GAME STATUS REALTIME (cross-device game-end detection) ============
  useEffect(() => {
    if (!inGame || !gameId) {
      if (gameStatusChannelRef.current) { supabase.removeChannel(gameStatusChannelRef.current); gameStatusChannelRef.current = null; }
      return;
    }
    const channel = supabase.channel(`game-status-${gameId}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'games', filter: `code=eq.${gameId}` },
        async (payload) => {
          const record = payload.new as any;
          const currentUserId = profile?.id;
          if (!currentUserId) return;

          const winners: any[] = record.winners || [];
          const isWinner = winners.some((w: any) => w.user_id === currentUserId);
          const otherFirstWinner = winners.find((w: any) => w.user_id !== currentUserId);

          // Game finished, opponent won
          if (record.status === 'finished' && record.winner_id && record.winner_id !== currentUserId) {
            if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
            try {
              const { data: winnerProfile } = await supabase.from('profiles').select('first_name, username').eq('id', record.winner_id).maybeSingle();
              setOpponentWinner(winnerProfile?.first_name || winnerProfile?.username || 'Another player');
            } catch {
              setOpponentWinner('Another player');
            }
            return;
          }

          // Game still active but another player claimed a win (collection window) — stop immediately
          if (record.status === 'active' && !isWinner && otherFirstWinner) {
            if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
            setOpponentWinner(otherFirstWinner.name || 'Another player');
          }
        })
      .subscribe();
    gameStatusChannelRef.current = channel;
    return () => { if (gameStatusChannelRef.current) { supabase.removeChannel(gameStatusChannelRef.current); gameStatusChannelRef.current = null; } };
  }, [inGame, gameId, profile?.id]);

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

  // ============ LOBBY HEARTBEAT (3s) ============
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const lobbyCountRef = useRef(0);
  useEffect(() => { lobbyCountRef.current = lobbyPlayerCount; }, [lobbyPlayerCount]);
  useEffect(() => {
    if (!selectedRoom || !gameId || inGame) {
      if (heartbeatRef.current) { clearInterval(heartbeatRef.current); heartbeatRef.current = null; }
      return;
    }
    const beat = async () => {
      try {
        const res = await fetch(`/api/public/game/heartbeat?gameId=${gameId}`);
        const data = await res.json();
        if (!data.success) return;
        if (data.lobbyPlayerCount !== undefined && data.lobbyPlayerCount > lobbyCountRef.current) {
          setLobbyPlayerCount(data.lobbyPlayerCount);
        }
        if (data.reservedCardCount !== undefined) {
          setReservedCardCount(prev => Math.max(prev, data.reservedCardCount));
        }
        if (data.prizePool !== undefined && data.prizePool > 0) {
          setPrizePool(data.prizePool);
        }
      } catch {}
    };
    beat();
    heartbeatRef.current = setInterval(beat, 3000);
    return () => { if (heartbeatRef.current) { clearInterval(heartbeatRef.current); heartbeatRef.current = null; } };
  }, [selectedRoom?.id, gameId, inGame]);

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
    if (winInProgressRef.current || opponentWinnerRef.current) return;
    if (autoWin && inGame && !isWatching && playerCards.length > 0) {
      const wonCards = playerCards.filter(c => checkWin(c, drawnNumbers));
      if (wonCards.length > 0) {
        const allMatches = [0];
        playerCards.forEach(card => { card.forEach(row => { row.forEach(num => { if (drawnNumbers.includes(num)) allMatches.push(num); }); }); });
        setUserMarkedNumbers(allMatches);
        triggerWin(wonCards, drawnNumbers);
      }
    }
  }, [autoWin, inGame, isWatching, playerCards, drawnNumbers, opponentWinner]);

  // ============ TRIGGER WIN (with re-entrancy guard, multi-winner support) ============
  const triggerWin = useCallback(async (cards: number[][][], drawn: number[], isAppointed?: boolean) => {
    if (winInProgressRef.current || opponentWinnerRef.current) return;
    winInProgressRef.current = true;
    try {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      activeGameCodesRef.current.delete(gameId);
      setWinningCards(cards);
      // For appointed wins, mark all drawn numbers as winning cells (pattern may not exist yet)
      setWinningCells(isAppointed && cards[0] ? cards[0].map(row => row.map(n => n === 0 || drawn.includes(n))) : getWinningCells(cards[0] || [], drawn));
      setShowWinModal(true);

      if (profile?.id) {
        const MAX_INIT_RETRIES = 2;
        const INIT_RETRY_DELAY = 1500;
        let initData: any = null;
        for (let attempt = 0; attempt <= MAX_INIT_RETRIES; attempt++) {
          try {
            const res = await fetch('/api/public/game/engine', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'validate_win', gameId, userId: profile.id, drawnNumbers: drawn, isAppointed: !!isAppointed }),
            });
            initData = await res.json();
            break; // success — exit retry loop
          } catch (initErr) {
            console.error(`Initial validate_win attempt ${attempt + 1} failed:`, initErr);
            if (attempt < MAX_INIT_RETRIES) {
              await new Promise(r => setTimeout(r, INIT_RETRY_DELAY));
            }
          }
        }
        if (!initData) {
          // All initial attempts failed — finish game with winner_id as last resort
          console.error('All initial validate_win attempts failed, calling finish_game with winnerId');
          try {
            const fallbackBody: any = { action: 'finish_game', gameCode: gameId };
            if (isValidUUID(profile.id)) fallbackBody.winnerId = profile.id;
            fetch('/api/public/game/lobby', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(fallbackBody),
            }).catch(() => {});
          } catch {}
        } else if (initData.success) {
            if (initData.pending) {
              // Collection window — record winners info and schedule finalization
              setIsPendingWin(true);
              setAllWinners(initData.winners || []);
              setWinnerCount(initData.winnerCount || 1);
              setWinMessage(initData.message || 'Winner recorded! Prize will be finalized shortly.');
              // Schedule finalization after the 5s collection window — with retry logic
              const MAX_FINALIZE_RETRIES = 3;
              const FINALIZE_RETRY_DELAY = 2000;
              const doFinalize = async (attempt: number): Promise<boolean> => {
                try {
                  const finalRes = await fetch('/api/public/game/engine', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'validate_win', gameId, userId: profile.id, drawnNumbers: drawn, isAppointed: !!isAppointed, finalize: true }),
                  });
                  const finalData = await finalRes.json();
                  if (finalData.success) {
                    setIsPendingWin(false);
                    setAllWinners(finalData.winners || []);
                    setWinnerCount(finalData.winnerCount || 1);
                    setFinalWinAmount(finalData.winAmount || 0);
                    setTotalWinAmount(finalData.totalWinAmount || 0);
                    setWinMessage(finalData.message || '');
                    const totalUserStake = selectedStake || (selectedRoom?.entry || 10) * (selectedCardsRef.current.length || 1);
                    addGameToHistory(gameId, totalUserStake, 'win', finalData.winAmount);
                    return true;
                  } else if (finalData.error === 'Game already finished') {
                    setIsPendingWin(false);
                    if (finalData.winners) { setAllWinners(finalData.winners); setWinnerCount(finalData.winners.length); }
                    if (finalData.winner_id === profile.id) {
                      const cc = selectedCardsRef.current.length || 1;
                      addGameToHistory(gameId, selectedStake || (selectedRoom?.entry || 10) * cc, 'win');
                    } else {
                      setShowWinModal(false);
                      setOpponentWinner(finalData.winner_name || 'Opponent');
                    }
                    return true;
                  }
                  // Other error — retry if attempts remain
                  if (attempt < MAX_FINALIZE_RETRIES) {
                    console.warn(`Finalize attempt ${attempt + 1} failed: ${finalData.error}, retrying...`);
                    await new Promise(r => setTimeout(r, FINALIZE_RETRY_DELAY));
                    return doFinalize(attempt + 1);
                  }
                  return false;
                } catch (finalizeErr) {
                  console.error(`Finalize attempt ${attempt + 1} fetch error:`, finalizeErr);
                  if (attempt < MAX_FINALIZE_RETRIES) {
                    await new Promise(r => setTimeout(r, FINALIZE_RETRY_DELAY));
                    return doFinalize(attempt + 1);
                  }
                  return false;
                }
              };
              setTimeout(async () => {
                const finalizeSucceeded = await doFinalize(0);
                if (!finalizeSucceeded) {
                  // All finalize attempts failed — fall back to finish_game with winner_id
                  console.error('All finalize attempts failed, falling back to finish_game with winnerId');
                  try {
                    const fallbackBody: any = { action: 'finish_game', gameCode: gameId };
                    if (profile?.id && isValidUUID(profile.id)) fallbackBody.winnerId = profile.id;
                    fetch('/api/public/game/lobby', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(fallbackBody),
                    }).catch(() => {});
                  } catch {}
                }
                await refreshWallet();
                setTimeout(() => { void refreshWallet(); }, 500);
                // Exit game after wallet is refreshed — countdown won't do it during pending win
                leaveGameRef.current?.();
              }, 5500);
            } else {
              // Immediate finalization
              setIsPendingWin(false);
              setAllWinners(initData.winners || []);
              setWinnerCount(initData.winnerCount || 1);
              setFinalWinAmount(initData.winAmount || 0);
              setTotalWinAmount(initData.totalWinAmount || 0);
              setWinMessage(initData.message || '');
              const cardCount = selectedCardsRef.current.length || 1;
              const totalUserStake = selectedStake || (selectedRoom?.entry || 10) * cardCount;
              addGameToHistory(gameId, totalUserStake, 'win', initData.winAmount);
            }
          } else if (initData.error === 'Game already finished') {
            if (initData.winner_id === profile.id) {
              const cc = selectedCardsRef.current.length || 1;
              addGameToHistory(gameId, selectedStake || (selectedRoom?.entry || 10) * cc, 'win');
            } else {
              setShowWinModal(false);
              setOpponentWinner(initData.winner_name || 'Opponent');
              if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
            }
          }
        // Refresh wallet immediately then again after a delay to handle any DB read-after-write consistency lag
        await refreshWallet();
        setTimeout(() => { void refreshWallet(); }, 500);
      }
    } finally {
      winInProgressRef.current = false;
    }
  }, [gameId, selectedStake, addGameToHistory, refreshWallet, profile?.id]);

  // Safety net: refresh wallet whenever win modal appears (ensures balance is up-to-date after win credit)
  useEffect(() => {
    if (showWinModal) {
      refreshWallet();
    }
  }, [showWinModal, refreshWallet]);

  // ============ SELECT STAKE / ROOM ============
  const selectStake = useCallback((stake: number) => {
    setSelectedStake(stake); setSelectedCards([]); setPreviewCard([]); setShowCardPicker(true);
  }, []);

  const handleJoinRoom = useCallback(async (room: RoomConfig) => {
    // Check if this room's stake is already locked by an active game
    if (activeStakesRef.current.has(room.entry)) {
      // Query server for the actual active game code (may be from a previous cycle)
      const serverGameId = await getCurrentLobbyGameId(room.id);
      setSelectedRoom(room);
      setSelectedStake(room.entry);
      setSelectedCards([]);
      setPreviewCard([]);
      setTakenCards([]);
      setLobbyPlayerCount(0);
      setReservedCardCount(0);
      setIsRegistered(false);
      setIsSpectatingReady(false);
      if (serverGameId) setGameId(serverGameId);
      return;
    }
    // No active game — generate deterministic code for current cycle
    const currentSec = Math.floor(Date.now() / 1000);
    const period = getRoomPeriod(room.id);
    const currentCycle = Math.floor(currentSec / period);
    const currentGameCode = generateDeterministicGameId(room.id, currentCycle);
    setSelectedRoom(room);
    setSelectedStake(room.entry);
    setSelectedCards([]);
    setPreviewCard([]);
    setTakenCards([]);
    setLobbyPlayerCount(0);
    setReservedCardCount(0);
    setIsRegistered(false);
    setIsSpectatingReady(false);
    setGameId(currentGameCode);
  }, [getCurrentLobbyGameId]);

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

    // Check if a game is already active for this room (any recent cycle) or stake is locked
    const roomForCheck = selectedRoomRef.current;
    if (roomForCheck && (hasAnyActiveGameForRoom(roomForCheck.id, activeGameCodesRef.current) || activeStakesRef.current.has(roomForCheck.entry))) {
      showToast('Game already in progress. Please wait for the current game to finish.', 'info');
      return;
    }

    // Lock the current gameId so startGameplay uses the same ID
    lockedGameIdRef.current = gameIdRef.current || gameId;

    const fee = selectedRoom ? selectedRoom.entry : 10;
    const stakeAmount = fee * selectedCards.length;
    const totalBal = (wallet?.main_balance || 0) + (wallet?.play_balance || 0);
    if (totalBal < stakeAmount) return;

    // Reserve cards on server first (prevents double-booking by another user)
    try {
      const res = await fetch('/api/public/game/lobby', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reserve_cards', gameId, userId: profile?.id, selectedCards }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showToast(t ? t('cards_taken') : (data.conflicts ? 'Some cards were just taken. Please choose different ones.' : 'Could not reserve cards. Please try again.'), 'error');
        return;
      }
    } catch (e) {
      console.warn('Card reservation failed:', e);
      showToast(t ? t('something_went_wrong') : 'Something went wrong. Please try again.', 'error');
      return;
    }

    setIsRegistered(true);
    setReservedCardCount(Math.max(selectedCards.length, reservedCardCount));
    await refreshWallet();
  }, [selectedCards, selectedRoom, wallet, updateBalance, refreshWallet, gameId, profile?.id, t]);

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
    lockedGameIdRef.current = null;
    setIsSpectatingReady(false); setTakenCards([]); setLobbyPlayerCount(0);
    // Refresh wallet after leaving game to ensure balance reflects any changes
    refreshWallet();
  }, [isRegistered, selectedCards, selectedRoom, updateBalance, refreshWallet, gameId, profile?.id]);

  const leaveGame = useCallback(async () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    // Capture pre-reset state for history check before we reset everything
    // Never record a loss if the user has a pending win - the finalize call will handle it
    const shouldRecordLoss = inGame && !isWatching && gameId && !showWinModal && !opponentWinner && !isPendingWin;
    // Determine if the game is already in a terminal state (opponent won, or we won) — need to call finish_game
    // When isPendingWin is true, the finalize timer will call finish_game after crediting the prize — don't race it
    const gameEnded = (opponentWinner || showWinModal) && gameId && !isPendingWin;
    // Capture room ID before clearing so we can start the 50s post-game timer
    const endedRoomId = selectedRoomRef.current?.id;
    // Reset all state synchronously BEFORE any async operations
    // to prevent re-renders with inGame=true and opponentWinner=null from
    // re-creating the draw interval or keeping the live poll active
    lockedGameIdRef.current = null;
    setInGame(false); setIsWatching(false); setGameCard([]); setDrawnNumbers([]);
    drawnRef.current = []; setSelectedStake(null); setSelectedCards([]); setRecentCalled([]);
    setShowWinModal(false); setWinningCards([]); setWinningCells([]); setAllWinners([]);
    setIsPendingWin(false); setWinMessage(''); setFinalWinAmount(0); setTotalWinAmount(0); setWinnerCount(1);
    setOtherPlayers([]); setOpponentWinner(null); setSelectedRoom(null);
    // Start 50s post-game timer for the room we just left (reliable — polling transition detection can miss it)
    if (endedRoomId) {
      gameEndTimersRef.current[endedRoomId] = Date.now() + 50000;
      prevIsPlayingRef.current[endedRoomId] = false;
    }
    if (shouldRecordLoss) addGameToHistory(gameId, selectedStake || 10, 'loss');
    const uid = profile?.id;
    // When the game is over (opponent won or we just won), tell server to finish it so status doesn't stay 'active'
    // Pass winnerId when the current user won (showWinModal=true) so opponent can detect who won
    if (gameEnded) {
      try {
        const finishBody: any = { action: 'finish_game', gameCode: gameId };
        if (showWinModal && uid && isValidUUID(uid)) finishBody.winnerId = uid;
        fetch('/api/public/game/lobby', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(finishBody),
        }).catch(() => {});
      } catch {}
    }
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
    await refreshWallet();
    setTakenCards([]); setLobbyPlayerCount(0);
    if (realtimeChannelRef.current) { supabase.removeChannel(realtimeChannelRef.current); realtimeChannelRef.current = null; }
  }, [inGame, isWatching, gameId, showWinModal, opponentWinner, selectedStake, addGameToHistory, profile?.id, refreshWallet, isPendingWin]);

  // Keep ref in sync so triggerWin can call leaveGame without circular dependency
  useEffect(() => { leaveGameRef.current = leaveGame; }, [leaveGame]);

  const handleLeaveAttempt = useCallback(() => {
    if (isWatching) leaveGame();
    else { setPendingTab(null); setShowLeaveModal(true); }
  }, [isWatching, leaveGame]);

  // ============ MANUAL DRAW ============
   const manualDraw = useCallback(() => {
    if (opponentWinnerRef.current) return;
    const currentDrawn = drawnRef.current;
    if (currentDrawn.length >= 75) return;
    const rem = Array.from({ length: 75 }, (_, i) => i + 1).filter(n => !currentDrawn.includes(n));
    const num = rem[Math.floor(Math.random() * rem.length)];
    const newDrawn = [...currentDrawn, num];
    drawnRef.current = newDrawn; setDrawnNumbers(newDrawn);
    setRecentCalled(prev => [{ num, label: `${getColumnLabel(num)}-${num}` }, ...prev].slice(0, 10));
    if (autoWin && gameCard.length > 0 && !isWatching && !opponentWinnerRef.current && checkWin(gameCard, newDrawn)) triggerWin([gameCard], newDrawn);
  }, [autoWin, language, gameCard, isWatching]);

  // ============ BINGO CLAIM ============
  const handleBingo = useCallback(() => {
    if (opponentWinnerRef.current) {
      showToast(language === 'en' ? 'Game already ended' : 'ጨዋታው ተጠናቋል', 'error');
      return;
    }
    if (playerCards.length > 0) {
      const checkAgainst = autoMark ? drawnRef.current : userMarkedNumbers;
      const wonCards = playerCards.filter(c => checkWin(c, checkAgainst));
      if (wonCards.length > 0) { triggerWin(wonCards, drawnRef.current); }
      else { showToast(language === 'en' ? 'Not a valid BINGO yet!' : 'ትክክለኛ ቢንጎ የለም!', 'error'); }
    }
  }, [playerCards, autoMark, userMarkedNumbers, language]);

  // ============ RESULT COUNTDOWN ============
  useEffect(() => { setResultCountdown(showWinModal || opponentWinner ? 5 : null); }, [showWinModal, opponentWinner]);
  useEffect(() => {
    if (resultCountdown === null) return;
    if (resultCountdown <= 0) {
      if (showWinModal) setShowWinModal(false);
      if (opponentWinner) {
        // Record loss before resetting state so addGameToHistory runs with opponentWinner still set
        addGameToHistory(gameId, selectedStake || 10, 'loss');
        setOpponentWinner(null);
      }
      // Always leave game when countdown hits 0 — go straight to home view
      leaveGame();
      return;
    }
    const timer = setTimeout(() => setResultCountdown(prev => (prev !== null ? prev - 1 : null)), 1000);
    return () => clearTimeout(timer);
  }, [resultCountdown, showWinModal, opponentWinner, leaveGame, addGameToHistory, gameId, selectedStake, isPendingWin]);

  // ============ REFERRAL ============
  useEffect(() => {
    if (typeof window !== 'undefined') { try { const saved = localStorage.getItem('nile_bingo_referrals'); if (saved) setReferralCount(parseInt(saved, 10)); } catch {} }
  }, []);

  const inviteLink = `https://t.me/${botUsername}?start=ref_${profile?.telegram_id || 'player'}`;

  const copyRefLink = useCallback(() => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) { navigator.clipboard.writeText(inviteLink); setCopiedLink(true); setTimeout(() => setCopiedLink(false), 2000); }
  }, [inviteLink]);

  const showToast = useCallback((message: string, type: 'error' | 'success' | 'info' = 'error') => {
    setToastMessage(message);
    setToastType(type);
    setShowRefToast(true);
    setTimeout(() => setShowRefToast(false), 3500);
  }, []);

  const simulateReferralJoin = useCallback(async () => {
    if (!profile?.id) {
      showToast(t('friend_registered') || 'Please sign in to claim the referral bonus.', 'error');
      return;
    }

    try {
      const res = await fetch('/api/public/referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: profile.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Unable to process referral bonus');
      }

      const nextCount = referralCount + 1;
      setReferralCount(nextCount);
      if (typeof window !== 'undefined') localStorage.setItem('nile_bingo_referrals', nextCount.toString());
      await refreshWallet();
      setToastMessage(`${t('friend_registered') || 'Referral bonus credited!'} +${data.bonus ?? referralBonus} ${t('birr')}`);
      setToastType('success');
      setShowRefToast(true); setTimeout(() => setShowRefToast(false), 3500);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to process referral bonus';
      showToast(message, 'error');
    }
  }, [profile?.id, referralCount, referralBonus, refreshWallet, showToast, t]);

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
    if (activeTab === 'wallet') return <WalletTab wallet={wallet} walletView={walletView} onSetWalletView={setWalletView} botUsername={botUsername} referralEnabled={referralEnabled} referralBonus={referralBonus} referralCount={referralCount} inviteLink={inviteLink} copiedLink={copiedLink} withdrawMinAmount={withdrawMinAmount} withdrawRequiredGames={withdrawRequiredGames} t={t} onCopyRefLink={copyRefLink} onSimulateReferral={simulateReferralJoin} onRefreshWallet={refreshWallet} />;
    if (activeTab === 'profile') return <ProfileTab profile={profile} wallet={wallet} stakeHistory={stakeHistory} language={language} t={t} onSetLanguage={setLanguage} onUpdateAvatar={updateAvatar} onUpdateName={updateName} />;

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
            winningCards={winningCards} allWinners={allWinners}
            isPendingWin={isPendingWin} winMessage={winMessage}
            finalWinAmount={finalWinAmount} totalWinAmount={totalWinAmount} winnerCount={winnerCount}
            winningCells={winningCells} commissionRate={effectiveComm}
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
          lobbyPlayerCount={lobbyPlayerCount} reservedCardCount={reservedCardCount} previewCard={previewCard}
          isRegistered={isRegistered} walletBalance={(wallet?.main_balance || 0) + (wallet?.play_balance || 0)}
          wallet={wallet} t={t}
          gameActive={selectedRoomActive}
          onBack={() => { setSelectedRoom(null); setSelectedCards([]); setPreviewCard([]); }}
          onToggleCard={toggleCard}
          onPlay={playWithCard}
          onUnregister={unregisterLobby}
          onDeposit={() => { setSelectedCards([]); setPreviewCard([]); setSelectedRoom(null); setReservedCardCount(0); setWalletView('deposit'); setActiveTab('wallet'); }}
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

  if (telegramAvailable === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-navy p-8">
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-6">📱</div>
          <h1 className="text-lg font-black text-white mb-4 leading-relaxed">ቴሌግራም ያስፈልጋል</h1>
          <p className="text-sm text-gray-300 leading-relaxed mb-6">ለመቀጠል እባክዎ ይህንን መተግበሪያ ከቴሌግራም ሚኒ አፕ (Telegram Mini App) ይክፈቱ።</p>
          <div className="w-12 h-0.5 bg-[#ff5a00]/50 mx-auto mb-6" />
          <p className="text-xs text-gray-500">This app should only be opened from Telegram Mini App.</p>
        </div>
      </div>
    );
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gradient-navy"><div className="text-center">{appLogoPng ? <img src={appLogoPng} alt="Logo" className="h-12 w-12 object-contain mx-auto mb-4 drop-shadow-[0_0_12px_rgba(254,232,0,0.3)]" /> : <div className="text-4xl font-black mb-4 animate-pulse" style={{ color: getThemeColor() }}>{appLogo}</div>}<div className="text-4xl font-black mb-4 animate-pulse drop-shadow-[0_0_12px_rgba(254,232,0,0.3)]" style={{ color: getThemeColor() }}>{appName}</div><div className="text-gray-400 text-sm">{t('loading')}</div></div></div>;

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
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-[9999] bg-red-600/90 backdrop-blur text-white text-[10px] font-bold text-center py-1.5 px-3">
          No internet connection — game actions may not work
        </div>
      )}
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
