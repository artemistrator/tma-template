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

function getPeriodStart(period: string): string {
  const d = new Date();
  if (period === '7d') d.setDate(d.getDate() - 7);
  else if (period === '30d') d.setDate(d.getDate() - 30);
  else d.setHours(0, 0, 0, 0); // today
  return d.toISOString().split('T')[0];
}

function buildDayBuckets(periodStart: string, period: string): Record<string, { revenue: number; count: number }> {
  const days = period === '30d' ? 30 : period === '7d' ? 7 : 1;
  const buckets: Record<string, { revenue: number; count: number }> = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    buckets[d.toISOString().split('T')[0]] = { revenue: 0, count: 0 };
  }
  return buckets;
}

/**
 * GET /api/admin/[slug]/analytics/revenue
 * Revenue trend over time.
 * Query: period=today|7d|30d
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const auth = requireAdminAuth(request, slug);
  if ('error' in auth) return auth.error;

  try {
    const period = request.nextUrl.searchParams.get('period') || '7d';
    const periodStart = getPeriodStart(period);

    // Fetch orders in period — only the fields we need
    const data = await directusFetch(
      `/items/orders?filter[tenant_id][_eq]=${slug}&filter[created_at][_gte]=${periodStart}&fields=id,created_at,total,status&limit=-1`
    );

    const orders: Array<{ id: string; created_at: string; total: number; status: string }> =
      (data.data || []).filter((o: { status?: string }) => o.status !== 'cancelled');

    const buckets = buildDayBuckets(periodStart, period);

    let totalRevenue = 0;
    let totalOrders = 0;

    for (const order of orders) {
      const day = order.created_at?.split('T')[0];
      if (day && buckets[day] !== undefined) {
        buckets[day].revenue += Number(order.total) || 0;
        buckets[day].count += 1;
      }
      totalRevenue += Number(order.total) || 0;
      totalOrders += 1;
    }

    const trend = Object.entries(buckets).map(([date, v]) => ({
      date,
      revenue: Math.round(v.revenue),
      count: v.count,
    }));

    const aov = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    return NextResponse.json({
      success: true,
      trend,
      totalRevenue: Math.round(totalRevenue),
      totalOrders,
      aov,
      period,
    });
  } catch (error) {
    console.error('[Analytics Revenue] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load revenue analytics' }, { status: 500 });
  }
}
