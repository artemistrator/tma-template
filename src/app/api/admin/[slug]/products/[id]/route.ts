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

async function getCollection(slug: string): Promise<string> {
  const tenantData = await directusFetch(
    `/items/tenants?filter[slug][_eq]=${encodeURIComponent(slug)}&fields=config&limit=1`
  );
  const tenant = (tenantData.data || [])[0];
  const businessType = tenant?.config?.businessType || 'ecommerce';
  const map: Record<string, string> = { ecommerce: 'products', booking: 'services', infobiz: 'info_products' };
  return map[businessType] || 'products';
}

/**
 * PATCH /api/admin/[slug]/products/[id]
 * Update a product/service/info_product.
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
    const collection = await getCollection(slug);

    // Verify ownership
    const existing = await directusFetch(`/items/${collection}/${id}`);
    if (!existing.data || existing.data.tenant_id !== slug) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }

    // Never allow changing tenant_id
    delete body.tenant_id;
    delete body.id;

    const updated = await directusFetch(`/items/${collection}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });

    console.log(`[Admin] Updated ${collection} #${id} (tenant: ${slug})`);

    return NextResponse.json({ success: true, item: updated.data, collection });
  } catch (error) {
    console.error('[Admin Product Update] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update item' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/[slug]/products/[id]
 * Soft-delete: set status to archived/inactive/draft.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params;
  const auth = requireAdminAuth(request, slug);
  if ('error' in auth) return auth.error;

  try {
    const collection = await getCollection(slug);

    // Verify ownership
    const existing = await directusFetch(`/items/${collection}/${id}`);
    if (!existing.data || existing.data.tenant_id !== slug) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }

    // Soft-delete by setting status
    const archiveStatus = collection === 'services' ? 'inactive' : collection === 'info_products' ? 'draft' : 'archived';
    await directusFetch(`/items/${collection}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: archiveStatus }),
    });

    console.log(`[Admin] Archived ${collection} #${id} (tenant: ${slug})`);

    return NextResponse.json({ success: true, archived: true });
  } catch (error) {
    console.error('[Admin Product Delete] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete item' },
      { status: 500 },
    );
  }
}
