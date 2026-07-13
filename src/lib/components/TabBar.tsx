'use client';

import { Gamepad2, Medal, History, Wallet, User } from 'lucide-react';
import type { TabType } from '../types';
import { useApp } from '@/lib/hooks/useApp';

interface TabBarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  inGame: boolean;
  themeColor?: string;
}

export default function TabBar({ activeTab, onTabChange, inGame, themeColor = '#FEE800' }: TabBarProps) {
  const { t } = useApp();

  const tabs: { id: TabType; label: string; icon: any }[] = [
    { id: 'game', label: t('tab_game'), icon: Gamepad2 },
    { id: 'scores', label: t('tab_scores'), icon: Medal },
    { id: 'history', label: t('tab_history'), icon: History },
    { id: 'wallet', label: t('tab_wallet'), icon: Wallet },
    { id: 'profile', label: t('tab_profile'), icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 tab-bar-safe-area">
      <div className="glass border-t border-gold-subtle px-2 py-1">
        <div className="flex items-center justify-around max-w-lg mx-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className="flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl transition-all duration-200 min-w-[60px] relative"
                style={{ color: isActive ? themeColor : undefined }}
              >
                <div className="relative">
                  <Icon size={22} style={{ color: isActive ? themeColor : undefined }} className={`transition-all duration-200 ${isActive ? 'drop-shadow-[0_0_6px_rgba(254,232,0,0.4)]' : ''}`} />
                  {isActive && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full shadow-gold-glow-sm"
                      style={{ backgroundColor: themeColor, boxShadow: `0 0 8px ${themeColor}66` }} />
                  )}
                </div>
                <span className={`text-[10px] font-medium transition-all duration-200 ${isActive ? 'font-bold' : ''}`}
                  style={{ color: isActive ? themeColor : undefined }}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
