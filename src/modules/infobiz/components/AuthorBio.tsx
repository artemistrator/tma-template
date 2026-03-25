'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { useTelegramContext } from '@/lib/telegram/telegram-provider';

interface AuthorBioProps {
  id?: string;
  className?: string;
  onNavigate?: (pageId: string) => void;
  props?: {
    name?: string;
    title?: string;         // "Digital marketing expert"
    bio?: string;
    photo?: string;
    credentials?: string[]; // ["10+ years experience", "500+ students"]
    ctaText?: string;       // "Book a consultation"
    ctaPage?: string;
  };
}

/**
 * AuthorBio — author / expert card for infobiz home pages.
 *
 * Config example:
 * {
 *   name: "Alex Johnson",
 *   title: "Digital marketing expert",
 *   bio: "I've helped 500+ entrepreneurs grow their businesses online. Former head of growth at two Y Combinator startups.",
 *   credentials: ["10+ years experience", "500+ students", "4.9★ rating"],
 *   ctaText: "Book a free call",
 *   ctaPage: "lead-form"
 * }
 */
export function AuthorBio({ id, className, onNavigate, props = {} }: AuthorBioProps) {
  const { name, title, bio, photo, credentials = [], ctaText, ctaPage } = props;
  const { hapticFeedback } = useTelegramContext();

  if (!name && !bio) return null;

  const handleCta = () => {
    if (!ctaPage) return;
    hapticFeedback.impact('light');
    onNavigate?.(ctaPage);
  };

  const initials = (name || '')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <div id={id} className={cn('px-4 py-5', className)}>
      <div className="p-5 rounded-2xl border bg-card space-y-4">
        {/* Header: avatar + name + title */}
        <div className="flex items-center gap-4">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt={name} className="w-20 h-20 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold flex-shrink-0">
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            {name && <p className="font-bold text-lg leading-tight">{name}</p>}
            {title && <p className="text-sm text-primary font-medium mt-0.5">{title}</p>}
          </div>
        </div>

        {/* Bio */}
        {bio && <p className="text-sm text-muted-foreground leading-relaxed">{bio}</p>}

        {/* Credentials chips */}
        {credentials.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {credentials.map((cred, i) => (
              <span
                key={i}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary"
              >
                {cred}
              </span>
            ))}
          </div>
        )}

        {/* CTA */}
        {ctaText && ctaPage && (
          <button
            onClick={handleCta}
            className="w-full py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors active:scale-95"
          >
            {ctaText}
          </button>
        )}
      </div>
    </div>
  );
}
