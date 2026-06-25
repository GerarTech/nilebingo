'use client';

import { Gamepad2, Medal, History, Wallet, User } from 'lucide-react';
import type { TabType } from '../types';
import { useApp } from '@/lib/hooks/useApp';

interface TabBarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  inGame?: boolean;
}

export default function TabBar({ activeTab, onTabChange, inGame }: TabBarProps) {
  const { t } = useApp();

  const tabs: { id: TabType; labelKey: string; icon: any }[] = [
    { id: 'game', labelKey: 'tab_game', icon: Gamepad2 },
    { id: 'scores', labelKey: 'tab_scores', icon: Medal },
    { id: 'history', labelKey: 'tab_history', icon: History },
    { id: 'wallet', labelKey: 'tab_wallet', icon: Wallet },
    { id: 'profile', labelKey: 'tab_profile', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 tab-bar-safe-area">
      <div className="glass border-t border-white/5 px-2 py-1">
        <div className="flex items-center justify-around max-w-lg mx-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`
                  flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl
                  transition-all duration-200 min-w-[60px]
                  ${isActive
                    ? 'text-gold'
                    : 'text-gray-500 hover:text-gray-300'
                  }
                  ${tab.id === 'game' && inGame ? 'animate-pulse' : ''}
                `}
              >
                <Icon size={22} />
                <span className="text-[10px] font-medium">{t(tab.labelKey)}</span>
                {isActive && (
                  <div className="absolute bottom-1 w-6 h-0.5 bg-gold rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}