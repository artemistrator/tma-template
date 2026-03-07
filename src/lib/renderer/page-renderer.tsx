'use client';

import React, { useEffect, useState } from 'react';
import { Page, ComponentInstance } from '@/lib/schema/mini-app-schema';
import { renderComponents } from './component-registry';
import { useTelegramContext } from '@/lib/telegram/telegram-provider';
import { BottomNav } from '@/components/core/bottom-nav';

interface PageRendererProps {
  page: Page;
  dataContext?: Record<string, unknown>;
  onNavigate?: (pageId: string) => void;
}

export function PageRenderer({ page, dataContext = {}, onNavigate }: PageRendererProps) {
  const { showMainButton, hideMainButton, showBackButton, hideBackButton, hapticFeedback } = useTelegramContext();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Setup MainButton if configured
    if (page.mainButton?.visible && page.mainButton?.text) {
      showMainButton(page.mainButton.text, () => {
        hapticFeedback.impact('light');
        if (page.mainButton?.action) {
          // Handle main button action
          console.log('MainButton action:', page.mainButton.action);
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
    <div className="min-h-screen bg-background pb-20">
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
