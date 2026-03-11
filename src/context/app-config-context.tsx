'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { MiniAppSchemaType } from '@/lib/schema/mini-app-schema';

interface AppConfigContextValue {
  config: MiniAppSchemaType | null;
  loading: boolean;
  error: Error | null;
  tenantId: string;
  reloadConfig: () => Promise<void>;
}

const AppConfigContext = createContext<AppConfigContextValue | null>(null);

interface AppConfigProviderProps {
  children: React.ReactNode;
  initialTenantId?: string;
}

export function AppConfigProvider({ children, initialTenantId = 'default' }: AppConfigProviderProps) {
  const [config, setConfig] = useState<MiniAppSchemaType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [tenantId, setTenantId] = useState(initialTenantId);

  const loadConfig = useCallback(async (tenant: string) => {
    setLoading(true);
    setError(null);

    try {
      console.log('[AppConfigProvider] Fetching config for tenant:', tenant);
      
      const response = await fetch('/api/config', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenant,
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to load configuration');
      }

      console.log('[AppConfigProvider] Config loaded successfully:', {
        tenantId: data.tenantId,
        appTitle: data.config.meta.title,
        appType: data.config.meta.appType,
      });

      setConfig(data.config);
      setTenantId(data.tenantId);
    } catch (err) {
      console.error('[AppConfigProvider] Error loading config:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, []);

  const reloadConfig = useCallback(async () => {
    await loadConfig(tenantId);
  }, [tenantId, loadConfig]);

  useEffect(() => {
    loadConfig(initialTenantId);
  }, [initialTenantId, loadConfig]);

  const value: AppConfigContextValue = {
    config,
    loading,
    error,
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
