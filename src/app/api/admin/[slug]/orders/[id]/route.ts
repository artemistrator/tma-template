import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/admin/auth';
import { DIRECTUS_URL } from '@/lib/orchestrator/admin-client';

const DIRECTUS_TOKEN = () => process.env.DIRECTUS_ADMIN_TOKEN || '';

async function directusFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${DIRECTUS_URL}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${DIRECTUS_TOKEN()}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    cache: 'no-store',
  });
  return res.json();
}

/**
 * GET /api/admin/[slug]/orders/[id]
 * Get a single order/booking detail.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params;
  const auth = requireAdminAuth(request, slug);
  if ('error' in auth) return auth.error;

  try {
    // Determine collection
    const tenantData = await directusFetch(
      `/items/tenants?filter[slug][_eq]=${encodeURIComponent(slug)}&fields=config&limit=1`
    );
    const tenant = (tenantData.data || [])[0];
    const businessType = tenant?.config?.businessType || 'ecommerce';
    const collection = businessType === 'booking' ? 'bookings' : 'orders';

    const res = await directusFetch(`/items/${collection}/${id}`);
    const item = res.data;

    if (!item) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }

    // Verify tenant ownership
    if (item.tenant_id !== slug) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({ success: true, item, collection });
  } catch (error) {
    console.error('[Admin Order Detail] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load order' },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/admin/[slug]/orders/[id]
 * Update order/booking status.
 *
 * Body: { status: 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params;
  const auth = requireAdminAuth(request, slug);
  if ('error' in auth) return auth.error;

  try {
    const body = await request.json();
    const { status } = body as { status?: string };

    const validOrderStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    const validBookingStatuses = ['pending', 'confirmed', 'cancelled'];

    // Determine collection
    const tenantData = await directusFetch(
      `/items/tenants?filter[slug][_eq]=${encodeURIComponent(slug)}&fields=config&limit=1`
    );
    const tenant = (tenantData.data || [])[0];
    const businessType = tenant?.config?.businessType || 'ecommerce';
    const collection = businessType === 'booking' ? 'bookings' : 'orders';
    const validStatuses = collection === 'bookings' ? validBookingStatuses : validOrderStatuses;

    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 },
      );
    }

    // Verify tenant ownership first
    const existing = await directusFetch(`/items/${collection}/${id}`);
    if (!existing.data || existing.data.tenant_id !== slug) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }

    // Update
    const updated = await directusFetch(`/items/${collection}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });

    console.log(`[Admin] ${collection} #${id} status → ${status} (tenant: ${slug})`);

    // Restore stock when order is cancelled
    if (status === 'cancelled' && collection === 'orders' && existing.data?.items) {
      restoreStock(existing.data.items as Array<{ id: string; quantity: number }>).catch(err =>
        console.warn('[Admin] Stock restore failed:', err),
      );
    }

    return NextResponse.json({
      success: true,
      item: updated.data,
      collection,
    });
  } catch (error) {
    console.error('[Admin Order Update] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update order' },
      { status: 500 },
    );
  }
}

/**
 * Restore stock_quantity for each item when an order is cancelled.
 * Only restores for products with finite stock (>= 0).
 */
async function restoreStock(items: Array<{ id: string; quantity: number }>) {
  for (const item of items) {
    try {
      const res = await directusFetch(`/items/products/${item.id}?fields=stock_quantity`);
      const currentStock = res.data?.stock_quantity as number | null | undefined;
      // Only restore for finite stock (not unlimited)
      if (currentStock == null || currentStock < 0) continue;
      const newStock = currentStock + (item.quantity || 1);
      await directusFetch(`/items/products/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ stock_quantity: newStock }),
      });
      console.log(`[Admin] Stock restored: product ${item.id} ${currentStock} → ${newStock}`);
    } catch (e) {
      console.warn(`[Admin] Could not restore stock for ${item.id}:`, e);
    }
  }
}
