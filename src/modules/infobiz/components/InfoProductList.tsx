'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useTelegramContext } from '@/lib/telegram/telegram-provider';
import { useTranslation } from '@/lib/use-translation';

interface InfoProductItem {
  id: string;
  name: string;
  slug?: string;
  type: 'article' | 'pdf' | 'course' | 'consultation';
  price: number;
  description?: string | null;
  image?: string | null;
  content?: string | null;
  fileId?: string | null;
  externalUrl?: string | null;
}

interface InfoProductListProps {
  id?: string;
  title?: string;
  data?: InfoProductItem[];
  props?: {
    title?: string;
    data?: InfoProductItem[];
  };
  className?: string;
  onNavigate?: (pageId: string) => void;
}

const TYPE_LABELS: Record<string, string> = {
  article: 'Article',
  pdf: 'PDF',
  course: 'Course',
  consultation: 'Consultation',
};

const TYPE_COLORS: Record<string, string> = {
  article: 'bg-blue-100 text-blue-700',
  pdf: 'bg-orange-100 text-orange-700',
  course: 'bg-green-100 text-green-700',
  consultation: 'bg-purple-100 text-purple-700',
};

/**
 * InfoProductList — grid of info products (articles, PDFs, courses, consultations)
 */
export function InfoProductList({
  id,
  title: directTitle,
  data: directData,
  className,
  props,
  onNavigate,
}: InfoProductListProps) {
  const title = props?.title ?? directTitle ?? 'Products';
  const data = props?.data ?? directData ?? [];

  const { hapticFeedback } = useTelegramContext();
  const { t } = useTranslation();

  const handleProductClick = (product: InfoProductItem) => {
    hapticFeedback.impact('light');
    // Store in sessionStorage so InfoProductDetails can read it after navigation
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('infobiz_selected_product', JSON.stringify(product));
    }
    onNavigate?.('product-details');
  };

  return (
    <div id={id} className={cn('p-4', className)}>
      {title && <h2 className="text-xl font-bold mb-4">{title}</h2>}

      {data.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-4xl mb-3">📚</p>
          <p>No products yet</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {data.map((product) => (
          <div
            key={product.id}
            className="rounded-xl border bg-card overflow-hidden cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98]"
            onClick={() => handleProductClick(product)}
          >
            {product.image && (
              <div className="relative w-full h-40">
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  unoptimized
                  className="object-cover"
                />
              </div>
            )}
            <div className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap gap-1.5 mb-1.5">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', TYPE_COLORS[product.type] || 'bg-muted text-muted-foreground')}>
                      {TYPE_LABELS[product.type] || product.type}
                    </span>
                    {product.price === 0 && (
                      <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-700">
                        {t('product.free')}
                      </Badge>
                    )}
                  </div>
                  <h3 className="font-semibold text-base leading-tight">{product.name}</h3>
                </div>
                <div className="text-right flex-shrink-0">
                  {product.price === 0 ? (
                    <span className="text-emerald-600 font-bold text-lg">{t('product.free')}</span>
                  ) : (
                    <span className="font-bold text-lg">${product.price}</span>
                  )}
                </div>
              </div>
              {product.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); handleProductClick(product); }}
                className="w-full py-2 px-4 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                {t('product.viewDetails')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

