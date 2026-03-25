'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface TestimonialItem {
  name: string;
  role?: string;
  avatar?: string;
  rating?: 1 | 2 | 3 | 4 | 5;
  text: string;
  source?: string;
}

interface TestimonialsProps {
  id?: string;
  className?: string;
  onNavigate?: (pageId: string) => void;
  props?: {
    title?: string;
    subtitle?: string;
    items?: TestimonialItem[];
    layout?: 'cards' | 'compact'; // default "cards"
  };
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={cn('w-3.5 h-3.5', star <= rating ? 'text-amber-400' : 'text-muted')}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function Avatar({ name, src }: { name: string; src?: string }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />;
  }
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  return (
    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold flex-shrink-0">
      {initials}
    </div>
  );
}

/**
 * Testimonials — customer / student review cards (vertical list).
 *
 * Config example:
 * {
 *   title: "What our customers say",
 *   items: [
 *     { name: "Anna K.", role: "Regular customer", rating: 5, text: "Best pizza in town! Fast delivery." },
 *     { name: "Mike R.", rating: 4, text: "Great quality, will order again." }
 *   ]
 * }
 */
export function Testimonials({ id, className, props = {} }: TestimonialsProps) {
  const { title, subtitle, items = [], layout = 'cards' } = props;

  if (items.length === 0) return null;

  if (layout === 'compact') {
    return (
      <div id={id} className={cn('px-4 py-5 space-y-3', className)}>
        {title && <h2 className="text-xl font-bold">{title}</h2>}
        {subtitle && <p className="text-sm text-muted-foreground -mt-2">{subtitle}</p>}
        {items.map((item, i) => (
          <div key={i} className="border-l-4 border-primary/40 pl-4 py-1">
            {item.rating && <StarRating rating={item.rating} />}
            <p className="text-sm leading-relaxed mt-1 text-muted-foreground italic">"{item.text}"</p>
            <p className="text-xs font-medium mt-1.5">{item.name}{item.role && <span className="text-muted-foreground font-normal"> · {item.role}</span>}{item.source && <span className="text-muted-foreground font-normal"> · {item.source}</span>}</p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div id={id} className={cn('px-4 py-5 space-y-4', className)}>
      {title && <h2 className="text-xl font-bold">{title}</h2>}
      {subtitle && <p className="text-sm text-muted-foreground -mt-2">{subtitle}</p>}
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="p-4 rounded-xl border bg-card space-y-3">
            {/* Header */}
            <div className="flex items-center gap-3">
              <Avatar name={item.name} src={item.avatar} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm leading-tight">{item.name}</p>
                {item.role && (
                  <p className="text-xs text-muted-foreground">{item.role}</p>
                )}
              </div>
              {item.rating && <StarRating rating={item.rating} />}
            </div>
            {/* Review text */}
            <p className="text-sm leading-relaxed text-muted-foreground">"{item.text}"</p>
            {item.source && (
              <p className="text-[11px] text-muted-foreground/60">via {item.source}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
