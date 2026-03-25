import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/admin/auth';
import { DIRECTUS_URL } from '@/lib/orchestrator/admin-client';

const DIRECTUS_TOKEN = () => process.env.DIRECTUS_ADMIN_TOKEN || '';

async function directusFetch(path: string) {
  const res = await fetch(`${DIRECTUS_URL}${path}`, {
    headers: { Authorization: `Bearer ${DIRECTUS_TOKEN()}` },
    cache: 'no-store',
  });
  return res.json();
}

/**
 * GET /api/admin/[slug]/stats
 * Dashboard statistics for the tenant admin.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const auth = requireAdminAuth(request, slug);
  if ('error' in auth) return auth.error;

  try {
    // Get tenant info
    const tenantData = await directusFetch(
      `/items/tenants?filter[slug][_eq]=${encodeURIComponent(slug)}&fields=id,name,slug,config&limit=1`
    );
    const tenant = (tenantData.data || [])[0];
    if (!tenant) {
      return NextResponse.json({ success: false, error: 'Tenant not found' }, { status: 404 });
    }

    const businessType = tenant.config?.businessType || 'ecommerce';
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Period filter: today | 7d | 30d (defaults to today for backward compat)
    const period = request.nextUrl.searchParams.get('period') || 'today';
    let periodDate = today;
    if (period === '7d') {
      const d = new Date(); d.setDate(d.getDate() - 7);
      periodDate = d.toISOString().split('T')[0];
    } else if (period === '30d') {
      const d = new Date(); d.setDate(d.getDate() - 30);
      periodDate = d.toISOString().split('T')[0];
    }

    // Fetch stats in parallel based on business type
    const statsPromises: Record<string, Promise<unknown>> = {};

    if (businessType === 'ecommerce' || businessType === 'infobiz') {
      // Orders
      statsPromises.allOrders = directusFetch(
        `/items/orders?filter[tenant_id][_eq]=${slug}&aggregate[count]=id&aggregate[sum]=total`
      );
      statsPromises.periodOrders = directusFetch(
        `/items/orders?filter[tenant_id][_eq]=${slug}&filter[created_at][_gte]=${periodDate}&aggregate[count]=id&aggregate[sum]=total`
      );
      statsPromises.pendingOrders = directusFetch(
        `/items/orders?filter[tenant_id][_eq]=${slug}&filter[status][_eq]=pending&aggregate[count]=id`
      );
      statsPromises.recentOrders = directusFetch(
        `/items/orders?filter[tenant_id][_eq]=${slug}&sort=-created_at&limit=5&fields=id,customer_name,total,status,created_at`
      );
    }

    if (businessType === 'booking') {
      // Bookings
      statsPromises.allBookings = directusFetch(
        `/items/bookings?filter[tenant_id][_eq]=${slug}&aggregate[count]=id`
      );
      statsPromises.periodBookings = directusFetch(
        `/items/bookings?filter[tenant_id][_eq]=${slug}&filter[date][_gte]=${periodDate}&aggregate[count]=id`
      );
      statsPromises.pendingBookings = directusFetch(
        `/items/bookings?filter[tenant_id][_eq]=${slug}&filter[status][_eq]=pending&aggregate[count]=id`
      );
      statsPromises.recentBookings = directusFetch(
        `/items/bookings?filter[tenant_id][_eq]=${slug}&sort=-created_at&limit=5&fields=id,customer_name,customer_phone,date,status,service_id,created_at`
      );
    }

    // Reviews (for all business types)
    statsPromises.pendingReviews = directusFetch(
      `/items/reviews?filter[tenant_id][_eq]=${slug}&filter[status][_eq]=pending&aggregate[count]=id`
    );
    statsPromises.approvedReviews = directusFetch(
      `/items/reviews?filter[tenant_id][_eq]=${slug}&filter[status][_eq]=approved&aggregate[count]=id`
    );

    // Item counts
    if (businessType === 'ecommerce') {
      statsPromises.productCount = directusFetch(
        `/items/products?filter[tenant_id][_eq]=${slug}&filter[status][_eq]=published&aggregate[count]=id`
      );
    } else if (businessType === 'booking') {
      statsPromises.serviceCount = directusFetch(
        `/items/services?filter[tenant_id][_eq]=${slug}&filter[status][_eq]=active&aggregate[count]=id`
      );
      statsPromises.staffCount = directusFetch(
        `/items/staff?filter[tenant_id][_eq]=${slug}&filter[status][_eq]=active&aggregate[count]=id`
      );
    } else if (businessType === 'infobiz') {
      statsPromises.infoProductCount = directusFetch(
        `/items/info_products?filter[tenant_id][_eq]=${slug}&filter[status][_eq]=published&aggregate[count]=id`
      );
    }

    const results = await Promise.all(
      Object.entries(statsPromises).map(async ([key, promise]) => {
        try {
          const data = await promise;
          return [key, data] as const;
        } catch {
          return [key, { data: [] }] as const;
        }
      })
    );

    const raw = Object.fromEntries(results) as Record<string, { data?: unknown[] }>;

    // Parse aggregate values
    const getCount = (d: { data?: unknown[] }) => {
      const row = (d.data || [])[0] as Record<string, unknown> | undefined;
      if (!row) return 0;
      const c = row.count as Record<string, unknown> | number | undefined;
      if (typeof c === 'number') return c;
      if (c && typeof c === 'object') return parseInt(String((c as Record<string, unknown>).id || 0)) || 0;
      return 0;
    };
    const getSum = (d: { data?: unknown[] }) => {
      const row = (d.data || [])[0] as Record<string, unknown> | undefined;
      if (!row) return 0;
      const s = row.sum as Record<string, unknown> | number | undefined;
      if (typeof s === 'number') return s;
      if (s && typeof s === 'object') return parseFloat(String((s as Record<string, unknown>).total || 0)) || 0;
      return 0;
    };

    const stats: Record<string, unknown> = {
      businessType,
      tenantName: tenant.name,
      period,
    };

    if (businessType === 'ecommerce' || businessType === 'infobiz') {
      stats.orders = {
        total: getCount(raw.allOrders || { data: [] }),
        totalRevenue: getSum(raw.allOrders || { data: [] }),
        periodCount: getCount(raw.periodOrders || { data: [] }),
        periodRevenue: getSum(raw.periodOrders || { data: [] }),
        pending: getCount(raw.pendingOrders || { data: [] }),
      };
      stats.recentOrders = (raw.recentOrders as { data?: unknown[] })?.data || [];
    }

    if (businessType === 'booking') {
      stats.bookings = {
        total: getCount(raw.allBookings || { data: [] }),
        periodCount: getCount(raw.periodBookings || { data: [] }),
        pending: getCount(raw.pendingBookings || { data: [] }),
      };
      stats.recentBookings = (raw.recentBookings as { data?: unknown[] })?.data || [];
    }

    if (raw.productCount) stats.productCount = getCount(raw.productCount);
    if (raw.serviceCount) stats.serviceCount = getCount(raw.serviceCount);
    if (raw.staffCount) stats.staffCount = getCount(raw.staffCount);
    if (raw.infoProductCount) stats.infoProductCount = getCount(raw.infoProductCount);

    // Reviews stats
    stats.reviews = {
      pending: getCount(raw.pendingReviews || { data: [] }),
      approved: getCount(raw.approvedReviews || { data: [] }),
    };

    return NextResponse.json({ success: true, ...stats });
  } catch (error) {
    console.error('[Admin Stats] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load stats' },
      { status: 500 },
    );
  }
}
