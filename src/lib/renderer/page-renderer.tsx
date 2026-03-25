'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Page, ComponentInstance } from '@/lib/schema/mini-app-schema';
import { renderComponents } from './component-registry';
import { useTelegramContext } from '@/lib/telegram/telegram-provider';
import { BottomNav } from '@/components/core/bottom-nav';
import { usePullToRefresh } from '@/lib/use-pull-to-refresh';

interface PageRendererProps {
  page: Page;
  dataContext?: Record<string, unknown>;
  onNavigate?: (pageId: string) => void;
}

export function PageRenderer({ page, dataContext = {}, onNavigate }: PageRendererProps) {
  const { showMainButton, hideMainButton, showBackButton, hideBackButton, hapticFeedback } = useTelegramContext();
  const [isLoading, setIsLoading] = useState(true);

  const handleRefresh = useCallback(async () => {
    // Reload the page by re-triggering hash navigation
    window.location.reload();
  }, []);

  const { containerRef, pullDistance, isRefreshing, isReady } = usePullToRefresh({
    onRefresh: handleRefresh,
    threshold: 80,
  });

  useEffect(() => {
    // Setup MainButton if configured
    if (page.mainButton?.visible && page.mainButton?.text) {
      showMainButton(page.mainButton.text, () => {
        hapticFeedback.impact('light');
        if (page.mainButton?.action) {
          // Handle main button action (no-op: action handled by components)
        }
      });
    } else {
      hideMainButton();
    }

    // Setup BackButton if configured
    if (page.backButton?.visible) {
      showBackButton(() => {
        hapticFeedback.impact('light');
        if (page.backButton?.action && onNavigate) {
          onNavigate(page.backButton.action);
        }
      });
    } else {
      hideBackButton();
    }

    // Cleanup
    return () => {
      hideMainButton();
      hideBackButton();
    };
  }, [page, showMainButton, hideMainButton, showBackButton, hideBackButton, hapticFeedback, onNavigate]);

  useEffect(() => {
    // Simulate loading state (can be extended with actual data fetching)
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 100);

    return () => clearTimeout(timer);
  }, [page.id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="min-h-screen bg-background pb-20 overflow-y-auto">
      {/* Pull-to-refresh indicator */}
      {(pullDistance > 0 || isRefreshing) && (
        <div
          className="flex items-center justify-center overflow-hidden transition-[height] duration-150"
          style={{ height: isRefreshing ? 48 : pullDistance }}
        >
          <div className={`transition-transform duration-200 ${isReady ? 'rotate-180' : ''}`}>
            {isRefreshing ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
            ) : (
              <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            )}
          </div>
        </div>
      )}

      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-3">
          <h1 className="text-xl font-semibold">{page.title}</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {renderComponents(page.components || [], dataContext, onNavigate)}
      </main>

      <BottomNav currentPage={page.id} onNavigate={onNavigate || (() => {})} />
    </div>
  );
}

/**
 * Hook for fetching page data based on bindings
 */
export function usePageData(page: Page, apiEndpoints?: Record<string, { url: string; method: string }>) {
  const [data, setData] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const dataContext: Record<string, unknown> = {};

        // Collect all unique data sources from components
        const sources = new Set<string>();
        page.components.forEach((component: ComponentInstance) => {
          if (component.binding?.source) {
            sources.add(component.binding.source);
          }
        });

        // Fetch data for each source
        Array.from(sources).forEach(async (source) => {
          const endpoint = apiEndpoints?.[source];

          if (endpoint) {
            const response = await fetch(endpoint.url, {
              method: endpoint.method,
              headers: {
                'Content-Type': 'application/json',
              },
            });

            if (!response.ok) {
              throw new Error(`Failed to fetch ${source}: ${response.statusText}`);
            }

            dataContext[source] = await response.json();
          } else {
            // Use mock data if no endpoint is configured
            dataContext[source] = [];
          }
        });

        setData(dataContext);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page.id, apiEndpoints]);

  return { data, loading, error };
}
