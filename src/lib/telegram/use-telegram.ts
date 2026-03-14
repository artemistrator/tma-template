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

export interface ViewportInfo {
  height: number;
  stableHeight: number;
  isExpanded: boolean;
  isClosingConfirmationEnabled: boolean;
}

export function useTelegram() {
  const [isReady, setIsReady] = useState(false);
  const [theme, setTheme] = useState<TelegramTheme>({ colorScheme: 'light' });
  const [initData, setInitData] = useState<Record<string, unknown> | null>(null);
  const [platform, setPlatform] = useState('unknown');
  const [viewport, setViewport] = useState<ViewportInfo>({
    height: 0,
    stableHeight: 0,
    isExpanded: false,
    isClosingConfirmationEnabled: false,
  });

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

      // NATIVE FEEL ENHANCEMENTS
      tg.enableClosingConfirmation(); // Prevent accidental close
      tg.disableVerticalSwipes(); // Disable Telegram swipes - use our own scroll
      
      // Set header and background colors to match theme
      tg.setHeaderColor(tg.themeParams.header_bg_color || tg.themeParams.bg_color);
      tg.setBackgroundColor(tg.themeParams.bg_color);

      // Apply theme colors to CSS variables for seamless integration
      document.documentElement.style.setProperty('--tg-bg', tg.themeParams.bg_color || '#ffffff');
      document.documentElement.style.setProperty('--tg-text', tg.themeParams.text_color || '#000000');
      document.documentElement.style.setProperty('--tg-hint', tg.themeParams.hint_color || '#999999');
      document.documentElement.style.setProperty('--tg-link', tg.themeParams.link_color || '#2481cc');
      document.documentElement.style.setProperty('--tg-button', tg.themeParams.button_color || '#2481cc');
      document.documentElement.style.setProperty('--tg-button-text', tg.themeParams.button_text_color || '#ffffff');
      document.documentElement.style.setProperty('--tg-secondary-bg', tg.themeParams.secondary_bg_color || '#efefef');
      document.documentElement.style.setProperty('--tg-header', tg.themeParams.header_bg_color || '#ffffff');

      // Viewport management
      setViewport({
        height: tg.viewportHeight,
        stableHeight: tg.viewportStableHeight,
        isExpanded: tg.isExpanded,
        isClosingConfirmationEnabled: true,
      });

      // Listen for viewport changes
      const handleViewportChange = (isStateStable: boolean) => {
        setViewport((prev) => ({
          ...prev,
          height: tg.viewportHeight,
          stableHeight: isStateStable ? tg.viewportStableHeight : prev.stableHeight,
        }));
      };

      tg.onEvent('viewportChanged', handleViewportChange);

      // Cleanup
      return () => {
        tg.offEvent('viewportChanged', handleViewportChange);
      };
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

  const showMainButtonProgress = (animate = true) => {
    if (typeof window === 'undefined') return;
    const tg = window.Telegram?.WebApp;
    tg?.MainButton?.showProgress(animate);
  };

  const hideMainButtonProgress = () => {
    if (typeof window === 'undefined') return;
    const tg = window.Telegram?.WebApp;
    tg?.MainButton?.hideProgress();
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
    viewport,
    isTelegram: typeof window !== 'undefined' && !!window.Telegram?.WebApp,
    showMainButton,
    hideMainButton,
    showMainButtonProgress,
    hideMainButtonProgress,
    showBackButton,
    hideBackButton,
    hapticFeedback,
    showAlert,
    showConfirm,
    closeApp,
    openLink,
  };
}
