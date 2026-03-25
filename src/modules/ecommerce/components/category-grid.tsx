'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { useTelegramContext } from '@/lib/telegram/telegram-provider';

interface CategoryItem {
  id: string;
  name: string;
  image?: string;
  icon?: string;   // emoji fallback when no image
  count?: number;  // "12 items"
}

interface CategoryGridProps {
  id?: string;
  className?: string;
  onNavigate?: (pageId: string) => void;
  props?: {
    title?: string;
    columns?: 2 | 3;
    items?: CategoryItem[];
    ctaPage?: string; // navigate target, default "catalog"
  };
}

/**
 * CategoryGrid — clickable category cards.
 * Stores selected category in sessionStorage so ProductList can preselect it.
 *
 * Config example:
 * {
 *   title: "Categories",
 *   columns: 2,
 *   items: [
 *     { id: "pizza", name: "Pizza", icon: "🍕", count: 12 },
 *     { id: "pasta", name: "Pasta", icon: "🍝", count: 8 }
 *   ]
 * }
 */
export function CategoryGrid({ id, className, onNavigate, props = {} }: CategoryGridProps) {
  const { title, columns = 2, items = [], ctaPage = 'catalog' } = props;
  const { hapticFeedback } = useTelegramContext();

  if (items.length === 0) return null;

  const gridCols = columns === 3 ? 'grid-cols-3' : 'grid-cols-2';

  const handleClick = (item: CategoryItem) => {
    hapticFeedback.impact('light');
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('catalog_preselect_category', item.name);
    }
    onNavigate?.(ctaPage);
  };

  return (
    <div id={id} className={cn('px-4 py-3 space-y-3', className)}>
      {title && <h2 className="text-xl font-bold">{title}</h2>}
      <div className={cn('grid gap-3', gridCols)}>
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => handleClick(item)}
            className="relative overflow-hidden rounded-xl aspect-[4/3] flex flex-col items-center justify-end active:scale-95 transition-transform"
          >
            {item.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.image}
                alt={item.name}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                {item.icon && <span className="text-4xl">{item.icon}</span>}
              </div>
            )}
            <div className="relative w-full bg-gradient-to-t from-black/60 to-transparent px-3 py-2.5">
              <p className="text-white font-semibold text-sm leading-tight text-left">{item.name}</p>
              {item.count !== undefined && (
                <p className="text-white/70 text-xs text-left">{item.count} items</p>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
