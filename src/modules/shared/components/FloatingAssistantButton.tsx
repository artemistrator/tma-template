'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { buildAssistantDeepLink, type AssistantContext } from '@/lib/assistant/deep-link';
import { useTelegramContext } from '@/lib/telegram/telegram-provider';

interface FloatingAssistantButtonProps {
  id?: string;
  className?: string;
  props?: {
    botUsername?: string;
    tenantSlug?: string;
    entryCta?: string;
    context?: AssistantContext;
    targetId?: string;
    placement?: 'floating' | 'header' | 'contacts' | 'product_page';
  };
}

export function FloatingAssistantButton({
  id,
  className,
  props = {},
}: FloatingAssistantButtonProps) {
  const {
    botUsername,
    tenantSlug,
    entryCta = 'Need help?',
    context = 'home',
    targetId,
    placement = 'floating',
  } = props;

  const { hapticFeedback } = useTelegramContext();
  const [expanded, setExpanded] = useState(false);

  // Auto-collapse after 5 seconds
  useEffect(() => {
    if (!expanded) return;
    const timer = setTimeout(() => setExpanded(false), 5000);
    return () => clearTimeout(timer);
  }, [expanded]);

  if (!botUsername || !tenantSlug) return null;

  const deepLink = buildAssistantDeepLink(botUsername, tenantSlug, context, targetId);

  const handleClick = () => {
    hapticFeedback.impact('light');

    // Prefer openTelegramLink for native Telegram navigation
    const webApp = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
    if (webApp?.openTelegramLink) {
      webApp.openTelegramLink(deepLink);
    } else if (webApp?.openLink) {
      webApp.openLink(deepLink);
    } else {
      window.open(deepLink, '_blank');
    }
  };

  // Floating button (default)
  if (placement === 'floating') {
    return (
      <button
        id={id}
        onClick={handleClick}
        onMouseEnter={() => setExpanded(true)}
        onFocus={() => setExpanded(true)}
        className={cn(
          'fixed z-50 flex items-center gap-2 rounded-full shadow-lg',
          'bg-primary text-primary-foreground',
          'transition-all duration-300 ease-in-out',
          'hover:shadow-xl active:scale-95',
          // Position above bottom nav (h-16 = 64px) + some margin
          'bottom-20 right-4',
          expanded ? 'px-4 py-3' : 'p-3',
          className,
        )}
        aria-label={entryCta}
      >
        <svg
          className="w-6 h-6 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
          />
        </svg>
        {expanded && (
          <span className="text-sm font-medium whitespace-nowrap">{entryCta}</span>
        )}
      </button>
    );
  }

  // Inline button (for header, contacts, product_page placements)
  return (
    <button
      id={id}
      onClick={handleClick}
      className={cn(
        'inline-flex items-center gap-2 px-4 py-2 rounded-lg',
        'bg-primary text-primary-foreground text-sm font-medium',
        'hover:opacity-90 active:scale-95 transition-all',
        className,
      )}
      aria-label={entryCta}
    >
      <svg
        className="w-4 h-4 flex-shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
        />
      </svg>
      <span>{entryCta}</span>
    </button>
  );
}
