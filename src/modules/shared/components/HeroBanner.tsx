'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { useTelegramContext } from '@/lib/telegram/telegram-provider';

interface HeroBannerProps {
  id?: string;
  className?: string;
  onNavigate?: (pageId: string) => void;
  props?: {
    title?: string;
    subtitle?: string;
    backgroundImage?: string;
    backgroundColor?: string;
    overlayOpacity?: number;       // 0–100, default 40
    textColor?: string;            // default "white"
    align?: 'left' | 'center';    // default "center"
    minHeight?: string;            // e.g. "280px", default "260px"
    ctaText?: string;
    ctaPage?: string;
    ctaVariant?: 'primary' | 'outline' | 'white'; // default "white"
  };
}

/**
 * HeroBanner — full-width hero section.
 * Shows title, subtitle and optional CTA button.
 * Background: image with overlay OR solid color.
 *
 * Config example:
 * {
 *   title: "Your Digital Academy",
 *   subtitle: "Learn from the best. Anywhere, anytime.",
 *   backgroundImage: "https://...",
 *   ctaText: "Browse courses",
 *   ctaPage: "catalog"
 * }
 */
export function HeroBanner({ id, className, onNavigate, props = {} }: HeroBannerProps) {
  const {
    title = 'Welcome',
    subtitle,
    backgroundImage,
    backgroundColor = 'hsl(var(--primary))',
    overlayOpacity = 45,
    textColor = '#ffffff',
    align = 'center',
    minHeight = '260px',
    ctaText,
    ctaPage,
    ctaVariant = 'white',
  } = props;

  const { hapticFeedback } = useTelegramContext();

  const handleCta = () => {
    if (!ctaPage) return;
    hapticFeedback.impact('light');
    onNavigate?.(ctaPage);
  };

  const ctaClass =
    ctaVariant === 'outline'
      ? 'border-2 border-white text-white hover:bg-white/10'
      : ctaVariant === 'primary'
      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
      : 'bg-white text-foreground hover:bg-white/90';

  return (
    <div
      id={id}
      className={cn('relative w-full overflow-hidden flex items-end rounded-2xl shadow-card', className)}
      style={{ minHeight, backgroundColor }}
    >
      {/* Background image */}
      {backgroundImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={backgroundImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          aria-hidden="true"
        />
      )}

      {/* Dark overlay */}
      {backgroundImage && (
        <div
          className="absolute inset-0"
          style={{ background: `rgba(0,0,0,${overlayOpacity / 100})` }}
        />
      )}

      {/* Content */}
      <div
        className={cn(
          'relative z-10 w-full px-6 py-8',
          align === 'center' ? 'text-center' : 'text-left',
        )}
        style={{ color: textColor }}
      >
        <h1 className="text-2xl font-bold leading-tight mb-2 drop-shadow-sm">{title}</h1>
        {subtitle && (
          <p className="text-sm opacity-90 mb-5 leading-relaxed drop-shadow-sm">{subtitle}</p>
        )}
        {ctaText && ctaPage && (
          <button
            onClick={handleCta}
            className={cn(
              'inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors active:scale-95',
              ctaClass,
            )}
          >
            {ctaText}
          </button>
        )}
      </div>
    </div>
  );
}
