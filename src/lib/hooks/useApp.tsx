import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from 'react';
import { supabase } from '../supabase';
import type { Profile, Wallet, TabType } from '../types';
import { useT, type Language } from '../i18n';

function isValidUUID(id: string | undefined): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

function fallbackProfile(id: string): Profile {
  const cleanId = String(id).replace(/[^0-9]/g, '');
  const paddedId = cleanId.padStart(12, '0').slice(-12);
  const uuid = `00000000-0000-4000-8000-${paddedId}`;
  return {
    id: uuid,
    telegram_id: id,
    username: 'Player',
    first_name: 'Player',
    language: 'en',
    verified: false,
    created_at: new Date().toISOString(),
  };
}

function fallbackWallet(userId: string): Wallet {
  const cleanId = String(userId).replace(/[^0-9a-f]/gi, '');
  const paddedId = cleanId.padStart(12, '0').slice(-12);
  const uuid = `00000000-0000-4000-9000-${paddedId}`;
  return {
    id: uuid,
    user_id: userId,
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
    const pid = profileRef.current?.id;
    const tid = profileRef.current?.telegram_id;
    // Guest user: load from localStorage
    if (tid && !/^\d+$/.test(tid)) {
      try {
        const raw = localStorage.getItem(`guest_wallet_${tid}`);
        if (raw) setState(prev => ({ ...prev, wallet: JSON.parse(raw) as Wallet }));
      } catch {}
      return;
    }
    if (isValidUUID(pid)) {
      try {
        const res = await fetch(`/api/public/wallet?userId=${pid}`);
        const data = await res.json();
        if (data.wallet) {
          setState(prev => ({ ...prev, wallet: data.wallet as Wallet }));
        } else if (tid) {
          const initRes = await fetch('/api/public/init', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ telegramId: tid }),
          });
          if (initRes.ok) {
            const initData = await initRes.json();
            if (initData.profile) {
              profileRef.current = initData.profile as Profile;
              setState(prev => ({
                ...prev,
                profile: initData.profile as Profile,
                wallet: (initData.wallet as Wallet | null) ?? prev.wallet,
              }));
            }
          }
        }
      } catch (e) {
        console.warn('Could not refresh wallet:', e);
      }
    }
  }, []);

  const initialize = useCallback(async (telegramId: string, firstName?: string, username?: string) => {
    setState(prev => ({ ...prev, loading: true }));

    // Guest (non-Telegram) IDs: skip API entirely, use local fallback + localStorage wallet
    if (!/^\d+$/.test(telegramId)) {
      const fbProf = fallbackProfile(telegramId);
      let savedWallet: Wallet | null = null;
      try {
        const raw = localStorage.getItem(`guest_wallet_${telegramId}`);
        if (raw) savedWallet = JSON.parse(raw) as Wallet;
      } catch {}
      setState(prev => ({
        ...prev,
        loading: false,
        initialized: true,
        profile: fbProf,
        wallet: savedWallet || fallbackWallet(fbProf.id),
      }));
      return;
    }

    let lastError: unknown = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch('/api/public/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ telegramId, firstName, username }),
        });

        if (!res.ok) {
          lastError = new Error('Init API returned ' + res.status);
          if (attempt < 2) await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }

        const data = await res.json();

        if (data.profile) {
          const profileData = data.profile as Profile;
          profileRef.current = profileData;
          // Always fetch the latest wallet after init — don't rely solely on init response
          let freshWallet = data.wallet as Wallet | null;
          try {
            const wr = await fetch(`/api/public/wallet?userId=${profileData.id}`);
            const wd = await wr.json();
            if (wd.wallet) freshWallet = wd.wallet as Wallet;
          } catch {}
          setState(prev => ({
            ...prev,
            profile: profileData,
            wallet: freshWallet ?? prev.wallet,
            language: (profileData.language as Language) || 'en',
            loading: false,
            initialized: true,
          }));
          return;
        }
      } catch (err) {
        lastError = err;
        if (attempt < 2) await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      }
    }

    console.warn('Init API failed after 3 retries, using local fallback:', lastError);
    const fbProf = fallbackProfile(telegramId);
    setState(prev => ({
      ...prev,
      loading: false,
      initialized: true,
      profile: fbProf,
      wallet: fallbackWallet(fbProf.id),
    }));
  }, []);

  // Periodically refresh wallet when initialized to keep balance in sync
  const initializedRef = useRef(false);
  const profileIdRef = useRef<string | undefined>(undefined);
  initializedRef.current = state.initialized;
  profileIdRef.current = state.profile?.id;
  useEffect(() => {
    if (!initializedRef.current) return;
    const fetchWallet = () => {
      const pid = profileIdRef.current;
      const tid = profileRef.current?.telegram_id;
      // Guest user: skip server wallet fetch
      if (tid && !/^\d+$/.test(tid)) return;
      if (isValidUUID(pid)) {
        fetch(`/api/public/wallet?userId=${pid}`)
          .then(r => r.json())
          .then(data => {
            if (data.wallet) {
              setState(prev => ({ ...prev, wallet: data.wallet }));
            } else if (tid) {
              fetch('/api/public/init', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ telegramId: tid }),
              })
                .then(r => r.json())
                .then(initData => {
                  if (initData.profile) {
                    setState(prev => ({
                      ...prev,
                      profile: initData.profile as Profile,
                      wallet: initData.wallet as Wallet | null,
                    }));
                  }
                })
                .catch(() => {});
            }
          })
          .catch(() => {});
      }
    };
    fetchWallet();
    const interval = setInterval(fetchWallet, 30000);
    const onVisibility = () => { if (document.visibilityState === 'visible') fetchWallet(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', onVisibility); };
  }, [state.initialized, state.profile?.id]);

  useEffect(() => {
    if (!state.initialized || !state.profile || state.wallet) return;
    refreshWallet().catch(() => {});
  }, [state.initialized, state.profile, state.wallet, refreshWallet]);

  const setCurrentGame = useCallback((gameId: string | null) => {
    setState(prev => ({ ...prev, currentGameId: gameId }));
  }, []);

  const updateBalance = useCallback(async (amount: number, type: 'play_balance' | 'main_balance') => {
    const profile = profileRef.current;
    if (!profile) return;
    // Guest user: update localStorage wallet locally
    if (!/^\d+$/.test(profile.telegram_id)) {
      setState(prev => {
        if (!prev.wallet) return prev;
        const field = type === 'main_balance' ? 'main_balance' : 'play_balance';
        const newWallet = { ...prev.wallet, [field]: Number(prev.wallet[field]) + amount };
        try { localStorage.setItem(`guest_wallet_${profile.telegram_id}`, JSON.stringify(newWallet)); } catch {}
        return { ...prev, wallet: newWallet as Wallet };
      });
      return;
    }
    if (isValidUUID(profile.id)) {
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
        await refreshWallet();
      } catch (e) {
        console.warn('Could not persist wallet balance update:', e);
      }
    }
  }, [refreshWallet]);

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