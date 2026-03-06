'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useTelegram, TelegramTheme } from './use-telegram';

interface TelegramContextValue {
  isReady: boolean;
  theme: TelegramTheme;
  initData: Record<string, unknown> | null;
  platform: string;
  isTelegram: boolean;
  showMainButton: (text: string, onClick?: () => void) => void;
  hideMainButton: () => void;
  showBackButton: (onClick?: () => void) => void;
  hideBackButton: () => void;
  hapticFeedback: {
    impact: (style?: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    success: () => void;
    warning: () => void;
    error: () => void;
    selection: () => void;
  };
  showAlert: (message: string) => void;
  showConfirm: (message: string) => Promise<boolean>;
  closeApp: () => void;
  openLink: (url: string) => void;
}

const TelegramContext = createContext<TelegramContextValue | null>(null);

export function TelegramProvider({ children }: { children: ReactNode }) {
  const telegram = useTelegram();

  return (
    <TelegramContext.Provider value={telegram}>
      {children}
    </TelegramContext.Provider>
  );
}

export function useTelegramContext() {
  const context = useContext(TelegramContext);
  if (!context) {
    throw new Error('useTelegramContext must be used within TelegramProvider');
  }
  return context;
}
