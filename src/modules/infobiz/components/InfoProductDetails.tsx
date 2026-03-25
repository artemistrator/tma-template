'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useTelegramContext } from '@/lib/telegram/telegram-provider';
import { useAppConfig } from '@/context/app-config-context';
import { useTranslation } from '@/lib/use-translation';
import { ReviewSummary } from '@/modules/shared/components/ReviewSummary';
import { ReviewsList } from '@/modules/shared/components/ReviewsList';

interface InfoProductDetailsProps {
  id?: string;
  className?: string;
  props?: Record<string, unknown>;
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
 * InfoProductDetails — full product page for infobiz products.
 * - article: renders content inline
 * - pdf/course: "Buy to access" button → navigates to checkout
 * - consultation: "Book a session" button → navigates to lead-form
 * - free items: "Get for free" button
 */
export function InfoProductDetails({
  id,
  className,
  onNavigate,
}: InfoProductDetailsProps) {
  const { hapticFeedback } = useTelegramContext();
  const { config } = useAppConfig();
  const { t } = useTranslation();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reviewsCfg = (config as any)?.features?.reviews;
  const reviewsEnabled = !!reviewsCfg?.enabled && !!reviewsCfg?.productReviews;

  // Read selected product from sessionStorage (set by InfoProductList on click)
  const [product, setProduct] = React.useState<{
    id: string; name: string; type: string; price: number;
    description?: string | null; content?: string | null; image?: string | null;
    externalUrl?: string | null; fileId?: string | null;
  } | null>(null);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = sessionStorage.getItem('infobiz_selected_product');
    if (stored) {
      try { setProduct(JSON.parse(stored)); } catch { /* ignore */ }
    }
  }, []);

  const handleBack = () => {
    hapticFeedback.impact('light');
    onNavigate?.('catalog');
  };

  const handleBuy = () => {
    hapticFeedback.impact('medium');
    // Store selected product for checkout
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('infobiz_checkout_product', JSON.stringify(product));
    }
    onNavigate?.('checkout');
  };

  const handleLeadForm = () => {
    hapticFeedback.impact('light');
    onNavigate?.('lead-form');
  };

  if (!product) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p>{t('product.notFound')}</p>
        <Button variant="ghost" onClick={() => onNavigate?.('catalog')} className="mt-4">
          {t('product.backToCatalog')}
        </Button>
      </div>
    );
  }

  const isFree = product.price === 0;
  const isConsultation = product.type === 'consultation';
  const isArticle = product.type === 'article';
  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: config?.meta?.currency || 'USD',
  }).format(product.price);

  return (
    <div id={id} className={cn('pb-36', className)}>
      <div className="max-w-2xl space-y-6">
        <button onClick={handleBack} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          {t('product.backToCatalog')}
        </button>

        {product.image && (
          <div className="relative rounded-xl overflow-hidden" style={{ height: 220 }}>
            <Image
              src={product.image}
              alt={product.name}
              fill
              unoptimized
              className="object-cover"
            />
          </div>
        )}

        <div className="space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium', TYPE_COLORS[product.type] || 'bg-muted text-muted-foreground')}>
              {TYPE_LABELS[product.type] || product.type}
            </span>
            {isFree && (
              <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-emerald-100 text-emerald-700">
                {t('product.free')}
              </span>
            )}
          </div>

          <h2 className="text-2xl font-bold">{product.name}</h2>

          {product.description && (
            <p className="text-muted-foreground">{product.description}</p>
          )}
        </div>

        {/* Article: render content inline */}
        {isArticle && product.content && (
          <div className="prose prose-sm max-w-none border rounded-xl p-5 bg-muted/30">
            {product.content.split('\n').map((line, i) => {
              if (line.startsWith('## ')) return <h3 key={i} className="text-lg font-semibold mt-4 mb-2">{line.slice(3)}</h3>;
              if (line.startsWith('# ')) return <h2 key={i} className="text-xl font-bold mt-2 mb-3">{line.slice(2)}</h2>;
              if (line.trim() === '') return <div key={i} className="h-2" />;
              return <p key={i} className="text-sm leading-relaxed">{line}</p>;
            })}
          </div>
        )}

        {/* Product Reviews */}
        {reviewsEnabled && product.id && (
          <div className="space-y-2">
            <ReviewSummary props={{ targetType: 'info_product', targetId: product.id, showDistribution: true }} />
            <ReviewsList props={{ targetType: 'info_product', targetId: product.id, title: 'Reviews', showForm: true, compact: true, limit: 5 }} />
          </div>
        )}

        {/* Price + CTA — fixed above BottomNav (h-16 = 4rem) */}
        <div className="fixed bottom-16 left-0 right-0 bg-background border-t px-4 py-4 z-40">
          <div className="max-w-2xl mx-auto flex items-center gap-4">
            {!isFree && (
              <div className="text-2xl font-bold">{formattedPrice}</div>
            )}
            {isConsultation ? (
              <Button className="flex-1" size="lg" onClick={handleLeadForm}>
                {t('product.bookSession')}
              </Button>
            ) : isFree ? (
              isArticle ? (
                <Button className="w-full" size="lg" variant="outline" onClick={handleBack}>
                  {t('product.backToCatalog')}
                </Button>
              ) : (
                <Button className="flex-1" size="lg" onClick={handleBuy}>
                  {t('product.getFree')}
                </Button>
              )
            ) : (
              <Button className="flex-1" size="lg" onClick={handleBuy}>
                {product.type === 'pdf' ? t('product.buyPdf') : product.type === 'course' ? t('product.enrollNow') : t('product.buyNow')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
