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

/** Resolve collection name by business type */
async function getCollection(slug: string): Promise<{ collection: string; businessType: string }> {
  const tenantData = await directusFetch(
    `/items/tenants?filter[slug][_eq]=${encodeURIComponent(slug)}&fields=config&limit=1`
  );
  const tenant = (tenantData.data || [])[0];
  const businessType = tenant?.config?.businessType || 'ecommerce';

  const collectionMap: Record<string, string> = {
    ecommerce: 'products',
    booking: 'services',
    infobiz: 'info_products',
  };

  return { collection: collectionMap[businessType] || 'products', businessType };
}

/**
 * GET /api/admin/[slug]/products
 * List products/services/info_products for this tenant.
 *
 * Query params: ?page=1&limit=50
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
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);
    const offset = (page - 1) * limit;

    const { collection, businessType } = await getCollection(slug);

    const [itemsRes, countRes] = await Promise.all([
      directusFetch(
        `/items/${collection}?filter[tenant_id][_eq]=${slug}&sort=-created_at&limit=${limit}&offset=${offset}`
      ),
      directusFetch(
        `/items/${collection}?filter[tenant_id][_eq]=${slug}&aggregate[count]=id`
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
      businessType,
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('[Admin Products] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load items' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/[slug]/products
 * Create a new product/service/info_product.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const auth = requireAdminAuth(request, slug);
  if ('error' in auth) return auth.error;

  try {
    const body = await request.json();
    const { collection } = await getCollection(slug);

    // Enforce tenant_id
    const item = { ...body, tenant_id: slug };

    const res = await directusFetch(`/items/${collection}`, {
      method: 'POST',
      body: JSON.stringify(item),
    });

    if (!res.data) {
      return NextResponse.json(
        { success: false, error: 'Failed to create item', details: res.errors },
        { status: 500 },
      );
    }

    console.log(`[Admin] Created ${collection} item for tenant ${slug}`);

    return NextResponse.json({ success: true, item: res.data, collection });
  } catch (error) {
    console.error('[Admin Products Create] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create item' },
      { status: 500 },
    );
  }
}
