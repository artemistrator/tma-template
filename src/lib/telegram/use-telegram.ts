'use client';

import { useEffect, useState } from 'react';

export interface TelegramTheme {
  bgColor?: string;
  textColor?: string;
  hintColor?: string;
  linkColor?: string;
  buttonColor?: string;
  buttonTextColor?: string;
  secondaryBgColor?: string;
  headerBgColor?: string;
  colorScheme: 'light' | 'dark';
}

export function useTelegram() {
  const [isReady, setIsReady] = useState(false);
  const [theme, setTheme] = useState<TelegramTheme>({ colorScheme: 'light' });
  const [initData, setInitData] = useState<Record<string, unknown> | null>(null);
  const [platform, setPlatform] = useState('unknown');

  useEffect(() => {
    // Only run on client
    if (typeof window === 'undefined') return;

    const tg = window.Telegram?.WebApp;

    if (tg) {
      // Ready
      tg.ready();
      setIsReady(true);

      // Theme
      setTheme({
        bgColor: tg.themeParams.bg_color,
        textColor: tg.themeParams.text_color,
        hintColor: tg.themeParams.hint_color,
        linkColor: tg.themeParams.link_color,
        buttonColor: tg.themeParams.button_color,
        buttonTextColor: tg.themeParams.button_text_color,
        secondaryBgColor: tg.themeParams.secondary_bg_color,
        headerBgColor: tg.themeParams.header_bg_color,
        colorScheme: tg.colorScheme,
      });

      // Init data
      setInitData((tg.initDataUnsafe as unknown as Record<string, unknown>) || {});
      setPlatform(tg.platform || 'unknown');

      // Expand viewport
      tg.expand();
    } else {
      // Fallback for development outside Telegram
      setIsReady(true);
    }
  }, []);

  const showMainButton = (text: string, onClick?: () => void) => {
    if (typeof window === 'undefined') return;
    const tg = window.Telegram?.WebApp;
    if (tg) {
      if (text) tg.MainButton.setText(text);
      if (onClick) {
        tg.MainButton.offClick(onClick);
        tg.MainButton.onClick(onClick);
      }
      tg.MainButton.show();
    }
  };

  const hideMainButton = () => {
    if (typeof window === 'undefined') return;
    const tg = window.Telegram?.WebApp;
    tg?.MainButton.hide();
  };

  const showBackButton = (onClick?: () => void) => {
    if (typeof window === 'undefined') return;
    const tg = window.Telegram?.WebApp;
    if (tg) {
      if (onClick) {
        tg.BackButton.offClick(onClick);
        tg.BackButton.onClick(onClick);
      }
      tg.BackButton.show();
    }
  };

  const hideBackButton = () => {
    if (typeof window === 'undefined') return;
    const tg = window.Telegram?.WebApp;
    tg?.BackButton.hide();
  };

  const hapticFeedback = {
    impact: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' = 'light') => {
      if (typeof window === 'undefined') return;
      window.Telegram?.WebApp.HapticFeedback?.impactOccurred(style);
    },
    success: () => {
      if (typeof window === 'undefined') return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      window.Telegram?.WebApp.HapticFeedback?.impactOccurred('success' as any);
    },
    warning: () => {
      if (typeof window === 'undefined') return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      window.Telegram?.WebApp.HapticFeedback?.impactOccurred('warning' as any);
    },
    error: () => {
      if (typeof window === 'undefined') return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      window.Telegram?.WebApp.HapticFeedback?.impactOccurred('error' as any);
    },
    selection: () => {
      if (typeof window === 'undefined') return;
      window.Telegram?.WebApp.HapticFeedback?.selectionChanged();
    },
  };

  const showAlert = (message: string) => {
    if (typeof window === 'undefined') return;
    window.Telegram?.WebApp.showAlert(message);
  };

  const showConfirm = (message: string): Promise<boolean> => {
    if (typeof window === 'undefined') {
      return Promise.resolve(false);
    }
    // Telegram's showConfirm doesn't return a promise in older versions
    // Using a wrapper that returns a promise
    return new Promise((resolve) => {
      const tg = window.Telegram?.WebApp;
      if (tg?.showConfirm) {
        tg.showConfirm(message);
        // Note: In real implementation, you'd need to handle the callback
        resolve(false);
      } else {
        resolve(false);
      }
    });
  };

  const closeApp = () => {
    if (typeof window === 'undefined') return;
    window.Telegram?.WebApp.close();
  };

  const openLink = (url: string) => {
    if (typeof window === 'undefined') return;
    window.Telegram?.WebApp.openLink(url);
  };

  return {
    isReady,
    theme,
    initData,
    platform,
    isTelegram: typeof window !== 'undefined' && !!window.Telegram?.WebApp,
    showMainButton,
    hideMainButton,
    showBackButton,
    hideBackButton,
    hapticFeedback,
    showAlert,
    showConfirm,
    closeApp,
    openLink,
  };
}
