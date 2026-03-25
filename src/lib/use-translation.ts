'use client';

import { useAppConfig } from '@/context/app-config-context';
import { createTranslator } from './i18n';

/**
 * React hook for translations. Reads locale from tenant config.
 *
 * Usage:
 *   const { t } = useTranslation();
 *   t('nav.home')        // 'Home' or 'Главная' depending on tenant locale
 *   t('checkout.payWithStars', { price: '$19' })
 */
export function useTranslation() {
  const { config } = useAppConfig();
  const locale = config?.meta?.locale || 'en';
  return createTranslator(locale);
}
