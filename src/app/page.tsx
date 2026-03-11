'use client';

import { useEffect, useState } from 'react';
import { PageRenderer } from '@/lib/renderer/page-renderer';
import { MiniAppSchemaType, validateMiniAppSchema } from '@/lib/schema/mini-app-schema';
import { initializeComponents } from '@/components';
import { useAppConfig, ConfigLoading, ConfigError } from '@/context/app-config-context';
import { useCartItemCount } from '@/store/cart-store';

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
      const hash = window.location.hash.slice(1);
      console.log('Hash changed:', hash);
      if (hash && schema?.pages.find(p => p.id === hash)) {
        setCurrentPageId(hash);
      } else if (hash && schema) {
        // If hash doesn't match, default to home
        console.warn('Page not found:', hash, 'Available pages:', schema.pages.map(p => p.id));
        setCurrentPageId('home');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Check initial hash

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [schema]);

  const handleNavigate = (pageId: string) => {
    console.log('Navigating to:', pageId);
    setCurrentPageId(pageId);
    window.location.hash = pageId;
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

  return (
    <PageRenderer
      page={currentPage}
      dataContext={{ cartItemCount }}
      onNavigate={handleNavigate}
    />
  );
}
