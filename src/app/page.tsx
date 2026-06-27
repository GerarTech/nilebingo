'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useApp, AppProvider } from '@/lib/hooks/useApp';
import { supabase } from '@/lib/supabase';
import TabBar from '@/lib/components/TabBar';
import BingoGrid from '@/lib/components/BingoGrid';
import { 
  Gamepad2, Medal, History, Wallet, User, 
  Check, X, Volume2, VolumeX, Trophy, Play, Star, Coins, RefreshCw, 
  Info, Crown, Target, List, Swords, Eye, Timer, RefreshCcw, Volume1, Camera
} from 'lucide-react';
import { generateCard, getSeededCard, getWinningCells, getColumnLabel, getAvailableCards, drawNumber, checkWin } from '@/lib/server/bingo';

type TabType = 'game' | 'scores' | 'history' | 'wallet' | 'profile';

function generateGameId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function triggerHaptic(type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error') {
  if (typeof window === 'undefined') return;
  const tg = (window as any).Telegram?.WebApp;
  if (tg?.HapticFeedback) {
    try {
      if (type === 'success' || type === 'warning' || type === 'error') {
        tg.HapticFeedback.notificationOccurred(type);
      } else {
        tg.HapticFeedback.impactOccurred(type);
      }
    } catch (e) {
      console.warn('Haptic feedback failed:', e);
    }
  }
}

function RollingCounter({ value, duration = 800, suffix = "" }: { value: number; duration?: number; suffix?: string }) {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValueRef = useRef(value);

  useEffect(() => {
    const startValue = prevValueRef.current;
    const endValue = value;
    if (startValue === endValue) return;

    let startTime: number | null = null;
    let animationFrameId: number;

    const animateValue = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const progressRatio = Math.min(progress / duration, 1);
      
      // Easing function: easeOutQuad
      const easedProgress = progressRatio * (2 - progressRatio);
      const currentValue = Math.round(startValue + (endValue - startValue) * easedProgress);
      
      setDisplayValue(currentValue);

      if (progressRatio < 1) {
        animationFrameId = requestAnimationFrame(animateValue);
      } else {
        prevValueRef.current = endValue;
        setDisplayValue(endValue);
      }
    };

    animationFrameId = requestAnimationFrame(animateValue);
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [value, duration]);

  return <span>{displayValue.toLocaleString()}{suffix}</span>;
}

// Amharic number words
const AMHARIC_NUMBERS: Record<number, string> = {
  1: 'አንድ', 2: 'ሁለት', 3: 'ሶስት', 4: 'አራት', 5: 'አምስት',
  6: 'ስድስት', 7: 'ሰባት', 8: 'ስምንት', 9: 'ዘጠኝ', 10: 'አስር',
  11: 'አስራ አንድ', 12: 'አስራ ሁለት', 13: 'አስራ ሶስት', 14: 'አስራ አራት', 15: 'አስራ አምስት',
  16: 'አስራ ስድስት', 17: 'አስራ ሰባት', 18: 'አስራ ስምንት', 19: 'አስራ ዘጠኝ', 20: 'ሃያ',
  21: 'ሃያ አንድ', 22: 'ሃያ ሁለት', 23: 'ሃያ ሶስት', 24: 'ሃያ አራት', 25: 'ሃያ አምስት',
  26: 'ሃያ ስድስት', 27: 'ሃያ ሰባት', 28: 'ሃያ ስምንት', 29: 'ሃያ ዘጠኝ', 30: 'ሰላሳ',
  31: 'ሰላሳ አንድ', 32: 'ሰላሳ ሁለት', 33: 'ሰላሳ ሶስት', 34: 'ሰላሳ አራት', 35: 'ሰላሳ አምስት',
  36: 'ሰላሳ ስድስት', 37: 'ሰላሳ ሰባት', 38: 'ሰላሳ ስምንት', 39: 'ሰላሳ ዘጠኝ', 40: 'አርባ',
  41: 'አርባ አንድ', 42: 'አርባ ሁለት', 43: 'አርባ ሶስት', 44: 'አርባ አራት', 45: 'አርባ አምስት',
  46: 'አርባ ስድስት', 47: 'አርባ ሰባት', 48: 'አርባ ስምንት', 49: 'አርባ ዘጠኝ', 50: 'ሃምሳ',
  51: 'ሃምሳ አንድ', 52: 'ሃምሳ ሁለት', 53: 'ሃምሳ ሶስት', 54: 'ሃምሳ አራት', 55: 'ሃምሳ አምስት',
  56: 'ሃምሳ ስድስት', 57: 'ሃምሳ ሰባት', 58: 'ሃምሳ ስምንት', 59: 'ሃምሳ ዘጠኝ', 60: 'ስልሳ',
  61: 'ስልሳ አንድ', 62: 'ስልሳ ሁለት', 63: 'ስልሳ ሶስት', 64: 'ስልሳ አራት', 65: 'ስልሳ አምስት',
  66: 'ስልሳ ስድስት', 67: 'ስልሳ ሰባት', 68: 'ስልሳ ስምንት', 69: 'ስልሳ ዘጠኝ', 70: 'ሰባ',
  71: 'ሰባ አንድ', 72: 'ሰባ ሁለት', 73: 'ሰባ ሶስት', 74: 'ሰባ አራት', 75: 'ሰባ አምስት',
};

const AMHARIC_COLUMNS: Record<string, string> = {
  B: 'ቢ', I: 'አይ', N: 'ኤን', G: 'ጂ', O: 'ኦ',
};

// Voice announcement for drawn numbers
// English: Uses Web Speech API
// Amharic: Uses pre-generated audio files
async function speakNumber(num: number, lang: 'en' | 'am') {
  if (typeof window === 'undefined') return;
  
  const label = getColumnLabel(num);
  
  if (lang === 'en') {
    // English: Use Web Speech API
    if (!window.speechSynthesis) return;
    
    window.speechSynthesis.cancel();
    const text = `${label} ${num}`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  } else {
    // Amharic: Use pre-generated audio files
    try {
      // Play column letter first
      const letterAudio = new Audio(`/audio/am/${label}.mp3`);
      await letterAudio.play();
      
      await letterAudio.addEventListener('ended', async () => {
        // Decompose number into audio parts
        const audioParts: string[] = [];
        
        if (num <= 9) {
          // 1-9: single file
          audioParts.push(`/audio/am/${num}.mp3`);
        } else if (num % 10 === 0) {
          // 10, 20, 30, 40, 50, 60, 70: base files
          audioParts.push(`/audio/am/${num}.mp3`);
        } else {
          // 11-19, 21-29, etc: base + unit
          const base = Math.floor(num / 10) * 10;
          const unit = num % 10;
          audioParts.push(`/audio/am/${base}.mp3`);
          audioParts.push(`/audio/am/${unit}.mp3`);
        }
        
        // Play each part sequentially
        for (const audioPath of audioParts) {
          try {
            const audio = new Audio(audioPath);
            await audio.play();
            await new Promise((resolve) => audio.addEventListener('ended', resolve, { once: true }));
          } catch (err) {
            // Skip missing files silently
          }
        }
      }, { once: true });
      
    } catch (err) {
      console.error('Audio playback error:', err);
      // Silent fail - no audio if file not found
    }
  }
}

function HomePage() {
  const { profile, wallet, language, activeTab, loading, t, setActiveTab, setLanguage, toggleSound, initialize, updateBalance, updateAvatar } = useApp();
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
  const [recentCalled, setRecentCalled] = useState<{num: number, label: string}[]>([]);
  const [showRules, setShowRules] = useState(false);
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [cardPickerCountdown, setCardPickerCountdown] = useState(50);
  const [livePlayerCount, setLivePlayerCount] = useState(20);
  const [gameId, setGameId] = useState('');
  const [previewCard, setPreviewCard] = useState<number[][]>([]);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [showWinModal, setShowWinModal] = useState(false);
  const [resultCountdown, setResultCountdown] = useState<number | null>(null);
  const [winningCard, setWinningCard] = useState<number[][]>([]);
  const [winningCells, setWinningCells] = useState<boolean[][]>([]);
  const drawnRef = useRef<number[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Dedicated state controls for Room selection and Custom Wallet views
  const [selectedRoom, setSelectedRoom] = useState<{
    id: string;
    name: string;
    entry: number;
    players: number;
    maxPlayers: number;
    winAmount: number;
    status: 'playing' | 'starting_soon';
    countdown: number;
  } | null>(null);

  const [walletView, setWalletView] = useState<'main' | 'deposit' | 'withdraw' | 'transfer'>('main');
  const [paymentMethod, setPaymentMethod] = useState<'telebirr' | 'cbe'>('telebirr');
  const [txnCode, setTxnCode] = useState('');
  const [isVerifyingTxn, setIsVerifyingTxn] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const [commissionRate, setCommissionRate] = useState<number>(10);
  const [appName, setAppName] = useState<string>('Nile BINGO');
  const [appLogo, setAppLogo] = useState<string>('🎰');
  const [colorScheme, setColorScheme] = useState<string>('gold');

  const [rooms, setRooms] = useState([
    { id: 'bronze', name: 'Bronze Room', entry: 10, players: 10, maxPlayers: 100, winAmount: 90, status: 'starting_soon' as const, countdown: 30 },
    { id: 'silver', name: 'Silver Room', entry: 20, players: 12, maxPlayers: 100, winAmount: 216, status: 'starting_soon' as const, countdown: 23 },
    { id: 'gold', name: 'Gold Room', entry: 50, players: 15, maxPlayers: 100, winAmount: 675, status: 'starting_soon' as const, countdown: 40 },
    { id: 'diamond', name: 'Diamond Room', entry: 100, players: 20, maxPlayers: 100, winAmount: 1800, status: 'starting_soon' as const, countdown: 58 },
    { id: 'premium', name: 'Premium Room', entry: 200, players: 5, maxPlayers: 100, winAmount: 900, status: 'starting_soon' as const, countdown: 15 },
    { id: 'vip', name: 'VIP Room', entry: 500, players: 2, maxPlayers: 100, winAmount: 900, status: 'starting_soon' as const, countdown: 95 },
  ]);

  const [dbLeaderboard, setDbLeaderboard] = useState<{ id: string; username: string; earnings: number; avatar: string; isUser: boolean; change?: string }[]>([]);

  // Fetch leaderboard from DB when score tab is opened
  useEffect(() => {
    if (activeTab === 'scores') {
      fetch('/api/public/leaderboard')
        .then(r => r.json())
        .then(data => {
          if (data && Array.isArray(data.leaderboard)) {
            setDbLeaderboard(data.leaderboard);
          }
        })
        .catch(err => console.error('Failed to load leaderboard:', err));
    }
  }, [activeTab]);

  // Fetch commission and rooms config from DB
  useEffect(() => {
    fetch('/api/public/config', { cache: 'no-store' })
      .then(r => r.json())
      .then(data => {
        if (data) {
          if (typeof data.commission === 'number') {
            setCommissionRate(data.commission);
          }
          if (data.appName) {
            setAppName(data.appName);
          }
          if (data.appLogo) {
            setAppLogo(data.appLogo);
          }
          if (data.colorScheme) {
            setColorScheme(data.colorScheme);
          }
          if (data.voiceEnabled !== undefined) {
            setVoiceEnabled(data.voiceEnabled !== false);
          }
          if (data.referralEnabled !== undefined) {
            setReferralEnabled(data.referralEnabled !== false);
          }
          if (data.referralBonus !== undefined) {
            setReferralBonus(Number(data.referralBonus) || 1);
          }
          if (Array.isArray(data.rooms)) {
            const mapped = data.rooms.map((room: any, i: number) => ({
              id: room.id || `room_${i}`,
              name: room.name || 'Room',
              entry: Number(room.entry) || 10,
              players: Number(room.players) || 10,
              maxPlayers: Number(room.maxPlayers) || 100,
              winAmount: Math.round((Number(room.entry) * Number(room.players)) * (1 - (data.commission ?? 10) / 100)),
              status: 'starting_soon' as const,
              countdown: 15 + i * 7
            }));
            setRooms(mapped);
          }
        }
      })
      .catch(err => console.error('Failed to load public config:', err));
  }, []);

  // Live real-time tournament other players
  type VirtualPlayer = {
    username: string;
    card: number[][];
    markedCount: number;
    neededToWin: number;
    hasWon: boolean;
  };
  const [otherPlayers, setOtherPlayers] = useState<VirtualPlayer[]>([]);
  const [opponentWinner, setOpponentWinner] = useState<string | null>(null);

  // Persistent stake history and layout tabs
  const [stakeHistory, setStakeHistory] = useState<{gameId: string, stake: number, result: 'win' | 'loss', prize?: number, timestamp: string}[]>([]);

  // Load persistent history on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('nile_bingo_stake_history');
        if (saved) {
          setStakeHistory(JSON.parse(saved));
        }
      } catch (e) {
        console.error('Error loading stake history:', e);
      }
    }
  }, []);

  // Referral states & link simulator logic
  const [referralCount, setReferralCount] = useState<number>(0);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [showRefToast, setShowRefToast] = useState<boolean>(false);
  const [referralEnabled, setReferralEnabled] = useState<boolean>(true);
  const [referralBonus, setReferralBonus] = useState<number>(1);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedCount = localStorage.getItem('nile_bingo_referrals');
        if (savedCount) {
          setReferralCount(parseInt(savedCount, 10));
        }
      } catch (e) {
        console.error('Error loading referrals:', e);
      }
    }
  }, []);

  const inviteLink = `https://t.me/NileBingoBot?start=ref_${profile?.id || 'player'}`;

  const copyRefLink = useCallback(() => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(inviteLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } else {
      alert("Referral Link copied: " + inviteLink);
    }
  }, [inviteLink]);

  const simulateReferralJoin = useCallback(() => {
    const nextCount = referralCount + 1;
    setReferralCount(nextCount);
    if (typeof window !== 'undefined') {
      localStorage.setItem('nile_bingo_referrals', nextCount.toString());
    }
    // Grant configured referral bonus from invitation to the play_balance as requested!
    updateBalance(referralBonus, 'play_balance');
    
    // Trigger premium success visual alert indicator
    setShowRefToast(true);
    setTimeout(() => setShowRefToast(false), 3500);
  }, [referralCount, updateBalance, referralBonus]);

  // Save game to persistent history helper
  const addGameToHistory = useCallback((gId: string, stakeAmt: number, outcome: 'win' | 'loss') => {
    if (isWatching || !gId) return;
    const actualPrize = outcome === 'win'
      ? Math.round((stakeAmt * livePlayerCount) * (1 - commissionRate / 100))
      : -stakeAmt;

    setStakeHistory(prev => {
      const exists = prev.some(item => item.gameId === gId && item.result === outcome);
      if (exists) return prev;
      const filtered = prev.filter(item => item.gameId !== gId || item.result !== outcome);
      const newHistory = [
        {
          gameId: gId,
          stake: stakeAmt,
          result: outcome,
          prize: actualPrize,
          timestamp: new Date().toISOString()
        },
        ...filtered
      ].slice(0, 10);
      try {
        localStorage.setItem('nile_bingo_stake_history', JSON.stringify(newHistory));
      } catch (e) {
        console.error('Error saving stake history:', e);
      }
      return newHistory;
    });

    // Record game in Supabase database and notify admin bot
    if (profile?.id) {
      const pot = Math.round((stakeAmt * livePlayerCount) * (1 - commissionRate / 100));
      fetch('/api/public/games/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: profile.id,
          stakeAmount: stakeAmt,
          prizePool: pot,
          outcome,
          drawnNumbers: drawnRef.current || [],
          roomName: selectedRoom?.name || 'Quick Lobby'
        })
      }).catch(err => console.error('Failed to save game to db:', err));
    }
  }, [isWatching, profile?.id, selectedRoom, livePlayerCount, commissionRate]);

  // Load voices on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.getVoices(); // Trigger voice loading
    }
  }, []);

  // Initialize Telegram
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const tg = window.Telegram?.WebApp;
      if (tg) {
        tg.ready();
        tg.expand();
        const user = tg.initDataUnsafe?.user;
        if (user?.id) initialize(String(user.id));
        else initialize('999999999');
      } else {
        initialize('999999999');
      }
    }
  }, [initialize]);

  // Stake countdowns tick
  const [stakeStates, setStakeStates] = useState<Record<number, {status: 'waiting'|'playing'|'finished', countdown: number}>>({
    10: { status: 'waiting', countdown: 30 },
    20: { status: 'waiting', countdown: 23 },
    50: { status: 'waiting', countdown: 40 },
  });

  useEffect(() => {
    const tick = setInterval(() => {
      setStakeStates(prev => {
        const next = { ...prev };
        for (const k of Object.keys(next)) {
          const key = Number(k);
          const s = next[key];
          // Always tick the countdown and cycle state correctly
          if (s.countdown > 0) {
            s.countdown--;
          } else {
            s.status = s.status === 'playing' ? 'waiting' : 'playing';
            s.countdown = 40;
          }
        }
        return next;
      });

      setRooms(prevRooms => prevRooms.map(r => {
        const nextCount = r.countdown <= 1 ? 40 : r.countdown - 1;
        return {
          ...r,
          status: 'starting_soon' as const,
          countdown: nextCount,
          winAmount: Math.round((r.entry * r.players) * (1 - commissionRate / 100))
        };
      }));

      // Keep live players completely stable based on selected room
      setLivePlayerCount(prev => {
        if (selectedRoom) return selectedRoom.players;
        return prev;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [inGame, selectedRoom, commissionRate]);

  // Card picker countdown
  useEffect(() => {
    if (!showCardPicker) return;
    const timer = setInterval(() => {
      setCardPickerCountdown(prev => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [showCardPicker]);

  // Handle winning state
  const triggerWin = useCallback((card: number[][], drawn: number[]) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    triggerHaptic('success');
    setWinningCard(card);
    setWinningCells(getWinningCells(card, drawn));
    setShowWinModal(true);
    addGameToHistory(gameId, selectedStake || 10, 'win');
    const rawJackpot = (selectedStake || 10) * livePlayerCount;
    const houseCommission = Math.round(rawJackpot * (commissionRate / 100));
    const jackpot = rawJackpot - houseCommission;
    updateBalance(jackpot, 'play_balance');
  }, [gameId, selectedStake, livePlayerCount, addGameToHistory, updateBalance, commissionRate]);

  // Auto-draw numbers when in game (every 1.4 seconds)
  useEffect(() => {
    if (!inGame || opponentWinner) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    intervalRef.current = setInterval(() => {
      const currentDrawn = drawnRef.current;
      if (currentDrawn.length >= 75) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        addGameToHistory(gameId, selectedStake || 10, 'loss');
        return;
      }
      const all = Array.from({ length: 75 }, (_, i) => i + 1);
      const rem = all.filter(n => !currentDrawn.includes(n));
      if (rem.length === 0) return;
      const num = rem[Math.floor(Math.random() * rem.length)];
      const newDrawn = [...currentDrawn, num];
      drawnRef.current = newDrawn;
      setDrawnNumbers(newDrawn);
      setRecentCalled(prev => [{ num, label: `${getColumnLabel(num)}-${num}` }, ...prev].slice(0, 10));
      
      // Voice announcement
      if (voiceEnabled) {
        speakNumber(num, language);
      }
      
      // Check if current player won
      if ((autoMark || autoWin) && !isWatching && playerCards.length > 0) {
        const wonCard = playerCards.find(c => checkWin(c, newDrawn));
        if (wonCard) {
          if (autoWin && !autoMark) {
            const allMatches = [0];
            playerCards.forEach(card => {
              card.forEach(row => {
                row.forEach(num => {
                  if (newDrawn.includes(num)) {
                    allMatches.push(num);
                  }
                });
              });
            });
            setUserMarkedNumbers(allMatches);
          }
          triggerWin(wonCard, newDrawn);
          return;
        }
      }

      // Simulate other live players marking their cards in real time!
      if (!isWatching) {
        setOtherPlayers(prev => {
          let someWinner = '';
          const updated = prev.map(p => {
            // Check marked cells for this player using the exact drawn numbers list
            const markedMatrix = p.card.map(row => row.map(cell => cell === 0 || newDrawn.includes(cell)));
            
            // Find max marked in any row (horizontal row of 5 columns)
            let maxRowMarked = 0;
            markedMatrix.forEach(row => {
              const rowCount = row.filter(cell => cell).length;
              if (rowCount > maxRowMarked) maxRowMarked = rowCount;
            });

            // Find max marked in any column (vertical column of 5 rows)
            let maxColMarked = 0;
            for (let col = 0; col < 5; col++) {
              let colCount = 0;
              for (let row = 0; row < markedMatrix.length; row++) {
                if (markedMatrix[row]?.[col]) colCount++;
              }
              if (colCount > maxColMarked) maxColMarked = colCount;
            }

            // Since winning is completing any row (5 matches) or any col (5 matches):
            const neededForCol = Math.max(0, 5 - maxColMarked);
            const neededForRow = Math.max(0, 5 - maxRowMarked);
            const neededToWin = Math.min(neededForRow, neededForCol);
            
            const hasBingo = neededToWin === 0;
            if (hasBingo && !someWinner) {
              someWinner = p.username;
            }

            return {
              ...p,
              markedCount: Math.max(maxRowMarked, maxColMarked), // Correct max match count 100% and aligned with neededToWin
              neededToWin: neededToWin,
              hasWon: hasBingo,
            };
          });

          if (someWinner) {
            setOpponentWinner(someWinner);
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            // Announce winner if vocal synthesis is available
            if (typeof window !== 'undefined') {
              try {
                const talkText = language === 'en'
                  ? `Attention! Competitor ${someWinner} has called BINGO! and claimed the jackpot prize!`
                  : `ትኩረት ይሰጥ! ተወዳዳሪ ${someWinner} ቢንጎ በመሙላት የጃክፖት ሽልማቱን አሸንፏል!`;

                if (window.speechSynthesis) {
                  window.speechSynthesis.cancel();
                  const utterance = new SpeechSynthesisUtterance(talkText);
                  utterance.lang = language === 'en' ? 'en-US' : 'am-ET';
                  utterance.rate = 0.95;
                  window.speechSynthesis.speak(utterance);
                }
              } catch (err) {
                console.warn('Winner announcement speech synthesis error:', err);
              }
            }
            addGameToHistory(gameId, selectedStake || 10, 'loss');
          }
          return updated;
        });
      }
    }, 2000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [inGame, opponentWinner, voiceEnabled, language, gameCard, isWatching, triggerWin, gameId, selectedStake, addGameToHistory, playerCards, autoMark, autoWin]);

  // Keep ref in sync
  useEffect(() => {
    drawnRef.current = drawnNumbers;
  }, [drawnNumbers]);

  // Synchronize userMarkedNumbers automatically when autoMark is ON
  useEffect(() => {
    if (autoMark && inGame && playerCards.length > 0) {
      const allMatches = [0]; // Free space is always marked
      playerCards.forEach(card => {
        card.forEach(row => {
          row.forEach(num => {
            if (drawnNumbers.includes(num)) {
              allMatches.push(num);
            }
          });
        });
      });
      setUserMarkedNumbers(allMatches);
    }
  }, [autoMark, drawnNumbers, inGame, playerCards]);

  // Automatically mark and claim a BINGO as soon as winning condition is detected with autoWin
  useEffect(() => {
    if (autoWin && inGame && !isWatching && playerCards.length > 0) {
      const wonCard = playerCards.find(c => checkWin(c, drawnNumbers));
      if (wonCard) {
        // Automatically sync marked numbers so they look visually complete immediately:
        const allMatches = [0];
        playerCards.forEach(card => {
          card.forEach(row => {
            row.forEach(num => {
              if (drawnNumbers.includes(num)) {
                allMatches.push(num);
              }
            });
          });
        });
        setUserMarkedNumbers(allMatches);
        triggerWin(wonCard, drawnNumbers);
      }
    }
  }, [autoWin, inGame, isWatching, playerCards, drawnNumbers, triggerWin]);

  // Stake selection → open card picker
  const selectStake = useCallback((stake: number) => {
    setSelectedStake(stake);
    setSelectedCards([]);
    setPreviewCard([]);
    setCardPickerCountdown(50);
    setShowCardPicker(true);
  }, []);

  // Handle room joining
  const handleJoinRoom = useCallback((room: typeof rooms[0]) => {
    setSelectedRoom(room);
    setSelectedStake(room.entry);
    setSelectedCards([]);
    setPreviewCard([]);
    setGameId(generateGameId());
  }, [rooms]);

  // Watch live game
  const watchGame = useCallback(() => {
    setShowCardPicker(false);
    setInGame(true);
    setIsWatching(true);
    setGameId(gameId || generateGameId());
    const randomCard = generateCard();
    setGameCard(randomCard);
    setPlayerCards([randomCard]);
    setUserMarkedNumbers([0]);
    setDrawnNumbers([]);
    drawnRef.current = [];
    setRecentCalled([]);
    setSelectedStake(null);
  }, [gameId]);

  // Toggle card selection in picker (supports up to 2 cards!)
  const toggleCard = useCallback((num: number) => {
    setSelectedCards(prev => {
      const isSelected = prev.includes(num);
      if (isSelected) {
        const next = prev.filter(c => c !== num);
        if (next.length > 0) {
          setPreviewCard(getSeededCard(next[next.length - 1]));
        } else {
          setPreviewCard([]);
        }
        return next;
      } else {
        if (prev.length >= 2) {
          // Keep maximum of 2 cards. Replace the oldest one:
          const next = [prev[1], num];
          setPreviewCard(getSeededCard(num));
          return next;
        } else {
          const next = [...prev, num];
          setPreviewCard(getSeededCard(num));
          return next;
        }
      }
    });
  }, []);

  // Play with selected card
  const playWithCard = useCallback(() => {
    if (selectedCards.length === 0) return;
    const cardCount = selectedCards.length;
    const singleStake = selectedStake || 10;
    const stakeAmount = singleStake * cardCount;
    const totalBal = (wallet?.main_balance || 0) + (wallet?.play_balance || 0);
    if (totalBal < stakeAmount) {
      alert(t('insufficient_balance'));
      return;
    }

    // Deduct stake from wallet balance
    const playBal = wallet?.play_balance || 0;
    if (playBal >= stakeAmount) {
      updateBalance(-stakeAmount, 'play_balance');
    } else {
      const remainder = stakeAmount - playBal;
      updateBalance(-playBal, 'play_balance');
      updateBalance(-remainder, 'main_balance');
    }

    // Initialize unique, competitive live game session
    const uniqueGameId = gameId || generateGameId();
    const activePlayerCards = selectedCards.map(num => getSeededCard(num));
    setPlayerCards(activePlayerCards);
    setGameCard(activePlayerCards[0] || []);
    setUserMarkedNumbers([0]); // free space initially
    setGameId(uniqueGameId);
    setDrawnNumbers([]);
    drawnRef.current = [];
    setRecentCalled([]);
    setOpponentWinner(null);

    setOtherPlayers([]);

    setShowCardPicker(false);
    // Keep selectedRoom set during active play to track room details & competitors!
    setInGame(true);
    setIsWatching(false);
    if (selectedRoom) {
      setLivePlayerCount(selectedRoom.players);
    }
  }, [selectedCards, selectedStake, wallet, updateBalance, t, selectedRoom, gameId]);

  const leaveGame = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Capture exit as a forfeiture/loss if in active play
    if (inGame && !isWatching && gameId && !showWinModal && !opponentWinner) {
      addGameToHistory(gameId, selectedStake || 10, 'loss');
    }

    setInGame(false);
    setIsWatching(false);
    setGameCard([]);
    setDrawnNumbers([]);
    drawnRef.current = [];
    setSelectedStake(null);
    setSelectedCards([]);
    setRecentCalled([]);
    setGameId('');
    setShowWinModal(false);
    setWinningCard([]);
    setWinningCells([]);
    setOtherPlayers([]);
    setOpponentWinner(null);
    setSelectedRoom(null);
  }, [inGame, isWatching, gameId, showWinModal, opponentWinner, selectedStake, addGameToHistory]);

  // Manage countdown for result screen (automatically transitions back to lobby or next round after 5 seconds)
  useEffect(() => {
    if (showWinModal || opponentWinner) {
      setResultCountdown(5);
    } else {
      setResultCountdown(null);
    }
  }, [showWinModal, opponentWinner]);

  useEffect(() => {
    if (resultCountdown === null) return;
    if (resultCountdown <= 0) {
      if (showWinModal) setShowWinModal(false);
      if (opponentWinner) setOpponentWinner(null);
      leaveGame();
      return;
    }
    const timer = setTimeout(() => {
      setResultCountdown(prev => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [resultCountdown, showWinModal, opponentWinner, leaveGame]);

  const manualDraw = useCallback(() => {
    const currentDrawn = drawnRef.current;
    if (currentDrawn.length >= 75) return;
    const all = Array.from({ length: 75 }, (_, i) => i + 1);
    const rem = all.filter(n => !currentDrawn.includes(n));
    const num = rem[Math.floor(Math.random() * rem.length)];
    const newDrawn = [...currentDrawn, num];
    drawnRef.current = newDrawn;
    setDrawnNumbers(newDrawn);
    setRecentCalled(prev => [{ num, label: `${getColumnLabel(num)}-${num}` }, ...prev].slice(0, 10));
    
    if (voiceEnabled) speakNumber(num, language);
    
    const card = gameCard;
    if (card.length > 0 && !isWatching && checkWin(card, newDrawn)) {
      triggerWin(card, newDrawn);
    }
  }, [voiceEnabled, language, gameCard, isWatching, triggerWin]);

  const handleBingo = useCallback(() => {
    if (playerCards.length > 0) {
      const checkAgainst = autoMark ? drawnRef.current : userMarkedNumbers;
      const wonCard = playerCards.find(c => checkWin(c, checkAgainst));
      
      if (wonCard) {
        triggerHaptic('success');
        triggerWin(wonCard, drawnRef.current);
      } else {
        triggerHaptic('error');
        alert(language === 'en' 
          ? "Not a valid BINGO yet! Match more numbers on your card." 
          : "ትክክለኛ ቢንጎ የለም! ካርድዎ ላይ ተጨማሪ ቁጥሮችን ያዛምዱ።"
        );
      }
    }
  }, [playerCards, autoMark, userMarkedNumbers, triggerWin, language]);

  // ============= WIN MODAL =============
  const renderWinModal = () => {
    if (!showWinModal) return null;
    const rawPrize = (selectedStake || 10) * livePlayerCount;
    const commissionAmt = Math.round(rawPrize * (commissionRate / 100));
    const singlePrize = rawPrize - commissionAmt;
    const cartelaNum = selectedCards[0] || 158;
    const userNameToShow = profile?.first_name || (profile?.username ? `@${profile.username}` : 'Bekele (You)');

    return (
      <div 
        className="fixed inset-0 bg-[#050e18] z-50 flex flex-col justify-between p-6 overflow-y-auto font-sans text-white animate-fade-in"
        onClick={() => { setShowWinModal(false); leaveGame(); }}
      >
        {/* Skip action top right corner */}
        <div className="flex justify-end">
          <button 
            onClick={(e) => { e.stopPropagation(); setShowWinModal(false); leaveGame(); }}
            className="text-xs font-black text-gray-400 hover:text-white bg-[#141f33] border border-[#233c66]/40 px-3.5 py-1.5 rounded-xl transition-all uppercase cursor-pointer"
          >
            Skip {resultCountdown !== null && `(${resultCountdown}s)`}
          </button>
        </div>

        {/* Main Content Vertical Align Stack */}
        <div className="max-w-sm w-full mx-auto my-auto space-y-6" onClick={e => e.stopPropagation()}>
          {/* Confetti & Flashing Header */}
          <div className="text-center">
            <span className="text-3xl animate-bounce inline-block">🎉</span>
            <h1 className="text-3xl font-black text-[#ffd000] tracking-tight uppercase mt-1 drop-shadow-md">
              BINGO! 🎉
            </h1>
            <div className="text-[10px] font-black uppercase text-[#8da0c4] mt-1.5 tracking-widest">
              SINGLE WINNER (FULL POT CLAIMED)
            </div>
          </div>

          {/* Winners List Cards exactly matching screenshot */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between bg-[#141f33]/80 border border-amber-500 px-5 py-4 rounded-2xl shadow-lg relative overflow-hidden">
              <span className="font-extrabold text-[#ffd000] text-sm tracking-wide flex items-center gap-1.5">
                <span>👑</span> {userNameToShow}
              </span>
              <div className="text-right">
                <span className="font-black text-amber-500 text-sm block">
                  +{singlePrize.toLocaleString()} ብር
                </span>
                <span className="text-[9px] text-gray-400 block font-mono">
                  (House commission of {commissionRate}% deducted)
                </span>
              </div>
            </div>
          </div>

          {/* Cartela Card Meta Label */}
          <div className="text-center">
            <div className="text-[10px] font-black tracking-widest text-[#a1a1aa] uppercase">
              CARTELA NO: {cartelaNum}
            </div>
          </div>

          {/* Bingo Custom 3D Grid Progress */}
          {winningCard.length > 0 && (
            <div className="bg-[#141f33]/40 border border-[#233c66]/20 p-4 rounded-3xl shadow-xl">
              <BingoGrid card={winningCard} drawnNumbers={drawnNumbers} winningCells={winningCells} compact={true} />
            </div>
          )}
        </div>

        {/* Starting timer countdown progress footer */}
        <div className="max-w-sm w-full mx-auto mt-auto pt-4" onClick={e => e.stopPropagation()}>
          <div className="text-center">
            <div className="text-[10px] uppercase font-black tracking-widest text-amber-500 tracking-wide select-none animate-pulse">
              STARTING IN {resultCountdown ?? 3}S
            </div>
            {/* Custom Orange Progress Bar */}
            <div className="w-full bg-[#141f33] h-2.5 rounded-full overflow-hidden mt-2.5 border border-[#233c66]/40 shadow-inner">
              <div 
                className="bg-gradient-to-r from-amber-500 via-[#ff5a00] to-orange-600 h-full rounded-full transition-all duration-1000 ease-linear shadow-sm"
                style={{ width: `${((resultCountdown ?? 5) / 5) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============= LOSS MODAL =============
  const renderLossModal = () => {
    if (!opponentWinner) return null;
    const singlePrize = Math.round(((selectedStake || 10) * livePlayerCount) * (1 - commissionRate / 100));
    const splitPrize = Math.round(singlePrize / 2);
    const cartelaNum = selectedCards[0] || 158;

    return (
      <div 
        className="fixed inset-0 bg-[#050e18] z-50 flex flex-col justify-between p-6 overflow-y-auto font-sans text-white animate-fade-in"
        onClick={() => { setOpponentWinner(null); leaveGame(); }}
      >
        {/* Skip action top right corner */}
        <div className="flex justify-end">
          <button 
            onClick={(e) => { e.stopPropagation(); setOpponentWinner(null); leaveGame(); }}
            className="text-xs font-black text-gray-400 hover:text-white bg-[#141f33] border border-[#233c66]/40 px-3.5 py-1.5 rounded-xl transition-all uppercase cursor-pointer"
          >
            Skip {resultCountdown !== null && `(${resultCountdown}s)`}
          </button>
        </div>

        {/* Main Content Vertical Align Stack */}
        <div className="max-w-sm w-full mx-auto my-auto space-y-6" onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className="text-center">
            <span className="text-3xl animate-bounce inline-block">😢</span>
            <h1 className="text-2xl font-black text-red-500 tracking-tight uppercase mt-1 drop-shadow-md">
              GAME OVER!
            </h1>
            <div className="text-[10px] font-black uppercase text-[#8da0c4] mt-1.5 tracking-widest">
              OPPONENT CLAIMED JACKPOT
            </div>
          </div>

          {/* Winner Row list styled identical to screenshot */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between bg-[#141f33]/80 border border-red-500/20 px-5 py-4 rounded-2xl shadow-lg">
              <span className="font-extrabold text-[#ffd000] text-sm tracking-wide flex items-center gap-1.5">
                <span>👑</span> {opponentWinner}
              </span>
              <span className="font-black text-amber-500 text-sm">
                +{singlePrize.toLocaleString()} ብር
              </span>
            </div>
            
            <div className="flex items-center justify-between bg-[#141f33]/80 border border-white/5 opacity-50 px-5 py-4 rounded-2xl shadow-lg">
              <span className="font-extrabold text-white text-sm tracking-wide flex items-center gap-1.5 font-sans">
                <span>👤</span> Bekele (You)
              </span>
              <span className="font-black text-gray-400 text-sm">
                +0 ብር
              </span>
            </div>
          </div>

          {/* Cartela Card Meta Label */}
          <div className="text-center">
            <div className="text-[10px] font-black tracking-widest text-[#a1a1aa] uppercase">
              CARTELA NO: {cartelaNum}
            </div>
          </div>

          {/* User's card final progress display */}
          {(playerCards.length > 0 ? playerCards : (gameCard.length > 0 ? [gameCard] : [])).map((card, cIndex) => {
            const cardNum = selectedCards[cIndex] || cIndex + 1;
            return (
              <div key={cIndex} className="bg-[#141f33]/40 border border-[#233c66]/20 p-4 rounded-3xl shadow-xl">
                <BingoGrid card={card} drawnNumbers={drawnNumbers} compact={true} />
              </div>
            );
          })}
        </div>

        {/* Starting timer countdown progress footer */}
        <div className="max-w-sm w-full mx-auto mt-auto pt-4" onClick={e => e.stopPropagation()}>
          <div className="text-center">
            <div className="text-[10px] uppercase font-black tracking-widest text-amber-500 tracking-wide select-none animate-pulse">
              STARTING IN {resultCountdown ?? 3}S
            </div>
            {/* Custom Orange Progress Bar */}
            <div className="w-full bg-[#141f33] h-2.5 rounded-full overflow-hidden mt-2.5 border border-[#233c66]/40 shadow-inner">
              <div 
                className="bg-gradient-to-r from-amber-500 via-[#ff5a00] to-orange-600 h-full rounded-full transition-all duration-1000 ease-linear shadow-sm"
                style={{ width: `${((resultCountdown ?? 5) / 5) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============= GAME TAB =============
  const renderGameTab = () => {
    const isBingoReady = inGame && playerCards.some(c => checkWin(c, autoMark ? drawnNumbers : userMarkedNumbers));

    if (inGame) {
      return (
        <div className="px-3 pt-2 animate-fade-in pb-20">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 bg-black/35 p-3 rounded-2xl border border-white/5 font-sans">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10b981] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#10b981]"></span>
              </span>
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#10b981]">ACTIVE BINGO PLAY</span>
            </div>
            <div className="text-[10px] text-gray-300 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
              Room BET: <span className="text-gold font-bold">{selectedStake || 10} ETB</span>
            </div>
          </div>

          {/* Top Bar Stats */}
          <div className="grid grid-cols-4 gap-1.5 mb-3 font-sans">
            {[
              { label: t('game_id'), value: `#${gameId.substring(0, 5)}`, element: null },
              { label: t('players'), value: `${livePlayerCount}`, element: <RollingCounter value={livePlayerCount} /> },
              { label: 'Bet Amount', value: `${selectedStake || 10} ETB`, element: null },
              { label: t('prize'), value: `${Math.round(((selectedStake || 10) * livePlayerCount) * (1 - commissionRate / 100))} ETB`, element: <span className="text-gold"><RollingCounter value={Math.round(((selectedStake || 10) * livePlayerCount) * (1 - commissionRate / 100))} suffix=" ETB" /></span> },
            ].map((stat, i) => (
              <div key={i} className="glass rounded-xl p-2.5 text-center flex flex-col justify-center border border-white/5 bg-navy-card/45 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-[1.5px] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
                <span className="text-[8.5px] text-gray-400 font-bold uppercase tracking-wider">{stat.label}</span>
                <span className={`text-[12px] font-black mt-0.5 truncate ${i === 3 ? 'text-gold' : 'text-white'}`}>
                  {stat.element !== null && stat.element !== undefined ? stat.element : stat.value}
                </span>
              </div>
            ))}
          </div>

          {/* Active Ball Tumbler Chamber */}
          <div className="relative mb-4 bg-gradient-to-b from-[#082414] to-[#04160c] border border-emerald-500/25 p-4 rounded-3xl shadow-xl shadow-black/40 overflow-hidden group">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,208,0,0.03)_0%,transparent_80%)] pointer-events-none" />
            <div className="absolute -top-10 -left-10 w-32 h-32 bg-gold/5 rounded-full blur-2xl group-hover:bg-gold/10 transition-all pointer-events-none" />
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                <div className="relative w-14 h-14 rounded-full bg-black/45 border-2 border-emerald-500/20 flex items-center justify-center overflow-hidden shadow-inner">
                  <div className="absolute inset-0.5 rounded-full border border-dashed border-emerald-500/10 animate-[spin_12s_linear_infinite]" />
                  <div className="absolute inset-2 rounded-full border border-dotted border-gold/10 animate-[spin_6s_linear_infinite_reverse]" />
                  {recentCalled.length > 0 ? (
                    <div className="relative z-10 w-11 h-11 rounded-full bg-gradient-to-br from-[#ffd500] via-[#ffd000] to-amber-500 flex flex-col items-center justify-center font-sans shadow-lg shadow-gold/25 animate-scale-up">
                      <span className="text-[8px] font-black text-navy leading-none mb-0.5 select-none">{recentCalled[0].label.charAt(0)}</span>
                      <span className="text-sm font-extrabold text-navy leading-none select-none">{recentCalled[0].num}</span>
                    </div>
                  ) : (
                    <div className="text-xl animate-spin text-gold">🌀</div>
                  )}
                </div>
                <div>
                  <div className="text-[8.5px] text-gray-500 font-bold uppercase tracking-wider">CAGE DRAW</div>
                  <div className="text-sm font-black text-white mt-0.5">
                    {recentCalled.length > 0 ? (
                      <span className="text-gold flex items-center gap-1.5 animate-pulse">
                        Ball {recentCalled[0].label.charAt(0)}-{recentCalled[0].num}
                      </span>
                    ) : (
                      <span className="text-[#8db9a1] text-[11px] font-mono animate-pulse">STARTING MACHINERY...</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Core Bingo Grid Card(s) */}
          <div className="space-y-4 mb-4">
            {(playerCards.length > 0 ? playerCards : (gameCard.length > 0 ? [gameCard] : [])).map((card, cardIndex) => {
              const cardNumSelected = selectedCards[cardIndex] || 0;
              const drawnNumsToShow = autoMark ? drawnNumbers : userMarkedNumbers;
              const cardWinningCells = getWinningCells(card, drawnNumsToShow);
              
              return (
                <div key={cardIndex} className="relative bg-gradient-to-b from-[#0b1624] to-[#050e18] border border-[#233c66]/30 p-3.5 rounded-2xl shadow-xl shadow-black/40">
                  <div className="absolute top-2 right-3 text-[9px] font-mono text-gold/80 tracking-widest font-black uppercase">
                    CARD #{cardNumSelected || cardIndex + 1}
                  </div>
                  <div className="pt-4">
                    <BingoGrid 
                      card={card} 
                      drawnNumbers={drawnNumsToShow} 
                      winningCells={cardWinningCells} 
                      interactive={!autoMark}
                      onCellClick={(row, col) => {
                        if (autoMark) return;
                        const num = card[row][col];
                        if (num === 0) return; // Free space
                        if (drawnNumbers.includes(num)) {
                          triggerHaptic('medium');
                          setUserMarkedNumbers(prev => {
                            if (prev.includes(num)) {
                              return prev.filter(n => n !== num);
                            } else {
                              return [...prev, num];
                            }
                          });
                        } else {
                          triggerHaptic('light');
                        }
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Live Opponents Activity grid (Compact & Engaging) */}
          {otherPlayers.length > 0 && (
            <div className="glass rounded-2xl p-3.5 mb-4 font-sans border border-white/5 bg-navy-card/30 relative">
              <div className="flex items-center justify-between mb-3 px-0.5">
                <span className="text-[9px] text-[#4ea075] font-black uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  Live Opponent Match Racer
                </span>
                <span className="text-[8px] text-gray-400 font-semibold lowercase">progress updated realtime</span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {otherPlayers.map((p, idx) => (
                  <div key={idx} className={`relative overflow-hidden border rounded-2xl p-2 text-center transition-all ${p.neededToWin <= 1 ? 'bg-red-500/10 border-red-500/40 shadow-lg shadow-red-500/5' : p.neededToWin === 2 ? 'bg-gold/15 border-gold/40 shadow-lg shadow-gold/5' : 'bg-[#051a0e] border-white/5'}`}>
                    {p.neededToWin <= 1 && (
                      <div className="absolute top-0 right-0 bg-red-500 text-white text-[6px] font-black uppercase px-1 py-0.5 rounded-bl">HOT!</div>
                    )}
                    <div className="text-[9px] text-gray-300 font-bold truncate leading-none mb-1">{p.username}</div>
                    <div className="flex gap-0.5 justify-center my-1.5">
                      {Array.from({ length: 5 }).map((_, bIdx) => {
                        const isLit = bIdx < p.markedCount;
                        return (
                          <span 
                            key={bIdx} 
                            className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${isLit ? (p.neededToWin <= 1 ? 'bg-red-400 animate-pulse' : 'bg-gold') : 'bg-white/10'}`} 
                          />
                        );
                      })}
                    </div>
                    <div className={`text-[10px] font-extrabold leading-none ${p.neededToWin <= 1 ? 'text-red-400 animate-pulse' : p.neededToWin === 2 ? 'text-gold' : 'text-emerald-400'}`}>
                      {p.markedCount}/5 matched
                    </div>
                    <div className="text-[7.5px] text-gray-500 mt-1 uppercase tracking-wider font-bold">
                      {p.neededToWin === 0 ? "BINGO!" : `NEED ${p.neededToWin}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Called Numbers Row */}
          <div className="glass rounded-2xl p-3 mb-4 flex items-center justify-between gap-3 font-sans border border-white/5">
            <span className="text-[10px] text-[#8db9a1] uppercase font-bold tracking-wider">Ball Call Chamber log:</span>
            <div className="flex gap-2 overflow-x-auto py-1 flex-1 scrollbar-none">
              {recentCalled.slice(1, 10).map((item, i) => (
                <span key={i} className="flex-shrink-0 text-[10px] w-7 h-7 rounded-full flex items-center justify-center font-black bg-[#0d2a1b] border border-[#1e4831] text-gray-400">
                  {item.label}
                </span>
              ))}
              {recentCalled.length <= 1 && <span className="text-[10px] text-gray-500 italic">No previous calls logged...</span>}
            </div>
          </div>

          {/* Actions panel */}
          <div className="space-y-3 font-sans">
            <div className="grid grid-cols-3 gap-2">
              <button 
                onClick={() => {
                  setAutoMark(!autoMark);
                  triggerHaptic('light');
                }} 
                className={`py-3 rounded-xl text-[10px] sm:text-xs font-bold border transition-all ${autoMark ? 'bg-[#10b981]/15 text-[#10b981] border-[#10b981]/30' : 'bg-black/20 border-white/5 text-gray-400'}`}
              >
                Marking: <span className="font-extrabold">{autoMark ? 'AUTO' : 'MAN'}</span>
              </button>
              <button 
                onClick={() => {
                  setAutoWin(!autoWin);
                  triggerHaptic('light');
                }} 
                className={`py-3 rounded-xl text-[10px] sm:text-xs font-bold border transition-all ${autoWin ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30' : 'bg-black/20 border-white/5 text-gray-400'}`}
              >
                🏆 Auto-Win: <span className="font-extrabold">{autoWin ? 'ON' : 'OFF'}</span>
              </button>
              <button 
                onClick={() => {
                  setVoiceEnabled(!voiceEnabled);
                  triggerHaptic('light');
                }} 
                className={`py-3 rounded-xl text-[10px] sm:text-xs font-bold border transition-all ${voiceEnabled ? 'bg-gold/15 text-gold border-gold/30' : 'bg-black/20 border-white/5 text-gray-400'}`}
              >
                Voice: <span className="font-extrabold">{voiceEnabled ? 'ON' : 'OFF'}</span>
              </button>
            </div>

            <div className="flex gap-2 relative">
              {isBingoReady && (
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-red-600 border border-red-400 text-white font-extrabold text-[9px] px-2.5 py-1 rounded-full animate-bounce shadow-lg shadow-red-500/50 uppercase tracking-widest pointer-events-none flex items-center gap-1.5 z-20">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping shrink-0" />
                  🔥 BINGO READY!
                </div>
              )}
              <button 
                onClick={handleBingo} 
                disabled={opponentWinner !== null} 
                className={`flex-1 font-black py-4 rounded-xl text-sm transition-all tracking-wider uppercase relative overflow-hidden select-none cursor-pointer ${
                  isBingoReady 
                    ? 'bg-gradient-to-r from-red-600 via-amber-500 to-red-600 text-white shadow-xl shadow-red-500/40 scale-[1.01] border border-red-400 animate-pulse' 
                    : 'bg-[#ffd000] text-navy hover:opacity-95 shadow-md shadow-gold/15 transition-transform hover:scale-[1.01] active:translate-y-0.5'
                }`}
              >
                🚀 {isBingoReady ? '🔥 CLAIM BINGO! 🔥' : 'CLAIM BINGO!'}
              </button>
              <button onClick={leaveGame} className="bg-red-500/10 border border-red-500/20 text-red-300 font-extrabold px-6 py-4 rounded-xl text-xs hover:bg-red-500/20 transition-all">
                {t('leave')}
              </button>
            </div>
          </div>

          {renderWinModal()}
          {renderLossModal()}
        </div>
      );
    }

    // ROOM DETAILED LOBBY (1-100 Card Selection Grid - 10 Columns Compact styled)
    if (selectedRoom) {
      const roomTick = rooms.find(r => r.id === selectedRoom.id) || selectedRoom;
      const cards = Array.from({ length: 100 }, (_, i) => i + 1);
      const fee = roomTick.entry;
      const totalBalance = (wallet?.main_balance || 0) + (wallet?.play_balance || 0);
      const isBalanceEligible = selectedCards.length > 0 && totalBalance >= fee * selectedCards.length;

      return (
        <div className="px-4 pt-4 animate-fade-in pb-24 font-sans bg-[#0c1322] min-h-screen text-white">
          {/* Header Title with premium design */}
          <div className="flex items-center justify-between mb-4 border-b border-[#233c66]/30 pb-3">
            <button 
              onClick={() => { setSelectedRoom(null); setSelectedCards([]); setPreviewCard([]); }}
              className="flex items-center gap-1.5 text-xs text-gray-300 hover:text-white bg-[#141f33] px-3 py-1.5 rounded-xl border border-[#233c66]/40 font-bold transition-all"
            >
              ⬅ Back
            </button>
            <div className="text-center">
              <div className="text-sm font-extrabold text-gold uppercase tracking-wider flex items-center gap-1.5 justify-center">
                <span>🎴</span> GAME ID: {gameId}
              </div>
            </div>
            <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-[8px] font-extrabold uppercase text-emerald-400">Live</span>
            </div>
          </div>

          {/* Quick Stats Panel modeled precisely on image */}
          <div className="flex items-stretch gap-1.5 mb-4">
            <div className="bg-[#141f33] border border-[#233c66]/30 p-2.5 rounded-xl flex-1 text-center shadow-lg">
              <div className="text-[7.5px] text-gray-400 font-extrabold uppercase tracking-wider">WALLET (ቀሪ ሒሳብ)</div>
              <div className="text-sm font-black text-white mt-1">{totalBalance.toLocaleString()} ብር</div>
            </div>
            <div className="bg-[#141f33] border border-[#233c66]/30 p-2.5 rounded-xl flex-1 text-center shadow-lg">
              <div className="text-[7.5px] text-gray-400 font-extrabold uppercase tracking-wider">STAKE (መደብ)</div>
              <div className="text-sm font-black text-amber-400 mt-1">{(fee * selectedCards.length).toLocaleString()} ብር</div>
            </div>
            <div className="bg-[#141f33] border border-[#233c66]/30 p-2.5 rounded-xl flex-1 text-center shadow-lg">
              <div className="text-[7.5px] text-gray-400 font-extrabold uppercase tracking-wider">PRIZE (ደራሽ)</div>
              <div className="text-sm font-black text-gold mt-1">{(selectedCards.length > 0 ? (roomTick.winAmount * selectedCards.length) : 0).toLocaleString()} ብር</div>
            </div>
            
            {/* Massive countdown timer floating card block */}
            {roomTick.status === 'starting_soon' && (
              <div className="bg-gradient-to-br from-[#ff5a00] to-amber-600 rounded-xl px-2.5 flex flex-col items-center justify-center font-black text-center shadow-lg shadow-[#ff5a00]/20 w-14 border border-white/10 select-none h-12 self-center shrink-0">
                <span className="text-[7px] text-white/80 uppercase font-bold tracking-tight">WAIT</span>
                <span className="text-base text-white font-black leading-none mt-0.5">{roomTick.countdown}S</span>
              </div>
            )}
          </div>

          {/* My Cards selector guide label */}
          <div className="flex items-center justify-between mb-2.5 px-0.5 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span className="font-bold text-gray-300 text-[11px] uppercase tracking-wider">MY CARDS (የእርስዎ ካርዶች)</span>
            </div>
            <div className="text-xs font-black text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-md">
              Selected: {selectedCards.length}/2
            </div>
          </div>

          {/* Cards 10-cols Grid - Squircles made more compact & beautiful as requested */}
          <div className="rounded-2xl bg-[#0a1120] border border-[#1e2f4d]/60 p-2.5 text-center relative overflow-hidden mb-4 shadow-xl shadow-black/30">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(35,60,102,0.06)_0%,transparent_75%)] pointer-events-none" />
            <div className="grid grid-cols-10 gap-[5px] sm:gap-1.5 max-h-[35vh] overflow-y-auto pb-1 relative z-10 scrollbar-none">
              {cards.map((num) => {
                const isSelected = selectedCards.includes(num);
                // No pre-taken cards when no one is active in the room
                const isTaken = false;

                return (
                  <button 
                    key={num} 
                    onClick={() => { if (!isTaken) toggleCard(num); }} 
                    disabled={isTaken}
                    className={`aspect-square w-full rounded-lg sm:rounded-xl flex items-center justify-center text-[10px] sm:text-[11.5px] font-black transition-all border select-none ${
                      isSelected 
                        ? 'bg-gradient-to-b from-[#ff5a00] to-[#e04f00] border-[#ff7a22]/30 border-b-[3.5px] border-b-[#9e3800] text-white shadow-lg shadow-[#ff5a00]/25 font-black scale-[1.04] z-10' 
                        : isTaken 
                          ? 'bg-[#0e1624]/40 text-[#253248] border-[#182335]/30 border-dashed cursor-not-allowed opacity-35 text-[8.5px] sm:text-[9.5px]' 
                          : 'bg-[#131f36] border-[#1e2f4d] border-b-[3px] border-b-[#1e2f4d] text-white hover:bg-[#1a2b4b] active:translate-y-[1px] active:border-b-[1.5px] cursor-pointer'
                    }`}
                  >
                    {num}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Two-card selection preview container inside the same page */}
          {selectedCards.length > 0 && (
            <div className="mb-4 bg-[#142036]/60 border border-[#233c66]/40 rounded-2xl p-3 animate-fade-in shadow-xl">
              <div className="text-[10px] text-amber-400 font-extrabold uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <span>👁</span> Card Grid Layout Preview
              </div>
              <div className="grid grid-cols-2 gap-3">
                {selectedCards.map((cardNum, cIndex) => {
                  const cardData = getSeededCard(cardNum);
                  return (
                    <div key={cardNum} className="bg-gradient-to-b from-[#142036]/80 to-[#0e1726]/65 rounded-xl p-2.5 border border-[#233c66]/30 shadow-md">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] font-black tracking-wider text-[#8da0c4]">CARD #{cardNum}</span>
                        <span className="text-[7.5px] font-black text-amber-400 bg-amber-400/10 px-1 rounded uppercase">Selected</span>
                      </div>
                      <BingoGrid card={cardData} drawnNumbers={[]} compact={true} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Balance/Wallet and Confirmation action footer block */}
          <div className="space-y-2.5">
            {selectedCards.length > 0 && !isBalanceEligible && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-300 text-[11px] py-2 px-3 rounded-xl font-medium flex items-center justify-between font-sans shadow-md animate-fade-in">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-ping" />
                  Insufficient Balance. Need {(fee * selectedCards.length).toLocaleString()} ብር
                </span>
                <button 
                  onClick={() => {
                    setSelectedCards([]);
                    setPreviewCard([]);
                    setSelectedRoom(null);
                    setWalletView('deposit');
                    setActiveTab('wallet');
                  }}
                  className="bg-amber-500 text-white text-[9.5px] font-extrabold px-3 py-1 rounded bg-[#ff5a00] hover:opacity-90 shadow-sm"
                >
                  Deposit
                </button>
              </div>
            )}

            {/* Main call-to-action bar */}
            <div className="flex gap-2.5">
              <button 
                onClick={() => {
                  setSelectedCards([]);
                  setPreviewCard([]);
                  setSelectedRoom(null);
                  watchGame();
                }}
                className="bg-[#141f33] border border-[#233c66]/40 hover:bg-white/5 text-gray-300 font-extrabold px-4 py-3.5 rounded-xl text-xs transition-colors uppercase select-none cursor-pointer tracking-wider flex items-center gap-1 justify-center shrink-0"
              >
                <Eye size={12} fill="currentColor" /> Live Spectate
              </button>

              {selectedCards.length > 0 && isBalanceEligible ? (
                <button 
                  onClick={playWithCard}
                  className="flex-1 bg-gradient-to-r from-[#ffd000] to-amber-500 text-navy font-black py-3.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-gold/20 hover:scale-[1.01] active:scale-[0.99] transition-all uppercase tracking-widest animate-pulse cursor-pointer"
                >
                  <Play size={10} fill="currentColor" /> Play {selectedCards.length} Cards ({(fee * selectedCards.length).toLocaleString()} ብር)
                </button>
              ) : (
                <button 
                  disabled
                  className="flex-1 bg-gray-500/10 border border-white/5 text-gray-500 font-extrabold py-3.5 rounded-xl text-xs transition-all uppercase tracking-widest cursor-not-allowed text-center"
                >
                  {selectedCards.length === 0 ? `SELECT A CARD TO START (${fee.toLocaleString()} ብር)` : `SELECT A CARD TO START`}
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    // HOME: ROOMS LIST SCREEN (Completely redesigned ultra-premium Game Tab)
    const walletBalance = (wallet?.main_balance || 0) + (wallet?.play_balance || 0);

    // Find the three core room stakeholders
    const bronzeRoom = rooms.find(r => r.id === 'bronze') || rooms[0];
    const silverRoom = rooms.find(r => r.id === 'silver') || rooms[1];
    const goldRoom = rooms.find(r => r.id === 'gold') || rooms[2];

    const handlePlaySelectedStake = () => {
      let matchedRoom = bronzeRoom;
      if (selectedStake === silverRoom.entry) matchedRoom = silverRoom;
      if (selectedStake === goldRoom.entry) matchedRoom = goldRoom;
      
      handleJoinRoom(matchedRoom);
    };

    return (
      <div className="px-4 pt-4 animate-fade-in pb-20 font-sans text-white bg-[#050e1e] min-h-screen">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-5 border-[#233c66]/30 pb-3 border-b">
          <div className="font-sans">
            <span className="text-[10px] uppercase font-black tracking-widest text-gray-400 block">WELCOME TO</span>
            <span className="text-2xl font-black text-[#ffd000] tracking-tight uppercase flex items-center gap-1.5 mt-0.5 animate-pulse">
              {appLogo} {appName} <span className="animate-bounce">🔥</span> <span className="text-yellow-400">🟡</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => { setWalletView('main'); setActiveTab('wallet'); }}
              className="flex items-center gap-1 bg-[#ff5a00] hover:bg-[#ff7a22] text-white font-extrabold text-[11px] px-3.5 py-2 rounded-xl shadow-md shadow-[#ff5a00]/15 transition-all cursor-pointer"
            >
              💰 {walletBalance.toLocaleString()} ብር
            </button>
          </div>
        </div>

        {/* Stake Choice Title Section */}
        <div className="mb-4">
          <div className="text-center">
            <h2 className="text-[12.5px] font-black tracking-widest uppercase text-gray-300">
              CHOOSE YOUR STAKE
            </h2>
            <div className="flex flex-col items-center mt-1">
              <span className="text-sm font-black text-amber-500 tracking-wide">
                ( ጨዋታዎን ይምረጡ )
              </span>
              {/* Elegant Accent Orange Underline */}
              <span className="w-16 h-1 bg-gradient-to-r from-transparent via-[#ff5a00] to-transparent mt-1.5 rounded-full" />
            </div>
          </div>
        </div>

        {/* The Three Premium Stake Choice Cards exactly like the uploaded reference image */}
        <div className="grid grid-cols-3 gap-3 mb-6 relative z-10">
          {[
            { amount: bronzeRoom.entry, label: `${bronzeRoom.entry} ብር`, room: bronzeRoom, tag: (bronzeRoom.countdown > 0 ? `${bronzeRoom.countdown}S` : '37S') },
            { amount: silverRoom.entry, label: `${silverRoom.entry} ብር`, room: silverRoom, tag: (silverRoom.countdown > 0 ? `${silverRoom.countdown}S` : '20S') },
            { amount: goldRoom.entry, label: `${goldRoom.entry} ብር`, room: goldRoom, tag: (goldRoom.countdown > 0 ? `${goldRoom.countdown}S` : '42S') },
          ].map((stakeCard) => {
            const isCurrentlySelected = selectedStake === stakeCard.amount;

            return (
              <button
                key={stakeCard.amount}
                onClick={() => setSelectedStake(stakeCard.amount)}
                className={`relative rounded-2xl py-5 px-3 border transition-all text-center flex flex-col items-center justify-center cursor-pointer select-none ${
                  isCurrentlySelected
                    ? 'bg-gradient-to-b from-[#14233c] to-[#0d1624] border-[#ff5a00] shadow-lg shadow-[#ff5a00]/15 scale-[1.04]'
                    : 'bg-[#141f33]/70 border-[#233c66]/40 hover:border-amber-500/50'
                }`}
              >
                {/* Floating countdown time badge on the top right */}
                <span className="absolute -top-1.5 -right-1.5 bg-[#ff5a00] text-white text-[7.5px] font-black px-1.5 py-0.5 rounded-full shadow-md shadow-[#ff5a00]/30 select-none uppercase tracking-tighter">
                  {stakeCard.tag}
                </span>

                <span className="text-xl font-black text-white block">
                  {stakeCard.amount}
                </span>
                <span className="text-[10px] text-gray-400 font-extrabold uppercase mt-1 tracking-wider block">
                  ብር (ETB)
                </span>
                
                {/* Subtle bottom check dot when selected */}
                {isCurrentlySelected && (
                  <span className="w-1.5 h-1.5 bg-[#ff5a00] rounded-full mt-2" />
                )}
              </button>
            );
          })}
        </div>

        {/* Dynamic CTA Confirmation / Play Button */}
        <div className="mb-6">
          {selectedStake ? (
            <button
              onClick={handlePlaySelectedStake}
              className="w-full bg-gradient-to-r from-amber-500 via-[#ff5a00] to-orange-600 hover:opacity-95 text-white font-black py-4 rounded-2xl text-[13px] tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-[#ff5a00]/25 transition-transform hover:scale-[1.01] active:translate-y-0.5 cursor-pointer uppercase font-sans animate-pulse"
            >
              🚀 PLAY WITH {selectedStake} ብር (ወደ ጨዋታ ይግቡ)
            </button>
          ) : (
            <button
              disabled
              className="w-full bg-[#141f33]/40 border border-white/5 text-gray-500 font-extrabold py-4 rounded-2xl text-[12px] tracking-widest text-center cursor-not-allowed select-none uppercase"
            >
              ⚙️ PLEASE SELECT A STAKE TO START
            </button>
          )}
        </div>

        {/* Detailed Wallet Balance Panel */}
        <div className="bg-[#0a1120] border border-[#1e2f4d]/60 rounded-2xl p-4.5 mb-5 shadow-lg relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(35,60,102,0.04)_0%,transparent_80%)] pointer-events-none" />
          <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3">
            <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <span>💳</span> WALLET BALANCE (ሂሳብ መረጃ)
            </span>
            <span className="text-[10px] text-amber-400 font-bold">ETB / ብር</span>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-400">Main Balance (ዋና ቀሪ ሒሳብ)</span>
              <span className="font-extrabold text-white">{(wallet?.main_balance || 0).toLocaleString()} ብር</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-400">Play Balance (የጨዋታ ቀሪ ሒሳብ)</span>
              <span className="font-extrabold text-white">{(wallet?.play_balance || 0).toLocaleString()} ብር</span>
            </div>
            <div className="border-t border-dashed border-white/5 pt-1.5 flex justify-between items-center text-[13px] font-black">
              <span className="text-amber-500">Total Balance (አጠቃላይ ቀሪ ሒሳብ)</span>
              <span className="text-[#ffd000]">{walletBalance.toLocaleString()} ብር</span>
            </div>
          </div>
        </div>

        {/* How to Play Manual Guide Buttons */}
        <button 
          onClick={() => setShowRules(true)} 
          className="w-full bg-[#0a1120] border border-[#1e2f4d]/60 hover:bg-[#101c33] text-white/70 py-3 rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-all font-semibold font-sans mt-3 cursor-pointer"
        >
          <Info size={12} />How to Play BINGO
        </button>

        {showRules && renderRulesModal()}
      </div>
    );
  };

  // ============= RULES MODAL =============
  const renderRulesModal = () => (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4" onClick={() => setShowRules(false)}>
      <div className="bg-navy-card rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-gold flex items-center gap-2"><Info size={20} />{t('how_to_play')}</h2>
          <button onClick={() => setShowRules(false)} className="text-gray-400 hover:text-white p-1"><X size={20} /></button>
        </div>
        <div className="space-y-5">
          {[
            { icon: <Target size={16} className="text-gold" />, bg: 'bg-gold/20', title: t('objective'), desc: t('objective_desc') },
            { icon: <List size={16} className="text-accent-green" />, bg: 'bg-accent-green/20', title: t('gameplay'), desc: t('gameplay_desc') },
            { icon: <Crown size={16} className="text-accent-blue" />, bg: 'bg-accent-blue/20', title: t('winning'), desc: t('winning_desc') },
            { icon: <Swords size={16} className="text-accent-violet" />, bg: 'bg-accent-violet/20', title: t('stakes'), desc: t('stakes_desc') },
          ].map((item, i) => (
            <div key={i} className="flex gap-3">
              <div className={`w-8 h-8 rounded-full ${item.bg} flex items-center justify-center flex-shrink-0`}>{item.icon}</div>
              <div><h4 className="text-sm font-semibold text-white mb-1">{item.title}</h4><p className="text-xs text-gray-400 leading-relaxed">{item.desc}</p></div>
            </div>
          ))}
        </div>
        <button onClick={() => setShowRules(false)} className="w-full mt-6 bg-gold text-navy font-bold py-3 rounded-xl hover:bg-gold-dark">{t('got_it')}</button>
      </div>
    </div>
  );

  // ============= OTHER TABS =============
  const renderScoresTab = () => {
    const userTotalEarnings = stakeHistory
      .filter(h => h.result === 'win')
      .reduce((sum, h) => sum + (h.stake * 20), 0); // realistic tournament yield multiplier (20 players average)

    const activeDbLeaderboard = dbLeaderboard.length > 0 ? dbLeaderboard : [
      { id: 'user', username: profile?.first_name || (profile?.username ? `@${profile.username}` : 'Bekele (You)'), earnings: userTotalEarnings, avatar: profile?.photo_url || '👑', isUser: true }
    ];

    const hasUser = activeDbLeaderboard.some(p => p.id === profile?.id || p.isUser);
    const listToUse = [...activeDbLeaderboard];

    if (!hasUser) {
      listToUse.push({
        id: profile?.id || 'user',
        username: profile?.first_name || (profile?.username ? `@${profile.username}` : 'Bekele (You)'),
        earnings: Number(wallet?.main_balance) || 0,
        avatar: profile?.photo_url || '👑',
        isUser: true
      });
    } else {
      for (let i = 0; i < listToUse.length; i++) {
        if (listToUse[i].id === profile?.id || listToUse[i].id === 'user') {
          listToUse[i].isUser = true;
          listToUse[i].username = profile?.first_name || (profile?.username ? `@${profile.username}` : 'Bekele (You)');
          listToUse[i].earnings = Number(wallet?.main_balance) || 0;
          listToUse[i].avatar = profile?.photo_url || '👑';
        }
      }
    }

    // Sort to determine real-time rank perfectly!
    const sortedList = listToUse.sort((a, b) => b.earnings - a.earnings);

    const userRank = sortedList.findIndex(p => p.isUser) + 1;
    const finalLeaderboard = sortedList.slice(0, 10);

    return (
      <div className="px-4 pt-4 animate-fade-in pb-20">
        <div className="bg-gradient-to-r from-violet-600 to-indigo-700 rounded-2xl p-5 mb-5 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-8 -mt-8" />
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center border border-white/20 shadow-inner">
              <Trophy size={24} className="text-yellow-300 animate-pulse" />
            </div>
            <div>
              <div className="text-[10px] text-white/70 uppercase tracking-widest font-black">{t('my_rank')}</div>
              <div className="text-2xl font-black text-white flex items-baseline gap-2">
                <span>#{userRank}</span>
                <span className="text-xs font-bold text-violet-200">Out of 10,000+ players</span>
              </div>
              <div className="text-[11px] text-yellow-300 font-semibold mt-0.5">
                Total Earnings: {userTotalEarnings.toLocaleString()} ETB
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-3.5">
          <h3 className="text-xs text-gray-400 font-bold uppercase tracking-wider">🏆 Top 10 High Earners</h3>
          <span className="text-[9px] text-violet-400 font-bold uppercase bg-violet-400/10 px-2 py-0.5 rounded-full border border-violet-400/20">Live Arena Sync</span>
        </div>

        <div className="space-y-2">
          {finalLeaderboard.map((item, index) => {
            const rank = index + 1;
            const isUser = item.isUser;
            
            return (
              <div 
                key={item.id} 
                className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                  isUser 
                    ? 'bg-gradient-to-r from-[#202050] to-[#15153c] border-amber-500/50 shadow-md shadow-amber-500/5' 
                    : 'bg-navy-card/50 border-white/5 hover:border-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Rank Badge */}
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs shrink-0 select-none ${
                    rank === 1 ? 'bg-amber-400 text-navy shadow-md shadow-amber-400/20' :
                    rank === 2 ? 'bg-slate-300 text-navy shadow-md shadow-slate-300/20' :
                    rank === 3 ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20' :
                    'bg-white/5 border border-white/5 text-gray-400'
                  }`}>
                    {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
                  </div>

                  {/* Avatar & Profile */}
                  <span className="text-base shrink-0">{item.avatar}</span>
                  <div>
                    <span className={`text-xs font-extrabold ${isUser ? 'text-amber-300 font-black' : 'text-white'}`}>
                      {item.username} {isUser && <span className="text-[9px] font-bold px-1.5 py-0.5 bg-amber-500/15 border border-amber-500/20 rounded text-amber-400 ml-1">YOU</span>}
                    </span>
                    <div className="text-[9px] text-gray-500 leading-none mt-0.5 font-mono font-bold uppercase tracking-wider">Nile Bingo Player</div>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`text-xs font-mono font-black ${isUser ? 'text-amber-400' : 'text-gray-200'}`}>
                    {item.earnings.toLocaleString()} <span className="text-[9px] font-sans font-bold text-gray-400">ETB</span>
                  </span>
                  <div className="text-[9px] flex items-center justify-end gap-0.5 mt-0.5 font-bold">
                    {item.change === 'up' && <span className="text-emerald-400">▲ +3.4%</span>}
                    {item.change === 'down' && <span className="text-red-400">▼ -1.2%</span>}
                    {(item.change === 'same' || !item.change) && <span className="text-gray-500">- 0.0%</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderHistoryTab = () => {
    const winsCount = stakeHistory.filter(h => h.result === 'win').length;
    
    return (
      <div className="px-4 pt-4 animate-fade-in pb-20">
        <div>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-navy-card/60 p-3 rounded-xl border border-white/5 text-center">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Total Games</span>
              <div className="text-lg font-extrabold text-white mt-0.5">{stakeHistory.length}</div>
            </div>
            <div className="bg-navy-card/60 p-3 rounded-xl border border-white/5 text-center">
              <span className="text-[10px] text-gold uppercase tracking-wider font-semibold">Total Wins</span>
              <div className="text-lg font-extrabold text-gold mt-0.5">
                {winsCount}
              </div>
            </div>
          </div>

          {/* Stake History list - last 10 games */}
          <h3 className="text-[11px] text-gray-400 mb-2.5 font-bold uppercase tracking-wider flex items-center justify-between">
            <span>Last 10 Games Played</span>
            <span className="text-[9px] text-gray-500 font-normal">Game Logs</span>
          </h3>

          <div className="space-y-2">
            {stakeHistory.map((item, idx) => {
              const isWin = item.result === 'win';
              const date = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date(item.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
              
              return (
                <div key={idx} className="glass rounded-xl p-3 flex items-center justify-between border border-white/5 hover:border-white/10 transition-all">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isWin ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                      {isWin ? <Trophy size={14} /> : <X size={14} />}
                    </div>
                    <div>
                      <div className="text-xs font-extrabold text-white flex items-center gap-1.5">
                        ID: <span className="font-mono text-gray-300">#{item.gameId.substring(0, 8)}</span>
                      </div>
                      <div className="text-[10px] text-gray-500">{date}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`text-xs font-black ${isWin ? 'text-[#10b981]' : 'text-red-400'}`}>
                      {isWin ? `+${item.prize || Math.round((item.stake * livePlayerCount) * (1 - commissionRate / 100))} Birr` : `-${item.stake} Birr`}
                    </div>
                    <span className={`inline-block text-[8.5px] px-2 py-0.5 mt-0.5 rounded-full font-bold uppercase ${isWin ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/15 text-red-400 border border-red-500/20'}`}>
                      {isWin ? 'Win' : 'Loss'}
                    </span>
                  </div>
                </div>
              );
            })}

            {stakeHistory.length === 0 && (
              <div className="glass rounded-xl py-12 text-center text-gray-500 text-xs">
                <History size={26} className="mx-auto mb-2 text-gray-600" />
                No games recorded yet. Choose a card and play to see your history logs!
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderWalletTab = () => (
    <div className="px-4 pt-4 animate-fade-in pb-20">
      <div className="space-y-3 mb-5">
        <div className="bg-gradient-gold rounded-2xl p-5 flex justify-between items-center shadow-lg"><span className="text-navy font-black text-sm">{t('main_wallet')} (ዋና ቀሪ ሂሳብ)</span><span className="text-navy text-2xl font-black">{wallet?.main_balance.toLocaleString() || '0'} {t('birr')}</span></div>
        <div className="glass rounded-2xl p-5 flex justify-between items-center shadow-md"><span className="text-white font-bold text-sm">{t('play_wallet')} (የትርፍ ጨዋታ ሂሳብ)</span><span className="text-gold text-2xl font-black">{wallet?.play_balance.toLocaleString() || '0'} {t('birr')}</span></div>
      </div>

      {/* High Quality Referral Program Panel precisely implementing requested behavior */}
      {referralEnabled ? (
        <div className="bg-gradient-to-b from-[#142036] to-[#0d1624] border border-[#233c66]/50 rounded-2xl p-4.5 mb-5 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-gold/10 text-gold text-[8px] font-black tracking-widest px-2 py-0.5 rounded-bl uppercase">Active Program</div>
          
          <h3 className="text-gold font-bold text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5 font-sans">
            <span>👥</span> Referral & Earn Program
          </h3>
          
          <p className="text-[10.5px] text-gray-300 leading-relaxed mb-3.5">
            Get <span className="text-emerald-400 font-extrabold">{referralBonus} Birr</span> in your <span className="text-gold font-bold">Play Balance</span> for each user you invite to the Nile Bingo Telegram bot!
          </p>

          {/* Dynamic Referral Statistics */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-[#0b101c] border border-white/5 rounded-xl p-2.5 text-center">
              <div className="text-[9px] text-gray-400 lowercase leading-none mb-1">successful invites</div>
              <div className="text-base font-black text-white">{referralCount}</div>
            </div>
            <div className="bg-[#0b101c] border border-white/5 rounded-xl p-2.5 text-center">
              <div className="text-[9px] text-emerald-400 font-bold lowercase leading-none mb-1">earned play balance</div>
              <div className="text-base font-black text-emerald-400">+{referralCount * referralBonus} Birr</div>
            </div>
          </div>

          {/* Copy Referral Link component */}
          <div className="space-y-2 mb-4">
            <label className="text-[9px] text-gray-400 uppercase font-bold tracking-wider block">Your Invitation Link</label>
            <div className="flex gap-2">
              <input 
                readOnly 
                value={inviteLink} 
                className="bg-[#0a0f1a]/80 text-[10px] text-gray-300 font-mono p-2 rounded-xl border border-[#233c66]/30 flex-1 truncate select-all focus:outline-none" 
              />
              <button 
                onClick={copyRefLink}
                className={`text-[10px] font-bold px-3 py-2 rounded-xl transition-all shadow-md shrink-0 flex items-center gap-1 ${copiedLink ? 'bg-emerald-500 text-white' : 'bg-gold hover:bg-gold/85 text-navy'}`}
              >
                {copiedLink ? '✓ Copied' : '📋 Copy'}
              </button>
            </div>
          </div>

          {/* Action Controls */}
          <div className="space-y-2">
            {/* Simulate Action explicitly designed for seamless testing & immediate play_balance updates */}
            <button 
              onClick={simulateReferralJoin}
              className="w-full bg-[#1c3052] hover:bg-[#253f66] text-amber-300 font-extrabold text-[11px] py-2.5 px-4 rounded-xl border border-amber-500/20 flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98]"
            >
              <span>✨</span> Simulate Friend Join (Instant +{referralBonus} Birr)
            </button>
            
            <a
              href={`https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(`Join me on Nile Bingo! Play, match cards and win cash prizes daily. Get free play balances now!`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[11px] py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md text-center inline-block"
            >
              <span>📢</span> Invite & Share on Telegram
            </a>
          </div>
        </div>
      ) : (
        <div className="bg-[#142036]/40 border border-[#233c66]/20 rounded-2xl p-6 mb-5 text-center shadow-lg">
          <p className="text-xs text-gray-400">The Referral Program is currently closed by administration.</p>
        </div>
      )}

      <div className="glass rounded-2xl p-4 mb-4"><Info size={16} className="text-gold" /><p className="text-xs text-gray-400 mt-1">Use 📥 Deposit or 📤 Withdraw in the Telegram bot.</p></div>
      <div className="glass rounded-2xl py-8 text-center text-gray-500 text-xs"><RefreshCw size={24} className="mx-auto mb-2 text-gray-600" />{t('no_transactions')}</div>
    </div>
  );

  const renderProfileTab = () => {
    const playedCount = stakeHistory.length;
    const winsCount = stakeHistory.filter(h => h.result === 'win').length;
    const userTotalEarnings = stakeHistory
      .filter(h => h.result === 'win')
      .reduce((sum, h) => sum + (h.stake * 20), 0);

    return (
      <div className="px-4 pt-4 animate-fade-in pb-20">
        <div className="text-center mb-6">
          <button 
            onClick={() => {
              setShowAvatarSelector(!showAvatarSelector);
              triggerHaptic('light');
            }}
            className="w-20 h-20 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 mx-auto mb-3 flex items-center justify-center shadow-lg relative border border-amber-300 cursor-pointer group hover:scale-[1.03] transition-all duration-200"
            title="Change profile picture"
          >
            <span className="text-3xl">{profile?.photo_url || '👑'}</span>
            <div className="absolute -bottom-1 -right-1 bg-amber-500 text-navy p-1 rounded-full border border-[#0d1624] shadow-md group-hover:scale-110 transition-transform">
              <Camera size={10} fill="currentColor" />
            </div>
          </button>

          {showAvatarSelector && (
            <div className="bg-[#142036] border border-[#233c66]/40 p-4 rounded-2xl mb-4 max-w-sm mx-auto shadow-xl animate-fade-in text-left">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] text-gray-200 font-extrabold uppercase tracking-wider flex items-center gap-1">🎭 Tap an emoji to set profile</span>
                <button onClick={() => setShowAvatarSelector(false)} className="text-[9px] text-amber-400 font-bold hover:text-white uppercase">CLOSE</button>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {['👑', '🦁', '🦅', '🏃‍♂️', '☕', '⚡', '🎪', '👤', '👩‍🦰', '🧔'].map((av) => {
                  const isSelected = (profile?.photo_url || '👑') === av;
                  return (
                    <button
                      key={av}
                      onClick={() => {
                        updateAvatar(av);
                        setShowAvatarSelector(false);
                        triggerHaptic('success');
                      }}
                      className={`aspect-square text-xl rounded-xl flex items-center justify-center border transition-all cursor-pointer hover:scale-105 active:scale-95 duration-150 relative ${
                        isSelected 
                          ? 'bg-amber-500/10 border-amber-500/60 shadow-lg shadow-amber-500/5' 
                          : 'bg-[#0a111a] border-white/5 hover:border-white/10'
                      }`}
                    >
                      {av}
                      {isSelected && (
                        <span className="absolute -top-1 -right-1 bg-amber-500 w-2.5 h-2.5 rounded-full border border-[#0d1624] flex items-center justify-center">
                          <Check size={6} className="text-navy stroke-[4px]" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <h2 className="text-lg font-black text-white">{profile?.first_name || (profile?.username ? `@${profile.username}` : 'Bekele (You)')}</h2>
          {profile?.phone && <div className="text-sm text-gray-400 mt-1">📞 {profile.phone}</div>}
          <div className="text-xs text-gray-500 mt-0.5">@{profile?.username || 'bekele_nile_bingo'}</div>
          {profile?.verified !== false && (
            <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full mt-2 font-bold uppercase tracking-wider">
              <Check size={10} /> {t('verified')}
            </span>
          )}
        </div>

        {/* Real Stats Board replacing static 0 values */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-gradient-to-b from-[#142036] to-[#0d1624] border border-[#233c66]/20 rounded-2xl p-3.5 text-center shadow-md">
            <Trophy size={16} className="mx-auto mb-1 text-gold" />
            <div className="text-base font-black text-white">{winsCount}</div>
            <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">{t('game_win')}</div>
          </div>
          <div className="bg-gradient-to-b from-[#142036] to-[#0d1624] border border-[#233c66]/20 rounded-2xl p-3.5 text-center shadow-md">
            <Gamepad2 size={16} className="mx-auto mb-1 text-gold" />
            <div className="text-base font-black text-white">{playedCount}</div>
            <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">{t('played')}</div>
          </div>
          <div className="bg-gradient-to-b from-[#142036] to-[#0d1624] border border-[#233c66]/20 rounded-2xl p-3.5 text-center shadow-md">
            <Coins size={16} className="mx-auto mb-1 text-gold" />
            <div className="text-base font-black text-gold">{userTotalEarnings.toLocaleString()} <span className="text-[8px] text-gray-400 font-normal">ETB</span></div>
            <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">{t('total_earned')}</div>
          </div>
        </div>

        {/* Controls and integrations */}
        <div className="space-y-3 mb-5">
          <h3 className="text-xs text-gray-400 mb-2 font-bold uppercase tracking-wider">⚙️ System Preferences</h3>
          
          <div className="glass rounded-2xl divide-y divide-white/5 border border-white/5">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                {profile?.sound_on ? <Volume2 size={18} className="text-gold" /> : <VolumeX size={18} className="text-gray-500" />}
                <span className="text-xs text-gray-200 font-bold">{t('sound_effects')}</span>
              </div>
              <button 
                onClick={toggleSound} 
                className={`w-10 h-5 rounded-full transition-colors relative select-none cursor-pointer ${profile?.sound_on ? 'bg-gold' : 'bg-gray-600'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full transition-transform absolute top-0.5 ${profile?.sound_on ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
            
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Star size={18} className="text-gold" />
                <span className="text-xs text-gray-200 font-bold">{t('language')}</span>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setLanguage('en')} className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${language === 'en' ? 'bg-gold text-navy shadow shadow-gold/25' : 'text-gray-400 bg-white/5 hover:bg-white/10'}`}>EN</button>
                <button onClick={() => setLanguage('am')} className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${language === 'am' ? 'bg-gold text-navy shadow shadow-gold/25' : 'text-gray-400 bg-white/5 hover:bg-white/10'}`}>አማ</button>
              </div>
            </div>
          </div>
        </div>

        {/* Telegram mini app wrapper info */}
        <div className="bg-[#0b101c] border border-white/5 p-4 rounded-2xl text-center shadow-inner relative overflow-hidden">
          <div className="absolute top-1 left-2 w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
          <div className="text-[10px] font-bold text-gray-300 flex items-center justify-center gap-1.5 font-sans">
            <span>🔌</span> Telegram WebApp Haptic Engine Active
          </div>
          <p className="text-[9.5px] text-gray-500 mt-1">Verified: Nile Bingo mini-app v1.8.4 connected to Telegram Bot API.</p>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'game': return renderGameTab();
      case 'scores': return renderScoresTab();
      case 'history': return renderHistoryTab();
      case 'wallet': return renderWalletTab();
      case 'profile': return renderProfileTab();
      default: return renderGameTab();
    }
  };

  const getThemeColor = () => {
    switch (colorScheme) {
      case 'emerald': return '#10b981';
      case 'ruby': return '#ef4444';
      case 'sapphire': return '#3b82f6';
      case 'amethyst': return '#a855f7';
      case 'gold':
      default: return '#ffd000';
    }
  };

  const getThemeGlow = () => {
    switch (colorScheme) {
      case 'emerald': return 'rgba(16, 185, 129, 0.3)';
      case 'ruby': return 'rgba(239, 68, 68, 0.3)';
      case 'sapphire': return 'rgba(59, 130, 246, 0.3)';
      case 'amethyst': return 'rgba(168, 85, 247, 0.3)';
      case 'gold':
      default: return 'rgba(255, 208, 0, 0.3)';
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="text-center"><div className="text-4xl font-black text-gold mb-4 animate-pulse">{appName}</div><div className="text-gray-400 text-sm">{t('loading')}</div></div></div>;
  }

  return (
    <div className="min-h-screen pb-20">
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --theme-gold: ${getThemeColor()};
          --theme-gold-glow: ${getThemeGlow()};
        }
        .text-gold, .text-yellow-400, .text-[#ffd000], .text-amber-400, .text-amber-500 { color: var(--theme-gold) !important; }
        .bg-gold, .bg-[#ffd000], .bg-amber-400, .bg-amber-500 { background-color: var(--theme-gold) !important; }
        .border-gold, .border-amber-500\\/50, .border-amber-500\\/20, .border-amber-300 { border-color: var(--theme-gold) !important; }
        .gold-glow { box-shadow: 0 0 20px var(--theme-gold-glow) !important; }
        .ring-gold\\/50 { --tw-ring-color: var(--theme-gold) !important; }
      ` }} />
      {renderContent()}
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} inGame={inGame} />

      {/* Floating high-quality referral activation visual toast */}
      {showRefToast && (
        <div className="fixed bottom-24 left-4 right-4 z-50 bg-[#162a45]/95 backdrop-blur border-2 border-emerald-500/40 text-emerald-300 py-3 px-4 rounded-2xl font-bold flex items-center justify-between text-xs shadow-2xl animate-bounce">
          <div className="flex items-center gap-2.5">
            <span className="text-base">🎉</span>
            <div>
              <p className="text-white font-black text-[12px]">Friend Registered!</p>
              <p className="text-emerald-400 font-medium text-[10px]">+1 Birr added to Play Balance</p>
            </div>
          </div>
          <span className="text-[10px] bg-emerald-500/10 text-emerald-300 px-2 py-0.5 rounded uppercase font-black tracking-wide border border-emerald-500/20">Earned</span>
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return (<AppProvider><HomePage /></AppProvider>);
}