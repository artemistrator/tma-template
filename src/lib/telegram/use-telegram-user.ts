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

      const user: TelegramUser = {
        id: tgUser?.id,
        username: tgUser?.username,
        firstName: tgUser?.first_name,
        lastName: tgUser?.last_name,
        phone: telegramUser?.phone, // Keep existing phone if any
      };

      setTelegramUser(user);
    }
  }, [initData, isTelegram, setTelegramUser]);

  // Use Telegram's native contact request
  const requestPhoneContactNative = useCallback(() => {
    return new Promise<TelegramUser | null>((resolve) => {
      if (!isTelegram || !window.Telegram?.WebApp) {
        console.warn('Not running in Telegram or WebApp not available');
        resolve(null);
        return;
      }

      const tg = window.Telegram.WebApp;
      
      console.log('Requesting contact from Telegram...');
      
      // Use the direct requestContact method (available in newer Bot API versions)
      tg.requestContact((success: boolean, response: { status: string; responseUnsafe?: { contact?: { phone_number: string; first_name: string; last_name?: string; user_id: number } } }) => {
        console.log('Contact request response:', success, response);
        
        if (success && response.status === 'sent' && response.responseUnsafe?.contact) {
          const contact = response.responseUnsafe.contact;
          
          const user: TelegramUser = {
            ...telegramUser,
            id: contact.user_id,
            firstName: contact.first_name,
            lastName: contact.last_name,
            phone: contact.phone_number,
          };
          setTelegramUser(user);
          console.log('Contact received successfully:', user);
          resolve(user);
        } else if (response.status === 'cancelled') {
          console.log('User cancelled contact request');
          resolve(null);
        } else {
          console.warn('Contact request failed or cancelled');
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
    isRequestingContact: false,
    requestPhoneContact: requestPhoneContactNative,
    getFullName,
    hasPhone: !!telegramUser?.phone,
  };
}