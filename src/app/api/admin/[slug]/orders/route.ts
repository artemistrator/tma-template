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
 * GET /api/admin/[slug]/orders
 * List orders for this tenant. Supports pagination and status filter.
 *
 * Query params: ?page=1&limit=20&status=pending
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const auth = requireAdminAuth(request, slug);
  if ('error' in auth) return auth.error;

  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
    const status = url.searchParams.get('status');
    const offset = (page - 1) * limit;

    // Determine collection based on business type
    const tenantData = await directusFetch(
      `/items/tenants?filter[slug][_eq]=${encodeURIComponent(slug)}&fields=config&limit=1`
    );
    const tenant = (tenantData.data || [])[0];
    const businessType = tenant?.config?.businessType || 'ecommerce';

    const collection = businessType === 'booking' ? 'bookings' : 'orders';

    let filterPath = `/items/${collection}?filter[tenant_id][_eq]=${slug}&sort=-created_at&limit=${limit}&offset=${offset}`;
    if (status) {
      filterPath += `&filter[status][_eq]=${encodeURIComponent(status)}`;
    }

    // Fetch items and total count in parallel
    const [itemsRes, countRes] = await Promise.all([
      directusFetch(filterPath),
      directusFetch(
        `/items/${collection}?filter[tenant_id][_eq]=${slug}${status ? `&filter[status][_eq]=${encodeURIComponent(status)}` : ''}&aggregate[count]=id`
      ),
    ]);

    const items = itemsRes.data || [];
    const totalRow = (countRes.data || [])[0] as Record<string, unknown> | undefined;
    const total = totalRow?.count
      ? (typeof totalRow.count === 'object'
        ? parseInt(String((totalRow.count as Record<string, unknown>).id || 0))
        : parseInt(String(totalRow.count))) || 0
      : 0;

    return NextResponse.json({
      success: true,
      collection,
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[Admin Orders] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load orders' },
      { status: 500 },
    );
  }
}
