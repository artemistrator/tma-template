'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

interface AdminInfo {
  name: string;
  role: 'owner' | 'manager';
  slug: string;
  telegramId: number;
}

interface AdminContextType {
  /** Tenant slug */
  slug: string;
  /** Current admin info, null if not authenticated */
  admin: AdminInfo | null;
  /** Session token for API calls */
  token: string | null;
  /** Auth state */
  status: 'loading' | 'authenticated' | 'unauthenticated';
  /** Error message */
  error: string | null;
  /** Login with admin token (desktop fallback) */
  loginWithToken: (adminToken: string) => Promise<boolean>;
  /** Logout */
  logout: () => void;
}

const AdminContext = createContext<AdminContextType | null>(null);

const STORAGE_KEY = (slug: string) => `admin_session_${slug}`;

export function AdminProvider({ slug, children }: { slug: string; children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminInfo | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  const [error, setError] = useState<string | null>(null);

  const saveSession = useCallback((sessionToken: string, adminInfo: AdminInfo) => {
    setToken(sessionToken);
    setAdmin(adminInfo);
    setStatus('authenticated');
    setError(null);
    try {
      localStorage.setItem(STORAGE_KEY(slug), JSON.stringify({ token: sessionToken, admin: adminInfo }));
    } catch { /* ignore */ }
  }, [slug]);

  const logout = useCallback(() => {
    setToken(null);
    setAdmin(null);
    setStatus('unauthenticated');
    try {
      localStorage.removeItem(STORAGE_KEY(slug));
    } catch { /* ignore */ }
  }, [slug]);

  // Try to authenticate on mount
  useEffect(() => {
    let cancelled = false;

    async function init() {
      // 1. Check localStorage for existing session
      try {
        const stored = localStorage.getItem(STORAGE_KEY(slug));
        if (stored) {
          const { token: storedToken, admin: storedAdmin } = JSON.parse(stored);
          if (storedToken && storedAdmin) {
            // Verify the token is still valid by making a test request
            const res = await fetch(`/api/admin/${slug}/stats`, {
              headers: { Authorization: `Bearer ${storedToken}` },
            });
            if (res.ok && !cancelled) {
              setToken(storedToken);
              setAdmin(storedAdmin);
              setStatus('authenticated');
              return;
            }
            // Token expired — clear it
            localStorage.removeItem(STORAGE_KEY(slug));
          }
        }
      } catch { /* ignore */ }

      // 2. Try Telegram WebApp initData
      try {
        const tg = (window as unknown as { Telegram?: { WebApp?: { initData?: string } } }).Telegram?.WebApp;
        if (tg?.initData) {
          const res = await fetch('/api/admin/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ slug, initData: tg.initData }),
          });
          const data = await res.json();
          if (data.success && !cancelled) {
            saveSession(data.token, data.admin);
            return;
          }
        }
      } catch { /* ignore */ }

      if (!cancelled) {
        setStatus('unauthenticated');
      }
    }

    init();
    return () => { cancelled = true; };
  }, [slug, saveSession]);

  const loginWithToken = useCallback(async (adminToken: string): Promise<boolean> => {
    setError(null);
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, adminToken }),
      });
      const data = await res.json();
      if (data.success) {
        saveSession(data.token, data.admin);
        return true;
      }
      setError(data.error || 'Authentication failed');
      return false;
    } catch {
      setError('Network error');
      return false;
    }
  }, [slug, saveSession]);

  return (
    <AdminContext.Provider value={{ slug, admin, token, status, error, loginWithToken, logout }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin(): AdminContextType {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used within AdminProvider');
  return ctx;
}

/**
 * Hook for making authenticated admin API requests
 */
export function useAdminFetch() {
  const { token, slug } = useAdmin();

  return useCallback(async (path: string, options?: RequestInit) => {
    const res = await fetch(`/api/admin/${slug}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options?.headers,
      },
    });
    return res.json();
  }, [token, slug]);
}
