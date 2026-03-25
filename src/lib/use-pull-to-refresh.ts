'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface PullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  /** Pull distance threshold in px to trigger refresh */
  threshold?: number;
  /** Max pull distance in px */
  maxPull?: number;
}

/**
 * Hook that adds pull-to-refresh gesture to a scrollable container.
 * Returns a ref to attach to the container and current state.
 */
export function usePullToRefresh({ onRefresh, threshold = 80, maxPull = 120 }: PullToRefreshOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const isPulling = useRef(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
      setPullDistance(0);
    }
  }, [onRefresh]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      // Only activate when scrolled to top
      if (el.scrollTop > 0 || isRefreshing) return;
      touchStartY.current = e.touches[0].clientY;
      isPulling.current = true;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isPulling.current || isRefreshing) return;

      const currentY = e.touches[0].clientY;
      const diff = currentY - touchStartY.current;

      if (diff > 0 && el.scrollTop <= 0) {
        // Apply resistance — pull slows down as it extends
        const distance = Math.min(diff * 0.5, maxPull);
        setPullDistance(distance);

        // Prevent default scroll when pulling
        if (distance > 10) {
          e.preventDefault();
        }
      } else {
        isPulling.current = false;
        setPullDistance(0);
      }
    };

    const onTouchEnd = () => {
      if (!isPulling.current) return;
      isPulling.current = false;

      if (pullDistance >= threshold) {
        handleRefresh();
      } else {
        setPullDistance(0);
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [pullDistance, threshold, maxPull, isRefreshing, handleRefresh]);

  return {
    containerRef,
    pullDistance,
    isRefreshing,
    /** True when pulled past threshold — shows "release to refresh" */
    isReady: pullDistance >= threshold,
  };
}
