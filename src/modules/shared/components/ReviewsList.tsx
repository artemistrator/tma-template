'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useAppConfig } from '@/context/app-config-context';
import { ReviewForm } from './ReviewForm';

interface ReviewData {
  id: string | number;
  author_name: string;
  rating: number;
  text: string;
  target_type?: string;
  target_id?: string | null;
  created_at?: string;
}

interface ReviewsListProps {
  id?: string;
  className?: string;
  onNavigate?: (pageId: string) => void;
  props?: {
    title?: string;
    targetType?: 'business' | 'product' | 'service' | 'info_product';
    targetId?: string;
    limit?: number;
    compact?: boolean;
    showForm?: boolean;
  };
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={cn('w-2 h-2', star <= rating ? 'text-warning-foreground' : 'text-gray-300 dark:text-gray-600')}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function Avatar({ name }: { name: string }) {
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

export function ReviewsList({ id, className, props = {} }: ReviewsListProps) {
  const { tenantSlug } = useAppConfig();
  const { title, targetType, targetId, limit = 10, compact = false, showForm = true } = props;

  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [summary, setSummary] = useState<{ averageRating: number; totalReviews: number } | null>(null);

  const fetchReviews = useCallback(async (pageNum: number, append = false) => {
    try {
      const params = new URLSearchParams({
        tenant: tenantSlug,
        page: String(pageNum),
        limit: String(limit),
      });
      if (targetType) params.set('target_type', targetType);
      if (targetId) params.set('target_id', targetId);

      const res = await fetch(`/api/reviews?${params}`);
      const data = await res.json();

      if (data.data) {
        setReviews(prev => append ? [...prev, ...data.data] : data.data);
        setHasMore(data.meta?.hasMore || false);
      }
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
    } finally {
      setLoading(false);
    }
  }, [tenantSlug, targetType, targetId, limit]);

  const fetchSummary = useCallback(async () => {
    try {
      const params = new URLSearchParams({ tenant: tenantSlug });
      if (targetType) params.set('target_type', targetType);
      if (targetId) params.set('target_id', targetId);

      const res = await fetch(`/api/reviews/summary?${params}`);
      const data = await res.json();
      setSummary(data);
    } catch {
      // ignore
    }
  }, [tenantSlug, targetType, targetId]);

  useEffect(() => {
    fetchReviews(1);
    fetchSummary();
  }, [fetchReviews, fetchSummary]);

  function handleLoadMore() {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchReviews(nextPage, true);
  }

  function handleReviewSubmitted() {
    setShowReviewForm(false);
    setJustSubmitted(true);
    // Refresh list after submission
    fetchReviews(1);
    fetchSummary();
  }

  // Don't render section if no reviews and not showing form
  if (!loading && reviews.length === 0 && !showForm) return null;

  return (
    <div id={id} className={cn('px-4 py-5 space-y-4', className)}>
      {/* Header with summary */}
      <div className="flex items-center justify-between">
        <div>
          {title && <h2 className="text-xl font-bold">{title}</h2>}
          {summary && summary.totalReviews > 0 && (
            <div className="flex items-center gap-2 mt-1">
              <StarRating rating={Math.round(summary.averageRating)} />
              <span className="text-sm text-muted-foreground">
                {summary.averageRating} ({summary.totalReviews})
              </span>
            </div>
          )}
        </div>
        {showForm && !showReviewForm && !justSubmitted && (
          <button
            onClick={() => setShowReviewForm(true)}
            className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Write a review
          </button>
        )}
      </div>

      {/* Just submitted banner */}
      {justSubmitted && !showReviewForm && (
        <div className="p-3 rounded-xl border border-success/30 bg-success-bg text-center">
          <p className="text-sm text-success-foreground font-medium">Your review has been submitted!</p>
          <p className="text-xs text-success-foreground/80 mt-0.5">It will appear here after moderation</p>
        </div>
      )}

      {/* Review form */}
      {showReviewForm && (
        <ReviewForm
          targetType={targetType}
          targetId={targetId}
          onSubmitted={handleReviewSubmitted}
          onCancel={() => setShowReviewForm(false)}
        />
      )}

      {/* Loading state */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      )}

      {/* Reviews */}
      {!loading && reviews.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No reviews yet. Be the first!
        </p>
      )}

      {!loading && reviews.length > 0 && (
        <div className="space-y-3">
          {reviews.map((review) => (
            <div
              key={review.id}
              className={cn(
                compact
                  ? 'border-l-4 border-primary/40 pl-4 py-1'
                  : 'p-4 rounded-xl border bg-card space-y-2'
              )}
            >
              {compact ? (
                <>
                  <StarRating rating={review.rating} />
                  <p className="text-sm leading-relaxed text-muted-foreground italic mt-1">
                    &quot;{review.text}&quot;
                  </p>
                  <p className="text-xs font-medium mt-1">
                    {review.author_name}
                    {review.created_at && (
                      <span className="text-muted-foreground font-normal">
                        {' '}&middot; {new Date(review.created_at).toLocaleDateString()}
                      </span>
                    )}
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <Avatar name={review.author_name} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm leading-tight">{review.author_name}</p>
                      {review.created_at && (
                        <p className="text-xs text-muted-foreground">
                          {new Date(review.created_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <StarRating rating={review.rating} />
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">{review.text}</p>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Load more */}
      {hasMore && !loading && (
        <button
          onClick={handleLoadMore}
          className="w-full py-2 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          Show more reviews
        </button>
      )}
    </div>
  );
}
