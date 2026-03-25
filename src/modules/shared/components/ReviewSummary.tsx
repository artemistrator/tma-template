'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useAppConfig } from '@/context/app-config-context';

interface ReviewSummaryProps {
  id?: string;
  className?: string;
  onNavigate?: (pageId: string) => void;
  props?: {
    targetType?: 'business' | 'product' | 'service' | 'info_product';
    targetId?: string;
    showDistribution?: boolean;
  };
}

function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const sizeClass = size === 'md' ? 'w-5 h-5' : 'w-3.5 h-3.5';
  return (
    <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={cn(sizeClass, star <= rating ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600')}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export function ReviewSummary({ id, className, props = {} }: ReviewSummaryProps) {
  const { tenantSlug } = useAppConfig();
  const { targetType, targetId, showDistribution = false } = props;

  const [summary, setSummary] = useState<{
    averageRating: number;
    totalReviews: number;
    distribution: Record<number, number>;
  } | null>(null);

  const fetchSummary = useCallback(async () => {
    try {
      const params = new URLSearchParams({ tenant: tenantSlug });
      if (targetType) params.set('target_type', targetType);
      if (targetId) params.set('target_id', targetId);

      const res = await fetch(`/api/reviews/summary?${params}`);
      const data = await res.json();
      if (data.totalReviews > 0) {
        setSummary(data);
      }
    } catch {
      // ignore
    }
  }, [tenantSlug, targetType, targetId]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  if (!summary) return null;

  return (
    <div id={id} className={cn('px-4 py-3', className)}>
      <div className="flex items-center gap-3">
        <span className="text-2xl font-bold">{summary.averageRating}</span>
        <div>
          <StarRating rating={Math.round(summary.averageRating)} size="md" />
          <p className="text-xs text-muted-foreground mt-0.5">
            {summary.totalReviews} {summary.totalReviews === 1 ? 'review' : 'reviews'}
          </p>
        </div>
      </div>

      {showDistribution && (
        <div className="mt-3 space-y-1">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = summary.distribution[star] || 0;
            const pct = summary.totalReviews > 0 ? (count / summary.totalReviews) * 100 : 0;
            return (
              <div key={star} className="flex items-center gap-2 text-xs">
                <span className="w-3 text-right text-muted-foreground">{star}</span>
                <svg className="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-6 text-right text-muted-foreground">{count}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
