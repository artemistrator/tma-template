'use client';

import { useEffect, useCallback } from 'react';
import { useTelegramContext } from './telegram-provider';
import { useCartStore, TelegramUser } from '@/store/cart-store';

export function useTelegramUser() {
  const { initData, isTelegram } = useTelegramContext();
  const { telegramUser, setTelegramUser } = useCartStore();

  // Extract user data from Telegram initData
  useEffect(() => {
    if (initData && isTelegram) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tgUser = (initData as any).user as { id?: number; username?: string; first_name?: string; last_name?: string } | undefined;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const contact = (initData as any).contact as { phone_number?: string } | undefined;
      
      const user: TelegramUser = {
        id: tgUser?.id,
        username: tgUser?.username,
        firstName: tgUser?.first_name,
        lastName: tgUser?.last_name,
        phone: contact?.phone_number,
      };
      
      setTelegramUser(user);
    }
  }, [initData, isTelegram, setTelegramUser]);

  // Alternative: Use Telegram's native contact request button
  const requestPhoneContactNative = useCallback(() => {
    return new Promise<TelegramUser | null>((resolve) => {
      if (!isTelegram || !window.Telegram?.WebApp) {
        resolve(null);
        return;
      }

      // Show native contact request popup
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      window.Telegram.WebApp.showPopup({
        title: 'Phone Number Required',
        message: 'We need your phone number to process your order. Would you like to share it?',
        buttons: [
          {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            type: 'request_phone' as any,
            text: 'Share Phone Number',
          },
          {
            type: 'cancel',
            text: 'Cancel',
          },
        ],
      }, (buttonId: string) => {
        if (buttonId === 'request_phone') {
          // Phone will be sent via initData
          const handler = () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const contact = (window.Telegram?.WebApp.initDataUnsafe as any)?.contact;
            if (contact) {
              const user: TelegramUser = {
                ...telegramUser,
                phone: contact.phone_number,
              };
              setTelegramUser(user);
              resolve(user);
            } else {
              resolve(null);
            }
            window.Telegram?.WebApp.offEvent('popupClosed', handler);
          };
          window.Telegram.WebApp.onEvent('popupClosed', handler);
        } else {
          resolve(null);
        }
      });
    });
  }, [isTelegram, telegramUser, setTelegramUser]);

  const getFullName = useCallback(() => {
    if (!telegramUser) return '';
    const parts = [telegramUser.firstName, telegramUser.lastName].filter(Boolean);
    return parts.join(' ');
  }, [telegramUser]);

  return {
    telegramUser,
    isRequestingContact,
    requestPhoneContact: requestPhoneContactNative,
    getFullName,
    hasPhone: !!telegramUser?.phone,
  };
}