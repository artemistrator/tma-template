'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { useTelegramContext } from '@/lib/telegram/telegram-provider';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  logo?: string;
  showBackButton?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  className?: string;
}

/**
 * Header - Navigation header component
 * Integrates with Telegram BackButton
 * Displays logo image if provided, otherwise text title
 */
export function Header({
  title,
  subtitle,
  logo,
  showBackButton = false,
  onBack,
  rightAction,
  className,
}: HeaderProps) {
  const { showBackButton: tgShowBackButton, hideBackButton, hapticFeedback } = useTelegramContext();

  React.useEffect(() => {
    if (showBackButton) {
      tgShowBackButton(() => {
        hapticFeedback.impact('light');
        onBack?.();
      });
    } else {
      hideBackButton();
    }

    return () => {
      hideBackButton();
    };
  }, [showBackButton, tgShowBackButton, hideBackButton, onBack, hapticFeedback]);

  return (
    <header className={cn(
      "sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b",
      className
    )}>
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {showBackButton && (
              <button
                onClick={() => {
                  hapticFeedback.impact('light');
                  onBack?.();
                }}
                className="p-2 -ml-2 hover:bg-accent rounded-full transition-colors"
                aria-label="Go back"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <div className="flex items-center gap-2.5">
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logo} alt={title || ''} className="h-8 w-auto object-contain" />
              ) : (
                title && <h1 className="text-lg font-semibold">{title}</h1>
              )}
              {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
            </div>
          </div>

          {rightAction && <div>{rightAction}</div>}
        </div>
      </div>
    </header>
  );
}
