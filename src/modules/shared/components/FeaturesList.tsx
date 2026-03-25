'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface FeaturesItem {
  icon: string;        // emoji or short text, e.g. "⚡", "🔒", "🚀"
  title: string;
  description?: string;
}

interface FeaturesListProps {
  id?: string;
  className?: string;
  onNavigate?: (pageId: string) => void;
  props?: {
    title?: string;
    subtitle?: string;
    columns?: 1 | 2 | 3;   // default 2 on mobile
    layout?: 'cards' | 'list'; // default "cards"
    iconSize?: 'sm' | 'md' | 'lg'; // default "md"
    items?: FeaturesItem[];
  };
}

/**
 * FeaturesList — "Why choose us" / advantages block.
 *
 * Config example:
 * {
 *   title: "Why us",
 *   items: [
 *     { icon: "⚡", title: "Fast delivery", description: "Order by 3pm, get it today" },
 *     { icon: "🔒", title: "Secure payment", description: "Telegram-native checkout" },
 *     { icon: "💬", title: "24/7 support", description: "We reply within 15 minutes" }
 *   ]
 * }
 */
export function FeaturesList({ id, className, props = {} }: FeaturesListProps) {
  const {
    title,
    subtitle,
    columns = 2,
    layout = 'cards',
    iconSize = 'md',
    items = [],
  } = props;

  if (items.length === 0) return null;

  const iconSizeClass = iconSize === 'sm' ? 'text-2xl' : iconSize === 'lg' ? 'text-5xl' : 'text-3xl';
  const gridCols =
    columns === 1 ? 'grid-cols-1' : columns === 3 ? 'grid-cols-3' : 'grid-cols-2';

  if (layout === 'list') {
    return (
      <div id={id} className={cn('px-4 py-5 space-y-4', className)}>
        {title && <h2 className="text-xl font-bold">{title}</h2>}
        {subtitle && <p className="text-sm text-muted-foreground -mt-2">{subtitle}</p>}
        <div className="space-y-3">
          {items.map((item, i) => (
            <div key={i} className="flex items-start gap-4 p-3 rounded-xl border bg-card">
              <span className={cn('flex-shrink-0 leading-none', iconSizeClass)}>{item.icon}</span>
              <div>
                <p className="font-semibold text-sm">{item.title}</p>
                {item.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div id={id} className={cn('px-4 py-5 space-y-4', className)}>
      {title && <h2 className="text-xl font-bold">{title}</h2>}
      {subtitle && <p className="text-sm text-muted-foreground -mt-2">{subtitle}</p>}
      <div className={cn('grid gap-3', gridCols)}>
        {items.map((item, i) => (
          <div
            key={i}
            className="flex flex-col items-center text-center gap-2 p-4 rounded-xl border bg-card"
          >
            <span className={cn('leading-none', iconSizeClass)}>{item.icon}</span>
            <p className="font-semibold text-sm leading-tight">{item.title}</p>
            {item.description && (
              <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
