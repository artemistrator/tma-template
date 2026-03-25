'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { useTelegramContext } from '@/lib/telegram/telegram-provider';

interface BannerCtaProps {
  id?: string;
  className?: string;
  onNavigate?: (pageId: string) => void;
  props?: {
    text?: string;               // Main promo text
    subtext?: string;            // Optional smaller text below
    emoji?: string;              // Leading emoji, e.g. "🎉"
    backgroundColor?: string;    // default: uses --primary with opacity
    textColor?: string;          // default: "white"
    ctaText?: string;            // Button label
    ctaPage?: string;            // Navigation target
    variant?: 'filled' | 'gradient' | 'subtle'; // default "filled"
  };
}

/**
 * BannerCta — compact promo/announcement banner with optional CTA button.
 *
 * Config example:
 * {
 *   emoji: "🎉",
 *   text: "Summer sale — 30% off everything",
 *   subtext: "Until July 31st",
 *   ctaText: "Shop now",
 *   ctaPage: "catalog"
 * }
 */
export function BannerCta({ id, className, onNavigate, props = {} }: BannerCtaProps) {
  const {
    text,
    subtext,
    emoji,
    backgroundColor,
    textColor = '#ffffff',
    ctaText,
    ctaPage,
    variant = 'filled',
  } = props;

  const { hapticFeedback } = useTelegramContext();

  if (!text) return null;

  const handleCta = () => {
    if (!ctaPage) return;
    hapticFeedback.impact('light');
    onNavigate?.(ctaPage);
  };

  const containerStyle: React.CSSProperties = {};
  if (variant === 'filled') {
    containerStyle.backgroundColor = backgroundColor || 'hsl(var(--primary))';
    containerStyle.color = textColor;
  } else if (variant === 'gradient') {
    containerStyle.background = backgroundColor || 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))';
    containerStyle.color = textColor;
  } else {
    // subtle — use muted card style, ignore custom colors
  }

  return (
    <div
      id={id}
      className={cn(
        'mx-4 my-2 rounded-xl px-4 py-3.5',
        variant === 'subtle' ? 'bg-muted border' : '',
        className,
      )}
      style={variant !== 'subtle' ? containerStyle : {}}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p
            className="font-semibold text-sm leading-tight"
            style={variant !== 'subtle' ? { color: textColor } : {}}
          >
            {emoji && <span className="mr-1.5">{emoji}</span>}
            {text}
          </p>
          {subtext && (
            <p
              className="text-xs mt-0.5 leading-tight"
              style={variant !== 'subtle' ? { color: textColor, opacity: 0.8 } : { color: 'var(--muted-foreground)' }}
            >
              {subtext}
            </p>
          )}
        </div>
        {ctaText && ctaPage && (
          <button
            onClick={handleCta}
            className={cn(
              'flex-shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors active:scale-95',
              variant === 'subtle'
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'bg-white/20 hover:bg-white/30 border border-white/40',
            )}
            style={variant !== 'subtle' ? { color: textColor } : {}}
          >
            {ctaText}
          </button>
        )}
      </div>
    </div>
  );
}
