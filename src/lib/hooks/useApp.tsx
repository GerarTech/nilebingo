import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { supabase } from '../supabase';
import type { Profile, Wallet, TabType } from '../types';
import { useT, type Language } from '../i18n';

function fallbackProfile(id: string): Profile {
  return {
    id: 'local-' + Date.now(),
    telegram_id: id,
    username: 'Player',
    first_name: 'Player',
    language: 'en',
    sound_on: true,
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
  toggleSound: () => void;
  initialize: (telegramId: string, firstName?: string, username?: string) => Promise<void>;
  setCurrentGame: (gameId: string | null) => void;
  refreshWallet: () => Promise<void>;
  updateBalance: (amount: number, type: 'play_balance' | 'main_balance') => Promise<void>;
  updateAvatar: (avatar: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>({
    profile: null,
    wallet: null,
    language: 'en',
    activeTab: 'game',
    loading: true,
    initialized: false,
    currentGameId: null,
  });

  const t = useT(state.language);

  const setLanguage = useCallback(async (lang: Language) => {
    setState(prev => ({ ...prev, language: lang }));
    if (state.profile) {
      await supabase.from('profiles').update({ language: lang }).eq('id', state.profile.id);
    }
  }, [state.profile]);

  const setActiveTab = useCallback((tab: TabType) => {
    setState(prev => ({ ...prev, activeTab: tab }));
  }, []);

  const toggleSound = useCallback(async () => {
    if (!state.profile) return;
    const newSound = !state.profile.sound_on;
    setState(prev => ({
      ...prev,
      profile: prev.profile ? { ...prev.profile, sound_on: newSound } : null,
    }));
    await supabase.from('profiles').update({ sound_on: newSound }).eq('id', state.profile.id);
  }, [state.profile]);

  const refreshWallet = useCallback(async () => {
    if (!state.profile) return;
    const { data } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', state.profile.id)
      .single();
    if (data) setState(prev => ({ ...prev, wallet: data as Wallet }));
  }, [state.profile]);

  const initialize = useCallback(async (telegramId: string, firstName?: string, username?: string) => {
    setState(prev => ({ ...prev, loading: true }));
    
    try {
      // Try to fetch existing profile
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('telegram_id', telegramId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      let profile = existingProfile as Profile | null;

      if (!profile) {
        // Try to create new profile
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            telegram_id: telegramId,
            first_name: firstName || 'Player',
            username: username || 'Player',
            language: 'en',
            sound_on: true,
            verified: false,
          })
          .select()
          .single();

        if (createError) throw createError;

        if (newProfile) {
          profile = newProfile as Profile;
          // Try to create wallet
          await supabase.from('wallets').insert({
            user_id: profile.id,
            main_balance: 0,
            play_balance: 0,
          });
        }
      } else {
        // Update first_name and username if they are provided and differ
        const updates: any = {};
        if (firstName && profile.first_name !== firstName) updates.first_name = firstName;
        if (username && profile.username !== username) updates.username = username;
        
        if (Object.keys(updates).length > 0) {
          const { data: updatedProfile } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', profile.id)
            .select()
            .single();
          if (updatedProfile) {
            profile = updatedProfile as Profile;
          }
        }
      }

      if (profile) {
        const { data: wallet } = await supabase
          .from('wallets')
          .select('*')
          .eq('user_id', profile.id)
          .single();

        setState(prev => ({
          ...prev,
          profile,
          wallet: wallet as Wallet | null,
          language: (profile?.language as Language) || 'en',
          loading: false,
          initialized: true,
        }));
      } else {
        // Profile fetch/creation failed completely - show app with defaults
        setState(prev => ({
          ...prev,
          loading: false,
          initialized: true,
          profile: {
            id: 'local',
            telegram_id: telegramId,
            username: username || 'Player',
            first_name: firstName || 'Player',
            language: 'en',
            sound_on: true,
            verified: false,
            created_at: new Date().toISOString(),
          } as Profile,
          wallet: {
            id: 'local',
            user_id: 'local',
            main_balance: 0,
            play_balance: 0,
            created_at: new Date().toISOString(),
          } as Wallet,
        }));
      }
    } catch (err) {
      console.warn('Supabase initialization failed, using local fallback:', err);
      // Show app with default data regardless of error
      setState(prev => ({
        ...prev,
        loading: false,
        initialized: true,
        profile: {
          id: 'local-' + Date.now(),
          telegram_id: telegramId,
          username: username || 'Player',
          first_name: firstName || 'Player',
          language: 'en',
          sound_on: true,
          verified: false,
          created_at: new Date().toISOString(),
        } as Profile,
        wallet: {
          id: 'local-' + Date.now(),
          user_id: 'local-' + Date.now(),
          main_balance: 0,
          play_balance: 0,
          created_at: new Date().toISOString(),
        } as Wallet,
      }));
    }
  }, []);

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

    if (state.profile) {
      try {
        const { data: latestWallet } = await supabase
          .from('wallets')
          .select('main_balance, play_balance')
          .eq('user_id', state.profile.id)
          .single();
        
        const dbVal = latestWallet ? (Number((latestWallet as any)[type]) || 0) : 0;
        const newVal = Math.max(0, dbVal + amount);

        await supabase
          .from('wallets')
          .update({ [type]: newVal })
          .eq('user_id', state.profile.id);
      } catch (e) {
        console.warn('Could not persist wallet balance update to Supabase:', e);
      }
    }
  }, [state.profile]);

  const updateAvatar = useCallback(async (avatar: string) => {
    if (!state.profile) return;
    setState(prev => ({
      ...prev,
      profile: prev.profile ? { ...prev.profile, photo_url: avatar } : null,
    }));
    try {
      await supabase
        .from('profiles')
        .update({ photo_url: avatar })
        .eq('id', state.profile.id);
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
        toggleSound,
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