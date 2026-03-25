'use client';

import { useEffect, useState } from 'react';
import { PageRenderer } from '@/lib/renderer/page-renderer';
import { MiniAppSchemaType, validateMiniAppSchema } from '@/lib/schema/mini-app-schema';
import { initializeComponents } from '@/components';
import { useAppConfig, ConfigLoading, ConfigError } from '@/context/app-config-context';
import { useCartItemCount } from '@/store/cart-store';
import { ComponentErrorBoundary } from '@/components/core/error-boundary';
import { FloatingAssistantButton } from '@/modules/shared/components/FloatingAssistantButton';
import type { AssistantContext } from '@/lib/assistant/deep-link';

// Force dynamic rendering to avoid SSR issues with window object
export const dynamic = 'force-dynamic';

export default function Home() {
  const { config: contextConfig, loading, error, reloadConfig } = useAppConfig();
  const [schema, setSchema] = useState<MiniAppSchemaType | null>(null);
  const [currentPageId, setCurrentPageId] = useState('home');
  const [isMounted, setIsMounted] = useState(false);
  const cartItemCount = useCartItemCount();

  useEffect(() => {
    // Initialize components on mount
    setIsMounted(true);
    initializeComponents();
  }, []);

  useEffect(() => {
    // Validate and load schema from context
    if (contextConfig) {
      const result = validateMiniAppSchema(contextConfig);
      if (result.success) {
        setSchema(result.data as MiniAppSchemaType);
      } else {
        console.error('Schema validation failed:', result.error);
      }
    }
  }, [contextConfig]);

  // Handle navigation from URL hash
  useEffect(() => {
    const handleHashChange = () => {
      const rawHash = window.location.hash.slice(1);
      // Strip query params — hash may contain "product-details?productId=3"
      const hash = rawHash.split('?')[0];
      if (hash && schema?.pages.find(p => p.id === hash)) {
        setCurrentPageId(hash);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Check initial hash

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [schema]);

  // FEAT-11: Handle deep links from URL search params on initial load
  // e.g. ?productId=5 → navigate to product-details#product-details?productId=5
  // e.g. ?serviceId=3 → navigate to product-details#product-details?productId=3
  useEffect(() => {
    if (!schema || !isMounted) return;
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('productId') || params.get('product');
    const serviceId = params.get('serviceId') || params.get('service');

    if (productId) {
      window.location.hash = `product-details?productId=${productId}`;
      setCurrentPageId('product-details');
    } else if (serviceId) {
      window.location.hash = `product-details?productId=${serviceId}`;
      setCurrentPageId('product-details');
    }
  // Only run once after schema loads
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schema, isMounted]);

  const handleNavigate = (pageId: string) => {
    setCurrentPageId(pageId);
    // Only update hash if it doesn't already point to this page (preserves query params like ?productId=3)
    const currentHash = window.location.hash.slice(1).split('?')[0];
    if (currentHash !== pageId) {
      window.location.hash = pageId;
    }
  };

  // Show loading state
  if (loading) {
    return <ConfigLoading />;
  }

  // Show error state
  if (error) {
    return <ConfigError error={error} onRetry={reloadConfig} />;
  }

  if (!isMounted || !schema) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const currentPage = schema.pages.find((p) => p.id === currentPageId) || schema.pages[0];

  const assistantCfg = schema.features?.assistant;
  const assistantEnabled = !!assistantCfg?.enabled && !!assistantCfg?.botUsername;

  // Map current page to assistant context
  const pageToAssistantContext: Record<string, AssistantContext> = {
    home: 'home',
    catalog: 'catalog',
    'product-details': 'product',
    cart: 'checkout',
    checkout: 'checkout',
    'order-success': 'order',
    'my-orders': 'order',
    'my-purchases': 'order',
  };
  const assistantContext = pageToAssistantContext[currentPageId] || 'home';

  return (
    <ComponentErrorBoundary componentType="PageRenderer" componentId={currentPageId}>
      <div key={currentPageId} className="animate-in fade-in duration-200">
        <PageRenderer
          page={currentPage}
          dataContext={{ cartItemCount }}
          onNavigate={handleNavigate}
        />
      </div>
      {assistantEnabled && assistantCfg.placement !== 'header' && (
        <FloatingAssistantButton
          props={{
            botUsername: assistantCfg.botUsername,
            tenantSlug: schema.meta.slug,
            entryCta: assistantCfg.entryCta || 'Need help?',
            context: assistantContext,
            placement: assistantCfg.placement || 'floating',
          }}
        />
      )}
    </ComponentErrorBoundary>
  );
}
