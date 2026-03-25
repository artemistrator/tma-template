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
 * GET /api/admin/[slug]/reviews
 * List all reviews for this tenant (all statuses). Supports pagination and filters.
 *
 * Query params: ?page=1&limit=20&status=pending&target_type=product
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
    const targetType = url.searchParams.get('target_type');
    const offset = (page - 1) * limit;

    let filterPath = `/items/reviews?filter[tenant_id][_eq]=${encodeURIComponent(slug)}&sort=-created_at&limit=${limit}&offset=${offset}`;
    let countFilter = `/items/reviews?filter[tenant_id][_eq]=${encodeURIComponent(slug)}&aggregate[count]=id`;

    if (status) {
      filterPath += `&filter[status][_eq]=${encodeURIComponent(status)}`;
      countFilter += `&filter[status][_eq]=${encodeURIComponent(status)}`;
    }
    if (targetType) {
      filterPath += `&filter[target_type][_eq]=${encodeURIComponent(targetType)}`;
      countFilter += `&filter[target_type][_eq]=${encodeURIComponent(targetType)}`;
    }

    const [itemsRes, countRes] = await Promise.all([
      directusFetch(filterPath),
      directusFetch(countFilter),
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
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[Admin Reviews] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load reviews' },
      { status: 500 },
    );
  }
}
