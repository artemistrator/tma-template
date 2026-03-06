// Jest setup file
import '@testing-library/jest-dom';

// Mock Telegram WebApp
(global as any).Telegram = {
  WebApp: {
    initData: '',
    initDataUnsafe: {},
    version: '7.0',
    platform: 'web',
    colorScheme: 'light',
    themeParams: {},
    expand: () => {},
    close: () => {},
    showMainButton: () => {},
    hideMainButton: () => {},
    showPopup: () => {},
    showAlert: () => {},
    showConfirm: () => {},
    HapticFeedback: {
      impactOccurred: () => {},
      notificationOccurred: () => {},
      selectionChanged: () => {},
    },
    onEvent: () => {},
    offEvent: () => {},
    ready: () => {},
    MainButton: {
      text: '',
      color: '',
      text_color: '',
      isVisible: false,
      isActive: false,
      show: () => {},
      hide: () => {},
      enable: () => {},
      disable: () => {},
      onClick: () => {},
      offClick: () => {},
    },
    BackButton: {
      isVisible: false,
      show: () => {},
      hide: () => {},
      onClick: () => {},
      offClick: () => {},
    },
  },
};
