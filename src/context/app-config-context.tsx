'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { MiniAppSchemaType } from '@/lib/schema/mini-app-schema';
import { useCartStore } from '@/store/cart-store';
import { applyTheme, resetTheme } from '@/lib/theme';
import { getTenantFromHostname } from '@/lib/tenant';

interface AppConfigContextValue {
  config: MiniAppSchemaType | null;
  loading: boolean;
  error: Error | null;
  tenantSlug: string;
  tenantId: string;
  reloadConfig: () => Promise<void>;
}

const AppConfigContext = createContext<AppConfigContextValue | null>(null);

interface AppConfigProviderProps {
  children: React.ReactNode;
  defaultTenantSlug?: string;
}

/**
 * Get tenant slug from URL.
 *
 * Resolution order:
 *   1. Subdomain: pizza.example.com → "pizza"
 *   2. Query param: ?tenant=pizza
 *
 * Subdomain routing is automatic when ROOT_DOMAIN is set
 * or when using *.localhost in development.
 */
function getTenantSlugFromUrl(): string | null {
  if (typeof window === 'undefined') return null;

  // 1. Try subdomain
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || '';
  const fromHostname = getTenantFromHostname(window.location.hostname, rootDomain);
  if (fromHostname) return fromHostname;

  // 2. Fallback to query param
  const params = new URLSearchParams(window.location.search);
  return params.get('tenant');
}

export function AppConfigProvider({ children, defaultTenantSlug = 'pizza' }: AppConfigProviderProps) {
  const [config, setConfig] = useState<MiniAppSchemaType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [tenantSlug, setTenantSlug] = useState(defaultTenantSlug);
  const [tenantId, setTenantId] = useState('');
  
  const clearCart = useCartStore((state) => state.clearCart);

  const loadConfig = useCallback(async (slug: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/config?tenant=${slug}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to load configuration');
      }

      // Clear cart when switching tenants
      if (tenantId && data.tenantId !== tenantId) {
        clearCart();
        resetTheme();
        if (typeof window !== 'undefined') {
          const keys = Object.keys(localStorage).filter(k => k.includes('cart'));
          keys.forEach(k => localStorage.removeItem(k));
        }
      }

      setConfig(data.config);
      // Apply tenant theme colors and style preset from config
      applyTheme(data.config?.meta?.theme, data.config?.meta?.style);
      setTenantSlug(data.tenantSlug);
      setTenantId(data.tenantId);
    } catch (err) {
      console.error('[AppConfigProvider] Error loading config:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [tenantId, clearCart]);

  const reloadConfig = useCallback(async () => {
    await loadConfig(tenantSlug);
  }, [tenantSlug, loadConfig]);

  useEffect(() => {
    // Get tenant slug from URL or use default
    const urlSlug = getTenantSlugFromUrl();
    const slug = urlSlug || defaultTenantSlug;
    loadConfig(slug);
  }, [defaultTenantSlug, loadConfig]);

  // Listen for hash changes to detect tenant switches
  useEffect(() => {
    const handleHashChange = () => {
      const urlSlug = getTenantSlugFromUrl();
      if (urlSlug && urlSlug !== tenantSlug) {
        loadConfig(urlSlug);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [tenantSlug, loadConfig]);

  const value: AppConfigContextValue = {
    config,
    loading,
    error,
    tenantSlug,
    tenantId,
    reloadConfig,
  };

  return (
    <AppConfigContext.Provider value={value}>
      {children}
    </AppConfigContext.Provider>
  );
}

export function useAppConfig() {
  const context = useContext(AppConfigContext);
  if (!context) {
    throw new Error('useAppConfig must be used within AppConfigProvider');
  }
  return context;
}

// Loading component
export function ConfigLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground">Loading application...</p>
      </div>
    </div>
  );
}

// Error component
export function ConfigError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center space-y-4 max-w-md mx-auto p-6">
        <div className="rounded-full bg-destructive/10 p-4 w-16 h-16 mx-auto flex items-center justify-center">
          <svg
            className="w-8 h-8 text-destructive"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-bold">Failed to load application</h2>
        <p className="text-muted-foreground">{error.message}</p>
        <button
          onClick={onRetry}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
