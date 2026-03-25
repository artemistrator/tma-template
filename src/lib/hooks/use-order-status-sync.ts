'use client';

import { useEffect, useRef } from 'react';
import { useCartStore, Order } from '@/store/cart-store';
import { useAppConfig } from '@/context/app-config-context';

const TERMINAL_STATUSES = new Set(['delivered', 'cancelled']);
const SYNC_COOLDOWN_MS = 30_000; // Don't re-sync same orders within 30s

/**
 * Syncs local order statuses with the server.
 * Fetches real statuses in a single batch request and updates the local store.
 * Only syncs non-terminal orders (pending, confirmed, processing, shipped).
 */
export function useOrderStatusSync() {
  const orders = useCartStore((state) => state.orders);
  const updateOrderStatus = useCartStore((state) => state.updateOrderStatus);
  const { tenantSlug } = useAppConfig();
  const lastSyncRef = useRef<number>(0);

  useEffect(() => {
    if (!tenantSlug || orders.length === 0) return;

    // Cooldown to avoid re-syncing on every re-render
    const now = Date.now();
    if (now - lastSyncRef.current < SYNC_COOLDOWN_MS) return;
    lastSyncRef.current = now;

    const ordersToSync = orders.filter((o) => !TERMINAL_STATUSES.has(o.status));
    if (ordersToSync.length === 0) return;

    async function syncStatuses() {
      try {
        const res = await fetch('/api/orders/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenant: tenantSlug,
            orderIds: ordersToSync.map((o) => o.id),
          }),
        });
        if (!res.ok) return;

        const data = await res.json();
        if (!data.success || !data.statuses) return;

        const statuses = data.statuses as Record<string, Order['status']>;
        for (const order of ordersToSync) {
          const serverStatus = statuses[order.id];
          if (serverStatus && serverStatus !== order.status) {
            updateOrderStatus(order.id, serverStatus);
          }
        }
      } catch {
        // Silently fail — will retry on next mount
      }
    }

    syncStatuses();
  }, [orders, tenantSlug, updateOrderStatus]);
}
