'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { useAppConfig } from '@/context/app-config-context';
import { useTelegramContext } from '@/lib/telegram/telegram-provider';

interface StickyCtaBarProps {
  text?: string;
  page?: string;
  secondaryText?: string;
  secondaryAction?: string;
  className?: string;
  onNavigate?: (pageId: string) => void;
}

export function StickyCtaBar({
  text,
  page,
  secondaryText,
  secondaryAction,
  className,
  onNavigate,
}: StickyCtaBarProps) {
  const { config } = useAppConfig();
  const { hapticFeedback } = useTelegramContext();

  // Read from props or from meta.cta config
  const cta = (config?.meta as Record<string, unknown>)?.cta as {
    text?: string;
    page?: string;
    secondaryText?: string;
    secondaryAction?: string;
  } | undefined;

  const ctaText = text || cta?.text;
  const ctaPage = page || cta?.page || 'catalog';
  const secText = secondaryText || cta?.secondaryText;
  const secAction = secondaryAction || cta?.secondaryAction;

  if (!ctaText) return null;

  const handlePrimary = () => {
    hapticFeedback.impact('medium');
    if (onNavigate) {
      onNavigate(ctaPage);
    }
  };

  const handleSecondary = () => {
    hapticFeedback.impact('light');
    if (!secAction) return;

    // Handle tel: and https: links directly
    if (secAction.startsWith('tel:') || secAction.startsWith('https://') || secAction.startsWith('http://')) {
      window.open(secAction, '_blank');
      return;
    }
    // Handle tg: links (Telegram deep links)
    if (secAction.startsWith('tg:') || secAction.startsWith('https://t.me/')) {
      window.open(secAction, '_blank');
      return;
    }
    // Otherwise treat as page navigation
    if (onNavigate) {
      onNavigate(secAction);
    }
  };

  return (
    <div
      className={cn(
        'fixed bottom-16 left-0 right-0 z-40 px-4 pb-2 pt-3',
        'bg-gradient-to-t from-background via-background/95 to-transparent',
        className,
      )}
    >
      <div className="flex gap-2 max-w-lg mx-auto">
        <button
          onClick={handlePrimary}
          className={cn(
            'flex-1 rounded-2xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground',
            'shadow-lg shadow-primary/25 active:scale-[0.98] transition-transform',
          )}
        >
          {ctaText}
        </button>
        {secText && secAction && (
          <button
            onClick={handleSecondary}
            className={cn(
              'rounded-2xl border border-border bg-background px-4 py-3.5 text-sm font-medium',
              'shadow-sm active:scale-[0.98] transition-transform',
            )}
          >
            {secText}
          </button>
        )}
      </div>
    </div>
  );
}
