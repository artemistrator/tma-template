'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface StatItem {
  value: string; // "1,000+"
  label: string; // "Students"
  icon?: string; // "👨‍🎓"
}

interface StatsRowProps {
  id?: string;
  className?: string;
  onNavigate?: (pageId: string) => void;
  props?: {
    items?: StatItem[];
    layout?: 'row' | 'grid'; // default "row"
  };
}

/**
 * StatsRow — social proof numbers block.
 *
 * Config example:
 * {
 *   items: [
 *     { icon: "👨‍🎓", value: "1,000+", label: "Students" },
 *     { icon: "📚", value: "50",     label: "Courses" },
 *     { icon: "⭐",  value: "4.9",   label: "Rating" },
 *     { icon: "🏆",  value: "3 yrs", label: "Online" }
 *   ]
 * }
 */
export function StatsRow({ id, className, props = {} }: StatsRowProps) {
  const { items = [], layout = 'row' } = props;

  if (items.length === 0) return null;

  if (layout === 'grid') {
    return (
      <div id={id} className={cn('px-4 py-4', className)}>
        <div className="grid grid-cols-2 gap-3">
          {items.map((item, i) => (
            <div key={i} className="p-4 rounded-xl border bg-card text-center space-y-1">
              {item.icon && <div className="text-2xl">{item.icon}</div>}
              <div className="text-2xl font-bold text-primary">{item.value}</div>
              <div className="text-xs text-muted-foreground">{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div id={id} className={cn('px-4 py-3', className)}>
      <div className="flex items-stretch divide-x rounded-xl border bg-card overflow-hidden">
        {items.map((item, i) => (
          <div key={i} className="flex-1 flex flex-col items-center justify-center py-4 px-2 text-center">
            {item.icon && <div className="text-xl mb-0.5">{item.icon}</div>}
            <div className="text-lg font-bold text-primary leading-tight">{item.value}</div>
            <div className="text-xs text-muted-foreground leading-tight mt-0.5">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
