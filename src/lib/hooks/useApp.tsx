import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from 'react';
import { supabase } from '../supabase';
import type { Profile, Wallet, TabType } from '../types';
import { useT, type Language } from '../i18n';

function isValidUUID(id: string | undefined): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

function fallbackProfile(id: string): Profile {
  return {
    id: 'local-' + Date.now(),
    telegram_id: id,
    username: 'Player',
    first_name: 'Player',
    language: 'en',
    verified: false,
    created_at: new Date().toISOString(),
  };
}

function fallbackWallet(): Wallet {
  return {
    id: 'local-' + Date.now(),
    user_id: 'local-' + Date.now(),
    main_balance: 0,
    play_balance: 0,
    created_at: new Date().toISOString(),
  };
}

interface AppState {
  profile: Profile | null;
  wallet: Wallet | null;
  language: Language;
  activeTab: TabType;
  loading: boolean;
  initialized: boolean;
  currentGameId: string | null;
}

interface AppContextType extends AppState {
  t: (key: string) => string;
  setLanguage: (lang: Language) => void;
  setActiveTab: (tab: TabType) => void;
  initialize: (telegramId: string, firstName?: string, username?: string) => Promise<void>;
  setCurrentGame: (gameId: string | null) => void;
  refreshWallet: () => Promise<void>;
  updateBalance: (amount: number, type: 'play_balance' | 'main_balance') => Promise<void>;
  updateAvatar: (avatar: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const profileRef = useRef<Profile | null>(null);
  const [state, setState] = useState<AppState>({
    profile: null,
    wallet: null,
    language: 'en',
    activeTab: 'game',
    loading: true,
    initialized: false,
    currentGameId: null,
  });

  profileRef.current = state.profile;

  const t = useT(state.language);

  const setLanguage = useCallback(async (lang: Language) => {
    setState(prev => ({ ...prev, language: lang }));
    if (state.profile) {
      try {
        await fetch('/api/public/init', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: state.profile.id, language: lang }),
        });
      } catch (e) {
        console.warn('Could not persist language:', e);
      }
    }
  }, [state.profile]);

  const setActiveTab = useCallback((tab: TabType) => {
    setState(prev => ({ ...prev, activeTab: tab }));
  }, []);

  const refreshWallet = useCallback(async () => {
    if (isValidUUID(profileRef.current?.id)) {
      try {
        const res = await fetch(`/api/public/wallet?userId=${profileRef.current!.id}`);
        const data = await res.json();
        if (data.wallet) setState(prev => ({ ...prev, wallet: data.wallet as Wallet }));
      } catch (e) {
        console.warn('Could not refresh wallet:', e);
      }
    }
  }, []);

  const initialize = useCallback(async (telegramId: string, firstName?: string, username?: string) => {
    setState(prev => ({ ...prev, loading: true }));

    try {
      const res = await fetch('/api/public/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId, firstName, username }),
      });

      if (!res.ok) throw new Error('Init API returned ' + res.status);

      const data = await res.json();

      if (data.profile) {
        setState(prev => ({
          ...prev,
          profile: data.profile as Profile,
          wallet: data.wallet as Wallet | null,
          language: (data.profile.language as Language) || 'en',
          loading: false,
          initialized: true,
        }));
      } else {
        setState(prev => ({
          ...prev,
          loading: false,
          initialized: true,
          profile: fallbackProfile(telegramId),
          wallet: fallbackWallet(),
        }));
      }
    } catch (err) {
      console.warn('Init API failed, using local fallback:', err);
      setState(prev => ({
        ...prev,
        loading: false,
        initialized: true,
        profile: fallbackProfile(telegramId),
        wallet: fallbackWallet(),
      }));
    }
  }, []);

  // Periodically refresh wallet when initialized to keep balance in sync
  const initializedRef = useRef(false);
  initializedRef.current = state.initialized;
  useEffect(() => {
    if (!state.initialized) return;
    const interval = setInterval(() => {
      if (isValidUUID(state.profile?.id)) {
        fetch(`/api/public/wallet?userId=${state.profile!.id}`)
          .then(r => r.json())
          .then(data => {
            if (data.wallet) setState(prev => ({ ...prev, wallet: data.wallet }));
          })
          .catch(() => {});
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [state.initialized, state.profile?.id]);

  const setCurrentGame = useCallback((gameId: string | null) => {
    setState(prev => ({ ...prev, currentGameId: gameId }));
  }, []);

  const updateBalance = useCallback(async (amount: number, type: 'play_balance' | 'main_balance') => {
    setState(prev => {
      if (!prev.wallet) return prev;
      const currentVal = prev.wallet[type] || 0;
      const newVal = Math.max(0, currentVal + amount);
      return {
        ...prev,
        wallet: {
          ...prev.wallet,
          [type]: newVal
        }
      };
    });

    const profile = profileRef.current;
    if (profile && isValidUUID(profile.id)) {
      try {
        const res = await fetch('/api/public/wallet', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: profile.id, amount, type }),
        });
        const data = await res.json();
        if (data.wallet) {
          setState(prev => ({ ...prev, wallet: data.wallet as Wallet }));
        }
      } catch (e) {
        console.warn('Could not persist wallet balance update:', e);
      }
    }
  }, []);

  const updateAvatar = useCallback(async (avatar: string) => {
    if (!state.profile) return;
    setState(prev => ({
      ...prev,
      profile: prev.profile ? { ...prev.profile, photo_url: avatar } : null,
    }));
    try {
      await fetch('/api/public/init', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: state.profile.id, avatar }),
      });
    } catch (e) {
      console.warn('Could not persist avatar update to Supabase:', e);
    }
  }, [state.profile]);

  return (
    <AppContext.Provider
      value={{
        ...state,
        t: t as (key: string) => string,
        setLanguage,
        setActiveTab,
        initialize,
        setCurrentGame,
        refreshWallet,
        updateBalance,
        updateAvatar,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}